/**
 * لایه ذخیره‌سازی محلی.
 *
 * دو مخزن:
 *  - kv    : اسناد JSON کوچک (تنطیمات، ثبت‌ها، نوبت‌ها ...)
 *  - blobs : فایل‌های حجیم (عکس پوست، عکس نسخه پزشک)
 *
 * چرا این‌طوری: localStorage سقف ~۵ مگابایت دارد و با ۲-۳ عکس base64
 * پر می‌شود و بی‌صدا شکست می‌خورد.
 *
 * خواندن همگام (sync) است و از کش حافطه جواب می‌دهد؛ نوشتن فوری
 * در کش می‌نشیند و پشت صحنه روی دیسک می‌رود. پس کد UI
 * لازم نیست async شود.
 */

import { DATA_SCHEMA_VERSION } from '../../config/appConfig';

const DB_NAME = 'roza_db';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const BLOB_STORE = 'blobs';
const LS_PREFIX = 'roza_';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const cache = new Map<string, unknown>();
const pendingWrites = new Map<string, unknown>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let hydrated = false;

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (!hasIndexedDb()) {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

/** خواندن همه داده از دیسک در حافظه. قبل از رندر React صدا زده می‌شود. */
export async function hydrateStore(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  const db = await openDb();
  if (db) {
    try {
      const store = tx(db, KV_STORE, 'readonly');
      const keys = (await requestToPromise(store.getAllKeys())) || [];
      const values = (await requestToPromise(tx(db, KV_STORE, 'readonly').getAll())) || [];
      keys.forEach((key, index) => {
        cache.set(String(key), values[index]);
      });
    } catch {
      /* دیتابیس در دسترس نیست؛ سراغ localStorage می‌رویم */
    }
  }

  migrateFromLocalStorage();
}

/** داده نسخه‌های قبلی که روی localStorage بوده را یک‌بار منتقل می‌کند. */
function migrateFromLocalStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const migratedFlag = `${LS_PREFIX}migrated_to_idb`;
    if (localStorage.getItem(migratedFlag) === String(DATA_SCHEMA_VERSION)) return;

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(LS_PREFIX)) continue;
      if (key === migratedFlag) continue;
      if (cache.has(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        cache.set(key, JSON.parse(raw));
        pendingWrites.set(key, cache.get(key));
      } catch {
        /* مقدار خراب را رد می‌کنیم */
      }
    }
    localStorage.setItem(migratedFlag, String(DATA_SCHEMA_VERSION));
    scheduleFlush();
  } catch {
    /* بی‌اهمیت */
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushStore();
  }, 250);
}

/** نوشتن فوری همه تغییرات معلق روی دیسک. */
export async function flushStore(): Promise<void> {
  if (pendingWrites.size === 0) return;
  const batch = Array.from(pendingWrites.entries());
  pendingWrites.clear();

  const db = await openDb();
  if (db) {
    try {
      const store = tx(db, KV_STORE, 'readwrite');
      batch.forEach(([key, value]) => store.put(value, key));
      return;
    } catch {
      /* می‌افتیم روی localStorage */
    }
  }

  try {
    batch.forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  } catch (error) {
    console.warn('ذخیره‌سازی محلی ممکن نشد', error);
    notifyStorageFailure();
  }
}

let storageFailureHandler: (() => void) | null = null;
export function onStorageFailure(handler: () => void): void {
  storageFailureHandler = handler;
}
function notifyStorageFailure(): void {
  if (storageFailureHandler) storageFailureHandler();
}

/** خواندن همگام یک سند JSON. */
export function readJson<T>(key: string, fallback: T): T {
  if (cache.has(key)) {
    const value = cache.get(key);
    if (value !== undefined && value !== null) return value as T;
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      cache.set(key, parsed);
      return parsed;
    }
  } catch {
    /* بی‌اهمیت */
  }
  return fallback;
}

/** نوشتن یک سند JSON (فوری در کش، دیرهنگام روی دیسک). */
export function writeJson<T>(key: string, value: T): void {
  cache.set(key, value);
  pendingWrites.set(key, value);
  scheduleFlush();
}

export function removeJson(key: string): void {
  cache.delete(key);
  pendingWrites.delete(key);
  void (async () => {
    const db = await openDb();
    if (db) {
      try {
        tx(db, KV_STORE, 'readwrite').delete(key);
      } catch {
        /* بی‌اهمیت */
      }
    }
    try {
      localStorage.removeItem(key);
    } catch {
      /* بی‌اهمیت */
    }
  })();
}

/* ---------------------------------- فایل‌ها ---------------------------------- */

/** ذخیره یک فایل (عکس). خروجی: موفق یا ناموفق — در UI باید چک شود. */
export async function putBlob(id: string, blob: Blob): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    const store = tx(db, BLOB_STORE, 'readwrite');
    const result = await requestToPromise(store.put(blob, id) as IDBRequest<IDBValidKey>);
    return result !== null;
  } catch {
    return false;
  }
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const result = await requestToPromise(tx(db, BLOB_STORE, 'readonly').get(id) as IDBRequest<Blob>);
    return result || null;
  } catch {
    return null;
  }
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    tx(db, BLOB_STORE, 'readwrite').delete(id);
  } catch {
    /* بی‌اهمیت */
  }
}

/** مصرف تقریبی فضای ذخیره‌سازی برای نمایش به کاربر. */
export async function estimateStorage(): Promise<{ usedMb: number; quotaMb: number } | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const estimate = await navigator.storage.estimate();
    return {
      usedMb: Math.round(((estimate.usage || 0) / 1024 / 1024) * 10) / 10,
      quotaMb: Math.round(((estimate.quota || 0) / 1024 / 1024) * 10) / 10,
    };
  } catch {
    return null;
  }
}

/** پاک کردن کامل همه داده‌های رزا روی این دستگاه. */
export async function wipeAllData(): Promise<void> {
  cache.clear();
  pendingWrites.clear();
  const db = await openDb();
  if (db) {
    try {
      tx(db, KV_STORE, 'readwrite').clear();
      tx(db, BLOB_STORE, 'readwrite').clear();
    } catch {
      /* بی‌اهمیت */
    }
  }
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LS_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* بی‌اهمیت */
  }
}

/**
 * قفل اپ.
 *
 * داده چرخه، عکس صورت و پرونده پزشکی حساس‌ترین اطلاعات شخصی
 * یک نفر هستند. گوشی در خانواده دست به دست می‌شود.
 *
 * PIN خود PIN ذخیره نمی‌شود؛ فقط هش با نمک تصادفی.
 */

import { readJson, removeJson, writeJson } from '../storage/persistence';

const LOCK_KEY = 'roza_lock_v1';
const MAX_ATTEMPTS = 10;

interface LockRecord {
  saltHex: string;
  hashHex: string;
  failedAttempts: number;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${saltHex}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export function isLockConfigured(): boolean {
  return Boolean(readJson<LockRecord | null>(LOCK_KEY, null));
}

export async function setPin(pin: string): Promise<{ ok: boolean; errorFa?: string }> {
  if (!/^\d{4,8}$/.test(pin)) {
    return { ok: false, errorFa: 'رمز باید بین ۴ تا ۸ رقم عدد باشد.' };
  }
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = toHex(salt.buffer);
  const hashHex = await hashPin(pin, saltHex);
  writeJson<LockRecord>(LOCK_KEY, { saltHex, hashHex, failedAttempts: 0 });
  return { ok: true };
}

export async function verifyPin(pin: string): Promise<{ ok: boolean; remainingAttempts: number }> {
  const record = readJson<LockRecord | null>(LOCK_KEY, null);
  if (!record) return { ok: true, remainingAttempts: MAX_ATTEMPTS };

  const hashHex = await hashPin(pin, record.saltHex);
  if (hashHex === record.hashHex) {
    writeJson<LockRecord>(LOCK_KEY, { ...record, failedAttempts: 0 });
    return { ok: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const failedAttempts = record.failedAttempts + 1;
  writeJson<LockRecord>(LOCK_KEY, { ...record, failedAttempts });
  return { ok: false, remainingAttempts: Math.max(0, MAX_ATTEMPTS - failedAttempts) };
}

export function clearPin(): void {
  removeJson(LOCK_KEY);
}

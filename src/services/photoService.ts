/**
 * عکس‌های پیشرفت پوست.
 *
 * نسخه ۱: base64 در localStorage → با ۲-۳ عکس پر می‌شد و بی‌صدا شکست می‌خورد.
 * نسخه ۲: فشرده‌سازی + ذخیره Blob در IndexedDB + خطای قابل نمایش.
 */

import { PhotoProgress } from '../types';
import { LocalDB, createId } from './db';
import { deleteBlob, getBlob, putBlob } from './storage/persistence';
import { getTodayIsoDate } from './jalali';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

/** فشرده‌سازی عکس قبل از ذخیره. عکس ۴ مگابایتی گوشی به ~۲۰۰ کیلوبایت می‌رسد. */
async function compressImage(file: File | Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', JPEG_QUALITY);
    });
    return blob || file;
  } catch {
    return file;
  }
}

export interface SavePhotoResult {
  ok: boolean;
  photo?: PhotoProgress;
  errorFa?: string;
}

export async function savePhoto(
  file: File,
  options: {
    dateIso?: string;
    notes?: string;
    tagsFa?: string[];
    appointmentId?: string;
    appointmentPhase?: 'before' | 'after';
  } = {},
): Promise<SavePhotoResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, errorFa: 'فقط فایل تصویری قابل انتخاب است.' };
  }

  const blob = await compressImage(file);
  const blobId = createId('img');
  const stored = await putBlob(blobId, blob);
  if (!stored) {
    return {
      ok: false,
      errorFa: 'فضای ذخیره‌سازی گوشی کافی نیست یا مرورگر اجازه ذخیره نمی‌دهد. چند عکس قدیمی را پاک کنید.',
    };
  }

  const photo: PhotoProgress = {
    id: createId('photo'),
    date: options.dateIso || getTodayIsoDate(),
    blobId,
    notes: options.notes,
    skinConditionScore: 0, // هرگز خودکار امتیاز نمی‌دهیم
    tagsFa: options.tagsFa || [],
    appointmentId: options.appointmentId,
    appointmentPhase: options.appointmentPhase,
    updatedAt: new Date().toISOString(),
  };

  LocalDB.savePhoto(photo);
  return { ok: true, photo };
}

const urlCache = new Map<string, string>();

/** لینک قابل نمایش برای یک عکس. کش می‌شود تا حافطه هدر نرود. */
export async function getPhotoUrl(blobId: string): Promise<string | null> {
  const cached = urlCache.get(blobId);
  if (cached) return cached;
  const blob = await getBlob(blobId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(blobId, url);
  return url;
}

export async function deletePhoto(photo: PhotoProgress): Promise<void> {
  LocalDB.deletePhoto(photo.id);
  const url = urlCache.get(photo.blobId);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(photo.blobId);
  }
  await deleteBlob(photo.blobId);
}

export function releasePhotoUrls(): void {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}

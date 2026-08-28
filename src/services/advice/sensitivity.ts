/**
 * تنها تعریف «حساسیت پوست» در کل اپ.
 *
 * قبلاً دو تعریف موازی وجود داشت: safety.ts با شرط خام
 * `sensitivityScore >= 8` و userContext با فرمول ترکیبی و آستانهٔ ۹.
 * نتیجه این بود که یک کاربر در یک صفحه «حساس» و در صفحهٔ دیگر «معمولی»
 * دیده می‌شد. این فایل عمداً برگ (leaf) است و جز types چیزی import
 * نمی‌کند، تا هر لایه‌ای (ایمنی، موتور توصیه، UI) بتواند بدون وابستگی
 * حلقه‌ای از آن بخواند.
 */

import { SkinProfile } from '../../types';

export type SensitivityLevel = 'low' | 'moderate' | 'high';

/** آستانه‌ها یک‌جا نگه داشته می‌شوند تا با تغییر یکی، رفتار همه‌جا هم‌زمان عوض شود. */
const HIGH_THRESHOLD = 9;
const MODERATE_THRESHOLD = 6;

/**
 * امتیاز خام حساسیت (۱ تا ۱۰ ورودی کاربر) با شواهد واقعی پروفایل تقویت
 * می‌شود؛ چون «۵ از ۱۰» برای کسی که رزاسه دارد با کسی که ندارد یکی نیست.
 */
export function getSensitivityScore(profile: SkinProfile): number {
  let score = Number(profile.sensitivityScore) || 5;
  if (profile.skinType === 'sensitive') score += 2;
  const concerns = profile.primaryConcerns || [];
  if (concerns.includes('rosacea') || concerns.includes('eczema')) score += 2;
  if (concerns.includes('redness')) score += 1;
  if ((profile.allergies || []).length > 0) score += 1;
  return score;
}

export function getSensitivityLevel(profile: SkinProfile): SensitivityLevel {
  const score = getSensitivityScore(profile);
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MODERATE_THRESHOLD) return 'moderate';
  return 'low';
}

/**
 * جایگزین شرط قدیمی `sensitivityScore >= 8` در لایهٔ ایمنی.
 * هرجا لازم است بدانیم «این پوست واقعاً حساس است؟» فقط همین تابع.
 */
export function isSensitiveSkin(profile: SkinProfile): boolean {
  return getSensitivityLevel(profile) === 'high';
}

export const SENSITIVITY_LABEL_FA: Record<SensitivityLevel, string> = {
  low: 'پوستت نسبتاً مقاوم است',
  moderate: 'پوستت حساسیت متوسط دارد',
  high: 'پوستت حساس است',
};

export const SENSITIVITY_HINT_FA: Record<SensitivityLevel, string> = {
  low: 'می‌توانی ترکیبات فعال را با شیب معمول شروع کنی.',
  moderate: 'ترکیب فعال جدید را یک شب در میان شروع کن.',
  high: 'هر ترکیب فعال جدید را اول روی یک نقطهٔ کوچک تست کن.',
};

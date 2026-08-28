/**
 * کمک‌ابزار شدت توصیه.
 *
 * تنها منبع مقایسه، برچسب فارسی و رنگ هر سطح. UI نباید خودش
 * برای شدت متن یا رنگ بسازد.
 */

import { AdviceAction, AdviceSeverity } from '../../types';

export const SEVERITY_RANK: Record<AdviceSeverity, number> = {
  INFO: 0,
  SUGGESTION: 1,
  CAUTION: 2,
  IMPORTANT: 3,
  PROFESSIONAL_INSTRUCTION: 4,
};

export function maxSeverity(a: AdviceSeverity, b: AdviceSeverity): AdviceSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

const ORDER: AdviceSeverity[] = ['INFO', 'SUGGESTION', 'CAUTION', 'IMPORTANT', 'PROFESSIONAL_INSTRUCTION'];

/** یک پله بالاتر — مثلاً پوست حساس روی قاعدهٔ پروسیجر. */
export function escalate(severity: AdviceSeverity, steps = 1, ceiling: AdviceSeverity = 'IMPORTANT'): AdviceSeverity {
  const next = ORDER[Math.min(ORDER.length - 1, SEVERITY_RANK[severity] + steps)];
  return SEVERITY_RANK[next] > SEVERITY_RANK[ceiling] ? ceiling : next;
}

export function isAtLeast(severity: AdviceSeverity, floor: AdviceSeverity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[floor];
}

/** این شدت واقعاً جلوی مصرف را می‌گیرد؟ فقط دو سطح بالا. */
export function isRestrictive(severity: AdviceSeverity): boolean {
  return isAtLeast(severity, 'IMPORTANT');
}

export const SEVERITY_LABEL_FA: Record<AdviceSeverity, string> = {
  INFO: 'فقط برای اطلاع',
  SUGGESTION: 'پیشنهاد',
  CAUTION: 'با احتیاط',
  IMPORTANT: 'مهم',
  PROFESSIONAL_INSTRUCTION: 'دستور پزشک یا مرکز درمانی',
};

/** توضیح یک‌خطی هر سطح برای کاربر عامی. */
export const SEVERITY_HINT_FA: Record<AdviceSeverity, string> = {
  INFO: 'لازم نیست کاری کنی؛ فقط خوب است بدانی.',
  SUGGESTION: 'اختیاری است. اگر پوستت راحت است، می‌توانی روتین را عوض نکنی.',
  CAUTION: 'بهتر است جدی بگیری، ولی این ممنوعیت نیست.',
  IMPORTANT: 'برای ایمنی خودت در این بازه رعایت کن.',
  PROFESSIONAL_INSTRUCTION: 'این مورد به تأیید پزشک نیاز دارد.',
};

export const SEVERITY_STYLE: Record<AdviceSeverity, string> = {
  INFO: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
  SUGGESTION: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50 text-sky-900 dark:text-sky-200',
  CAUTION: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
  IMPORTANT: 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-900/50 text-orange-900 dark:text-orange-200',
  PROFESSIONAL_INSTRUCTION: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200',
};

/* ------------------------- پل با واژگان قدیمی ایمنی ------------------------- */

/**
 * لایهٔ ایمنی (safety.ts) با سه سطح blocked/caution/safe کار می‌کند و
 * SkinLab هم مستقیم همان را نشان می‌داد، در حالی که خانه و روتین با پنج
 * سطح INFO..PROFESSIONAL_INSTRUCTION حرف می‌زدند. نتیجه: یک ماده در دو
 * صفحه دو برچسب متفاوت می‌گرفت. این تابع تنها مسیر ترجمه است و هر UI
 * باید از همین بخواند تا واژگان اپ یکی بماند.
 */
export function severityFromSafetyLevel(
  level: 'blocked' | 'caution' | 'safe',
): AdviceSeverity | null {
  if (level === 'blocked') return 'IMPORTANT';
  if (level === 'caution') return 'CAUTION';
  return null; // safe یعنی هیچ توصیه‌ای لازم نیست
}

/** برچسب حالت «مشکلی ندارد» — تا UI خودش متن نسازد. */
export const SAFE_LABEL_FA = 'برای تو مشکلی ندارد';
export const SAFE_STYLE =
  'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200';

/** برچسب و استایل یک سطح، با پوشش حالت safe. یک تابع برای همهٔ صفحه‌ها. */
export function describeSeverity(severity: AdviceSeverity | null): {
  labelFa: string;
  hintFa: string;
  style: string;
} {
  if (severity === null) {
    return { labelFa: SAFE_LABEL_FA, hintFa: 'لازم نیست کاری کنی.', style: SAFE_STYLE };
  }
  return {
    labelFa: SEVERITY_LABEL_FA[severity],
    hintFa: SEVERITY_HINT_FA[severity],
    style: SEVERITY_STYLE[severity],
  };
}

/**
 * کاری که از کاربر خواسته می‌شود، از شدت مشتق می‌شود نه دستی.
 * قبلاً هر جای کد خودش تصمیم می‌گرفت 'stop' یا 'reduce' بدهد و همین باعث
 * می‌شد یک نوبت وکس همان action نوبت میکرونیدلینگ را بگیرد.
 */
export function actionForSeverity(severity: AdviceSeverity, prescription = false): AdviceAction {
  // رزا هرگز نمی‌گوید داروی تجویزی را قطع کن؛ حداکثر می‌گوید با پزشکت هماهنگ کن.
  if (prescription) return 'info';
  if (severity === 'PROFESSIONAL_INSTRUCTION') return 'stop';
  if (severity === 'IMPORTANT') return 'pause';
  if (severity === 'CAUTION') return 'reduce';
  if (severity === 'SUGGESTION') return 'use';
  return 'info';
}

export const ACTION_LABEL_FA: Record<AdviceAction, string> = {
  info: 'فقط بدان',
  use: 'می‌توانی استفاده کنی',
  reduce: 'کمترش کن',
  pause: 'در این بازه نگه‌دار',
  stop: 'در این بازه قطع',
};

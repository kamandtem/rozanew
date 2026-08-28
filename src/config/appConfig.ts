/**
 * تنطیمات مرکزی برنامه.
 *
 * مهم: هر قابلیتی که به سرور یا فازهای بعدی وابسته است
 * باید از اینجا خاموش/روشن شود، نه با دستکاری در کامپوننت‌ها.
 * فاز ۱ (فعلی): همه چیز آفلاین.
 * فاز ۲: دفترچه نوبت آرایشگاه و پزشک (محلی، بدون سرور).
 * فاز ۳: دایرکتوری آرایشگاه/پزشک طرف قرارداد + رزرو نوبت.
 * فاز ۴: فروشگاه وب متصل به اپ.
 */

export const APP_VERSION = '1.1.0';

/** نسخه ساختار داده محلی. با هر تغییر ساختار، یکی اضافه کن و مایگریشن بنویس. */
export const DATA_SCHEMA_VERSION = 2;

/**
 * آدرس بک‌اند. تا وقتی خالی باشد، اپ ۱۰۰٪ آفلاین کار می‌کند
 * و هیچ درخواستی به بیرون نمی‌رود.
 * برای فازهای بعدی فقط این را پر کن (مثلاً https://api.roza.ir).
 */
export const API_BASE_URL = '';

/** آدرس فروشگاه وب (فاز ۴). خالی = دکمه‌های خرید نمایش داده نمی‌شوند. */
export const SHOP_BASE_URL = '';

export type FeatureFlag =
  | 'weather'
  | 'appointments'
  | 'clinicSection'
  | 'providerDirectory'
  | 'onlineBooking'
  | 'shop'
  | 'cloudSync'
  | 'appLock';

const FEATURES: Record<FeatureFlag, boolean> = {
  weather: true,
  appointments: true,
  clinicSection: true,
  providerDirectory: false,
  onlineBooking: false,
  shop: false,
  cloudSync: false,
  appLock: false,
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (!FEATURES[flag]) return false;
  if (flag === 'providerDirectory' || flag === 'onlineBooking' || flag === 'cloudSync') {
    return API_BASE_URL.length > 0;
  }
  if (flag === 'shop') return SHOP_BASE_URL.length > 0;
  return true;
}

/** کد منبع برای لینک‌های ارجاع به فروشگاه یا آرایشگاه طرف قرارداد. */
export const REFERRAL_SOURCE = 'roza-app';

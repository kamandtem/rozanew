/**
 * سرویس مرکزی Location/GPS — Native-first.
 *
 * قبل از این فایل، منطق موقعیت در دو جای مستقل تکرار شده بود:
 * weatherService.requestWeatherLocation و OnboardingFlow.requestLocation.
 * هر دو مستقیماً Geolocation کپسیتور را صدا می‌زدند، هرکدام با
 * enableHighAccuracy متفاوت (یکی true یکی false، بدون دلیل مستند)،
 * و نتیجه را خام (فقط lat/lng) در یک کلید localStorage می‌نوشتند —
 * بدون accuracy، بدون timestamp، بدون source. UI مستقیماً مسئول
 * Permission و GPS بود.
 *
 * این‌جا همه‌ی آن منطق یک‌جا جمع شده: درخواست/بررسی Permission،
 * گرفتن موقعیت فعلی (یک‌بار، نه Track مداوم)، نگه‌داشتن آخرین موقعیت
 * معتبر برای حالت آفلاین، و تفکیک خطاها (رد دسترسی، رد دائمی، GPS
 * خاموش، Timeout) با پیام فارسی مناسب برای هرکدام.
 *
 * توجه: پروژه از قبل روی @capacitor/geolocation (Native-first) بود، نه
 * navigator.geolocation مرورگر — این فایل معماری موجود را متمرکز و
 * یکدست می‌کند، نه اینکه موتور GPS را عوض کند.
 */

import { Geolocation } from '@capacitor/geolocation';
import { readJson, writeJson } from './storage/persistence';

const LOCATION_KEY = 'roza_location_v1';
/** کلید نسخه قبلی (فقط lat/lng خام) — فقط برای مهاجرت یک‌باره خوانده می‌شود. */
const LEGACY_COORDS_KEY = 'roza_weather_coords_v1';

export type LocationSource = 'gps' | 'network' | 'cache';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  /** شعاع خطا به متر، اگر پلاگین برگرداند. */
  accuracy?: number;
  /** ISO 8601 — فرمت شمسی فقط در UI اعمال شود، نه در Data Layer. */
  timestamp: string;
  source: LocationSource;
}

export type LocationErrorReason =
  | 'permission_denied'
  | 'permission_denied_permanently'
  | 'position_unavailable'
  | 'timeout'
  | 'unsupported';

export class LocationError extends Error {
  reason: LocationErrorReason;
  constructor(reason: LocationErrorReason, message?: string) {
    super(message || reason);
    this.name = 'LocationError';
    this.reason = reason;
  }
}

export interface GetLocationOptions {
  /**
   * فقط وقتی true بده که use-case واقعاً به دقت GPS نیاز دارد.
   * برای تشخیص شهر (مثلاً آب‌وهوا) false کافی است و باتری کمتری می‌گیرد.
   * پیش‌فرض: false.
   */
  highAccuracy?: boolean;
  timeoutMs?: number;
}

function isSupported(): boolean {
  try {
    return typeof Geolocation?.getCurrentPosition === 'function';
  } catch {
    return false;
  }
}

async function checkPermission() {
  try {
    return await Geolocation.checkPermissions();
  } catch {
    return null;
  }
}

function isGranted(status: { location?: string; coarseLocation?: string } | null): boolean {
  return status?.location === 'granted' || status?.coarseLocation === 'granted';
}

/** فقط بررسی وضعیت فعلی Permission، بدون نمایش پرامپت. */
export async function hasLocationPermission(): Promise<boolean> {
  return isGranted(await checkPermission());
}

/**
 * درخواست Permission — فقط باید وقتی صدا زده شود که یک قابلیت واقعاً
 * به Location نیاز دارد (نه در startup اپ به‌صورت پیش‌فرض).
 */
async function ensurePermission(): Promise<'granted' | 'denied' | 'denied_permanently'> {
  const current = await checkPermission();
  if (isGranted(current)) return 'granted';

  try {
    const requested = await Geolocation.requestPermissions();
    if (isGranted(requested)) return 'granted';
    // اگر بعد از درخواست هم هر دو denied باشند، یعنی یا کاربر همین الان رد
    // کرد یا قبلاً دائمی رد کرده (اندروید در حالت دوم دیگر پرامپت نشان نمی‌دهد).
    const permanentlyDenied = requested.location === 'denied' && requested.coarseLocation === 'denied';
    return permanentlyDenied ? 'denied_permanently' : 'denied';
  } catch {
    return 'denied';
  }
}

function readLegacyCoords(): { latitude: number; longitude: number } | null {
  const legacy = readJson<{ latitude: number; longitude: number } | null>(LEGACY_COORDS_KEY, null);
  return legacy && typeof legacy.latitude === 'number' && typeof legacy.longitude === 'number' ? legacy : null;
}

/**
 * آخرین موقعیت معتبر ذخیره‌شده، بدون تماس با GPS — برای حالت آفلاین یا
 * bootstrap سریع (مثلاً قبل از پاسخ آب‌وهوا). ممکن است قدیمی باشد؛
 * فراخوان باید timestamp را خودش برای تصمیم «قابل استفاده هست یا نه»
 * بررسی کند.
 */
export function getLastKnownLocation(): LocationCoords | null {
  const stored = readJson<LocationCoords | null>(LOCATION_KEY, null);
  if (stored && typeof stored.latitude === 'number' && typeof stored.longitude === 'number') return stored;

  // مهاجرت یک‌باره از فرمت قدیمی (بدون accuracy/timestamp/source).
  const legacy = readLegacyCoords();
  if (legacy) {
    const migrated: LocationCoords = {
      latitude: legacy.latitude,
      longitude: legacy.longitude,
      timestamp: new Date(0).toISOString(),
      source: 'cache',
    };
    writeJson(LOCATION_KEY, migrated);
    return migrated;
  }
  return null;
}

/**
 * دریافت موقعیت فعلی — یک‌بار (نه watch/Track مداوم). بعد از دریافت
 * موفق، در LocalDB با accuracy/timestamp/source ذخیره می‌شود تا هم
 * getLastKnownLocation آفلاین جواب بدهد و هم منبع/سن داده مشخص باشد.
 */
export async function getCurrentLocation(options: GetLocationOptions = {}): Promise<LocationCoords> {
  if (!isSupported()) {
    throw new LocationError('unsupported', 'پلاگین Geolocation در دسترس نیست');
  }

  const permission = await ensurePermission();
  if (permission === 'denied') throw new LocationError('permission_denied');
  if (permission === 'denied_permanently') throw new LocationError('permission_denied_permanently');

  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.highAccuracy ?? false,
      timeout: options.timeoutMs ?? 12000,
      // اگر پلتفرم یک موقعیت اخیر (حداکثر ۵ دقیقه) دارد همان را بده —
      // نیازی به یک fix تازه GPS برای هر درخواست نیست.
      maximumAge: 5 * 60 * 1000,
    });

    const coords: LocationCoords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
      timestamp: new Date().toISOString(),
      source: 'gps',
    };
    writeJson(LOCATION_KEY, coords);
    return coords;
  } catch (error) {
    throw toLocationError(error);
  }
}

function toLocationError(error: unknown): LocationError {
  if (error instanceof LocationError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: number | string })?.code;

  if (code === 3 || /timeout/i.test(message)) return new LocationError('timeout', message);
  if (code === 1 || /denied|permission/i.test(message)) return new LocationError('permission_denied', message);
  return new LocationError('position_unavailable', message);
}

/** پیام فارسی مناسب برای کاربر بر اساس نوع خطا — برای نمایش در UI. */
export function getLocationErrorMessageFa(error: unknown): string {
  const reason = error instanceof LocationError ? error.reason : toLocationError(error).reason;
  switch (reason) {
    case 'permission_denied':
      return 'اجازه موقعیت داده نشد؛ می‌توانی شهر را دستی وارد کنی.';
    case 'permission_denied_permanently':
      return 'دسترسی موقعیت مسدود شده؛ از تنظیمات گوشی اجازه بده یا شهر را دستی وارد کن.';
    case 'timeout':
      return 'دریافت موقعیت طول کشید؛ دوباره امتحان کن یا شهر را دستی وارد کن.';
    case 'unsupported':
      return 'موقعیت‌یابی روی این دستگاه در دسترس نیست؛ شهر را دستی وارد کن.';
    case 'position_unavailable':
    default:
      return 'موقعیت در دسترس نیست؛ مطمئن شو GPS روشن است یا شهر را دستی وارد کن.';
  }
}

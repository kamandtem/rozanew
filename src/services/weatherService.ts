/**
 * آب‌وهوا — تنها قابلیت آنلاین برنامه و کاملاً اختیاری.
 *
 * در نسخه ۱، وقتی اینترنت نبود کارت روی داشبورد صفر نشان می‌داد و
 * پیام «اینترنت را روشن کنید» می‌داد. برای کاربر ایرانی که اکسراً
 * وضعیت اینترنت ناپایدار دارد، این یعنی یک نقص دائمی روی صفحه اول.
 * الان: اگر داده نباشد hasData=false می‌شود و کارت کاملاً مخفی می‌ماند.
 */

import { WeatherData } from '../types';
import { isFeatureEnabled } from '../config/appConfig';
import { readJson, writeJson } from './storage/persistence';
import { getCurrentLocation } from './locationService';

const CACHE_KEY = 'roza_weather_cache_v2';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export interface WeatherCoords { latitude: number; longitude: number; }

export interface WeatherSnapshot extends WeatherData {
  latitude?: number;
  longitude?: number;
}

export const EMPTY_WEATHER: WeatherSnapshot = {
  city: '',
  temp: 0,
  conditionFa: '',
  humidity: 0,
  uvIndex: 0,
  recommendationFa: '',
  hasData: false,
  isStale: false,
};

function conditionFromCode(code = -1, isNight = false): string {
  if (code === 0) return isNight ? 'آسمان صاف' : 'آفتابی';
  if ([1, 2].includes(code)) return 'کمی ابری';
  if (code === 3) return 'ابری';
  if ([45, 48].includes(code)) return 'مه‌آلود';
  if ([51, 53, 55, 56, 57].includes(code)) return 'نم‌نم باران';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'بارانی';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'برفی';
  if ([95, 96, 99].includes(code)) return 'رعدوبرق';
  return '';
}

function makeRecommendation(temp: number, humidity: number, uv: number, code: number, skinType?: string): string {
  if (uv >= 6) return 'تابش آفتاب بالاست؛ ضدآفتاب را تجدید کنید.';
  if (humidity > 0 && (humidity < 35 || skinType === 'dry')) return 'رطوبت هوا پایین است؛ مرطوب‌کننده را روی پوست نم‌دار بزنید.';
  if (code >= 51 && code <= 82) return 'هوا مرطوب است؛ بعد از بازگشت به خانه پوست را ملایم پاکسازی کنید.';
  if (temp >= 32) return 'هوا گرم است؛ در ساعات تابش شدید سایه را جدی بگیرید.';
  return '';
}

function readCache(): WeatherSnapshot | null {
  const cached = readJson<WeatherSnapshot | null>(CACHE_KEY, null);
  if (!cached) return null;
  const age = cached.updatedAt ? Date.now() - new Date(cached.updatedAt).getTime() : Infinity;
  return { ...cached, isStale: age > CACHE_TTL_MS };
}

/** آخرین آب‌وهوای کش‌شده، بدون درخواست شبکه — برای هشدار یووی در سرویس اعلان‌ها. */
export function getCachedWeather(): WeatherSnapshot | null {
  return readCache();
}

export async function fetchWeather(city: string, skinType?: string, coords?: WeatherCoords): Promise<WeatherSnapshot> {
  if (!isFeatureEnabled('weather')) return EMPTY_WEATHER;

  const cached = readCache();
  if (!city.trim() && !coords) return cached || EMPTY_WEATHER;
  if (cached && !cached.isStale && (!city || cached.city === city) && !coords) return cached;

  try {
    let place: { name: string; latitude: number; longitude: number } | undefined;
    if (coords) {
      place = { name: city || 'موقعیت شما', latitude: coords.latitude, longitude: coords.longitude };
    } else {
      const geoResponse = await fetch(
        `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=fa&format=json`,
      );
      if (!geoResponse.ok) throw new Error('geocoding_failed');
      const geo = (await geoResponse.json()) as { results?: { name: string; latitude: number; longitude: number }[] };
      place = geo.results?.[0];
    }
    if (!place) return cached || EMPTY_WEATHER;

    const query = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: 'temperature_2m,relative_humidity_2m,weather_code,is_day',
      daily: 'uv_index_max',
      timezone: 'auto',
    });
    const response = await fetch(`${FORECAST_URL}?${query}`);
    if (!response.ok) throw new Error('forecast_failed');

    const json = (await response.json()) as {
      current?: Record<string, number>;
      daily?: { uv_index_max?: number[] };
    };
    const current = json.current || {};
    const uv = Number(json.daily?.uv_index_max?.[0] || 0);
    const temp = Math.round(Number(current.temperature_2m || 0));
    const humidity = Math.round(Number(current.relative_humidity_2m || 0));
    const code = Number(current.weather_code);

    const snapshot: WeatherSnapshot = {
      city: place.name || city || 'موقعیت شما',
      temp,
      humidity,
      uvIndex: Math.round(uv * 10) / 10,
      conditionFa: conditionFromCode(code, Number(current.is_day) === 0),
      weatherCode: code,
      recommendationFa: makeRecommendation(temp, humidity, uv, code, skinType),
      updatedAt: new Date().toISOString(),
      latitude: place.latitude,
      longitude: place.longitude,
      isStale: false,
      hasData: true,
    };
    writeJson(CACHE_KEY, snapshot);
    return snapshot;
  } catch {
    return cached || EMPTY_WEATHER;
  }
}

/**
 * موقعیت برای آب‌وهوا — فقط برای تشخیص شهر لازم است، نه مسیریابی دقیق،
 * پس enableHighAccuracy لازم نیست (باتری کمتر مصرف می‌شود). درخواست
 * Permission، خواندن GPS و ذخیره‌سازی همه در locationService مرکزی
 * انجام می‌شود؛ این تابع فقط همان را برای شکل داده آب‌وهوا صدا می‌زند.
 */
export async function requestWeatherLocation(): Promise<WeatherCoords> {
  const location = await getCurrentLocation({ highAccuracy: false, timeoutMs: 12000 });
  return { latitude: location.latitude, longitude: location.longitude };
}

import React from 'react';
import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudOff,
  CloudRain,
  CloudSnow,
  Cloudy,
  Droplets,
  Loader2,
  MapPin,
  Moon,
  Sun,
  SunMedium,
} from 'lucide-react';
import { WeatherData } from '../../types';
import { toPersianDigits } from '../../services/jalali';

interface Props {
  weather: WeatherData;
  onRequestLocation?: () => void;
  locationLoading?: boolean;
  locationError?: boolean;
  /** پیام دقیق خطا از locationService؛ اگر نبود، متن عمومی نشان داده می‌شود. */
  locationErrorFa?: string | null;
}

/**
 * آیکون آب‌وهوا بر اساس weather_code سرویس Open-Meteo و شب/روز بودن انتخاب می‌شود؛
 * قبلاً یک آیکون ثابت (CloudSun) برای همه‌ی حالت‌ها (آفتابی/ابری/بارانی) نمایش داده می‌شد.
 */
function weatherVisual(code: number | undefined, isNight: boolean): { Icon: typeof Sun; iconClass: string; chipClass: string } {
  const c = code ?? -1;
  if (c === 0) {
    return isNight
      ? { Icon: Moon, iconClass: 'text-indigo-400', chipClass: 'from-indigo-100 to-slate-100 dark:from-indigo-950 dark:to-slate-900' }
      : { Icon: Sun, iconClass: 'text-amber-500', chipClass: 'from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-slate-900' };
  }
  if ([1, 2].includes(c)) {
    return isNight
      ? { Icon: CloudMoon, iconClass: 'text-indigo-400', chipClass: 'from-indigo-100 to-slate-100 dark:from-indigo-950 dark:to-slate-900' }
      : { Icon: SunMedium, iconClass: 'text-amber-400', chipClass: 'from-amber-100 to-sky-50 dark:from-amber-900/30 dark:to-slate-900' };
  }
  if (c === 3) return { Icon: Cloudy, iconClass: 'text-slate-400', chipClass: 'from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900' };
  if ([45, 48].includes(c)) return { Icon: CloudFog, iconClass: 'text-slate-400', chipClass: 'from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900' };
  if ([51, 53, 55, 56, 57].includes(c)) return { Icon: CloudDrizzle, iconClass: 'text-sky-500', chipClass: 'from-sky-100 to-slate-100 dark:from-sky-950 dark:to-slate-900' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return { Icon: CloudRain, iconClass: 'text-sky-600', chipClass: 'from-sky-100 to-blue-50 dark:from-sky-950 dark:to-slate-900' };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { Icon: CloudSnow, iconClass: 'text-sky-400', chipClass: 'from-sky-50 to-slate-100 dark:from-slate-800 dark:to-slate-900' };
  if ([95, 96, 99].includes(c)) return { Icon: CloudLightning, iconClass: 'text-amber-500', chipClass: 'from-amber-100 to-slate-100 dark:from-amber-900/30 dark:to-slate-900' };
  return isNight
    ? { Icon: CloudMoon, iconClass: 'text-indigo-400', chipClass: 'from-indigo-100 to-slate-100 dark:from-indigo-950 dark:to-slate-900' }
    : { Icon: SunMedium, iconClass: 'text-amber-400', chipClass: 'from-amber-100 to-sky-50 dark:from-amber-900/30 dark:to-slate-900' };
}

function uvCategory(uv: number): string {
  if (uv < 3) return 'کم';
  if (uv < 6) return 'متوسط';
  if (uv < 8) return 'زیاد';
  if (uv < 11) return 'خیلی‌زیاد';
  return 'حاد';
}

function humidityCategory(h: number): string {
  if (h < 30) return 'خشک';
  if (h < 60) return 'مطلوب';
  return 'مرطوب';
}

export const WeatherClimateCard: React.FC<Props> = ({ weather, onRequestLocation, locationLoading, locationError, locationErrorFa }) => {
  if (!weather.hasData) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-3">
          <CloudOff className="w-5 h-5 text-slate-400" />
          <div>
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">آب‌وهوای امروز</h3>
            <p className="text-xs text-slate-500 mt-1">برای پیشنهاد دقیق‌تر پوست، موقعیتت را یک‌بار فعال کن.</p>
          </div>
        </div>
        {onRequestLocation && (
          <button
            onClick={onRequestLocation}
            disabled={locationLoading}
            className="w-full py-3 rounded-2xl bg-[#eef3fa] dark:bg-slate-800 text-[#263b56] dark:text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {locationLoading ? 'در حال دریافت موقعیت...' : 'فعال‌کردن موقعیت دقیق'}
          </button>
        )}
        {/* پیام دقیق همان خطایی که واقعاً رخ داده — نه همیشه «اجازه داده نشد».
            GPS خاموش، Timeout و رد دائمی هرکدام راه‌حل متفاوتی دارند. */}
        {locationError && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
            {locationErrorFa || 'موقعیت در دسترس نیست؛ می‌توانی شهر را در پروفایل وارد کنی.'}
          </p>
        )}
      </div>
    );
  }

  // آیکون شب فقط برای «آسمان صاف» قابل تشخیص است چون weatherService فقط برای
  // کد ۰ (صاف) بین شب/روز فرق می‌گذارد؛ برای بقیه‌ی کدها آیکون روز نمایش داده می‌شود.
  const isNight = weather.conditionFa === 'آسمان صاف';
  const { Icon, iconClass, chipClass } = weatherVisual(weather.weatherCode, isNight);
  const uv = weather.uvIndex;
  const uvPercent = Math.min(100, Math.max(0, (uv / 12) * 100));
  const humidityPercent = Math.min(100, Math.max(0, weather.humidity));

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${chipClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${iconClass}`} strokeWidth={2.2} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white">{weather.city} · {toPersianDigits(weather.temp)} درجه</h3>
          <p className="text-xs text-slate-500">{weather.conditionFa}{weather.isStale ? ' · داده قدیمی' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* فرابنفش: نوار رنگی مثل شاخص کیفیت هوا، از سبز تا بنفش */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">فرابنفش</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <strong className="text-xl font-black text-slate-800 dark:text-white block">{toPersianDigits(uv)}</strong>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{uvCategory(uv)}</p>
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'linear-gradient(90deg,#22c55e,#eab308,#f97316,#ef4444,#a855f7)' }}>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-700 shadow"
              style={{ right: `calc(${uvPercent}% - 6px)` }}
            />
          </div>
        </div>

        {/* رطوبت: نوار آبی ساده مثل شاخص پوشش ابر */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">رطوبت</span>
            <Droplets className="w-4 h-4 text-sky-500" />
          </div>
          <strong className="text-xl font-black text-slate-800 dark:text-white block">{toPersianDigits(weather.humidity)}٪</strong>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{humidityCategory(weather.humidity)}</p>
          <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className="absolute inset-y-0 right-0 rounded-full bg-sky-400" style={{ width: `${humidityPercent}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-sky-500 shadow"
              style={{ right: `calc(${humidityPercent}% - 6px)` }}
            />
          </div>
        </div>
      </div>

      {weather.recommendationFa && (
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-7 flex items-start gap-2">
          <Droplets className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
          {weather.recommendationFa}
        </p>
      )}
    </div>
  );
};

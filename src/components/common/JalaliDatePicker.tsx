import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEK_HEADERS,
  buildJalaliMonthGrid,
  formatJalaliDate,
  getJalaliToday,
  getTodayIsoDate,
  gregorianToJalali,
  toPersianDigits,
} from '../../services/jalali';

interface JalaliDatePickerProps {
  /** تاریخ مقدار به شکل میلادی YYYY-MM-DD (ذخیره داخلی). */
  value: string;
  onChange: (isoDate: string) => void;
  labelFa?: string;
  /** اجازه انتخاب تاریخ آینده. برای ثبت پریود باید false باشد. */
  allowFuture?: boolean;
  allowPast?: boolean;
  /** اگر true باشد، تقویم بدون دکمه‌ی محرک، همیشه به‌شکل باز نمایش داده می‌شود. */
  inline?: boolean;
  /**
   * نسخه فشرده‌تر (سلول‌ها و فاصله‌ها کوچک‌تر) — برای جاهایی مثل مودال
   * «ویرایش پریود» که تقویم کنار چند نوار دیگر است و نباید صفحه را
   * اسکرول‌پذیر کند.
   */
  compact?: boolean;
}

/**
 * تاریخ‌گیر شمسی.
 *
 * مشکل نسخه ۱: همه ورودی‌ها <input type="date"> میلادی بودند در حالی که
 * همه نمایش‌ها شمسی. کاربر ایرانی تاریخ میلادی آخرین پریودش را نمی‌داند.
 */
export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  labelFa,
  allowFuture = true,
  allowPast = true,
  inline = false,
  compact = false,
}) => {
  const todayIso = getTodayIsoDate();
  const initial = value
    ? (() => {
        const [gy, gm, gd] = value.split('-').map((part) => parseInt(part, 10));
        return gregorianToJalali(gy, gm, gd);
      })()
    : getJalaliToday();

  const [isOpen, setIsOpen] = useState(inline);
  const [viewYear, setViewYear] = useState(initial.jy);
  const [viewMonth, setViewMonth] = useState(initial.jm);

  const goPrevious = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };

  const goNext = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  const cells = buildJalaliMonthGrid(viewYear, viewMonth);

  const isDisabled = (iso: string): boolean => {
    if (!allowFuture && iso > todayIso) return true;
    if (!allowPast && iso < todayIso) return true;
    return false;
  };

  /*
   * تقویم قبلاً absolute + top-full + right-0 بود و نسبت به دکمه‌ی محرک
   * جای می‌گرفت. وقتی این دکمه در یک ستون باریک بود (مثلاً کنار دکمه‌ی
   * «عکس جدید» در پیشرفت)، عرض ثابت ۱۹rem تقویم از لبه‌ی صفحه بیرون
   * می‌زد و باعث اسکرول افقی/به‌هم‌ریختن کل پنل می‌شد. الان (در حالت
   * غیر inline) تقویم به‌شکل یک مودال ثابت و وسط‌چین صفحه نمایش داده
   * می‌شود، مستقل از عرض یا موقعیت دکمه‌ی محرک، تا هیچ‌وقت از صفحه
   * بیرون نزند.
   */
  const calendarBody = (
    <>
      <div className={`flex items-center justify-between ${compact ? 'mb-0.5' : ''}`}>
        <button
          type="button"
          onClick={goNext}
          aria-label="ماه بعد"
          className={`icon-only flex items-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-700 ${compact ? 'p-1' : 'py-2 px-2.5'}`}
        >
          <ChevronLeft className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
          {!compact && <span className="text-xs font-bold">بعد</span>}
        </button>

        <span className={`font-black text-slate-800 dark:text-white ${compact ? 'text-[11px]' : 'text-sm'}`}>
          {PERSIAN_MONTH_NAMES[viewMonth - 1]} {toPersianDigits(viewYear)}
        </span>

        <button
          type="button"
          onClick={goPrevious}
          aria-label="ماه قبل"
          className={`icon-only flex items-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-700 ${compact ? 'p-1' : 'py-2 px-2.5'}`}
        >
          {!compact && <span className="text-xs font-bold">قبل</span>}
          <ChevronRight className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {PERSIAN_WEEK_HEADERS.map((day) => (
          <span key={day} className={`font-bold text-slate-400 ${compact ? 'text-[10px] py-0' : 'text-xs py-1'}`}>
            {day}
          </span>
        ))}

        {cells.map((cell, index) => {
          if (!cell.iso || cell.jd === null) return <span key={`blank-${index}`} />;
          const disabled = isDisabled(cell.iso);
          const isSelected = cell.iso === value;
          const isToday = cell.iso === todayIso;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(cell.iso as string);
                if (!inline) setIsOpen(false);
              }}
              className={`icon-only rounded-xl font-bold transition-all aspect-square ${compact ? 'text-xs rounded-lg' : 'text-sm'} ${
                isSelected
                  ? 'bg-rose-500 text-white'
                  : isToday
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300'
                    : disabled
                      ? 'text-slate-300 dark:text-slate-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {toPersianDigits(cell.jd)}
            </button>
          );
        })}
      </div>

      {allowPast && !inline && (
        <button
          type="button"
          onClick={() => {
            onChange(todayIso);
            setIsOpen(false);
          }}
          className="w-full py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold text-rose-600 dark:text-rose-400"
        >
          امروز
        </button>
      )}
    </>
  );

  return (
    <div className={inline ? 'space-y-2' : 'space-y-2'}>
      {labelFa && <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">{labelFa}</label>}

      {!inline && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between gap-2 text-right"
        >
          <span className={value ? '' : 'text-slate-400 font-normal'}>
            {value ? formatJalaliDate(value) : 'انتخاب تاریخ'}
          </span>
          <Calendar className="w-5 h-5 text-rose-500 shrink-0" />
        </button>
      )}

      {isOpen && inline && (
        <div
          className={`rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-700 shadow-lg ${compact ? 'p-2 space-y-1' : 'p-3 space-y-3'}`}
        >
          {calendarBody}
        </div>
      )}

      {isOpen && !inline && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[19rem] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-700 shadow-2xl space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            {calendarBody}
          </div>
        </div>
      )}
    </div>
  );
};

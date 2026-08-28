import React, { useMemo } from 'react';
import {
  BIRTH_YEAR_MIN,
  PERSIAN_MONTH_NAMES,
  gregorianToJalali,
  jalaliMonthLength,
  jalaliToGregorian,
  getBirthYearMax,
  getAgeFromBirthDate,
  toIsoDate,
  toPersianDigits,
} from '../../services/jalali';
import { PrettySelect } from './PrettySelect';

interface BirthDatePickerProps {
  /** تاریخ تولد به شکل میلادی YYYY-MM-DD (ذخیره داخلی)، یا رشته خالی. */
  value: string;
  onChange: (isoDate: string) => void;
  labelFa?: string;
}

/**
 * انتخاب‌گر تاریخ تولد شمسی با سه فهرست کشویی (روز، ماه، سال).
 *
 * چرا از JalaliDatePicker (تقویم ورق‌خور ماهانه) استفاده نشد: برای تاریخ
 * تولد باید بشود مثلاً از ۱۴۰۵ به ۱۳۷۰ رفت که با ورق‌زدن ماه‌به‌ماه چند ده
 * بار لمس لازم دارد. اینجا سال مستقیم از فهرست انتخاب می‌شود.
 * بازه سال‌ها ۱۳۵۰ تا سال جلالی جاری است.
 */
export const BirthDatePicker: React.FC<BirthDatePickerProps> = ({ value, onChange, labelFa = 'تاریخ تولد' }) => {
  const yearMax = getBirthYearMax();

  const parsed = useMemo(() => {
    if (!value) return null;
    const [gy, gm, gd] = value.split('-').map((part) => parseInt(part, 10));
    if (!gy || !gm || !gd) return null;
    return gregorianToJalali(gy, gm, gd);
  }, [value]);

  const jy = parsed?.jy ?? null;
  const jm = parsed?.jm ?? null;
  const jd = parsed?.jd ?? null;

  const yearOptions = useMemo(() => {
    const years: { value: string; label: string }[] = [];
    for (let year = yearMax; year >= BIRTH_YEAR_MIN; year -= 1) {
      years.push({ value: String(year), label: toPersianDigits(year) });
    }
    return years;
  }, [yearMax]);

  const monthOptions = useMemo(
    () => PERSIAN_MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name })),
    [],
  );

  const dayCount = jy && jm ? jalaliMonthLength(jy, jm) : 31;
  const dayOptions = useMemo(() => {
    const days: { value: string; label: string }[] = [];
    for (let day = 1; day <= dayCount; day += 1) days.push({ value: String(day), label: toPersianDigits(day) });
    return days;
  }, [dayCount]);

  const commitDate = (nextJy: number | null, nextJm: number | null, nextJd: number | null) => {
    if (!nextJy || !nextJm || !nextJd) return;
    const clampedDay = Math.min(nextJd, jalaliMonthLength(nextJy, nextJm));
    const { gy, gm, gd } = jalaliToGregorian(nextJy, nextJm, clampedDay);
    onChange(toIsoDate(new Date(gy, gm - 1, gd)));
  };

  const age = value ? getAgeFromBirthDate(value) : null;

  return (
    <div className="space-y-1.5">
      {labelFa && <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">{labelFa}</label>}
      <div className="grid grid-cols-3 gap-2">
        <PrettySelect
          value={jd ? String(jd) : ''}
          options={dayOptions}
          onChange={(next) => commitDate(jy, jm, parseInt(next, 10))}
          placeholder="روز"
        />
        <PrettySelect
          value={jm ? String(jm) : ''}
          options={monthOptions}
          onChange={(next) => commitDate(jy, parseInt(next, 10), jd || 1)}
          placeholder="ماه"
        />
        <PrettySelect
          value={jy ? String(jy) : ''}
          options={yearOptions}
          onChange={(next) => commitDate(parseInt(next, 10), jm || 1, jd || 1)}
          placeholder="سال"
        />
      </div>
      {age !== null && (
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">≈ {toPersianDigits(age)} سال</p>
      )}
    </div>
  );
};

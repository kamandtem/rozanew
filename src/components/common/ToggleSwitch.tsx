import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  labelFa?: string;
  ariaLabel?: string;
}

/**
 * سوئیچ روشن/خاموش — رَد (track) کشیده و مستطیلی گوشه‌گرد (Pill)،
 * خیلی کشیده‌تر از حالت معمول (۶۸×۲۹ پیکسل، همان نسبت طول به ارتفاع قبلی
 * یعنی تقریباً ۲.۴ به ۱ — فقط با مقیاس ۸۵٪ کوچک‌تر شده، تناسب دست‌نخورده)
 * و دسته‌ی نسبتاً کوچک (۲۵ پیکسل) داخل آن — دقیقاً مثل نمونه‌ی مرجع.
 * دسته داخل ردّ می‌ماند و از لبه‌ها بیرون نمی‌زند.
 *
 * رنگ‌ها (rose-500 روشن / slate خاموش) و انیمیشن (duration، easing،
 * فنری‌بودن حرکت دسته) دقیقاً از نسخه‌ی قبل حفظ شده‌اند — فقط اندازه و
 * تناسب شکل عوض شده.
 *
 * برای درست کار کردن در چیدمان راست‌به‌چپ از فاصله‌ی منطقی start
 * (نه چپ/راست فیزیکی) استفاده شده تا در حالت روشن، دسته به‌سمت پایان
 * (چپِ صفحه در RTL) برود.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled, labelFa, ariaLabel }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || labelFa}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 inline-block w-[68px] h-[29px] rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${
        checked ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-[25px] w-[25px] rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,.28)] ring-1 ring-black/[0.03] transition-[inset-inline-start] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? 'start-[41px]' : 'start-[2px]'
        }`}
      />
    </button>
  );
};

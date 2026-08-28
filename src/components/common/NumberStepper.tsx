import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { toPersianDigits } from '../../services/jalali';

interface NumberStepperProps {
  labelFa: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unitFa?: string;
  /** برای اعشار (مثل ساعت خواب: ۷.۵) تعداد رقم اعشار نمایش داده‌شده. */
  decimals?: number;
}

/**
 * ورودی عددی با دکمه‌ی +/‑ به‌جای <input type="number">.
 *
 * مشکل نسخه‌ی قبل: چون مقدار با «|| پیش‌فرض» محاسبه می‌شد، همین‌که کاربر
 * برای وارد کردن عدد جدید فیلد را خالی می‌کرد، فوراً به پیش‌فرض
 * برمی‌گشت — عملاً غیرقابل‌تغییر به‌نظر می‌رسید. اینجا کاربر فقط با
 * لمس + / − مقدار را عوض می‌کند، بدون تایپ و بدون این باگ.
 */
export const NumberStepper: React.FC<NumberStepperProps> = ({
  labelFa,
  value,
  onChange,
  min,
  max,
  step = 1,
  unitFa,
  decimals = 0,
}) => {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  const display = decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <div>
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">{labelFa}</label>
      <div className="flex items-center gap-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          className="icon-only w-8 h-8 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-200 disabled:opacity-30 active:scale-95 transition-transform shrink-0"
          aria-label={`کم کردن ${labelFa}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <span className="text-base font-black text-slate-800 dark:text-white">{toPersianDigits(display)}</span>
          {unitFa && <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">{unitFa}</span>}
        </div>

        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          className="icon-only w-8 h-8 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-200 disabled:opacity-30 active:scale-95 transition-transform shrink-0"
          aria-label={`زیاد کردن ${labelFa}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

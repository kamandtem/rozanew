import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface OptionSheetFieldProps<T extends string> {
  labelFa: string;
  value: T;
  options: { value: T; labelFa: string; hintFa?: string }[];
  onChange: (value: T) => void;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * فیلد انتخابی به‌شکل «کارتِ راهنما» + شیت پایین‌آمده، جایگزین <select> خام مرورگر.
 *
 * مشکل نسخه قبل: نوع پوست، نوع مو و استرس با <select> پیش‌فرض مرورگر
 * ساخته می‌شدند که روی موبایل بسیار خشک و ناهماهنگ با بقیه‌ی اپ دیده می‌شود.
 * اینجا با زدن روی فیلد، یک شیت پایین با کارت‌های بزرگ و قابل‌لمس باز
 * می‌شود؛ گزینه‌ی فعلی با تیک و رنگ مشخص می‌شود.
 */
export function OptionSheetField<T extends string>({ labelFa, value, options, onChange, icon: Icon }: OptionSheetFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <div>
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">{labelFa}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between gap-2 text-right"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-rose-500" />}
          {current?.labelFa || 'انتخاب کن'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-[#20334d]/35 flex items-end justify-center p-4" onClick={() => setOpen(false)}>
          <section
            className="w-full max-w-md rounded-[2rem] bg-white dark:bg-slate-900 p-5 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-[#263b56] dark:text-white">{labelFa}</h3>
              <button onClick={() => setOpen(false)} aria-label="بستن" className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`relative p-4 rounded-2xl border-2 text-sm font-bold text-center transition-colors ${
                      selected
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <span className="block">{option.labelFa}</span>
                    {option.hintFa && <span className="block mt-1 text-xs font-normal text-slate-500 dark:text-slate-400 leading-5">{option.hintFa}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

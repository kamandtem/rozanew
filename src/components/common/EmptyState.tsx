import React from 'react';
import { Sparkles } from 'lucide-react';
import { toPersianDigits } from '../../services/jalali';

interface EmptyStateProps {
  titleFa: string;
  descriptionFa?: string;
  /** پیشرفت به سمت داده کافی — به جای نمایش عدد جعلی. */
  progress?: { current: number; required: number; unitFa: string };
  actionLabelFa?: string;
  onAction?: () => void;
  icon?: React.ElementType;
}

/**
 * حالت خالی محترمانه.
 *
 * قاعده طلایی پروژه: اگر داده نیست، عدد نشان نمی‌دهیم. به جایش
 * می‌گوییم چند روز ثبت لازم است تا این بخش معنادار شود.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  titleFa,
  descriptionFa,
  progress,
  actionLabelFa,
  onAction,
  icon: Icon = Sparkles,
}) => {
  const percent = progress ? Math.min(100, Math.round((progress.current / Math.max(1, progress.required)) * 100)) : 0;

  return (
    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-dashed border-rose-200 dark:border-slate-700 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>

      <h4 className="font-black text-base text-slate-800 dark:text-white">{titleFa}</h4>

      {descriptionFa && (
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">{descriptionFa}</p>
      )}

      {progress && (
        <div className="space-y-1.5 max-w-xs mx-auto pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>
              {toPersianDigits(progress.current)} از {toPersianDigits(progress.required)} {progress.unitFa}
            </span>
            <span>{toPersianDigits(percent)}٪</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-l from-rose-400 to-amber-400 rounded-full" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {actionLabelFa && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold active:scale-95 transition-all"
        >
          {actionLabelFa}
        </button>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronDown } from 'lucide-react';
import { averageSkinScore, buildRecentDays, loggedDaysCount, routineAdherence } from '../../services/statsService';
import { formatJalaliDate, toPersianDigits } from '../../services/jalali';
import { EmptyState } from '../common/EmptyState';

interface Monthly30DayTrackerProps {
  onOpenProgress: () => void;
}

const MIN_DAYS = 5;

/**
 * روند ۳۰ روزه.
 *
 * بدترین بخش نسخه ۱: در کد نوشته شده بود «Simulate high adherence rate»
 * و مربع‌ها با فرمول «dayNum % 7 !== 0» ساخته می‌شدند. اعداد ۸۶٪،
 * ۶ روز متوالی و ۸.۵ از ۱۰ هم هاردکد بودند. کاربر بعد از یک هفته
 * می‌فهمید الکی است و به کل اپ بی‌اعتماد می‌شد.
 */
export const Monthly30DayTracker: React.FC<Monthly30DayTrackerProps> = ({ onOpenProgress }) => {
  // در پنل خانه به‌صورت آکاردئونی و بسته شروع می‌شود تا صفحه اول شلوغ نباشد؛
  // با یک لمس روی هدر باز می‌شود.
  const [open, setOpen] = useState(false);
  const days = buildRecentDays(30);
  const logged = loggedDaysCount(30);
  const adherence = routineAdherence(30);
  const skin = averageSkinScore(30);

  if (logged < MIN_DAYS) {
    return (
      <EmptyState
        icon={Calendar}
        titleFa="روند ۳۰ روزه‌ات"
        descriptionFa="وقتی چند روز روتین و حال پوستت را ثبت کنی، رزا روند واقعی را به‌ت نشان می‌دهد."
        progress={{ current: logged, required: MIN_DAYS, unitFa: 'روز ثبت' }}
        actionLabelFa="ثبت امروز"
        onAction={onOpenProgress}
      />
    );
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen((value) => !value)}
        className="w-full p-4 flex items-center justify-between gap-2"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-right">
            <h3 className="font-black text-sm text-slate-800 dark:text-white">روند ۳۰ روز اخیر</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {toPersianDigits(logged)} روز ثبت کرده‌ای
            </span>
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            {adherence.percent !== null && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">روزهای با روتین</span>
                <span className="text-base font-black text-emerald-900 dark:text-emerald-200">
                  {toPersianDigits(adherence.activeDays)} روز
                </span>
              </div>
            )}

            {/* امتیاز پوست فقط از ثبت خود کاربر و با حداقل ۳ نمونه */}
            {skin.average !== null ? (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">میانگین حال پوست</span>
                <span className="text-base font-black text-rose-900 dark:text-rose-200">
                  {toPersianDigits(skin.average)} از ۱۰
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">حال پوست</span>
                <span className="text-xs text-slate-500 dark:text-slate-500">هنوز امتیاز نداده‌ای</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>۳۰ روز اخیر</span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  روتین
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  فقط ثبت
                </span>
              </span>
            </div>

            <div className="grid grid-cols-10 gap-1">
              {days.map((day) => (
                <div
                  key={day.dateIso}
                  title={`${formatJalaliDate(day.dateIso)} — ${
                    day.hasRoutine ? 'روتین ثبت شده' : day.hasLog ? 'ثبت روزانه' : 'ثبت نشده'
                  }`}
                  className={`aspect-square rounded-lg ${
                    day.hasRoutine
                      ? 'bg-emerald-500'
                      : day.hasLog
                        ? 'bg-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={onOpenProgress}
            className="w-full text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5"
          >
            جزئیات کامل
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

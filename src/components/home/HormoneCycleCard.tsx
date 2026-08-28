import React from 'react';
import { Moon, ChevronLeft, AlertTriangle } from 'lucide-react';
import { MenstrualCycleConfig } from '../../types';
import { estimateOvulationDay, getTodayCycleState } from '../../services/cycle/cycleService';
import { PHASE_GUIDE } from '../../services/cycle/phaseGuide';
import { toPersianDigits } from '../../services/jalali';
import { RED, ORANGE, TEAL, TRACK, NAVY, point, arcPath, rangeToAngles } from '../cycle/CycleWheel';

interface HormoneCycleCardProps {
  cycleConfig: MenstrualCycleConfig;
  onOpenCycle: () => void;
  compact?: boolean;
}

/**
 * متن فاز از منبع واحد phaseGuide می‌آید.
 *
 * قبلاً همین فایل یک جدول هاردکد جدا (PHASE_INFO) داشت، CycleDashboard یکی
 * دیگر و recommendationEngine متن inline خودش را؛ سه کارت می‌توانستند سه
 * حرف متفاوت بزنند. این نام مستعار فقط برای خوانایی JSX پایین‌تر است.
 */
const PHASE_INFO = PHASE_GUIDE;

interface MiniCycleWheelProps {
  day: number;
  cycleLength: number;
  periodLength: number;
  pmsStartDaysBefore: number;
  onClick: () => void;
}

const TOP_GAP_DEG = 8;

/**
 * نسخه‌ی کوچکِ همان چرخه‌ی پنل چرخه (CycleWheel) — همان حلقه‌ی اصلی و
 * همان رنگ‌بندی، فقط در اندازه‌ی مینیاتوری و بدون تعامل. برخلاف پنل
 * کامل، حلقه‌ی بیرونیِ فولیکولار/لوتئال اینجا نمایش داده نمی‌شود — کارت
 * خانه فقط باید وضعیت کلی (پریود/تخمک‌گذاری/PMS) را نشان بدهد، نه جزئیات
 * فازهای فرعی. جزئیات (متن وسط، راهنما، ویرایش پریود، نقطه‌ی هر روز) هم
 * عمداً حذف شده چون فقط در پنل کامل لازم است. خودِ چرخه یک لینک به همان
 * پنل است.
 */
const MiniCycleWheel: React.FC<MiniCycleWheelProps> = ({
  day,
  cycleLength,
  periodLength,
  pmsStartDaysBefore,
  onClick,
}) => {
  const CENTER = 60;
  const INNER_R = 40;
  const INNER_W = 8;
  const BADGE_R = 10;

  const days = Math.max(21, Math.min(45, cycleLength || 28));
  const period = Math.max(1, Math.min(periodLength || 5, days));
  const pmsDays = Math.max(0, Math.min(days - period, pmsStartDaysBefore ?? 5));
  const ovulationDay = Math.min(days, estimateOvulationDay(days, period));
  const today = Math.max(1, Math.min(day, days));

  const menstrualRange = { start: 1, end: period };
  const ovulationRange = { start: Math.max(period + 1, ovulationDay - 1), end: Math.min(days, ovulationDay + 1) };
  const pmsRange = pmsDays > 0 ? { start: Math.max(ovulationRange.end + 1, days - pmsDays + 1), end: days } : null;

  const todayPoint = point(((today - 0.5) / days) * 360, INNER_R, CENTER);

  const menstrualAngles = rangeToAngles(menstrualRange.start, menstrualRange.end, days);
  const ovulationAngles = rangeToAngles(ovulationRange.start, ovulationRange.end, days);

  return (
    <button onClick={onClick} aria-label="مشاهده وضعیت چرخه" className="relative shrink-0" style={{ width: 120, height: 120 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" className="overflow-visible">
        {/* حلقه اصلی: پس‌زمینه */}
        <path
          d={arcPath(TOP_GAP_DEG / 2, 360 - TOP_GAP_DEG / 2, INNER_R, CENTER)}
          fill="none"
          stroke={TRACK}
          strokeWidth={INNER_W}
          strokeLinecap="round"
        />

        {/* پریود */}
        <path d={arcPath(menstrualAngles.from, menstrualAngles.to, INNER_R, CENTER)} fill="none" stroke={RED} strokeWidth={INNER_W} strokeLinecap="round" />
        {/* تخمک‌گذاری */}
        <path d={arcPath(ovulationAngles.from, ovulationAngles.to, INNER_R, CENTER)} fill="none" stroke={TEAL} strokeWidth={INNER_W} strokeLinecap="round" />
        {/* PMS */}
        {pmsRange &&
          (() => {
            const pmsAngles = rangeToAngles(pmsRange.start, pmsRange.end, days);
            return <path d={arcPath(pmsAngles.from, pmsAngles.to, INNER_R, CENTER)} fill="none" stroke={ORANGE} strokeWidth={INNER_W} strokeLinecap="round" />;
          })()}

        {/* نشان شناور روز جاری — کوچک‌تر از قبل، تا روی چرخه‌ی مینیاتوری کارت خانه بزرگ ننماید */}
        <circle cx={todayPoint.x} cy={todayPoint.y} r={BADGE_R} fill="#fffdfa" stroke={RED} strokeWidth={2} />
        <text x={todayPoint.x} y={todayPoint.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill={NAVY}>
          {toPersianDigits(today)}
        </text>
      </svg>
    </button>
  );
};

/**
 * کارت چرخه.
 *
 * دو مشکل نسخه ۱ حل شد:
 *  ۱) روز چرخه از فیلدی به نام cycleDayCount خوانده می‌شد که اصلاً وجود
 *     نداشت، پس همیشه عدد جانشین ۱۴ نمایش داده می‌شد.
 *  ۲) «سطح تخمینی هورمون‌ها: استروژن ۶۵٪». این اعداد از هیچ داده‌ای
 *     نمی‌آمدند. نمایش درصد هورمون بدن کاربر هم گمراه‌کننده است و هم
 *     ریسک حقوقی. جایش توصیف کیفی و قابل استفاده آمد.
 */
export const HormoneCycleCard: React.FC<HormoneCycleCardProps> = ({ cycleConfig, onOpenCycle, compact = false }) => {
  const state = getTodayCycleState(cycleConfig);

  if (!state.available || !state.phase || state.cycleDay === null) {
    return (
      <button
        onClick={onOpenCycle}
        className="w-full p-4 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-purple-200 dark:border-slate-700 text-right flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-black text-slate-800 dark:text-white">چرخه ماهانه</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              برای شروع، روز اول آخرین پریودت را ثبت کن
            </span>
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
    );
  }

  const info = PHASE_INFO[state.phase];

  return (
    <div className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3 ${compact ? 'max-h-[320px] overflow-hidden' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        {/* ستون نوشته‌ها: عنوان + فاز، هر دو هم‌عرضِ همین ستون */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-slate-800 dark:text-white">چرخه ماهانه</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                روز {toPersianDigits(state.cycleDay)} از حدود {toPersianDigits(state.cycleLength)}
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${info.color} space-y-1`}>
            <span className="text-sm font-black block">{info.cardTitleFa}</span>
            <p className="text-xs leading-relaxed opacity-90">{info.skinFa}</p>
          </div>
        </div>

        {/* ستون کنار: پیش‌نمایش کوچکِ چرخه — خودش لینک به پنل چرخه است */}
        <MiniCycleWheel
          day={state.cycleDay}
          cycleLength={state.cycleLength}
          periodLength={cycleConfig.periodLength}
          pmsStartDaysBefore={cycleConfig.pmsStartDaysBefore}
          onClick={onOpenCycle}
        />
      </div>

      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
        <span className="text-xs font-black text-slate-800 dark:text-white block">امروز چه کار کنیم</span>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{info.actionFa}</p>
      </div>

      {state.inPmsWindow && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            احتمالاً در بازه پیش از قاعدگی هستی. این یک برآورد بر اساس ثبت‌های خودت است، نه تشخیص پزشکی.
          </p>
        </div>
      )}
    </div>
  );
};

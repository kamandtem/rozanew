import React from 'react';
import { MenstrualPhase } from '../../types';
import { addDays, formatWeekdayDayMonth, toPersianDigits } from '../../services/jalali';
import { estimateOvulationDay, getPhaseForCycleDay } from '../../services/cycle/cycleService';

interface CycleWheelProps {
  /** روز جاری چرخه (بر مبنای امروز واقعی)، بین ۱ تا cycleLength. */
  currentDay: number;
  /** روزی که کاربر برای مرور روی دایره انتخاب کرده؛ پیش‌فرض همان امروز است. */
  selectedDay?: number;
  /** طول کل چرخه — تعداد نقطه‌های هر دو حلقه از همین عدد می‌آید. */
  cycleLength: number;
  periodLength: number;
  pmsStartDaysBefore: number;
  /** تاریخ میلادیِ «امروز»؛ برای محاسبه تاریخ واقعیِ روز انتخاب‌شده. */
  todayIso: string;
  onSelectDay?: (day: number) => void;
  onSelectPhase?: (phase: MenstrualPhase) => void;
  onEditPeriod?: () => void;
}

export const RED = '#f0445b';
export const ORANGE = '#f5a623';
export const TEAL = '#20b7b0';
export const PINK = '#f472b6';
export const PURPLE = '#a78bfa';
export const TRACK = '#eeeeef';
export const NAVY = '#263b56';

const ORDINALS_FA = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];

/* --- هندسه --- */
const CENTER = 170;
const INNER_R = 120; // شعاع حلقه اصلی (پریود/تخمک‌گذاری/PMS)
const INNER_W = 16; // پهنای حلقه اصلی — نسبت به شعاع، مطابق طرح مرجع (نازک‌تر از نسخه قبل)
const OUTER_R = 156; // شعاع حلقه بیرونی نازک (فولیکولار/لوتئال) — فاصله بیشتر از حلقه اصلی
const OUTER_W = 3;
const TOP_GAP_DEG = 20; // شکاف بالای حلقه اصلی — سر و ته چرخه به‌وضوح به هم نچسبیده
const OUTER_GAP_DEG = 12; // شکاف حلقه بیرونی در هر دو قطب، تا شبیه دو پرانتز شود
const BADGE_R = 19; // شعاع نشان شناور روز — کوچک‌تر و متناسب با اندازه چرخه

/** هندسه‌ی مشترک با نسخه‌ی کوچکِ کارت خانه (MiniCycleWheel) — همین ثابت‌ها آنجا هم استفاده می‌شوند. */
export const CYCLE_GEOMETRY = { TOP_GAP_DEG, OUTER_GAP_DEG };

export function point(angle: number, radius: number, center = CENTER) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
}

export function arcPath(startAngle: number, endAngle: number, radius: number, center = CENTER) {
  const a = point(startAngle, radius, center);
  const b = point(endAngle, radius, center);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * بازه [start,end] یک روز به زاویه [شروع,پایان] با یک درجه فاصله از همسایه‌ها.
 * gapDeg یعنی شکاف بالای دایره (بین آخرین و اولین روز) از فضای ۳۶۰ درجه کم می‌شود
 * تا روزها هم واقعاً در همان شکاف قرار نگیرند، نه فقط پس‌زمینه‌ی خاکستری.
 */
export function rangeToAngles(start: number, end: number, days: number, gapDeg = 0) {
  const usable = 360 - gapDeg;
  const from = gapDeg / 2 + ((start - 1) / days) * usable + 1;
  const to = gapDeg / 2 + (end / days) * usable - 1;
  return { from, to: Math.max(from + 1, to) };
}

/** زاویه‌ی مرکز یک روز مشخص، با در نظر گرفتن شکاف بالای دایره. */
function dayCenterAngle(day: number, days: number, gapDeg: number) {
  return gapDeg / 2 + ((day - 0.5) / days) * (360 - gapDeg);
}

/** موقعیت و زاویه‌ی چرخش یک فلش کوچک، مماس بر دایره در زاویه‌ی داده‌شده (جهت حرکت ساعت‌گرد). */
function arrowAt(angle: number, radius: number, center = CENTER) {
  const tip = point(angle, radius, center);
  const behind = point(angle - 1, radius, center);
  const rotationDeg = (Math.atan2(tip.y - behind.y, tip.x - behind.x) * 180) / Math.PI;
  return { x: tip.x, y: tip.y, rotationDeg };
}

/** شکستن متن فارسی به حداکثر دو خط، تا از حاشیه‌ی دایره بیرون نزند. */
function wrapHeadline(text: string, maxChars = 15): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

/**
 * دایره چرخه ماهانه.
 *
 * دو حلقه دارد:
 *  - حلقه اصلی: روزهای پریود (قرمز)، بازه PMS درست پیش از پریود بعدی (نارنجی)
 *    و بازه تخمک‌گذاری (فیروزه‌ای) روی یک زمینه‌ی خاکستری. سر و ته آن به‌هم
 *    وصل نیست — یک شکاف کوچک بالای دایره دارد. بقیه‌ی روزها فقط نقطه‌اند.
 *  - حلقه بیرونی: خطی نازک به شعاعی بزرگ‌تر، نه یک دایره‌ی کامل بلکه دو
 *    کمان جدا (شبیه دو پرانتز) — نیمه‌ی فولیکولار (صورتی) و نیمه‌ی لوتئال
 *    (بنفش)، با شکاف در هر دو قطب.
 * تعداد روزهای هر دو حلقه با طول چرخه (۲۸/۳۰/۳۲...) عوض می‌شود.
 */
export const CycleWheel: React.FC<CycleWheelProps> = ({
  currentDay,
  selectedDay,
  cycleLength,
  periodLength,
  pmsStartDaysBefore,
  todayIso,
  onSelectDay,
  onSelectPhase,
  onEditPeriod,
}) => {
  const days = Math.max(21, Math.min(45, cycleLength || 28));
  const period = Math.max(1, Math.min(periodLength || 5, days));
  const pmsDays = Math.max(0, Math.min(days - period, pmsStartDaysBefore ?? 5));
  const ovulationDay = Math.min(days, estimateOvulationDay(days, period));
  const today = Math.max(1, Math.min(currentDay, days));
  const selected = Math.max(1, Math.min(selectedDay ?? today, days));
  const selectedIso = addDays(todayIso, selected - today);

  /* حلقه اصلی: پریود / تخمک‌گذاری / PMS */
  const menstrualRange = { start: 1, end: period };
  const ovulationRange = { start: Math.max(period + 1, ovulationDay - 1), end: Math.min(days, ovulationDay + 1) };
  const pmsRange = pmsDays > 0 ? { start: Math.max(ovulationRange.end + 1, days - pmsDays + 1), end: days } : null;

  const selectedPoint = point(dayCenterAngle(selected, days, TOP_GAP_DEG), INNER_R);

  const selectDay = (day: number) => {
    onSelectDay?.(day);
    onSelectPhase?.(getPhaseForCycleDay(day, days, period, ovulationDay));
  };

  /* متن وسط دایره */
  let headline: string;
  if (selected <= period) {
    const remaining = period - selected;
    if (remaining === 1) headline = 'یک روز مانده به پایان پریود';
    else if (remaining === 0) headline = 'امروز آخرین روز پریود است';
    else headline = `روز ${ORDINALS_FA[selected - 1] || toPersianDigits(selected)} پریود`;
  } else if (selected >= ovulationRange.start && selected <= ovulationRange.end) {
    headline = 'احتمال تخمک‌گذاری در این بازه';
  } else {
    headline = `${toPersianDigits(days - selected + 1)} روز تا پریود بعدی`;
  }
  const headlineLines = wrapHeadline(headline);
  const headlineStartY = headlineLines.length > 1 ? CENTER - 6 : CENTER + 4;

  /* زاویه‌ی قطب چرخه‌گذاری (برای شکاف پایینی حلقه بیرونی) — هم‌مقیاس با نگاشت روزهای حلقه اصلی */
  const ovAngle = TOP_GAP_DEG / 2 + (ovulationDay / days) * (360 - TOP_GAP_DEG);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[300px] aspect-square">
        <svg viewBox="0 0 340 340" className="w-full h-full overflow-visible">
          {/* حلقه بیرونی: دو کمان جدا شبیه دو پرانتز — فولیکولار (صورتی) و لوتئال (بنفش) */}
          {(() => {
            const gap = OUTER_GAP_DEG / 2;
            const topStart = TOP_GAP_DEG / 2 + gap;
            const topEnd = 360 - TOP_GAP_DEG / 2 - gap;
            const pinkFrom = topStart;
            const pinkTo = Math.max(pinkFrom + 1, ovAngle - gap);
            const purpleFrom = Math.min(topEnd - 1, ovAngle + gap);
            const purpleTo = topEnd;
            return (
              <>
                <path d={arcPath(pinkFrom, pinkTo, OUTER_R)} fill="none" stroke={PINK} strokeWidth={OUTER_W} strokeLinecap="round" />
                <path d={arcPath(purpleFrom, purpleTo, OUTER_R)} fill="none" stroke={PURPLE} strokeWidth={OUTER_W} strokeLinecap="round" />
              </>
            );
          })()}

          {/* حلقه اصلی: پس‌زمینه — سر و ته وصل نیست */}
          <path d={arcPath(TOP_GAP_DEG / 2, 360 - TOP_GAP_DEG / 2, INNER_R)} fill="none" stroke={TRACK} strokeWidth={INNER_W} strokeLinecap="round" />

          {/* بازه‌های رنگی حلقه اصلی */}
          {(() => {
            const { from, to } = rangeToAngles(menstrualRange.start, menstrualRange.end, days, TOP_GAP_DEG);
            return <path d={arcPath(from, to, INNER_R)} fill="none" stroke={RED} strokeWidth={INNER_W} strokeLinecap="round" />;
          })()}
          {(() => {
            const { from, to } = rangeToAngles(ovulationRange.start, ovulationRange.end, days, TOP_GAP_DEG);
            return <path d={arcPath(from, to, INNER_R)} fill="none" stroke={TEAL} strokeWidth={INNER_W} strokeLinecap="round" />;
          })()}
          {pmsRange && (() => {
            const { from, to } = rangeToAngles(pmsRange.start, pmsRange.end, days, TOP_GAP_DEG);
            // فلش دقیقاً روی نوک کمان (انتهای بازه PMS، قبل از شکاف بالای دایره) می‌نشیند —
            // نه چند درجه قبل‌تر — تا مثل نمونه طرح، دقیقاً سر چرخه باشد.
            const arrow = arrowAt(Math.max(from + 1, to), INNER_R);
            return (
              <>
                <path d={arcPath(from, to, INNER_R)} fill="none" stroke={ORANGE} strokeWidth={INNER_W} strokeLinecap="round" />
                <g transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.rotationDeg})`}>
                  <path d="M -5 -6 L 6 0 L -5 6" fill="none" stroke="#fffdfa" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </>
            );
          })()}

          {/* نقطه‌های قابل‌کلیک هر روز */}
          {Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const dot = point(dayCenterAngle(day, days, TOP_GAP_DEG), INNER_R);
            const isToday = day === today;
            return (
              <circle
                key={day}
                cx={dot.x}
                cy={dot.y}
                r={isToday ? 4.2 : 2.4}
                fill="#fffdfa"
                stroke={isToday ? '#fffdfa' : '#d4d4d8'}
                strokeWidth={isToday ? 2.5 : 1}
                className="cursor-pointer"
                onClick={() => selectDay(day)}
              />
            );
          })}

          {/* برچسب شروع/پایان چرخه، بالای دایره، هم‌رنگ با بازه‌های خودشان */}
          {(() => {
            const startLabel = point(5, INNER_R + 26);
            const endLabel = point(-5, INNER_R + 26);
            return (
              <>
                <text x={startLabel.x} y={startLabel.y} textAnchor="middle" fontSize="14" fontWeight="800" className="fill-[#f0445b]">
                  {toPersianDigits(1)}
                </text>
                <text x={endLabel.x} y={endLabel.y} textAnchor="middle" fontSize="14" fontWeight="800" className="fill-[#f5a623]">
                  {toPersianDigits(days)}
                </text>
              </>
            );
          })()}

          {/* متن وسط */}
          <text x={CENTER} y={CENTER - 34} textAnchor="middle" className="fill-slate-500" fontSize="11">
            {formatWeekdayDayMonth(selectedIso)}
          </text>
          <text x={CENTER} y={headlineStartY} textAnchor="middle" className="fill-[#263b56] dark:fill-white" fontSize="16" fontWeight="800">
            {headlineLines.map((line, index) => (
              <tspan key={index} x={CENTER} dy={index === 0 ? 0 : 20}>
                {line}
              </tspan>
            ))}
          </text>

          {/* نشان شناور روز — درون خود SVG تا با اندازه‌ی چرخه هم‌مقیاس بماند */}
          <g className="pointer-events-none">
            <circle cx={selectedPoint.x} cy={selectedPoint.y} r={BADGE_R} fill="#fffdfa" stroke={RED} strokeWidth={3} />
            <text x={selectedPoint.x} y={selectedPoint.y - 4} textAnchor="middle" fontSize="7.5" className="fill-slate-500">
              روز
            </text>
            <text x={selectedPoint.x} y={selectedPoint.y + 12} textAnchor="middle" fontSize="13" fontWeight="800" fill={NAVY}>
              {toPersianDigits(selected)}
            </text>
          </g>
        </svg>

        {onEditPeriod && (
          <button
            onClick={onEditPeriod}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[30px] pointer-events-auto rounded-full border border-purple-300 bg-[#fffdfa] dark:bg-slate-900 px-5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm"
          >
            ویرایش پریود
          </button>
        )}
      </div>

      {/* راهنمای رنگ‌ها */}
      <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: RED }}>
            i
          </span>
          پریود
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: TEAL }}>
            i
          </span>
          تخمک‌گذاری
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: ORANGE }}>
            i
          </span>
          PMS
        </span>
      </div>

      <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PINK }} />
          فولیکولار
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PURPLE }} />
          لوتئال
        </span>
      </div>
    </div>
  );
};

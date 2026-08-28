/**
 * آمار واقعی.
 *
 * قاعده طلایی این فایل: اگر داده نیست، null برمی‌گردد. هرگز عدد
 * مفروض نمی‌سازد. نسخه ۱ پر از ۸۶٪ و ۸.۵ از ۱۰ و ۹۲٪ هاردکد بود.
 */

import { DailyTrackerEntry } from '../types';
import { LocalDB } from './db';
import { addDays, getTodayIsoDate } from './jalali';
import { hasRoutineActivity } from './routineService';

export interface DayCell {
  dateIso: string;
  hasRoutine: boolean;
  hasLog: boolean;
  skinScore: number | null;
}

/** پنجره N روز اخیر با داده واقعی. تاریخ‌ها محلی‌اند، نه UTC. */
export function buildRecentDays(days = 30, todayIso: string = getTodayIsoDate()): DayCell[] {
  const logs = LocalDB.getDailyLogs();
  const cells: DayCell[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dateIso = addDays(todayIso, -offset);
    const log = logs.find((item) => item.date === dateIso);
    cells.push({
      dateIso,
      hasRoutine: hasRoutineActivity(dateIso),
      hasLog: Boolean(log),
      skinScore: log && log.skinStatusScore > 0 ? log.skinStatusScore : null,
    });
  }
  return cells;
}

export interface HabitStat {
  key: string;
  labelFa: string;
  /** درصد پایبندی. null = داده کافی نیست. */
  percent: number | null;
  loggedDays: number;
  windowDays: number;
}

const MIN_DAYS_FOR_STATS = 5;

export function buildHabitStats(days = 30): HabitStat[] {
  const cells = buildRecentDays(days);
  const logs = LocalDB.getDailyLogs();
  const window = cells.map((cell) => logs.find((log) => log.date === cell.dateIso)).filter(Boolean) as DailyTrackerEntry[];

  const build = (key: string, labelFa: string, predicate: (log: DailyTrackerEntry) => boolean): HabitStat => {
    const relevant = window.filter((log) => log.waterGlasses > 0 || log.sleepHours > 0 || log.usedSunscreen || log.skinStatusScore > 0);
    if (relevant.length < MIN_DAYS_FOR_STATS) {
      return { key, labelFa, percent: null, loggedDays: relevant.length, windowDays: days };
    }
    const hits = relevant.filter(predicate).length;
    return {
      key,
      labelFa,
      percent: Math.round((hits / relevant.length) * 100),
      loggedDays: relevant.length,
      windowDays: days,
    };
  };

  const target = LocalDB.getUserState().lifestyle;

  return [
    build('water', 'رسیدن به هدف نوشیدن آب', (log) => log.waterGlasses >= (target.waterTargetGlasses || 8)),
    build('sleep', 'رسیدن به هدف خواب', (log) => log.sleepHours >= (target.sleepTargetHours || 7)),
    build('sunscreen', 'استفاده از ضدآفتاب', (log) => log.usedSunscreen),
  ];
}

/** درصد روزهایی که روتین داشته‌اند. null = داده کافی نیست. */
export function routineAdherence(days = 30): { percent: number | null; activeDays: number } {
  const cells = buildRecentDays(days);
  const activeDays = cells.filter((cell) => cell.hasRoutine).length;
  if (activeDays === 0) return { percent: null, activeDays: 0 };
  return { percent: Math.round((activeDays / days) * 100), activeDays };
}

/** میانگین امتیاز پوست که خود کاربر ثبت کرده. null = ثبت نکرده. */
export function averageSkinScore(days = 30): { average: number | null; samples: number } {
  const scores = buildRecentDays(days)
    .map((cell) => cell.skinScore)
    .filter((score): score is number => score !== null);
  if (scores.length < 3) return { average: null, samples: scores.length };
  const sum = scores.reduce((total, score) => total + score, 0);
  return { average: Math.round((sum / scores.length) * 10) / 10, samples: scores.length };
}

/** تعداد روزهای ثبت‌شده برای نمایش در حالت خالی. */
export function loggedDaysCount(days = 30): number {
  return buildRecentDays(days).filter((cell) => cell.hasLog || cell.hasRoutine).length;
}

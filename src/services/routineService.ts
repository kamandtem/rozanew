/**
 * روتین روزانه — ذخیره‌سازی واقعی.
 *
 * در نسخه ۱، تیک مراحل روتین فقط در useState می‌ماند و با بستن اپ
 * پاک می‌شد. یعنی مهم‌ترین کار روزانه کاربر هیچ اثری نداشت.
 */

import { Routine, RoutineStep, RoutineType } from '../types';
import { LocalDB, createId } from './db';
import { addDays, getDaysDifference, getTodayIsoDate } from './jalali';

/**
 * روتین ذخیره‌شده را با قالب تولیدشده امروز ترکیب می‌کند.
 * محتوای گام‌ها از قالب تازه می‌آید (چون ممکن است پرهیز نوبت یا فاز
 * چرخه عوض شده باشد) ولی تیک‌های کاربر حفظ می‌شوند.
 */
export function loadRoutine(date: string, type: RoutineType, template: RoutineStep[]): Routine {
  const saved = LocalDB.getRoutine(date, type);
  const completedIds = new Set((saved?.steps || []).filter((step) => step.completed).map((step) => step.id));
  const customSteps = (saved?.steps || []).filter((step) => step.isCustom);

  const steps = [
    ...template.map((step) => ({ ...step, completed: completedIds.has(step.id) })),
    ...customSteps.map((step) => ({ ...step, completed: completedIds.has(step.id) })),
  ];

  return {
    id: saved?.id || createId('routine'),
    date,
    type,
    steps,
    completedAt: saved?.completedAt,
    updatedAt: saved?.updatedAt || new Date().toISOString(),
  };
}

export function toggleStep(routine: Routine, stepId: string): Routine {
  const steps = routine.steps.map((step) =>
    step.id === stepId ? { ...step, completed: !step.completed } : step,
  );
  const allDone = steps.length > 0 && steps.every((step) => step.completed);
  const updated: Routine = {
    ...routine,
    steps,
    completedAt: allDone ? new Date().toISOString() : undefined,
  };
  LocalDB.saveRoutine(updated);
  return updated;
}

export function addCustomStep(routine: Routine, step: Omit<RoutineStep, 'id' | 'isCustom'>): Routine {
  const updated: Routine = {
    ...routine,
    steps: [...routine.steps, { ...step, id: createId('step'), isCustom: true }],
  };
  LocalDB.saveRoutine(updated);
  return updated;
}

export function removeStep(routine: Routine, stepId: string): Routine {
  const updated: Routine = { ...routine, steps: routine.steps.filter((step) => step.id !== stepId) };
  LocalDB.saveRoutine(updated);
  return updated;
}

/** روتین یک روز کامل شده باشد (هم صبح هم شب حداقل یک تیک). */
export function hasRoutineActivity(date: string): boolean {
  return LocalDB.getRoutines().some(
    (routine) => routine.date === date && routine.steps.some((step) => step.completed),
  );
}

/**
 * محاسبه واقعی زنجیره روزهای متوالی.
 * در نسخه ۱ این عدد همیشه max(streak, 1) بود، یعنی همیشه ۱.
 */
export function computeStreak(todayIso: string = getTodayIsoDate()): { current: number; best: number } {
  const activeDates = new Set<string>();
  LocalDB.getRoutines().forEach((routine) => {
    if (routine.steps.some((step) => step.completed)) activeDates.add(routine.date);
  });
  LocalDB.getDailyLogs().forEach((log) => {
    if (log.waterGlasses > 0 || log.sleepHours > 0 || log.skinStatusScore > 0) activeDates.add(log.date);
  });

  if (activeDates.size === 0) return { current: 0, best: 0 };

  // زنجیره جاری: از امروز عقب می‌رویم. اگر امروز هنوز ثبت نشده،
  // از دیروز شروع می‌کنیم تا زنجیره الكی نشکند.
  let cursor = activeDates.has(todayIso) ? todayIso : addDays(todayIso, -1);
  let current = 0;
  while (activeDates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = Array.from(activeDates).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  sorted.forEach((date) => {
    if (previous && getDaysDifference(previous, date) === 1) run += 1;
    else run = 1;
    best = Math.max(best, run);
    previous = date;
  });

  return { current, best: Math.max(best, current) };
}

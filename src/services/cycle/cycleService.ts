/**
 * موتور چرخه.
 *
 * تفاوت بنیادین با نسخه ۱:
 *  - منبع حقیقت تاریخچه پریودهاست، نه یک تاریخ دستی.
 *  - پیش‌بینی تطبیقی است: میانه ۶ چرخه آخر.
 *  - هر پیش‌بینی سطح اطمینان دارد و برای چرخه نامنظم بازه می‌دهد نه روز دقیق.
 *  - «الگوی شخصی» از علائم خود کاربر ساخته می‌شود، نه از متن عمومی مقالات.
 *
 * هیچ عددی در این فایل ساختگی نیست. اگر داده نباشد، خروجی null است.
 */

import { CycleSymptom, MenstrualCycleConfig, MenstrualPhase, PeriodLog, SymptomKey } from '../../types';
import { addDays, getDaysDifference, getTodayIsoDate } from '../jalali';
import { LocalDB, createId } from '../db';
import { PHASE_GUIDE, phaseInsightFa } from './phaseGuide';

/**
 * منبع واحد توصیه ترکیبات هر فاز چرخه — که حالا واقعاً واحد است.
 *
 * محتوای متنی و شناسه‌ها همه در phaseGuide.ts زندگی می‌کنند و کارت چرخه،
 * کارت خانه و موتور توصیه هر سه از همان می‌خوانند. این ثابت فقط یک نمای
 * مشتق‌شده است تا import های موجود نشکنند.
 *
 * تغییر معنایی مهم: avoidIds حذف شد. برای هر چهار فاز خالی بود، یعنی آن
 * مکانیزم مرده بود و بخش پرهیزِ کارت چرخه فقط از متن هاردکد تغذیه می‌شد.
 * جایش cautionIds آمده که واقعاً مصرف می‌شود.
 */
export const PHASE_INGREDIENTS: Record<
  MenstrualPhase,
  { recommendedIds: string[]; cautionIds: string[]; cautionReasonFa: string }
> = {
  menstrual: {
    recommendedIds: PHASE_GUIDE.menstrual.recommendedIds,
    cautionIds: PHASE_GUIDE.menstrual.cautionIds,
    cautionReasonFa: PHASE_GUIDE.menstrual.cautionReasonFa,
  },
  follicular: {
    recommendedIds: PHASE_GUIDE.follicular.recommendedIds,
    cautionIds: PHASE_GUIDE.follicular.cautionIds,
    cautionReasonFa: PHASE_GUIDE.follicular.cautionReasonFa,
  },
  ovulation: {
    recommendedIds: PHASE_GUIDE.ovulation.recommendedIds,
    cautionIds: PHASE_GUIDE.ovulation.cautionIds,
    cautionReasonFa: PHASE_GUIDE.ovulation.cautionReasonFa,
  },
  luteal: {
    recommendedIds: PHASE_GUIDE.luteal.recommendedIds,
    cautionIds: PHASE_GUIDE.luteal.cautionIds,
    cautionReasonFa: PHASE_GUIDE.luteal.cautionReasonFa,
  },
};

export { PHASE_GUIDE, phaseInsightFa };

export type PredictionConfidence = 'none' | 'low' | 'medium' | 'high';

export interface CycleStats {
  /** تعداد چرخه کامل قابل محاسبه (بین دو شروع پریود متوالی). */
  completedCycles: number;
  averageLength: number | null;
  shortestLength: number | null;
  longestLength: number | null;
  /** پراکندگی طول چرخه بر حسب روز. ملاک بازه پیش‌بینی. */
  spreadDays: number | null;
  averagePeriodLength: number | null;
  confidence: PredictionConfidence;
  /** بر اساس پراکندگی واقعی، نه انتخاب دستی کاربر. */
  looksIrregular: boolean;
}

export interface CycleState {
  /** اگر false، هیچ محتوای چرخه‌ای نباید نمایش داده شود. */
  available: boolean;
  /** اگر هیچ پریودی ثبت نشده باشد، روز چرخه نامعلوم است. */
  cycleDay: number | null;
  cycleLength: number;
  phase: MenstrualPhase | null;
  phaseNameFa: string;
  inPeriod: boolean;
  inPmsWindow: boolean;
  /** پیش‌بینی شروع پریود بعدی. بازه به دلیل عدم قطعیت. */
  nextPeriodFromIso: string | null;
  nextPeriodToIso: string | null;
  daysUntilNextPeriod: number | null;
  confidence: PredictionConfidence;
  stats: CycleStats;
  /**
   * تاریخ دقیق (بدون بازه) پیش‌بینی شروع پریود بعدی — برای زمان‌بندی
   * یادآوری «فردا پریودت شروع می‌شود»، برخلاف nextPeriodFromIso/To که
   * بازه نمایشی به کاربر هستند.
   */
  predictedPeriodStartIso: string | null;
  /** روزی که بازه پیش از قاعدگی (PMS) این چرخه شروع می‌شود. */
  pmsStartIso: string | null;
  /** بازه تخمین زده‌شده تخمک‌گذاری این چرخه. */
  ovulationFromIso: string | null;
  ovulationToIso: string | null;
}

/** نام فاز هم از همان منبع واحد می‌آید، نه یک جدول موازی. */
const PHASE_NAMES: Record<MenstrualPhase, string> = {
  menstrual: PHASE_GUIDE.menstrual.titleFa,
  follicular: PHASE_GUIDE.follicular.titleFa,
  ovulation: PHASE_GUIDE.ovulation.titleFa,
  luteal: PHASE_GUIDE.luteal.titleFa,
};

/* ---------------------------- ثبت پریود ---------------------------- */

/**
 * ثبت یا تصحیح شروع پریود.
 *
 * دو حالت کاملاً متفاوت از یک فرم می‌آید و باید جدا شوند:
 *  ۱) کاربر می‌خواهد تاریخ همان پریودی که قبلاً ثبت کرده را تصحیح کند
 *     (مثلاً اشتباهی ۲۰ مرداد زده بود، می‌خواهد بگذارد ۲۳ مرداد).
 *  ۲) یک پریود واقعاً تازه شروع شده و باید به‌عنوان رکورد جدید ثبت شود.
 *
 * ملاک تشخیص: اگر تاریخ جدید به آخرین پریود ثبت‌شده نزدیک‌تر از یک چرخه
 * فیزیولوژیک معقول (کمتر از ۱۵ روز) باشد، تصحیح همان رکورد است — رکورد
 * قبلی جای خودش می‌ماند و فقط startIso آن عوض می‌شود، نه اینکه یک پریود
 * جعلی و کوتاه در تاریخچه ساخته شود. در غیر این صورت رکورد تازه‌ای ساخته
 * می‌شود و اگر پریود قبلی هنوز باز بود، بسته می‌شود.
 */
export function logPeriodStart(startIso: string = getTodayIsoDate()): PeriodLog {
  const logs = LocalDB.getPeriodLogs();
  const sorted = [...logs].sort((a, b) => (a.startIso < b.startIso ? 1 : -1));
  const latest = sorted[0];

  if (!latest) {
    const log: PeriodLog = { id: createId('period'), startIso, updatedAt: new Date().toISOString() };
    LocalDB.savePeriodLog(log);
    return log;
  }

  const gapFromLatest = getDaysDifference(latest.startIso, startIso);
  const looksLikeCorrection = Math.abs(gapFromLatest) < 15;

  if (looksLikeCorrection) {
    const updated: PeriodLog = { ...latest, startIso, updatedAt: new Date().toISOString() };
    if (updated.endIso && getDaysDifference(updated.startIso, updated.endIso) < 0) {
      delete updated.endIso;
    }
    LocalDB.savePeriodLog(updated);
    return updated;
  }

  if (!latest.endIso && gapFromLatest > 0) {
    LocalDB.savePeriodLog({ ...latest, endIso: addDays(startIso, -1) });
  }

  const log: PeriodLog = { id: createId('period'), startIso, updatedAt: new Date().toISOString() };
  LocalDB.savePeriodLog(log);
  return log;
}

/** بستن دوره جاری پریود. */
export function logPeriodEnd(endIso: string = getTodayIsoDate()): void {
  const open = LocalDB.getPeriodLogs().find((log) => !log.endIso);
  if (!open) return;
  if (getDaysDifference(open.startIso, endIso) < 0) return;
  LocalDB.savePeriodLog({ ...open, endIso });
}

export function getOpenPeriod(): PeriodLog | undefined {
  return LocalDB.getPeriodLogs().find((log) => !log.endIso);
}

/* ---------------------------- آمار ---------------------------- */

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

export function deriveCycleStats(logs: PeriodLog[], config: MenstrualCycleConfig): CycleStats {
  // قدیمی به جدید
  const sorted = [...logs].sort((a, b) => (a.startIso < b.startIso ? -1 : 1));

  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = getDaysDifference(sorted[i - 1].startIso, sorted[i].startIso);
    // بازه معقول فیزیولوژیک؛ بقیه خطای ثبت در نظر گرفته می‌شود
    if (gap >= 15 && gap <= 90) lengths.push(gap);
  }

  const recent = lengths.slice(-6);
  const periodLengths = sorted
    .filter((log) => log.endIso)
    .map((log) => getDaysDifference(log.startIso, log.endIso as string) + 1)
    .filter((length) => length >= 1 && length <= 15)
    .slice(-6);

  const averageLength = recent.length > 0 ? median(recent) : null;
  const shortest = recent.length > 0 ? Math.min(...recent) : null;
  const longest = recent.length > 0 ? Math.max(...recent) : null;
  const spread = shortest !== null && longest !== null ? longest - shortest : null;

  let confidence: PredictionConfidence = 'none';
  if (recent.length >= 4 && (spread ?? 99) <= 4) confidence = 'high';
  else if (recent.length >= 3 && (spread ?? 99) <= 8) confidence = 'medium';
  else if (recent.length >= 1) confidence = 'low';

  return {
    completedCycles: recent.length,
    averageLength,
    shortestLength: shortest,
    longestLength: longest,
    spreadDays: spread,
    averagePeriodLength: periodLengths.length > 0 ? median(periodLengths) : null,
    confidence,
    looksIrregular: (spread ?? 0) > 8 || config.regularity === 'irregular' || config.pcosFlagged,
  };
}

/* ---------------------------- وضعیت روز ---------------------------- */

export function computeCycleState(
  config: MenstrualCycleConfig,
  logs: PeriodLog[],
  targetIso: string = getTodayIsoDate(),
): CycleState {
  const stats = deriveCycleStats(logs, config);

  const empty: CycleState = {
    available: false,
    cycleDay: null,
    cycleLength: stats.averageLength || config.cycleLength || 28,
    phase: null,
    phaseNameFa: '',
    inPeriod: false,
    inPmsWindow: false,
    nextPeriodFromIso: null,
    nextPeriodToIso: null,
    daysUntilNextPeriod: null,
    confidence: 'none',
    stats,
    predictedPeriodStartIso: null,
    pmsStartIso: null,
    ovulationFromIso: null,
    ovulationToIso: null,
  };

  if (!config.enabled) return empty;

  const sorted = [...logs].sort((a, b) => (a.startIso < b.startIso ? 1 : -1));
  // آخرین پریودی که قبل یا همزمان با روز مورد نظر شروع شده
  const anchor = sorted.find((log) => getDaysDifference(log.startIso, targetIso) >= 0);
  if (!anchor) return { ...empty, available: false };

  const cycleLength = stats.averageLength || config.cycleLength || 28;
  const periodLength = stats.averagePeriodLength || config.periodLength || 5;
  const elapsed = getDaysDifference(anchor.startIso, targetIso);
  const cycleDay = elapsed + 1;

  const anchorEnd = anchor.endIso;
  const inPeriod = anchorEnd
    ? getDaysDifference(targetIso, anchorEnd) >= 0
    : cycleDay <= periodLength;

  // فازها بر اساس طول واقعی چرخه محاسبه می‌شوند، نه اعداد هاردکد ۱ تا ۵
  // تخمک‌گذاری تقریباً ۱۴ روز قبل از پریود بعدی رخ می‌دهد (فاز لوتئال ثابت‌تر است)
  const ovulationDay = Math.max(periodLength + 3, cycleLength - 14);
  const daysUntilNextPeriod = cycleLength - elapsed;

  let phase: MenstrualPhase;
  if (inPeriod || cycleDay <= periodLength) phase = 'menstrual';
  else if (cycleDay < ovulationDay - 2) phase = 'follicular';
  else if (cycleDay <= ovulationDay + 1) phase = 'ovulation';
  else phase = 'luteal';

  const pmsDays = Math.max(0, Math.min(12, config.pmsStartDaysBefore || 5));
  const inPmsWindow = phase === 'luteal' && daysUntilNextPeriod <= pmsDays && daysUntilNextPeriod >= 0;

  // بازه پیش‌بینی: هرچه داده کمتر یا چرخه نامنظم‌تر، بازه بازتر
  const margin =
    stats.confidence === 'high' ? 1 : stats.confidence === 'medium' ? 2 : stats.spreadDays ? Math.min(7, Math.ceil(stats.spreadDays / 2)) : 4;
  const predictedStart = addDays(anchor.startIso, cycleLength);

  return {
    available: true,
    cycleDay,
    cycleLength,
    phase,
    phaseNameFa: PHASE_NAMES[phase],
    inPeriod,
    inPmsWindow,
    nextPeriodFromIso: addDays(predictedStart, -margin),
    nextPeriodToIso: addDays(predictedStart, margin),
    daysUntilNextPeriod: daysUntilNextPeriod >= 0 ? daysUntilNextPeriod : null,
    confidence: stats.confidence,
    stats,
    predictedPeriodStartIso: predictedStart,
    pmsStartIso: addDays(predictedStart, -pmsDays),
    ovulationFromIso: addDays(anchor.startIso, ovulationDay - 2 - 1),
    ovulationToIso: addDays(anchor.startIso, ovulationDay + 1 - 1),
  };
}

/** میانبر راحت: وضعیت چرخه امروز از داده ذخیره‌شده. */
export function getTodayCycleState(config: MenstrualCycleConfig): CycleState {
  return computeCycleState(config, LocalDB.getPeriodLogs(), getTodayIsoDate());
}

/**
 * روز تقریبی تخمک‌گذاری در یک چرخه به طول مشخص.
 * قاعده بالینی: فاز لوتئال نسبتاً ثابت است و حدود ۱۴ روز قبل از پریود بعدی رخ می‌دهد.
 */
export function estimateOvulationDay(cycleLength: number, periodLength: number): number {
  return Math.max(periodLength + 3, cycleLength - 14);
}

/** فاز یک روز مشخص از چرخه (۱ تا cycleLength) — برای مرور دستی دایره چرخه. */
export function getPhaseForCycleDay(
  cycleDay: number,
  cycleLength: number,
  periodLength: number,
  ovulationDay = estimateOvulationDay(cycleLength, periodLength),
): MenstrualPhase {
  if (cycleDay <= periodLength) return 'menstrual';
  if (cycleDay < ovulationDay - 2) return 'follicular';
  if (cycleDay <= ovulationDay + 1) return 'ovulation';
  return 'luteal';
}

/* ---------------------------- الگوی شخصی ---------------------------- */

export interface PersonalPattern {
  symptom: SymptomKey;
  /** میانگین شدت بر حسب درصد پیشرفت چرخه (۱۰ باکت ۱۰ درصدی). */
  buckets: { fromDay: number; toDay: number; average: number; samples: number }[];
  /** روزی که شدت به اوج می‌رسد. */
  peakDay: number | null;
  /** اولین روزی که شدت از میانگین فراتر می‌رود — ملاک شروع روتین پیشگیرانه. */
  riseDay: number | null;
  /** تعداد چرخه‌هایی که داده دارند. زیر ۲ تا، الگو نمایش داده نمی‌شود. */
  cyclesCovered: number;
  totalSamples: number;
}

/**
 * الگوی واقعی کاربر را از علائم ثبت‌شده می‌سازد.
 * خروجی null یعنی داده کافی نیست — در این حالت باید به کاربر بگوییم
 * چند روز دیگر ثبت لازم دارد، نه اینکه عدد الکی نشان دهیم.
 */
export function buildPersonalPattern(
  symptom: SymptomKey,
  logs: PeriodLog[],
  symptoms: CycleSymptom[],
): PersonalPattern | null {
  if (logs.length === 0 || symptoms.length === 0) return null;

  const sorted = [...logs].sort((a, b) => (a.startIso < b.startIso ? 1 : -1));
  const bucketCount = 10;
  const sums = new Array(bucketCount).fill(0) as number[];
  const counts = new Array(bucketCount).fill(0) as number[];
  const perDay = new Map<number, { sum: number; count: number }>();
  const cycleKeys = new Set<string>();
  let totalSamples = 0;

  symptoms.forEach((entry) => {
    const score = entry.scores?.[symptom];
    if (typeof score !== 'number') return;

    const anchor = sorted.find((log) => getDaysDifference(log.startIso, entry.date) >= 0);
    if (!anchor) return;
    const elapsed = getDaysDifference(anchor.startIso, entry.date);
    if (elapsed > 60) return;

    const anchorIndex = sorted.indexOf(anchor);
    const next = anchorIndex > 0 ? sorted[anchorIndex - 1] : null;
    const length = next ? getDaysDifference(anchor.startIso, next.startIso) : 28;
    if (length <= 0) return;

    const bucket = Math.min(bucketCount - 1, Math.floor((elapsed / length) * bucketCount));
    sums[bucket] += score;
    counts[bucket] += 1;

    const day = elapsed + 1;
    const dayStats = perDay.get(day) || { sum: 0, count: 0 };
    dayStats.sum += score;
    dayStats.count += 1;
    perDay.set(day, dayStats);

    cycleKeys.add(anchor.id);
    totalSamples += 1;
  });

  if (cycleKeys.size < 2 || totalSamples < 12) {
    return {
      symptom,
      buckets: [],
      peakDay: null,
      riseDay: null,
      cyclesCovered: cycleKeys.size,
      totalSamples,
    };
  }

  const referenceLength = 28;
  const buckets = sums.map((sum, index) => ({
    fromDay: Math.round((index / bucketCount) * referenceLength) + 1,
    toDay: Math.round(((index + 1) / bucketCount) * referenceLength),
    average: counts[index] > 0 ? Math.round((sum / counts[index]) * 10) / 10 : 0,
    samples: counts[index],
  }));

  const dayAverages = Array.from(perDay.entries())
    .filter(([, value]) => value.count >= 2)
    .map(([day, value]) => ({ day, average: value.sum / value.count }))
    .sort((a, b) => a.day - b.day);

  if (dayAverages.length === 0) {
    return { symptom, buckets, peakDay: null, riseDay: null, cyclesCovered: cycleKeys.size, totalSamples };
  }

  const overallAverage = dayAverages.reduce((sum, item) => sum + item.average, 0) / dayAverages.length;
  const peak = dayAverages.reduce((best, item) => (item.average > best.average ? item : best), dayAverages[0]);
  // اولین روزی که قبل از اوج، شدت بالاتر از میانگین می‌رود
  const rise = dayAverages.find((item) => item.day <= peak.day && item.average > overallAverage * 1.15);

  return {
    symptom,
    buckets,
    peakDay: peak.average > overallAverage ? peak.day : null,
    riseDay: rise ? rise.day : null,
    cyclesCovered: cycleKeys.size,
    totalSamples,
  };
}

/** جمله فارسی الگوی شخصی — فقط وقتی داده کافی باشد. */
export function describePattern(pattern: PersonalPattern | null, labelFa: string): string | null {
  if (!pattern || pattern.peakDay === null) return null;
  const rise = pattern.riseDay && pattern.riseDay < pattern.peakDay ? pattern.riseDay : null;
  if (rise) {
    return `در ${pattern.cyclesCovered} چرخه گذشته، ${labelFa} تو معمولاً از روز ${rise} چرخه شدت گرفته و روز ${pattern.peakDay} به اوج رسیده.`;
  }
  return `در ${pattern.cyclesCovered} چرخه گذشته، ${labelFa} تو معمولاً در روز ${pattern.peakDay} چرخه بیشترین شدت را داشته.`;
}

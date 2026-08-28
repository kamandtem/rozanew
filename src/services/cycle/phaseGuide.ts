/**
 * تنها منبع محتوای فازهای چرخه.
 *
 * قبلاً چهار منبع جدا وجود داشت و کامنت‌ها ادعا می‌کردند منبع واحد است، در
 * حالی که فقط شناسهٔ ترکیبات مشترک بود:
 *   ۱) PHASE_INGREDIENTS در cycleService
 *   ۲) PHASE_GUIDE در CycleDashboard (متن هاردکد)
 *   ۳) PHASE_INFO در HormoneCycleCard (متن هاردکد)
 *   ۴) متن inline فاز در خودِ recommendationEngine
 *
 * نتیجه: کارت خانه، کارت چرخه و متن روتین می‌توانستند سه حرف متفاوت بزنند.
 * از این‌جا به بعد همهٔ آن‌ها فقط از همین فایل می‌خوانند و فهرست پرهیزِ
 * پروسیجرها هم از procedureRules مشتق می‌شود، نه از متن دستی.
 */

import { AdviceSeverity, MenstrualPhase } from '../../types';

export interface PhaseGuide {
  phase: MenstrualPhase;
  /** نام کوتاه، برای چرخ و برچسب‌ها. */
  titleFa: string;
  /** عنوان کارت. */
  cardTitleFa: string;
  /** وضعیت پوست در این فاز. */
  skinFa: string;
  /** کاری که در این فاز اولویت دارد. */
  actionFa: string;
  /** نکات رویه‌ای «بکن» که به شناسهٔ ترکیب ربط ندارند. */
  extraDoFa: string[];
  /** نکات رویه‌ای «نکن». پرهیز پروسیجرها اینجا نمی‌آید — از قواعد مشتق می‌شود. */
  extraAvoidFa: string[];
  /** ترکیباتی که این فاز پیشنهاد می‌کند. */
  recommendedIds: string[];
  /**
   * ترکیباتی که در این فاز احتیاط لازم دارند.
   *
   * جای avoidIds قبلی را گرفته‌اند که برای هر چهار فاز خالی بود، یعنی آن
   * مکانیزم عملاً مرده بود. مهم‌تر: فاز چرخه به‌تنهایی دلیل کافی برای منع یک
   * اکتیو نیست، پس این‌ها هرگز مستقیم «ممنوع» نمی‌شوند؛ فقط وقتی با علائم
   * واقعی یا حساسیت بالا جمع شوند به CAUTION می‌رسند.
   */
  cautionIds: string[];
  cautionReasonFa: string;
  /** شدت پایهٔ توصیه‌های این فاز. فاز، دستور پزشک نیست. */
  baseSeverity: AdviceSeverity;
  color: string;
}

export const PHASE_GUIDE: Record<MenstrualPhase, PhaseGuide> = {
  menstrual: {
    phase: 'menstrual',
    titleFa: 'قاعدگی',
    cardTitleFa: 'فاز قاعدگی',
    skinFa: 'سد دفاعی پوست حساس‌تر است و رطوبتش کمتر می‌ماند؛ احتمال التهاب بیشتر.',
    actionFa: 'روتین ملایم و آبرسان؛ تمرکز روی ترمیم سد دفاعی.',
    extraDoFa: ['شوینده ملایم', 'کرم ترمیمی سرامیددار'],
    extraAvoidFa: ['لایه‌برداری مکانیکی و اسکراب'],
    recommendedIds: ['ing_centella', 'ing_panthenol', 'ing_ceramides', 'ing_hyaluronic_acid'],
    cautionIds: ['ing_glycolic_acid', 'ing_salicylic_acid', 'ing_retinol'],
    cautionReasonFa: 'در روزهای قاعدگی سد دفاعی نازک‌تر است و لایه‌بردارها زودتر می‌سوزانند.',
    baseSeverity: 'SUGGESTION',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-900',
  },
  follicular: {
    phase: 'follicular',
    titleFa: 'فولیکولار',
    cardTitleFa: 'فاز فولیکولار',
    skinFa: 'معمولاً مقاوم‌ترین و شاداب‌ترین بخش ماه؛ تحمل پوست برای ترکیبات فعال بیشتر است.',
    actionFa: 'بهترین زمان شروع یا افزایش ترکیبات فعال.',
    extraDoFa: ['لایه‌برداری ملایم', 'اضافه کردن ترکیب فعال جدید'],
    extraAvoidFa: [],
    recommendedIds: ['ing_vitamin_c', 'ing_niacinamide'],
    cautionIds: [],
    cautionReasonFa: '',
    baseSeverity: 'SUGGESTION',
    color:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900',
  },
  ovulation: {
    phase: 'ovulation',
    titleFa: 'تخمک‌گذاری',
    cardTitleFa: 'تخمک‌گذاری تقریبی',
    skinFa: 'ترشح چربی رو به افزایش است.',
    actionFa: 'مرطوب‌کنندهٔ سبک و پاکسازی منظم.',
    extraDoFa: ['مرطوب‌کننده سبک'],
    extraAvoidFa: ['کرم‌های سنگین و چرب'],
    recommendedIds: ['ing_niacinamide', 'ing_zinc_pca'],
    cautionIds: [],
    cautionReasonFa: '',
    baseSeverity: 'SUGGESTION',
    color:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-900',
  },
  luteal: {
    phase: 'luteal',
    titleFa: 'لوتئال',
    cardTitleFa: 'فاز لوتئال',
    skinFa: 'منافذ مستعد انسداد و جوش هورمونی هستند.',
    actionFa: 'پیشگیری با نیاسینامید و آزلائیک اسید؛ نه شروع درمان تهاجمی.',
    extraDoFa: ['روتین پیشگیرانهٔ جوش'],
    extraAvoidFa: ['کرم کومدون‌زا', 'دستکاری جوش'],
    recommendedIds: ['ing_niacinamide', 'ing_azelaic_acid', 'ing_salicylic_acid'],
    // سالیسیلیک در همین فاز پیشنهاد می‌شود؛ برای پوست خشک یا حساس همان
    // ترکیب باید احتیاط بگیرد. آشتی این دو، کار reconcileAdvice است.
    cautionIds: ['ing_salicylic_acid', 'ing_glycolic_acid'],
    cautionReasonFa: 'در فاز لوتئال پوست مستعد التهاب است؛ اگر پوستت خشک یا حساس است لایه‌بردار را کم کن.',
    baseSeverity: 'SUGGESTION',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-900',
  },
};

/** متن بینش فاز برای امروز. تنها جایی که این جمله ساخته می‌شود. */
export function phaseInsightFa(phase: MenstrualPhase, cycleDay: number, hedgeFa = ''): string {
  const guide = PHASE_GUIDE[phase];
  return `روز ${cycleDay} چرخه، ${guide.cardTitleFa}. ${guide.skinFa} ${guide.actionFa}${hedgeFa}`.trim();
}

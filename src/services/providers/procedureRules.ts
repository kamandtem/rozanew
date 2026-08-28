/**
 * قواعد خدمات زیبایی.
 *
 * این فایل، دلیل وجود بخش آرایشگاه داخل رزا است. وگرنه یک تقویم ساده روی
 * گوشی کافی بود. چهار کار می‌کند:
 *   ۱) می‌گوید چند روز قبل از جلسه، کدام ترکیبات باید قطع شوند.
 *   ۲) روتین روزهای قبل و بعد را خودکار ملایم می‌کند.
 *   ۳) می‌گوید کدام روزهای چرخه برای این خدمت مناسب یا نامناسبند.
 *   ۴) شدت پیام را متناسب با شدت واقعیِ خدمت تعیین می‌کند.
 *
 * چهار اشکال ساختاری نسخهٔ قبل که اینجا برطرف شده است:
 *
 *  الف) فهرست پرهیز، دو آرایهٔ هاردکد ID بود (ACIDS و STRONG_ACTIVES) و
 *       ترتینوئین، آداپالن، لاکتیک اسید و بنزویل پراکساید در هیچ قاعده‌ای
 *       نبودند، در حالی که ویتامین C بی‌دلیل داخل «اسیدها» بود. حالا فهرست
 *       از خصوصیت فارماکولوژیک خودِ دیتابیس ساخته می‌شود.
 *
 *  ب) همهٔ توصیه‌های پروسیجر یکسان PROFESSIONAL_INSTRUCTION می‌گرفتند، پس
 *     یک نوبت وکس آرایشگاه هم‌سطح دستور پزشک می‌شد. حالا هر قاعده
 *     baseSeverity و severityCeiling خودش را دارد.
 *
 *  ج) دسته‌ها بیش از حد کلی بودند: لیزر موی زائد با لیزر رزورفیسینگ یکی،
 *     تاتوی ابرو با رنگ ابرو یکی، پیلینگ بدون عمق. حالا تفکیک شده‌اند و
 *     دسته‌های قدیمی به‌عنوان «نسخهٔ محتاطانه» باقی مانده‌اند تا رکوردهای
 *     ذخیره‌شدهٔ کاربران نشکنند.
 *
 *  د) پرهیز ناحیه‌ای سراسری اعمال می‌شد: قاعده می‌گفت «روی ناحیهٔ ابرو» ولی
 *     موتور کل روتین صورت را می‌بست. حالا هر قاعده scope دارد.
 */

import { AdviceScope, AdviceSeverity, MenstrualPhase, ServiceCategory } from '../../types';
import { PauseSelection, Potency, selectProcedurePauseIds } from '../advice/ingredientClasses';

/** مناسب‌بودن یک روز برای یک خدمت. */
export type DaySuitability = 'good' | 'neutral' | 'caution' | 'avoid';

export interface ProcedureRule {
  category: ServiceCategory;
  labelFa: string;
  /**
   * شدت واقعی پروسیجر. ملاک دامنهٔ پرهیز ترکیبات:
   *  low    : تماس سطحی و کوتاه (بند، رنگ ابرو)
   *  medium : تحریک واقعی سد دفاعی (وکس، پاکسازی، پیلینگ سطحی)
   *  high   : آسیب کنترل‌شده به پوست (میکرونیدلینگ، پیلینگ متوسط، رزورفیسینگ)
   */
  intensity: 'low' | 'medium' | 'high';
  /** ناحیهٔ واقعی درگیر. region یعنی روتین کل صورت نباید بسته شود. */
  scope: AdviceScope;
  scopeFa: string;
  /** شدت پایهٔ توصیه‌های این پروسیجر. */
  baseSeverity: AdviceSeverity;
  /** سقف شدت؛ حتی با پوست خیلی حساس از این بالاتر نمی‌رود. */
  severityCeiling: AdviceSeverity;
  /** آیا این واقعاً دستور یک مرکز درمانی است یا یک خدمت آرایشگاهی. */
  requiresProfessional: boolean;
  /** چند روز قبل، ترکیبات فعال قطع شوند. ۰ = لازم نیست. */
  pauseActivesDaysBefore: number;
  /** چند روز بعد، روتین باید ملایم و فقط ترمیمی باشد. */
  gentleRoutineDaysAfter: number;
  /** حداقل قدرتی که در این پروسیجر اهمیت دارد؛ خالی = از intensity مشتق می‌شود. */
  minPotency?: Potency;
  prepChecklistFa: string[];
  aftercareChecklistFa: string[];
  /**
   * فازهایی که واقعاً بهتر است این خدمت انجام نشود (منع نسبی جدی).
   *
   * بازنگری ممیزی: قبلاً peeling و microneedling و cleansing هم luteal را
   * داخل این فهرست داشتند و هم discouragedInPms روشن بود؛ با احتساب
   * قاعدگی حدود ۱۹ روز از ۲۸ روز «avoid» می‌شد و اپ عملاً می‌گفت هیچ‌وقت
   * نوبت نگیر. حالا لوتئال به cautionPhases منتقل شده: هشدار می‌دهیم،
   * ولی راه را نمی‌بندیم.
   */
  discouragedPhases: MenstrualPhase[];
  /** فازهایی که فقط «حواست باشد» است، نه پرهیز. */
  cautionPhases: MenstrualPhase[];
  /** وضعیت در بازهٔ پیش از قاعدگی. جای فلگ دوحالتهٔ قبلی. */
  pmsSuitability: 'avoid' | 'caution' | 'fine';
  /** فاز طلایی برای این خدمت. */
  preferredPhases: MenstrualPhase[];
  reasonFa: string;
  /** توضیح فازِ احتیاط (نرم‌تر از reasonFa). */
  cautionReasonFa?: string;
  /** در بارداری باید هشدار داده شود. */
  pregnancyCautionFa?: string;
  /** در دوره مصرف رتینوئید خوراکی ممنوع است. */
  blockedOnOralRetinoid?: boolean;
  /** فاصله تکرار معمول (روز). ملاک پیشنهاد جلسه بعدی. */
  typicalIntervalDays?: number;
  /** دستهٔ عمومیِ قدیمی که این دستهٔ ریز زیرمجموعه‌اش است. */
  generalizesTo?: ServiceCategory;
}

/* ------------------------------ فهرست قواعد ------------------------------ */

const SUN_AFTERCARE = 'ضدآفتاب اجباری و تجدید هر دو ساعت؛ دو هفته جدی بگیرید.';

export const PROCEDURE_RULES: ProcedureRule[] = [
  /* ------------------------------- لیزر ------------------------------- */
  {
    category: 'laser_hair',
    labelFa: 'لیزر موی زائد',
    intensity: 'medium',
    scope: 'region',
    scopeFa: 'ناحیهٔ لیزر',
    baseSeverity: 'IMPORTANT',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 5,
    gentleRoutineDaysAfter: 2,
    prepChecklistFa: [
      '۵ روز قبل، رتینوئید و اسیدهای لایه‌بردار را روی همان ناحیه قطع کنید.',
      'دو هفته قبل برنزه نشوید و از آفتاب مستقیم دوری کنید.',
      'روز جلسه ناحیه تمیز، بدون کرم و بدون دئودورانت باشد.',
      'اگر داروی حساس‌کننده به نور مصرف می‌کنید، به اپراتور اطلاع دهید.',
    ],
    aftercareChecklistFa: [
      '۴۸ ساعت روی ناحیه فقط شوینده ملایم و کرم ترمیمی سرامیددار.',
      SUN_AFTERCARE,
      'تا ۲ روز سونا، استخر و آب داغ روی ناحیه نه.',
    ],
    discouragedPhases: ['menstrual'],
    cautionPhases: [],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular', 'ovulation'],
    reasonFa: 'در روزهای قاعدگی، آستانهٔ درد پایین‌تر و پوست مستعد قرمزی است.',
    cautionReasonFa: 'در بازهٔ پیش از قاعدگی درد را بیشتر حس می‌کنی؛ اگر جای دیگری در ماه ممکن است، بهتر است.',
    pregnancyCautionFa: 'در بارداری قبل از لیزر حتماً با پزشک مشورت کنید.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 35,
    generalizesTo: 'laser',
  },
  {
    category: 'ipl',
    labelFa: 'آی‌پی‌ال',
    intensity: 'medium',
    scope: 'region',
    scopeFa: 'ناحیهٔ آی‌پی‌ال',
    baseSeverity: 'IMPORTANT',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 5,
    gentleRoutineDaysAfter: 2,
    prepChecklistFa: [
      '۵ روز قبل رتینوئید و اسید روی ناحیه را قطع کنید.',
      'دو هفته قبل بدون برنزگی و بدون آفتاب مستقیم.',
    ],
    aftercareChecklistFa: ['۴۸ ساعت فقط ترمیمی و تسکینی روی ناحیه.', SUN_AFTERCARE],
    discouragedPhases: ['menstrual'],
    cautionPhases: [],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular', 'ovulation'],
    reasonFa: 'در روزهای قاعدگی، آستانهٔ درد پایین‌تر و پوست مستعد قرمزی است.',
    pregnancyCautionFa: 'در بارداری قبل از آی‌پی‌ال با پزشک مشورت کنید.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 35,
    generalizesTo: 'laser',
  },
  {
    category: 'laser_resurfacing',
    labelFa: 'لیزر رزورفیسینگ یا فرکشنال',
    intensity: 'high',
    scope: 'face',
    scopeFa: 'کل روتین صورت',
    baseSeverity: 'PROFESSIONAL_INSTRUCTION',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 7,
    gentleRoutineDaysAfter: 7,
    prepChecklistFa: [
      '۷ روز قبل همهٔ ترکیبات فعال را قطع کنید.',
      'دو هفته قبل بدون برنزگی و بدون آفتاب مستقیم.',
      'سابقهٔ تبخال را به پزشک بگویید؛ ممکن است داروی پیشگیری تجویز کند.',
      'برنامهٔ قطع داروهای تجویزی را فقط پزشک تعیین می‌کند.',
    ],
    aftercareChecklistFa: [
      '۷۲ ساعت فقط شوینده ملایم و ترمیم‌کنندهٔ سرامیددار.',
      SUN_AFTERCARE,
      'پوسته‌ها را نکنید؛ خودشان می‌روند.',
      'رتینوئید و اسیدها را فقط با تأیید پزشک شروع کنید.',
    ],
    discouragedPhases: ['menstrual'],
    cautionPhases: ['luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، پوست ملتهب‌تر و آستانهٔ درد پایین‌تر است.',
    cautionReasonFa: 'در فاز لوتئال، ریسک لک التهابی بعد از پروسیجرهای عمیق کمی بالاتر است.',
    pregnancyCautionFa: 'در بارداری توصیه نمی‌شود.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 60,
    generalizesTo: 'laser',
  },
  {
    // دستهٔ قدیمی و کلی. رکوردهای ذخیره‌شدهٔ کاربران با همین مقدار مانده‌اند،
    // پس محتاطانه‌ترین حالت (رزورفیسینگ) را می‌گیرد.
    category: 'laser',
    labelFa: 'لیزر یا آی‌پی‌ال (نامشخص)',
    intensity: 'high',
    scope: 'face',
    scopeFa: 'کل روتین صورت',
    baseSeverity: 'PROFESSIONAL_INSTRUCTION',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 7,
    gentleRoutineDaysAfter: 3,
    prepChecklistFa: [
      '۷ روز قبل، رتینوئید و همهٔ اسیدهای لایه‌بردار را قطع کنید.',
      'دو هفته قبل برنزه نشوید و از آفتاب مستقیم دوری کنید.',
      'روز جلسه پوست تمیز و بدون کرم و میکاپ باشد.',
      'نوع لیزر را در رزا ثبت کنید تا قاعدهٔ دقیق‌تری بگیرید.',
    ],
    aftercareChecklistFa: [
      '۴۸ ساعت فقط شوینده ملایم و کرم ترمیمی سرامیددار.',
      SUN_AFTERCARE,
      'تا ۳ روز سونا، استخر، ورزش سنگین و آب داغ ممنوع.',
      'رتینوئید و اسیدها را حداقل ۳ روز بعد شروع کنید.',
    ],
    discouragedPhases: ['menstrual'],
    cautionPhases: [],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، آستانهٔ درد پایین‌تر و پوست مستعد قرمزی است.',
    pregnancyCautionFa: 'در بارداری قبل از لیزر حتماً با پزشک مشورت کنید.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 35,
  },

  /* ------------------------------- مو زدایی ------------------------------- */
  {
    category: 'wax',
    labelFa: 'اپیلاسیون و وکس',
    intensity: 'medium',
    scope: 'region',
    scopeFa: 'ناحیهٔ اپیلاسیون',
    // یک نوبت وکس آرایشگاه دستور پزشک نیست. قبلاً همین‌جا
    // PROFESSIONAL_INSTRUCTION می‌گرفت و متن «به تأیید پزشک نیاز دارد» می‌آمد.
    baseSeverity: 'CAUTION',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 3,
    gentleRoutineDaysAfter: 2,
    prepChecklistFa: [
      '۳ روز قبل، رتینوئید و اسیدها را روی ناحیهٔ مورد نظر قطع کنید.',
      'پوست را مرطوب نگه دارید ولی روز جلسه چربی نزنید.',
    ],
    aftercareChecklistFa: [
      '۲۴ ساعت اول روی ناحیه فقط تسکین‌دهنده (پانتنول یا سیکا).',
      'تا ۲ روز روی ناحیه بدون لایه‌بردار و بدون ورزش سنگین.',
    ],
    discouragedPhases: ['menstrual'],
    cautionPhases: [],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular', 'ovulation'],
    reasonFa: 'در روزهای قاعدگی درد بیشتر حس می‌شود و پوست زودتر تحریک می‌شود.',
    cautionReasonFa: 'در بازهٔ پیش از قاعدگی درد بیشتر است، ولی منعی ندارد.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 25,
  },
  {
    category: 'threading',
    labelFa: 'بند و اصلاح صورت',
    intensity: 'low',
    scope: 'region',
    scopeFa: 'ناحیهٔ بند',
    baseSeverity: 'CAUTION',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 2,
    gentleRoutineDaysAfter: 1,
    prepChecklistFa: ['۲ روز قبل روی همان ناحیه لایه‌بردار نزنید.'],
    aftercareChecklistFa: [
      'تا ۲۴ ساعت روی ناحیه محصولات قوی مثل رتینوئید و لایه‌بردار نزنید؛ فقط تسکین‌دهنده و ضدآفتاب.',
    ],
    discouragedPhases: [],
    cautionPhases: ['menstrual'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular', 'ovulation'],
    reasonFa: 'در روزهای حساس، قرمزی بعد از بند بیشتر و ماندگارتر است.',
    cautionReasonFa: 'در روزهای حساس قرمزی بعد از بند بیشتر می‌ماند.',
    typicalIntervalDays: 21,
  },

  /* ------------------------------- پیلینگ ------------------------------- */
  {
    category: 'peel_superficial',
    labelFa: 'پیلینگ سطحی',
    intensity: 'medium',
    scope: 'face',
    scopeFa: 'کل روتین صورت',
    baseSeverity: 'IMPORTANT',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 4,
    gentleRoutineDaysAfter: 4,
    prepChecklistFa: ['۴ روز قبل ترکیبات فعال را قطع کنید.', 'سابقهٔ تبخال و حساسیت را به متخصص بگویید.'],
    aftercareChecklistFa: ['۴ روز فقط آبرسان و ترمیم‌کننده.', 'پوسته‌ها را نکنید.', SUN_AFTERCARE],
    discouragedPhases: ['menstrual'],
    cautionPhases: ['luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، پوست ملتهب‌تر و حساس‌تر است.',
    cautionReasonFa: 'در فاز لوتئال، ریسک لک التهابی بعد از پیلینگ کمی بالاتر است.',
    pregnancyCautionFa: 'پیلینگ شیمیایی در بارداری معمولاً توصیه نمی‌شود.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 21,
    generalizesTo: 'peeling',
  },
  {
    category: 'peel_medium',
    labelFa: 'پیلینگ متوسط',
    intensity: 'high',
    scope: 'face',
    scopeFa: 'کل روتین صورت',
    baseSeverity: 'PROFESSIONAL_INSTRUCTION',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 7,
    gentleRoutineDaysAfter: 10,
    prepChecklistFa: [
      '۷ روز قبل همهٔ ترکیبات فعال را قطع کنید.',
      'سابقهٔ تبخال و حساسیت را به متخصص بگویید.',
      'برنامهٔ قطع داروهای تجویزی را فقط پزشک تعیین می‌کند.',
    ],
    aftercareChecklistFa: ['۱۰ روز فقط آبرسان و ترمیم‌کننده.', 'پوسته‌ها را نکنید؛ خودشان می‌روند.', SUN_AFTERCARE],
    discouragedPhases: ['menstrual'],
    cautionPhases: ['luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، پوست ملتهب‌تر و ریسک واکنش بیشتر است.',
    cautionReasonFa: 'در فاز لوتئال، ریسک لک التهابی بعد از پیلینگ بالاتر است.',
    pregnancyCautionFa: 'پیلینگ شیمیایی در بارداری توصیه نمی‌شود.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 45,
    generalizesTo: 'peeling',
  },
  {
    category: 'peeling',
    labelFa: 'پیلینگ شیمیایی (عمق نامشخص)',
    intensity: 'high',
    scope: 'face',
    scopeFa: 'کل روتین صورت',
    baseSeverity: 'PROFESSIONAL_INSTRUCTION',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 7,
    gentleRoutineDaysAfter: 10,
    prepChecklistFa: [
      '۷ روز قبل همهٔ ترکیبات فعال را قطع کنید.',
      'سابقهٔ تبخال و حساسیت را به متخصص بگویید.',
      'عمق پیلینگ را در رزا ثبت کنید تا قاعدهٔ دقیق‌تری بگیرید.',
    ],
    aftercareChecklistFa: ['۱۰ روز فقط آبرسان و ترمیم‌کننده.', 'پوسته‌ها را نکنید؛ خودشان می‌روند.', SUN_AFTERCARE],
    discouragedPhases: ['menstrual'],
    cautionPhases: ['luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، پوست ملتهب‌تر و ریسک واکنش بیشتر است.',
    cautionReasonFa: 'در فاز لوتئال، ریسک لک التهابی بعد از پیلینگ بالاتر است.',
    pregnancyCautionFa: 'پیلینگ شیمیایی در بارداری معمولاً توصیه نمی‌شود.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 30,
  },

  /* ---------------------------- میکرونیدلینگ ---------------------------- */
  {
    category: 'microneedling',
    labelFa: 'میکرونیدلینگ',
    intensity: 'high',
    scope: 'face',
    scopeFa: 'کل روتین صورت',
    baseSeverity: 'PROFESSIONAL_INSTRUCTION',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 7,
    gentleRoutineDaysAfter: 7,
    prepChecklistFa: [
      '۷ روز قبل ترکیبات فعال را قطع کنید.',
      'پوست نباید جوش فعال التهابی داشته باشد.',
      'برنامهٔ قطع داروهای تجویزی را فقط پزشک تعیین می‌کند.',
    ],
    aftercareChecklistFa: [
      '۲۴ ساعت فقط سرم آبرسان ساده و بدون میکاپ.',
      '۷ روز لایه‌برداری ممنوع.',
      'ضدآفتاب معدنی ملایم از روز دوم.',
    ],
    discouragedPhases: ['menstrual'],
    cautionPhases: ['luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، پوست ملتهب‌تر است و ترمیم کندتر انجام می‌شود.',
    cautionReasonFa: 'در فاز لوتئال و PMS پوست مستعد جوش است؛ اگر جای دیگری در ماه ممکن است، بهتر است.',
    pregnancyCautionFa: 'در بارداری توصیه نمی‌شود.',
    blockedOnOralRetinoid: true,
    typicalIntervalDays: 30,
  },

  /* ------------------------------- فیشیال ------------------------------- */
  {
    category: 'facial_hydrating',
    labelFa: 'فیشیال آبرسان',
    intensity: 'low',
    scope: 'face',
    scopeFa: 'روتین صورت',
    baseSeverity: 'SUGGESTION',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 1,
    gentleRoutineDaysAfter: 1,
    prepChecklistFa: ['شب قبل لایه‌بردار قوی نزنید.'],
    aftercareChecklistFa: ['امشب روتین را ساده نگه دارید.', 'فردا ضدآفتاب را جدی بگیرید.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: ['menstrual', 'follicular', 'ovulation', 'luteal'],
    reasonFa: 'فیشیال آبرسان در همهٔ فازها بی‌اشکال است و در قاعدگی حتی مفید است.',
    typicalIntervalDays: 30,
    generalizesTo: 'facial',
  },
  {
    category: 'facial_deep',
    labelFa: 'فیشیال با تخلیه و لایه‌برداری',
    intensity: 'medium',
    scope: 'face',
    scopeFa: 'روتین صورت',
    baseSeverity: 'CAUTION',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 3,
    gentleRoutineDaysAfter: 2,
    prepChecklistFa: ['۳ روز قبل لایه‌بردار قوی و رتینوئید را قطع کنید.'],
    aftercareChecklistFa: ['۴۸ ساعت میکاپ سنگین نزنید.', '۲ روز فقط روتین ملایم و ترمیمی.'],
    discouragedPhases: [],
    cautionPhases: ['menstrual', 'luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular', 'ovulation'],
    reasonFa: 'در فاز فولیکولار پوست مقاوم‌تر است و نتیجه بهتر دیده می‌شود.',
    cautionReasonFa: 'در روزهای حساس، قرمزی بعد از تخلیه بیشتر می‌ماند.',
    typicalIntervalDays: 30,
    generalizesTo: 'facial',
  },
  {
    category: 'facial',
    labelFa: 'فیشیال (نوع نامشخص)',
    intensity: 'medium',
    scope: 'face',
    scopeFa: 'روتین صورت',
    baseSeverity: 'CAUTION',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 2,
    gentleRoutineDaysAfter: 1,
    prepChecklistFa: ['۲ روز قبل لایه‌بردار قوی نزنید.'],
    aftercareChecklistFa: ['امشب روتین را ساده نگه دارید.', 'فردا ضدآفتاب را جدی بگیرید.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: ['follicular', 'ovulation'],
    reasonFa: 'در فاز فولیکولار پوست مقاوم‌تر است و نتیجه بهتر دیده می‌شود.',
    typicalIntervalDays: 30,
  },
  {
    category: 'cleansing',
    labelFa: 'پاکسازی پوست',
    intensity: 'medium',
    scope: 'face',
    scopeFa: 'روتین صورت',
    baseSeverity: 'CAUTION',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 3,
    gentleRoutineDaysAfter: 3,
    prepChecklistFa: ['۳ روز قبل رتینوئید و اسید را قطع کنید.'],
    aftercareChecklistFa: ['۴۸ ساعت میکاپ سنگین نزنید.', '۳ روز فقط روتین ملایم و ترمیمی.'],
    // بازنگری: قبلاً luteal داخل discouragedPhases بود؛ پاکسازی پوست
    // پروسیجر تهاجمی نیست و منع کردن نیمی از ماه برایش توجیه علمی ندارد.
    discouragedPhases: [],
    cautionPhases: ['menstrual', 'luteal'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در فاز فولیکولار پوست مقاوم‌تر است.',
    cautionReasonFa: 'در روزهای پیش از قاعدگی، منافذ متورم‌تر و پوست حساس‌تر است.',
    typicalIntervalDays: 30,
  },

  /* -------------------------------- ابرو -------------------------------- */
  {
    category: 'brow_tattoo',
    labelFa: 'تاتو یا میکروبلیدینگ ابرو',
    intensity: 'high',
    scope: 'region',
    scopeFa: 'ناحیهٔ ابرو',
    baseSeverity: 'IMPORTANT',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: true,
    pauseActivesDaysBefore: 5,
    gentleRoutineDaysAfter: 7,
    prepChecklistFa: ['۵ روز قبل رتینوئید و اسید روی ناحیهٔ ابرو نزنید.', 'تست حساسیت رنگدانه را انجام دهید.'],
    aftercareChecklistFa: [
      '۷ روز روی ابرو محصولات قوی مثل رتینوئید و لایه‌بردار را نزنید.',
      'ناحیه را خشک نگه دارید و پوسته‌ها را نکنید.',
    ],
    discouragedPhases: ['menstrual'],
    cautionPhases: [],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای قاعدگی، تورم و درد بیشتر است و ماندگاری رنگدانه کمتر می‌شود.',
    typicalIntervalDays: 365,
    generalizesTo: 'brow',
  },
  {
    category: 'brow_lift',
    labelFa: 'لیفت ابرو',
    intensity: 'low',
    scope: 'region',
    scopeFa: 'ناحیهٔ ابرو',
    baseSeverity: 'CAUTION',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 2,
    gentleRoutineDaysAfter: 2,
    prepChecklistFa: ['۲ روز قبل روی ناحیهٔ ابرو لایه‌بردار نزنید.'],
    aftercareChecklistFa: ['۲۴ ساعت ناحیه را خیس نکنید.', '۲ روز روی ابرو فقط تسکین‌دهنده.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: [],
    reasonFa: '',
    typicalIntervalDays: 45,
    generalizesTo: 'brow',
  },
  {
    category: 'brow_tint',
    labelFa: 'رنگ یا هنا ابرو',
    intensity: 'low',
    scope: 'region',
    scopeFa: 'ناحیهٔ ابرو',
    baseSeverity: 'INFO',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 1,
    gentleRoutineDaysAfter: 1,
    prepChecklistFa: ['تست حساسیت پشت گوش را ۴۸ ساعت قبل انجام دهید.'],
    aftercareChecklistFa: ['۲۴ ساعت روی ناحیه لایه‌بردار نزنید تا رنگ زود نرود.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: [],
    reasonFa: '',
    typicalIntervalDays: 30,
    generalizesTo: 'brow',
  },
  {
    category: 'brow',
    labelFa: 'ابرو (نوع نامشخص)',
    intensity: 'high',
    scope: 'region',
    scopeFa: 'ناحیهٔ ابرو',
    baseSeverity: 'IMPORTANT',
    severityCeiling: 'PROFESSIONAL_INSTRUCTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 5,
    gentleRoutineDaysAfter: 7,
    prepChecklistFa: [
      '۵ روز قبل رتینوئید و اسید روی ناحیهٔ ابرو نزنید.',
      'نوع خدمت ابرو را در رزا ثبت کنید تا قاعدهٔ دقیق‌تری بگیرید.',
    ],
    aftercareChecklistFa: ['۷ روز روی ابرو محصولات قوی را نزنید.', 'ناحیه را خشک نگه دارید.'],
    discouragedPhases: ['menstrual'],
    cautionPhases: [],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در روزهای حساس، تورم و درد بیشتر است و ماندگاری رنگ کمتر می‌شود.',
    typicalIntervalDays: 45,
  },
  {
    category: 'lash',
    labelFa: 'مژه (اکستنشن یا لیفت)',
    intensity: 'low',
    scope: 'region',
    scopeFa: 'ناحیهٔ چشم',
    baseSeverity: 'CAUTION',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 2,
    gentleRoutineDaysAfter: 1,
    prepChecklistFa: ['۲ روز قبل دور چشم رتینوئید نزنید.', 'روز جلسه چشم بدون میکاپ و بدون کرم چرب.'],
    aftercareChecklistFa: ['۲۴ ساعت ناحیه را خیس نکنید.', 'پاک‌کنندهٔ روغنی روی مژه‌ها نزنید.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: [],
    reasonFa: '',
    typicalIntervalDays: 21,
  },

  /* --------------------------------- مو --------------------------------- */
  {
    category: 'hair_color',
    labelFa: 'رنگ مو',
    intensity: 'low',
    scope: 'body',
    scopeFa: 'پوست سر',
    baseSeverity: 'INFO',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 0,
    gentleRoutineDaysAfter: 0,
    prepChecklistFa: [
      '۲۴ تا ۴۸ ساعت قبل مو را نشویید (چربی طبیعی پوست سر محافظ است).',
      'تست حساسیت پوست پشت گوش را ۴۸ ساعت قبل انجام دهید.',
      'فرمول دفعهٔ قبل را از دفترچهٔ رزا به آرایشگر نشان دهید.',
    ],
    aftercareChecklistFa: [
      '۴۸ ساعت اول مو را نشویید.',
      'شامپوی بدون سولفات استفاده کنید.',
      'موعد رنگ ریشه را در رزا ثبت کنید تا یادآوری بگیرید.',
    ],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: [],
    reasonFa: '',
    pregnancyCautionFa:
      'در سه ماه اول بارداری بهتر است رنگ مو را به تأخیر بیندازید یا از روش بدون تماس با پوست سر استفاده کنید.',
    typicalIntervalDays: 28,
  },
  {
    category: 'highlight',
    labelFa: 'هایلایت و دکلره',
    intensity: 'low',
    scope: 'body',
    scopeFa: 'پوست سر',
    baseSeverity: 'INFO',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 0,
    gentleRoutineDaysAfter: 0,
    prepChecklistFa: ['۴۸ ساعت قبل مو را نشویید.', 'ماسک ترمیمی پروتئینی را یک هفته قبل شروع کنید.'],
    aftercareChecklistFa: ['شامپو و ماسک مخصوص موی دکلره.', 'حرارت مستقیم (سشوار داغ) را کم کنید.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: [],
    reasonFa: '',
    typicalIntervalDays: 60,
  },
  {
    category: 'keratin',
    labelFa: 'کراتین و احیا',
    intensity: 'low',
    scope: 'body',
    scopeFa: 'پوست سر',
    baseSeverity: 'INFO',
    severityCeiling: 'CAUTION',
    requiresProfessional: false,
    pauseActivesDaysBefore: 0,
    gentleRoutineDaysAfter: 0,
    prepChecklistFa: ['ترکیبات مادهٔ مصرفی را بپرسید (فرمالدئید).', 'محل کار باید تهویه داشته باشد.'],
    aftercareChecklistFa: ['تا ۷۲ ساعت مو را نشویید و نبندید.', 'شامپوی بدون سولفات اجباری است.'],
    discouragedPhases: [],
    cautionPhases: [],
    pmsSuitability: 'fine',
    preferredPhases: [],
    reasonFa: '',
    pregnancyCautionFa: 'در بارداری و شیردهی، تماس با مواد حاوی فرمالدئید توصیه نمی‌شود.',
    typicalIntervalDays: 120,
  },

  /* ------------------------------ سایر خدمات ------------------------------ */
  {
    category: 'procedure',
    labelFa: 'خدمت پوستی دیگر',
    intensity: 'medium',
    scope: 'face',
    scopeFa: 'روتین صورت',
    baseSeverity: 'CAUTION',
    severityCeiling: 'IMPORTANT',
    requiresProfessional: false,
    pauseActivesDaysBefore: 3,
    gentleRoutineDaysAfter: 3,
    prepChecklistFa: ['۳ روز قبل ترکیبات فعال را قطع کنید.'],
    aftercareChecklistFa: ['تا ۳ روز روتین ملایم و ضدآفتاب.'],
    discouragedPhases: [],
    cautionPhases: ['menstrual'],
    pmsSuitability: 'caution',
    preferredPhases: ['follicular'],
    reasonFa: 'در فاز فولیکولار تحمل پوست بالاتر است.',
    cautionReasonFa: 'در روزهای حساس، تحمل پوست پایین‌تر است.',
    typicalIntervalDays: 30,
  },
];

/* ------------------------------ توابع کمکی ------------------------------ */

export function findProcedureRule(category: ServiceCategory): ProcedureRule | undefined {
  return PROCEDURE_RULES.find((rule) => rule.category === category);
}

/** خدماتی که قاعده پرهیز دارند — برای نمایش نشان هشدار در لیست. */
export function hasRoutineImpact(category: ServiceCategory): boolean {
  const rule = findProcedureRule(category);
  if (!rule) return false;
  return rule.pauseActivesDaysBefore > 0 || rule.gentleRoutineDaysAfter > 0;
}

/**
 * فهرست پرهیز یک قاعده — از دیتابیس ترکیبات ساخته می‌شود، نه هاردکد.
 * نتیجه کش می‌شود چون در حلقهٔ روزها هزاران بار صدا زده می‌شود.
 */
const pauseCache = new Map<string, PauseSelection>();

export function procedurePauseIds(rule: ProcedureRule): PauseSelection {
  const key = `${rule.intensity}|${rule.minPotency || ''}`;
  const cached = pauseCache.get(key);
  if (cached) return cached;
  const selection = selectProcedurePauseIds({ intensity: rule.intensity, minPotency: rule.minPotency });
  pauseCache.set(key, selection);
  return selection;
}

/** فقط برای نمایش: همهٔ ترکیباتی که این خدمت روی آن‌ها اثر می‌گذارد. */
export function procedureAffectedIngredientIds(category: ServiceCategory): string[] {
  const rule = findProcedureRule(category);
  if (!rule) return [];
  const selection = procedurePauseIds(rule);
  return Array.from(new Set([...selection.hardIds, ...selection.softIds]));
}

/**
 * خدماتی که در یک فاز چرخه توصیه نمی‌شوند یا احتیاط لازم دارند.
 *
 * تناقض قابل‌دیدن نسخهٔ قبل: کارت چرخه با متن هاردکد می‌گفت در فاز لوتئال
 * «نوبت لیزر و اپیلاسیون» نگیر، ولی procedureRules برای laser و wax فقط
 * menstrual را منع کرده بود؛ پس بخش چرخه و بخش نوبت‌ها دو حرف متفاوت
 * می‌زدند. حالا کارت چرخه از همین تابع می‌خواند، یعنی امکان ناهم‌خوانی صفر است.
 */
export function proceduresByPhaseSuitability(
  phase: MenstrualPhase,
  inPmsWindow = false,
): { avoidFa: string[]; cautionFa: string[]; goodFa: string[] } {
  const avoidFa: string[] = [];
  const cautionFa: string[] = [];
  const goodFa: string[] = [];

  PROCEDURE_RULES.forEach((rule) => {
    // دسته‌های کلیِ قدیمی در متن راهنما تکرار نمی‌شوند؛ نسخهٔ ریزشان هست.
    if (rule.labelFa.includes('نامشخص')) return;

    if (rule.discouragedPhases.includes(phase) || (inPmsWindow && rule.pmsSuitability === 'avoid')) {
      avoidFa.push(rule.labelFa);
      return;
    }
    if (rule.cautionPhases.includes(phase) || (inPmsWindow && rule.pmsSuitability === 'caution')) {
      cautionFa.push(rule.labelFa);
      return;
    }
    if (rule.preferredPhases.includes(phase)) goodFa.push(rule.labelFa);
  });

  return {
    avoidFa: Array.from(new Set(avoidFa)),
    cautionFa: Array.from(new Set(cautionFa)),
    goodFa: Array.from(new Set(goodFa)),
  };
}

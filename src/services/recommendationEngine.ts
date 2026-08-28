/**
 * موتور توصیه روزانه.
 *
 * این یک سیستم قواعد شفاف است، نه هوش مصنوعی. عنوان‌های اپ هم همین را
 * می‌گویند. جلوی هر توصیه، دلیلش نوشته می‌شود.
 *
 * ترتیب اولویت قواعد (مهم‌ترین اول):
 *   ۱) ایمنی (بارداری، شیردهی، دارو، حساسیت)
 *   ۲) پرهیز نوبت آرایشگاه یا کلینیک
 *   ۳) علائم واقعی ثبت‌شدهٔ پوست
 *   ۴) فاز چرخه (اگر فعال باشد)
 *   ۵) آب‌وهوا (اگر داده موجود باشد)
 *   ۶) نوع پوست، دغدغه‌ها و بازهٔ سنی
 *
 * چهار تغییر ساختاری نسبت به نسخهٔ قبل:
 *
 *  الف) هیچ توصیه‌ای دستی ساخته نمی‌شود. همه از makeAdvice می‌گذرند، پس
 *       headlineFa، triggersFa، productNamesFa، untilIso، educationalOnly و
 *       action همیشه پر هستند — قبلاً نیمی از این‌ها ساخته می‌شدند و هرگز به
 *       کاربر نمی‌رسیدند.
 *
 *  ب) چرخه، علائم و سن حالا واقعاً IngredientAdvice تولید می‌کنند. سه مقدار
 *     'cycle'، 'symptom' و 'age' در AdviceSource وجود داشتند و هیچ‌جا
 *     ساخته نمی‌شدند.
 *
 *  ج) خروجی از reconcileAdvice می‌گذرد، پس یک ماده نمی‌تواند هم‌زمان در چیپ
 *     سبز «پیشنهاد می‌شود» و چیپ نارنجی «با احتیاط» باشد.
 *
 *  د) هشدارهای ایمنی به‌همراه شدت‌شان سفر می‌کنند (SafetyWarning)، نه دو
 *     آرایهٔ موازی که با ایندکس عددی در UI به هم وصل می‌شدند.
 */

import {
  AdviceSeverity,
  AdviceSource,
  IngredientAdvice,
  LifestyleProfile,
  MenstrualCycleConfig,
  Medication,
  Product,
  ProductCategory,
  RoutineStep,
  SafetyWarning,
  SkinProfile,
  SkinSignals,
  WeatherData,
} from '../types';
import { findIngredientById, INGREDIENTS_DATABASE } from './content/ingredients';
import { evaluateIngredientSafety, getBlockedIngredientIds } from './safety';
import { escalate, isAtLeast, maxSeverity, SEVERITY_RANK } from './advice/severity';
import { getSensitivityLevel, SensitivityLevel } from './advice/sensitivity';
import { getSkinSignals, resolveShelfActives, ShelfActive, signalTriggersFa } from './advice/userContext';
import { makeAdvice, reconcileAdvice } from './advice/adviceFactory';
import { isIrritatingActive, matchesAllergy } from './advice/ingredientClasses';
import { getTodayCycleState, PHASE_GUIDE, phaseInsightFa } from './cycle/cycleService';
import { getRoutineRestrictionForDate, RoutineRestriction } from './providers/appointmentService';
import { addDays, getAgeFromBirthDate, getTodayIsoDate } from './jalali';

export interface DailyGuidance {
  /** متن چرخه. null = چرخه خاموش یا داده ناکافی. در این حالت چیزی نشان نده. */
  cycleInsightFa: string | null;
  weatherInsightFa: string | null;
  /** پرهیز مربوط به نوبت آرایشگاه یا کلینیک. */
  procedureInsightFa: string | null;
  pmsWarningFa: string | null;
  /** هشدارهای ایمنی با شدت خودشان. UI نباید شدت را حدس بزند. */
  safetyWarnings: SafetyWarning[];
  /** فقط متن‌ها — برای سازگاری با کامپوننت‌های قدیمی. */
  safetyWarningsFa: string[];
  /** فهرست نهایی پیشنهاد؛ تضمیناً بدون هم‌پوشانی با هشدارها. */
  recommendedIngredientIds: string[];
  /** ماده‌هایی که یک قاعده پیشنهاد کرده بود ولی قاعدهٔ دیگری محدودشان می‌کند. */
  withheldIngredientIds: string[];
  avoidIngredientIds: string[];
  morningRoutine: RoutineStep[];
  nightRoutine: RoutineStep[];
  gentleMode: boolean;
  /** چرا روتین امروز ملایم شد. */
  gentleReasonFa: string | null;
  lifestyleInsightFa: string | null;
  /** توصیه متناسب با سن؛ اگر تاریخ تولد ثبت نشده باشد null است. */
  ageInsightFa: string | null;
  /** کارت‌های «حواست باشد» — فقط CAUTION و بالاتر. منبع اصلی هر UI. */
  ingredientAdvice: IngredientAdvice[];
  /** نکته‌های فقط-اطلاعی که ممنوعیت نیستند (مثلاً اثر فاز روی یک اکتیو). */
  ingredientNotes: IngredientAdvice[];
  /** دلیل پیشنهاد هر مادهٔ فهرست سبز، تا چیپ سبز هم دلیل داشته باشد. */
  recommendedReasonById: Record<string, string>;
  /** علائم واقعی چند روز اخیر — تا UI بتواند بگوید این توصیه از کجا آمد. */
  skinSignals: SkinSignals;
  sensitivity: SensitivityLevel;
}

/* ============================ ۱) ایمنی ============================ */

/**
 * توصیه‌های ایمنی (بارداری/شیردهی/رتینوئید خوراکی/آلرژی/تداخل دارویی/نوع پوست).
 * از همان evaluateIngredientSafety در safety.ts استفاده می‌کند تا قاعده دوبار
 * نوشته نشود؛ اینجا فقط منبع و شدت متناسب با نوع دلیل واقعی تعیین می‌شود.
 */
function buildSafetyAdvice(
  profile: SkinProfile,
  medications: Medication[],
  shelfActives: Map<string, ShelfActive>,
  sensitivity: SensitivityLevel,
  skinSignals: SkinSignals,
): IngredientAdvice[] {
  const activeMedications = medications.filter((medication) => medication.isActive);
  const advice: IngredientAdvice[] = [];

  INGREDIENTS_DATABASE.forEach((ingredient) => {
    const verdict = evaluateIngredientSafety(ingredient, profile, activeMedications);
    if (verdict.level === 'safe') return;

    let source: AdviceSource = 'skin_profile';
    let severity: AdviceSeverity = verdict.level === 'blocked' ? 'IMPORTANT' : 'CAUTION';
    const triggers = [...verdict.reasonsFa];

    const medConflict = activeMedications.find((medication) =>
      (medication.conflictingIngredientIds || []).includes(ingredient.id),
    );

    // تشخیص آلرژی از همان تابع مشترک لایهٔ ایمنی. قبلاً اینجا فقط
    // ingredient.nameFa.includes(...) بود، پس آلرژی‌های انگلیسی‌نوشته منبع و
    // شدت اشتباه می‌گرفتند.
    const allergy = matchesAllergy(ingredient, profile.allergies || []);

    if (medConflict) {
      // تداخل با دارویی که پزشک تجویز کرده — این دیگر «پیشنهاد» نیست.
      source = 'medication';
      severity = 'PROFESSIONAL_INSTRUCTION';
      triggers.push(`داروی در حال مصرف: ${medConflict.nameFa}`);
    } else if (profile.onOralRetinoid && isIrritatingActive(ingredient.id)) {
      // رتینوئید خوراکی هم دستور پزشک است، نه ترجیح اپ.
      source = 'medication';
      severity = 'PROFESSIONAL_INSTRUCTION';
      triggers.push('دورهٔ مصرف رتینوئید خوراکی');
    } else if (allergy.hit) {
      // حساسیت ثبت‌شدهٔ خود کاربر: ایمنی واقعی، ولی دستور پزشک نیست.
      source = 'safety';
      severity = 'IMPORTANT';
      triggers.push(`حساسیت ثبت‌شدهٔ خودت: ${allergy.matchedTermFa}`);
    } else if (
      (profile.isPregnant && ingredient.pregnancySafety !== 'safe') ||
      (profile.isBreastfeeding && ingredient.breastfeedingSafety !== 'safe')
    ) {
      source = 'pregnancy';
      triggers.push(profile.isPregnant ? 'بارداری' : 'شیردهی');
    }

    // پوست ملتهبِ همین چند روز یا حساسیت بالا: یک پله شدت را بالا می‌بریم،
    // ولی هرگز از IMPORTANT بالاتر نمی‌رویم مگر منبع واقعاً پزشکی/دارویی باشد.
    if (severity === 'CAUTION' && (sensitivity === 'high' || skinSignals.irritatedNow)) {
      severity = escalate(severity, 1, 'IMPORTANT');
      triggers.push(...signalTriggersFa(skinSignals));
    }

    advice.push(
      makeAdvice(
        {
          ruleId: `safety_${ingredient.id}`,
          ingredientId: ingredient.id,
          severity,
          source,
          reasonFa: verdict.reasonsFa.join(' '),
          triggersFa: triggers,
          scope: source === 'pregnancy' || source === 'medication' || source === 'safety' ? 'systemic' : 'face',
        },
        shelfActives,
      ),
    );
  });

  return advice;
}

/* ============================ ۲) نوبت‌ها ============================ */

/**
 * توصیه‌های مربوط به نوبت آرایشگاه/کلینیک.
 *
 * سه چیز که قبلاً غلط بود و اینجا درست شده:
 *  ۱) شدت همه یکسان PROFESSIONAL_INSTRUCTION بود؛ حالا از خود قاعده و
 *     حساسیت پوست می‌آید (وکس آرایشگاه هم‌سطح دستور پزشک نیست).
 *  ۲) پرهیز ناحیه‌ای سراسری اعمال می‌شد؛ حالا scope حفظ می‌شود.
 *  ۳) untilIso هرگز ست نمی‌شد، پس «تا کِی» به کاربر گفته نمی‌شد.
 */
function buildProcedureAdvice(
  restriction: RoutineRestriction,
  shelfActives: Map<string, ShelfActive>,
): IngredientAdvice[] {
  const advice: IngredientAdvice[] = [];

  restriction.entries.forEach((entry) => {
    const triggers = [
      entry.isTentative ? `${entry.labelFa} (درخواست تأییدنشده)` : entry.labelFa,
      entry.timing === 'before'
        ? `${entry.distanceDays} روز تا جلسه`
        : entry.timing === 'day'
          ? 'روز جلسه'
          : `${Math.abs(entry.distanceDays)} روز پس از جلسه`,
    ];

    const push = (id: string, severity: AdviceSeverity) => {
      advice.push(
        makeAdvice(
          {
            ruleId: `procedure_${entry.category}_${id}_${entry.appointmentId}`,
            ingredientId: id,
            severity,
            source: 'procedure',
            reasonFa: entry.reasonFa,
            triggersFa: triggers,
            scope: entry.scope,
            scopeFa: entry.scope === 'face' ? undefined : entry.scopeFa,
            untilIso: entry.untilIso,
            appointmentId: entry.appointmentId,
          },
          shelfActives,
        ),
      );
    };

    entry.hardIds.forEach((id) => push(id, entry.severity));
    // فهرست نرم هرگز از CAUTION بالاتر نمی‌رود: ویتامین C یا اسیدی که فقط
    // در شوینده هست، «قطع» نمی‌خواهد.
    entry.softIds.forEach((id) =>
      push(id, SEVERITY_RANK[entry.severity] > SEVERITY_RANK.CAUTION ? 'CAUTION' : entry.severity),
    );
  });

  return advice;
}

/* ============================ ۳) علائم واقعی ============================ */

/**
 * علائم ثبت‌شدهٔ خود کاربر.
 *
 * قبلاً علائم فقط یک کار می‌کردند: یک پله بالا بردن شدتِ توصیه‌های ایمنی.
 * خودشان هیچ توصیه‌ای نمی‌ساختند و gentleMode را هم فعال نمی‌کردند. حالا
 * منبع مستقل توصیه‌اند و روی اکتیوهای واقعیِ قفسهٔ کاربر اثر می‌گذارند.
 */
function buildSymptomAdvice(
  signals: SkinSignals,
  shelfActives: Map<string, ShelfActive>,
  sensitivity: SensitivityLevel,
): IngredientAdvice[] {
  if (!signals.hasData) return [];
  const triggers = signalTriggersFa(signals);
  if (triggers.length === 0 && signals.acne < 3) return [];

  const advice: IngredientAdvice[] = [];

  if (signals.irritatedNow) {
    // فقط ترکیباتی که خود کاربر دارد. برای بقیه، حرف زدن بی‌فایده است.
    Array.from(shelfActives.keys())
      .filter((id) => isIrritatingActive(id))
      .forEach((id) => {
        const severity: AdviceSeverity = sensitivity === 'high' ? 'IMPORTANT' : 'CAUTION';
        advice.push(
          makeAdvice(
            {
              ruleId: `symptom_irritation_${id}`,
              ingredientId: id,
              severity,
              source: 'symptom',
              reasonFa: `${signals.sourceFa}. تا وقتی پوست آرام نشده، ترکیب فعال روی سد دفاعیِ تحریک‌شده کار را بدتر می‌کند.`,
              triggersFa: triggers,
              scope: 'face',
            },
            shelfActives,
          ),
        );
      });

    // جایگزین مشخص، نه فقط «نزن».
    ['ing_panthenol', 'ing_centella', 'ing_ceramides'].forEach((id) => {
      advice.push(
        makeAdvice(
          {
            ruleId: `symptom_soothe_${id}`,
            ingredientId: id,
            severity: 'SUGGESTION',
            source: 'symptom',
            reasonFa: `${signals.sourceFa}. این ترکیب برای همین چند روز ساخته شده است.`,
            triggersFa: triggers,
            scope: 'face',
          },
          shelfActives,
        ),
      );
    });
  }

  if (signals.acne >= 3 && !signals.irritatedNow) {
    ['ing_niacinamide', 'ing_azelaic_acid'].forEach((id) => {
      advice.push(
        makeAdvice(
          {
            ruleId: `symptom_acne_${id}`,
            ingredientId: id,
            severity: 'SUGGESTION',
            source: 'symptom',
            reasonFa: 'در ثبت‌های چند روز اخیرت جوش ثبت شده؛ این ترکیب پیشگیرانه و کم‌ریسک است.',
            triggersFa: triggers.length > 0 ? triggers : ['جوش ثبت‌شده در ثبت‌های خودت'],
            scope: 'face',
          },
          shelfActives,
        ),
      );
    });
  }

  return advice;
}

/* ============================ ۴) چرخه ============================ */

/**
 * توصیه‌های فاز چرخه.
 *
 * قبلاً چرخه هیچ IngredientAdvice تولید نمی‌کرد و PHASE_INGREDIENTS.avoidIds
 * برای هر چهار فاز خالی بود، یعنی آن مکانیزم مرده بود.
 *
 * قاعدهٔ علمی که رعایت می‌شود: فاز چرخه به‌تنهایی دلیل کافی برای منع یک
 * اکتیو نیست. پس cautionIds فقط وقتی به CAUTION می‌رسند که با نوع پوست،
 * حساسیت یا علائم واقعی جمع شوند؛ وگرنه در سطح INFO می‌مانند.
 */
function buildCycleAdvice(args: {
  phase: keyof typeof PHASE_GUIDE;
  profile: SkinProfile;
  sensitivity: SensitivityLevel;
  signals: SkinSignals;
  shelfActives: Map<string, ShelfActive>;
  untilIso?: string;
  phaseNameFa: string;
}): IngredientAdvice[] {
  const guide = PHASE_GUIDE[args.phase];
  const advice: IngredientAdvice[] = [];
  const triggers = [`فاز ${args.phaseNameFa}`];

  guide.recommendedIds.forEach((id) => {
    advice.push(
      makeAdvice(
        {
          ruleId: `cycle_${args.phase}_use_${id}`,
          ingredientId: id,
          severity: guide.baseSeverity,
          source: 'cycle',
          reasonFa: `${guide.skinFa} ${guide.actionFa}`,
          triggersFa: triggers,
          scope: 'face',
          untilIso: args.untilIso,
        },
        args.shelfActives,
      ),
    );
  });

  const fragileSkin =
    args.profile.skinType === 'dry' ||
    args.profile.skinType === 'dehydrated' ||
    args.profile.skinType === 'sensitive';
  const escalates = fragileSkin || args.sensitivity === 'high' || args.signals.irritatedNow;

  guide.cautionIds.forEach((id) => {
    const extraTriggers = [...triggers];
    if (fragileSkin) extraTriggers.push('نوع پوست خودت');
    if (args.sensitivity === 'high') extraTriggers.push('حساسیت بالای پوستت');
    if (args.signals.irritatedNow) extraTriggers.push(...signalTriggersFa(args.signals));

    advice.push(
      makeAdvice(
        {
          ruleId: `cycle_${args.phase}_caution_${id}`,
          ingredientId: id,
          // بدون شاهد دیگری، فاز فقط یک اطلاع است نه احتیاط.
          severity: escalates ? 'CAUTION' : 'INFO',
          source: 'cycle',
          reasonFa: escalates
            ? guide.cautionReasonFa
            : `${guide.cautionReasonFa} برای پوست تو الان فقط خوب است بدانی.`,
          triggersFa: extraTriggers,
          scope: 'face',
          untilIso: args.untilIso,
        },
        args.shelfActives,
      ),
    );
  });

  return advice;
}

/* ============================ ۶) سن ============================ */

interface AgeGuidance {
  insightFa: string;
  recommendIds: string[];
  cautionIds: string[];
  cautionReasonFa: string;
}

function ageGuidance(age: number, canUseRetinol: boolean): AgeGuidance | null {
  if (age <= 0) return null;
  if (age < 18) {
    return {
      insightFa:
        'در سن نوجوانی، پوست به روتین ساده و ملایم نیاز دارد؛ فعلاً از رتینول و لایه‌بردارهای قوی فاصله بگیر و روی شست‌وشوی ملایم و ضدآفتاب روزانه تمرکز کن.',
      recommendIds: ['ing_niacinamide', 'ing_hyaluronic_acid'],
      cautionIds: ['ing_retinol', 'ing_glycolic_acid'],
      cautionReasonFa: 'در سن نوجوانی پوست به ترکیب فعال قوی نیازی ندارد و ریسک تحریکش بیشتر است.',
    };
  }
  if (age < 25) {
    return {
      insightFa:
        'در این سن، بهترین سرمایه‌گذاری پیشگیری است: ضدآفتاب روزانه و آنتی‌اکسیدان‌ها جلوی سالخوردگی زودرس پوست را می‌گیرند.',
      recommendIds: ['ing_vitamin_c'],
      cautionIds: [],
      cautionReasonFa: '',
    };
  }
  if (age < 35) {
    return {
      insightFa:
        'اوایل دههٔ سوم زمان خوبی برای شروع رتینول سبک در شب و ویتامین C در صبح است تا اولین خطوط ریز دیرتر بیفتند.',
      recommendIds: canUseRetinol ? ['ing_vitamin_c', 'ing_retinol'] : ['ing_vitamin_c'],
      cautionIds: [],
      cautionReasonFa: '',
    };
  }
  if (age < 45) {
    return {
      insightFa:
        'در این سن تولید کلاژن پوست کم‌کم کاهش می‌یابد؛ رتینول و مرطوب‌کننده‌های حاوی سرامید نقش پررنگ‌تری در روتین شب پیدا می‌کنند.',
      recommendIds: canUseRetinol ? ['ing_ceramides', 'ing_retinol'] : ['ing_ceramides'],
      cautionIds: [],
      cautionReasonFa: '',
    };
  }
  return {
    insightFa:
      'با نزدیک شدن به یائسگی، افت استروژن پوست را خشک‌تر و نازک‌تر می‌کند؛ آبرسانی عمیق و ترمیم سد دفاعی اولویت اول روتین می‌شود.',
    recommendIds: ['ing_ceramides', 'ing_hyaluronic_acid'],
    cautionIds: [],
    cautionReasonFa: '',
  };
}

function buildAgeAdvice(
  guidance: AgeGuidance,
  ageFa: string,
  shelfActives: Map<string, ShelfActive>,
): IngredientAdvice[] {
  const advice: IngredientAdvice[] = [];
  guidance.recommendIds.forEach((id) => {
    advice.push(
      makeAdvice(
        {
          ruleId: `age_use_${id}`,
          ingredientId: id,
          severity: 'SUGGESTION',
          source: 'age',
          reasonFa: guidance.insightFa,
          triggersFa: [ageFa],
          scope: 'face',
        },
        shelfActives,
      ),
    );
  });
  guidance.cautionIds.forEach((id) => {
    advice.push(
      makeAdvice(
        {
          ruleId: `age_caution_${id}`,
          ingredientId: id,
          severity: 'CAUTION',
          source: 'age',
          reasonFa: guidance.cautionReasonFa,
          triggersFa: [ageFa],
          scope: 'face',
        },
        shelfActives,
      ),
    );
  });
  return advice;
}

/* ============================ روتین ============================ */

function pickProductName(products: Product[], category: ProductCategory, blockedIds: string[]): string | undefined {
  const candidate = products.find(
    (product) =>
      // همان تعریف مالکیت که بقیهٔ اپ استفاده می‌کند.
      product.owned !== false &&
      product.category === category &&
      !(product.ingredientIds || []).some((id) => blockedIds.includes(id)),
  );
  return candidate ? `${candidate.brand} ${candidate.name}`.trim() : undefined;
}

function ingredientNameFa(id: string): string {
  return findIngredientById(id)?.nameFa || id;
}

/* ============================ خروجی روز ============================ */

export function buildDailyGuidance(args: {
  profile: SkinProfile;
  lifestyle: LifestyleProfile;
  cycleConfig: MenstrualCycleConfig;
  weather: WeatherData;
  products: Product[];
  medications?: Medication[];
  dateIso?: string;
}): DailyGuidance {
  const { profile, cycleConfig, weather, products } = args;
  const medications = args.medications || [];
  const dateIso = args.dateIso || getTodayIsoDate();

  const shelfActives = resolveShelfActives(products);
  const skinSignals = getSkinSignals(dateIso);
  const sensitivity = getSensitivityLevel(profile);

  /* --- سبک زندگی --- */
  let lifestyleInsightFa: string | null = null;
  if (profile.hairType === 'curly' || profile.hairType === 'coily') {
    lifestyleInsightFa =
      'برای موی فر، بعد از شست‌وشو مو را با حولهٔ زبر نساب؛ رطوبت را با کرم یا نرم‌کننده نگه دار.';
  } else if (
    // باگ تأییدشده: شرط قبلی `profile.hairType === 'oily'` بود، در حالی که
    // HairType فقط straight | wavy | curly | coily است؛ کامپایلر هم آن را
    // TS2367 می‌داد و آن توصیه هرگز اجرا نمی‌شد. منظور «پوست سر زودچرب»
    // بوده، پس از داده‌ای خوانده می‌شود که واقعاً وجود دارد.
    (profile.skinType === 'oily' || profile.skinType === 'combination') &&
    (profile.hairType === 'straight' || profile.hairType === 'wavy')
  ) {
    lifestyleInsightFa =
      'اگر پوست سرت زود چرب می‌شود، محصول‌های سنگین را نزدیک ریشه نزن و شامپو را روی پوست سر بزن نه روی طول مو.';
  }
  if (args.lifestyle.stressLevel === 'high') {
    const stressNote =
      'استرس زیاد می‌تواند ثبت‌های پوست و چرخه را تغییر دهد؛ اینجا فقط ثبت کن، نه قضاوت.';
    lifestyleInsightFa = lifestyleInsightFa ? `${lifestyleInsightFa} ${stressNote}` : stressNote;
  }

  /* --- ۱) ایمنی --- */
  const safetyBlocked = getBlockedIngredientIds(profile, medications);
  const safetyWarnings: SafetyWarning[] = [];
  if (profile.isPregnant) {
    safetyWarnings.push({
      id: 'warn_pregnancy',
      textFa: 'برای دوران بارداری، رتینوئیدها و لایه‌بردارهای قوی از روتین حذف شدند.',
      severity: 'IMPORTANT',
      source: 'pregnancy',
    });
  }
  if (profile.isBreastfeeding) {
    safetyWarnings.push({
      id: 'warn_breastfeeding',
      textFa: 'در دوران شیردهی، ترکیبات نامناسب از روتین حذف شدند.',
      severity: 'IMPORTANT',
      source: 'pregnancy',
    });
  }
  if (profile.onOralRetinoid) {
    safetyWarnings.push({
      id: 'warn_oral_retinoid',
      textFa:
        'چون رتینوئید خوراکی مصرف می‌کنی، روتین فقط روی آبرسانی و ترمیم سد دفاعی تنظیم شد. لایه‌برداری و لیزر در این دوره توصیه نمی‌شود.',
      severity: 'PROFESSIONAL_INSTRUCTION',
      source: 'medication',
    });
  }
  const activeMedConflicts = medications.filter(
    (medication) => medication.isActive && (medication.conflictingIngredientIds || []).length > 0,
  );
  activeMedConflicts.forEach((medication) => {
    safetyWarnings.push({
      id: `warn_med_${medication.id}`,
      textFa: `داروی «${medication.nameFa}» با بعضی ترکیبات روتین تداخل دارد؛ آن‌ها از روتین امروز حذف شدند.`,
      severity: 'PROFESSIONAL_INSTRUCTION',
      source: 'medication',
    });
  });

  /* --- ۲) پرهیز نوبت‌ها --- */
  const restriction = getRoutineRestrictionForDate(dateIso, profile);

  /* --- ۳) چرخه --- */
  // در بارداری، پیش‌بینی فاز/PMS از داده‌های پیش از بارداری بی‌معنی و
  // گمراه‌کننده است؛ چرخه کاملاً غیرفعال در نظر گرفته می‌شود.
  const cycle = getTodayCycleState(profile.isPregnant ? { ...cycleConfig, enabled: false } : cycleConfig);

  const recommended: string[] = ['ing_hyaluronic_acid', 'ing_ceramides'];
  const avoid = new Set<string>([...safetyBlocked, ...restriction.blockedIngredientIds]);

  let cycleInsight: string | null = null;
  let pmsWarning: string | null = null;
  const cycleAdvice: IngredientAdvice[] = [];

  if (cycle.available && cycle.phase && cycle.cycleDay) {
    const hedge = cycle.confidence === 'low' || cycle.confidence === 'none' ? ' (برآورد تقریبی است)' : '';
    // متن فاز از منبع واحد phaseGuide می‌آید، نه از متن inline این فایل.
    cycleInsight = phaseInsightFa(cycle.phase, cycle.cycleDay, hedge);

    const periodLength = cycle.stats.averagePeriodLength || cycleConfig.periodLength || 5;
    const phaseUntilIso =
      cycle.phase === 'menstrual'
        ? addDays(dateIso, Math.max(0, periodLength - cycle.cycleDay))
        : cycle.phase === 'luteal'
          ? cycle.predictedPeriodStartIso || undefined
          : cycle.ovulationToIso || undefined;

    cycleAdvice.push(
      ...buildCycleAdvice({
        phase: cycle.phase,
        profile,
        sensitivity,
        signals: skinSignals,
        shelfActives,
        untilIso: phaseUntilIso || undefined,
        phaseNameFa: cycle.phaseNameFa,
      }),
    );
    PHASE_GUIDE[cycle.phase].recommendedIds.forEach((id) => recommended.push(id));

    if (cycle.inPmsWindow && cycle.daysUntilNextPeriod !== null) {
      pmsWarning = `حدود ${cycle.daysUntilNextPeriod} روز تا شروع احتمالی پریود. اگر الگوی جوش هورمونی داری، الان بهترین زمان شروع روتین پیشگیرانه است. این یک برآورد است، نه تشخیص پزشکی.`;
    }
  }

  /* --- ۴) آب‌وهوا --- */
  let weatherInsight: string | null = null;
  if (weather.hasData) {
    if (weather.uvIndex >= 6) {
      weatherInsight = `شاخص فرابنفش امروز ${weather.uvIndex} است. ضدآفتاب را هر دو ساعت تجدید کن.`;
      recommended.push('ing_vitamin_c');
    } else if (weather.humidity > 0 && weather.humidity < 30) {
      weatherInsight = `رطوبت هوا ${weather.humidity} درصد است. مرطوب‌کننده را روی پوست نم‌دار بزن.`;
      recommended.push('ing_ceramides');
    } else {
      weatherInsight = weather.recommendationFa || null;
    }
  }

  /* --- ۵) نوع پوست و دغدغه‌ها --- */
  if (profile.skinType === 'oily' || profile.skinType === 'combination') recommended.push('ing_niacinamide');
  if (profile.skinType === 'dry' || profile.skinType === 'dehydrated') recommended.push('ing_panthenol');
  if (profile.skinType === 'sensitive') recommended.push('ing_centella');
  const concerns = profile.primaryConcerns || [];
  if (concerns.includes('acne') || concerns.includes('hyperpigmentation')) recommended.push('ing_azelaic_acid');
  if (concerns.includes('redness') || concerns.includes('rosacea')) recommended.push('ing_azelaic_acid');

  /* --- ۶) سن --- */
  const age = getAgeFromBirthDate(profile.birthDateIso);
  const canUseRetinol = !profile.isPregnant && !profile.isBreastfeeding && !profile.onOralRetinoid;
  const ageInfo = profile.birthDateIso ? ageGuidance(age, canUseRetinol) : null;
  const ageAdvice = ageInfo ? buildAgeAdvice(ageInfo, `بازهٔ سنی ${age} سال`, shelfActives) : [];
  if (ageInfo) ageInfo.recommendIds.forEach((id) => recommended.push(id));

  /* --- جمع‌بندی و آشتی --- */
  const symptomAdvice = buildSymptomAdvice(skinSignals, shelfActives, sensitivity);

  const reconciled = reconcileAdvice(recommended, [
    ...buildSafetyAdvice(profile, medications, shelfActives, sensitivity, skinSignals),
    ...buildProcedureAdvice(restriction, shelfActives),
    ...symptomAdvice,
    ...cycleAdvice,
    ...ageAdvice,
  ]);

  // هر توصیه‌ای که واقعاً جلوی مصرف را می‌گیرد و دامنه‌اش صورت یا عمومی است،
  // از روتین هم حذف می‌شود. پرهیز ناحیه‌ای گام روتین را حذف نمی‌کند.
  reconciled.advice
    .filter((item) => isAtLeast(item.severity, 'IMPORTANT') && item.scope !== 'region' && item.scope !== 'body')
    .forEach((item) => avoid.add(item.ingredientId));

  const blockedList = Array.from(avoid);

  /* --- حالت ملایم --- */
  // علائم واقعی هم می‌توانند روتین را ملایم کنند؛ قبلاً gentleMode فقط از
  // نوبت یا رتینوئید خوراکی می‌آمد.
  const gentleReasons: string[] = [];
  if (restriction.gentleMode && restriction.reasonFa) gentleReasons.push(restriction.reasonFa);
  if (profile.onOralRetinoid) gentleReasons.push('دورهٔ مصرف رتینوئید خوراکی.');
  if (skinSignals.irritatedNow) gentleReasons.push(`${skinSignals.sourceFa}، پس امشب فقط ترمیم.`);
  const gentleMode = restriction.gentleMode || profile.onOralRetinoid || skinSignals.irritatedNow;

  /* --- ساخت گام‌های روتین --- */
  const recommendedSet = new Set(reconciled.recommendedIds);

  const morning: RoutineStep[] = [
    {
      id: 'm_cleanse',
      titleFa: 'شویندهٔ ملایم صبح',
      category: 'cleanser',
      productNameFa: pickProductName(products, 'cleanser', blockedList) || 'شویندهٔ ملایم صورت',
      completed: false,
      timeSeconds: 60,
      descriptionFa: 'با آب ولرم بشوی و فقط ۳۰ تا ۶۰ ثانیه ماساژ بده.',
      reasonFa: 'پاکسازی چربی شبانه بدون آسیب به سد دفاعی',
    },
  ];

  if (!gentleMode && !blockedList.includes('ing_vitamin_c') && recommendedSet.has('ing_vitamin_c')) {
    morning.push({
      id: 'm_serum_vitc',
      titleFa: 'سرم ویتامین C',
      category: 'serum',
      productNameFa: pickProductName(products, 'serum', blockedList) || 'سرم ویتامین C',
      completed: false,
      timeSeconds: 30,
      descriptionFa: '۳ تا ۴ قطره روی پوست خشک و سپس مرطوب‌کننده.',
      reasonFa: 'محافظت آنتی‌اکسیدانی در برابر آلودگی و آفتاب',
    });
  } else {
    morning.push({
      id: 'm_serum_hydra',
      titleFa: 'سرم آبرسان',
      category: 'serum',
      productNameFa: pickProductName(products, 'serum', blockedList) || 'سرم هیالورونیک اسید',
      completed: false,
      timeSeconds: 30,
      descriptionFa: 'روی پوست کمی نم‌دار بزن و بلافاصله مرطوب‌کننده رویش بگذار.',
      reasonFa: gentleMode ? gentleReasons[0] || 'روتین امروز ملایم تنظیم شده' : 'آبرسانی پایه',
    });
  }

  morning.push(
    {
      id: 'm_moisturizer',
      titleFa: 'مرطوب‌کننده',
      category: 'moisturizer',
      productNameFa: pickProductName(products, 'moisturizer', blockedList) || 'مرطوب‌کنندهٔ سبک',
      completed: false,
      timeSeconds: 30,
      descriptionFa: 'یک لایهٔ یکنواخت روی صورت و گردن.',
      reasonFa: 'حفظ رطوبت و تقویت سد دفاعی',
    },
    {
      id: 'm_sunscreen',
      titleFa: 'ضدآفتاب (مهم‌ترین گام روز)',
      category: 'sunscreen',
      productNameFa: pickProductName(products, 'sunscreen', blockedList) || 'ضدآفتاب SPF 50',
      completed: false,
      timeSeconds: 45,
      descriptionFa: 'دو بند انگشت برای صورت و گردن.',
      reasonFa: gentleMode
        ? 'پوست امروز در حال ترمیم است و به نور خیلی حساس‌تر است'
        : 'پیشگیری از لک و پیری زودرس',
    },
  );

  const night: RoutineStep[] = [
    {
      id: 'n_cleanse',
      titleFa: 'پاکسازی شب',
      category: 'cleanser',
      productNameFa: pickProductName(products, 'cleanser', blockedList) || 'ژل شویندهٔ ملایم',
      completed: false,
      timeSeconds: 90,
      descriptionFa: 'اگر ضدآفتاب یا میکاپ زده‌ای، اول میسلار یا روغن پاک‌کننده.',
      reasonFa: 'باقی‌ماندن ضدآفتاب روی پوست منافذ را می‌بندد',
    },
  ];

  // ترتیب از ملایم به قوی: اگر پوست تحمل بیشتری داشت، اکتیو قوی‌تر انتخاب
  // می‌شود؛ برای پوست حساس اول گزینه‌های کم‌ریسک.
  const activeOrder =
    sensitivity === 'high'
      ? ['ing_niacinamide', 'ing_azelaic_acid', 'ing_salicylic_acid', 'ing_retinol']
      : ['ing_retinol', 'ing_azelaic_acid', 'ing_salicylic_acid', 'ing_niacinamide'];
  const nightActive = activeOrder.find((id) => recommendedSet.has(id) && !blockedList.includes(id));

  if (gentleMode || !nightActive) {
    night.push({
      id: 'n_repair',
      titleFa: 'سرم ترمیمی و آبرسان',
      category: 'serum',
      productNameFa: pickProductName(products, 'serum', blockedList) || 'سرم هیالورونیک یا پانتنول',
      completed: false,
      timeSeconds: 30,
      descriptionFa: 'در این بازه فقط آبرسانی و ترمیم.',
      reasonFa: gentleReasons[0] || 'روتین ملایم',
      blockedReasonFa: gentleReasons.length > 0 ? gentleReasons.join(' ') : undefined,
    });
  } else {
    night.push({
      id: 'n_active',
      titleFa: `ترکیب فعال شب: ${ingredientNameFa(nightActive)}`,
      category: 'treatment',
      productNameFa:
        pickProductName(products, 'treatment', blockedList) || pickProductName(products, 'serum', blockedList),
      completed: false,
      timeSeconds: 30,
      descriptionFa: 'کم شروع کن: ابتدا هفته‌ای دو شب، بعد افزایش بده.',
      reasonFa:
        cycle.available && cycle.phase === 'luteal'
          ? 'فاز لوتئال و پیشگیری از جوش هورمونی'
          : 'دغدغهٔ اصلی پوست تو',
    });
  }

  night.push({
    id: 'n_moisturizer',
    titleFa: 'کرم شب ترمیم‌کننده',
    category: 'moisturizer',
    productNameFa: pickProductName(products, 'moisturizer', blockedList) || 'کرم حاوی سرامید',
    completed: false,
    timeSeconds: 45,
    descriptionFa: 'لایهٔ نهایی برای قفل کردن رطوبت.',
    reasonFa: 'ترمیم سد دفاعی در طول خواب',
  });

  return {
    cycleInsightFa: cycleInsight,
    weatherInsightFa: weatherInsight,
    procedureInsightFa: restriction.reasonFa || null,
    pmsWarningFa: pmsWarning,
    safetyWarnings,
    safetyWarningsFa: safetyWarnings.map((warning) => warning.textFa),
    recommendedIngredientIds: reconciled.recommendedIds,
    withheldIngredientIds: reconciled.withheldIds,
    avoidIngredientIds: blockedList,
    morningRoutine: morning,
    nightRoutine: night,
    gentleMode,
    gentleReasonFa: gentleReasons.length > 0 ? gentleReasons.join(' ') : null,
    lifestyleInsightFa,
    ageInsightFa: ageInfo?.insightFa || null,
    ingredientAdvice: reconciled.advice,
    ingredientNotes: reconciled.notes,
    recommendedReasonById: reconciled.reasonById,
    skinSignals,
    sensitivity,
  };
}

/** نام فارسی لیست ترکیبات — برای نمایش در UI. */
export function ingredientNamesFa(ids: string[]): string[] {
  return ids.map((id) => ingredientNameFa(id));
}

/** بالاترین شدت میان توصیه‌های امروز — برای نشان کوچک روی تب‌ها. */
export function peakAdviceSeverity(advice: IngredientAdvice[]): AdviceSeverity | null {
  if (advice.length === 0) return null;
  return advice.reduce<AdviceSeverity>((top, item) => maxSeverity(top, item.severity), 'INFO');
}

/**
 * ساخت و آشتی‌دادن توصیه‌ها.
 *
 * سه مشکل ساختاری که این فایل حل می‌کند:
 *
 * ۱) قبلاً هر قاعده خودش IngredientAdvice را دستی می‌ساخت، پس نیمی از
 *    فیلدهای تایپ (headlineFa، triggersFa، productNamesFa، untilIso،
 *    educationalOnly، action) یا خالی می‌ماندند یا هر جا متفاوت پر
 *    می‌شدند. حالا فقط یک سازنده وجود دارد و پر کردن همهٔ فیلدها اجباری است.
 *
 * ۲) یک ماده می‌توانست هم‌زمان در چیپ سبز «پیشنهاد می‌شود» و چیپ نارنجی
 *    «با احتیاط» ظاهر شود — چون buildDailyGuidance فقط blockedها را از
 *    فهرست پیشنهاد حذف می‌کرد، نه cautionها. تابع reconcile این را
 *    غیرممکن می‌کند.
 *
 * ۳) چند منبع می‌توانستند برای یک ماده چند کارت جدا بسازند. dedupe آن‌ها
 *    را با maxSeverity در یک کارت ادغام می‌کند و بقیهٔ منابع را به عنوان
 *    «همچنین از این منبع» نگه می‌دارد.
 */

import { AdviceAction, AdviceScope, AdviceSeverity, AdviceSource, IngredientAdvice } from '../../types';
import { findIngredientById } from '../content/ingredients';
import { isPrescription } from './ingredientClasses';
import { ShelfActive } from './userContext';
import { ACTION_LABEL_FA, actionForSeverity, isAtLeast, maxSeverity, SEVERITY_RANK } from './severity';

/**
 * وقتی چند منبع یک ماده را نشان می‌کنند، منبعِ کارت باید صادق‌ترین باشد:
 * «دارویی که پزشکت داده» بر «فاز چرخه» می‌چربد.
 */
const SOURCE_PRIORITY: Record<AdviceSource, number> = {
  medication: 7,
  pregnancy: 6,
  safety: 5,
  procedure: 4,
  symptom: 3,
  cycle: 2,
  skin_profile: 1,
  age: 0,
};

const SCOPE_LABEL_FA: Record<AdviceScope, string> = {
  face: 'روتین صورت',
  region: 'فقط ناحیهٔ جلسه',
  body: 'ناحیهٔ بدن',
  systemic: 'همهٔ محصولات',
};

export interface AdviceInput {
  ruleId: string;
  ingredientId: string;
  severity: AdviceSeverity;
  source: AdviceSource;
  /** جملهٔ «چرا امروز» — به کاربر نمایش داده می‌شود، نه فقط داخل tooltip. */
  reasonFa: string;
  /** داده‌هایی که قاعده را فعال کردند. هر کدام یک چیپ در UI می‌شود. */
  triggersFa?: string[];
  scope?: AdviceScope;
  scopeFa?: string;
  untilIso?: string;
  appointmentId?: string;
  /** فقط وقتی قاعده دلیل خاصی دارد؛ وگرنه action از شدت مشتق می‌شود. */
  action?: AdviceAction;
}

/**
 * تنها سازندهٔ IngredientAdvice در اپ.
 *
 * دو قاعده‌ای که کامنت types.ts خواسته بود و رعایت نمی‌شد، اینجا اجرا
 * می‌شوند: اگر ماده در قفسهٔ کاربر نباشد educationalOnly روشن می‌شود و
 * متن هرگز شکل دستور نمی‌گیرد؛ و اگر باشد، نام محصول واقعی خودش در متن
 * می‌آید نه نام عمومی ماده.
 */
export function makeAdvice(input: AdviceInput, shelfActives: Map<string, ShelfActive>): IngredientAdvice {
  const ingredient = findIngredientById(input.ingredientId);
  const nameFa = ingredient?.nameFa || input.ingredientId;
  const shelf = shelfActives.get(input.ingredientId);
  const inUserShelf = Boolean(shelf);
  const prescription = ingredient ? isPrescription(ingredient) : false;

  /*
   * رتینوئید تجویزی: رزا اجازه ندارد بگوید قطع کن، پس شدت یک پله نرم می‌شود.
   *
   * ولی سه منبع از این تخفیف مستثنا هستند، چون در آن‌ها «نرم کردن» یعنی
   * پنهان کردن یک خطر واقعی:
   *   medication : تداخل با داروی در حال مصرف
   *   pregnancy  : بارداری و شیردهی
   *   safety     : حساسیتی که خودِ کاربر ثبت کرده
   * (مورد سوم در بازبینی پیدا شد: بدون این، آلرژی ثبت‌شده به ترتینوئین از
   * «مهم» به «با احتیاط» سقوط می‌کرد.)
   */
  const SOFTENABLE = !(input.source === 'medication' || input.source === 'pregnancy' || input.source === 'safety');
  const severity: AdviceSeverity =
    prescription && SOFTENABLE && (input.severity === 'CAUTION' || input.severity === 'IMPORTANT')
      ? 'CAUTION'
      : input.severity;

  const action = input.action || actionForSeverity(severity, prescription);
  const scope: AdviceScope = input.scope || 'face';

  const productNamesFa = shelf?.productNamesFa || [];
  const headlineFa = buildHeadline({
    nameFa,
    action,
    inUserShelf,
    productNamesFa,
    prescription,
    scope,
    scopeFa: input.scopeFa,
  });

  const triggersFa = (input.triggersFa || []).filter(Boolean);

  return {
    ruleId: input.ruleId,
    ingredientId: input.ingredientId,
    ingredientNameFa: nameFa,
    severity,
    action,
    headlineFa,
    reasonFa: prescription
      ? `${input.reasonFa} این ترکیب تجویزی است؛ برنامهٔ قطع و شروعش را پزشک تعیین می‌کند، نه رزا.`.trim()
      : input.reasonFa,
    triggersFa,
    productNamesFa,
    inUserShelf,
    educationalOnly: !inUserShelf,
    source: input.source,
    untilIso: input.untilIso,
    appointmentId: input.appointmentId,
    scope,
    scopeFa: input.scopeFa || (scope === 'face' ? undefined : SCOPE_LABEL_FA[scope]),
  };
}

function buildHeadline(args: {
  nameFa: string;
  action: AdviceAction;
  inUserShelf: boolean;
  productNamesFa: string[];
  prescription: boolean;
  scope: AdviceScope;
  scopeFa?: string;
}): string {
  const where = args.scopeFa ? ` (${args.scopeFa})` : '';

  // ماده در قفسهٔ کاربر نیست: حق نداریم بگوییم «امروز از X استفاده نکن».
  if (!args.inUserShelf) {
    return `${args.nameFa} — در محصولات ثبت‌شدهٔ تو نیست؛ فقط خوب است بدانی.`;
  }

  const product = args.productNamesFa[0];
  const extra = args.productNamesFa.length > 1 ? ` و ${args.productNamesFa.length - 1} محصول دیگر` : '';
  const inProduct = product ? ` (${product}${extra})` : '';

  if (args.prescription) return `${args.nameFa}${inProduct} — با پزشک تجویزکننده هماهنگ کن.`;

  switch (args.action) {
    case 'stop':
      return `${args.nameFa}${inProduct} — در این بازه استفاده نکن${where}.`;
    case 'pause':
      return `${args.nameFa}${inProduct} — در این بازه نگه‌دار${where}.`;
    case 'reduce':
      return `${args.nameFa}${inProduct} — کمترش کن${where}.`;
    case 'use':
      return `${args.nameFa}${inProduct} — امروز گزینهٔ خوبی است.`;
    default:
      return `${args.nameFa}${inProduct} — ${ACTION_LABEL_FA.info}.`;
  }
}

/* ------------------------------- ادغام ------------------------------- */

/**
 * چند توصیه برای یک ماده، یک کارت.
 * شدت نهایی maxSeverity است، منبع نمایشی بالاترین اولویت، و دلیل‌ها و
 * تریگرهای همهٔ منابع در همان کارت جمع می‌شوند.
 */
export function dedupeAdvice(list: IngredientAdvice[]): IngredientAdvice[] {
  const byIngredient = new Map<string, IngredientAdvice>();

  list.forEach((item) => {
    const current = byIngredient.get(item.ingredientId);
    if (!current) {
      byIngredient.set(item.ingredientId, { ...item, alsoFromSources: [] });
      return;
    }

    const severity = maxSeverity(current.severity, item.severity);
    const winner =
      SOURCE_PRIORITY[item.source] > SOURCE_PRIORITY[current.source] ? item : current;
    const loser = winner === item ? current : item;

    const reasons = [winner.reasonFa, loser.reasonFa].filter(Boolean);
    const uniqueReasons = Array.from(new Set(reasons));

    const ingredient = findIngredientById(item.ingredientId);
    byIngredient.set(item.ingredientId, {
      ...winner,
      severity,
      // action از شدت نهایی مشتق می‌شود، نه از action یکی از دو طرف؛ وگرنه
      // یک ماده می‌توانست شدت «مهم» بگیرد ولی همچنان بگوید «کمترش کن».
      action: actionForSeverity(severity, ingredient ? isPrescription(ingredient) : false),
      reasonFa: uniqueReasons.join(' '),
      triggersFa: Array.from(new Set([...winner.triggersFa, ...loser.triggersFa])),
      // محدودترین دامنه برنده است: پرهیز عمومی، پرهیز ناحیه‌ای را می‌پوشاند.
      scope: winner.scope === 'region' && loser.scope !== 'region' ? loser.scope : winner.scope,
      scopeFa: winner.scope === 'region' && loser.scope !== 'region' ? loser.scopeFa : winner.scopeFa,
      untilIso: pickFurthest(winner.untilIso, loser.untilIso),
      alsoFromSources: Array.from(
        new Set([...(current.alsoFromSources || []), ...(item.alsoFromSources || []), loser.source]),
      ).filter((source) => source !== winner.source),
    });
  });

  return Array.from(byIngredient.values()).sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
}

function pickFurthest(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/* ------------------------------- آشتی ------------------------------- */

export interface ReconciledGuidance {
  /** فهرست نهایی «پیشنهاد می‌شود» — تضمیناً بدون هم‌پوشانی با هشدارها. */
  recommendedIds: string[];
  /**
   * ماده‌هایی که یک قاعده پیشنهادشان کرده بود ولی قاعدهٔ دیگری محدودشان
   * می‌کند. اینها به فهرست سبز نمی‌روند و فقط داخل کارت خودشان دیده می‌شوند.
   */
  withheldIds: string[];
  /** کارت‌های «حواست باشد» — هر چیزی با شدت CAUTION یا بالاتر. */
  advice: IngredientAdvice[];
  /**
   * دلیلِ پیشنهاد هر مادهٔ فهرست سبز، بر حسب شناسه.
   *
   * بدون این، یک ماده هم به‌عنوان چیپ سبز «پیشنهاد می‌شود» دیده می‌شد و هم
   * به‌عنوان یک کارت جداگانهٔ SUGGESTION با همان نام — دو بار، در یک صفحه.
   * حالا کارت‌ها فقط برای مواردی هستند که واقعاً توجه لازم دارند و دلیلِ
   * پیشنهاد روی خودِ چیپ سبز می‌نشیند.
   */
  reasonById: Record<string, string>;
  /** نکته‌های فقط-اطلاعی (INFO) که ممنوعیت نیستند. */
  notes: IngredientAdvice[];
}

/**
 * قاعدهٔ آشتی: هر ماده‌ای که توصیه‌ای با شدت CAUTION یا بالاتر دارد، از
 * فهرست «پیشنهاد می‌شود» بیرون می‌رود.
 *
 * مثال واقعی که قبلاً می‌شکست: کاربر ۳۰ سالهٔ پوست حساس. شاخهٔ سنی رتینول را
 * به recommended اضافه می‌کرد و avoidSkinTypes همان رتینول را با CAUTION به
 * هشدارها می‌فرستاد؛ کارت «ترکیبات امروز» هر دو چیپ را کنار هم نشان می‌داد.
 */
export function reconcileAdvice(
  recommendedIds: string[],
  rawAdvice: IngredientAdvice[],
): ReconciledGuidance {
  const merged = dedupeAdvice(rawAdvice);

  const restricted = new Set(
    merged.filter((item) => isAtLeast(item.severity, 'CAUTION')).map((item) => item.ingredientId),
  );

  const advice = merged.filter((item) => isAtLeast(item.severity, 'CAUTION'));
  // توصیه‌های «استفاده کن» کارت جدا نمی‌گیرند؛ دلیلشان روی چیپ سبز می‌نشیند.
  const positive = merged.filter((item) => !isAtLeast(item.severity, 'CAUTION') && item.action === 'use');
  const notes = merged.filter((item) => !isAtLeast(item.severity, 'CAUTION') && item.action !== 'use');

  const reasonById: Record<string, string> = {};
  positive.forEach((item) => {
    if (!reasonById[item.ingredientId]) reasonById[item.ingredientId] = item.reasonFa;
  });

  const withheldIds: string[] = [];
  const recommended: string[] = [];
  const seen = new Set<string>();

  // ماده‌هایی که یک قاعده صریحاً «استفاده کن» گفته هم وارد فهرست می‌شوند،
  // وگرنه توصیهٔ تسکینی علائم ساخته می‌شد و هیچ‌جا دیده نمی‌شد.
  [...recommendedIds, ...positive.map((item) => item.ingredientId)].forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (restricted.has(id)) withheldIds.push(id);
    else recommended.push(id);
  });

  return { recommendedIds: recommended, withheldIds, advice, reasonById, notes };
}

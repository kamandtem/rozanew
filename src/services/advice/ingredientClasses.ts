/**
 * پل بین دیتابیس ترکیبات و قواعد.
 *
 * جدی‌ترین گپ نسخهٔ قبل اینجا بود: فیلدهای activeClass، potency،
 * typicalUse، prescriptionOnly و pauseBeforeProcedures همه پر بودند ولی
 * صفر ارجاع داشتند. قواعد پروسیجر با دو آرایهٔ هاردکد ID کار می‌کردند:
 *
 *   ACIDS = [retinol, glycolic, salicylic, vitamin_c]
 *   STRONG_ACTIVES = [retinol, glycolic, salicylic]
 *
 * نتیجه‌اش این بود که ترتینوئین (قوی‌ترین رتینوئید دیتابیس)، آداپالن،
 * لاکتیک اسید و بنزویل پراکساید در هیچ قاعده‌ای نبودند — یعنی کاربرِ
 * ترتینوئین قبل از میکرونیدلینگ هیچ هشداری نمی‌گرفت ولی کاربر رتینول
 * ساده می‌گرفت. و ویتامین C که اسید لایه‌بردار نیست، داخل ACIDS بود.
 *
 * از این‌جا به بعد هیچ قاعده‌ای شناسهٔ ترکیب را هاردکد نمی‌کند؛ همه از
 * روی خصوصیت فارماکولوژیک انتخاب می‌شوند. اضافه شدن یک ترکیب جدید به
 * دیتابیس، خودکار همهٔ قواعد را پوشش می‌دهد.
 */

import { Ingredient } from '../../types';
import { INGREDIENTS_DATABASE, findIngredientById } from '../content/ingredients';
import { normalizeFa } from '../textNormalize';

export type ActiveClass = NonNullable<Ingredient['activeClass']>;
export type Potency = NonNullable<Ingredient['potency']>;

export const POTENCY_RANK: Record<Potency, number> = { gentle: 0, moderate: 1, strong: 2 };

/** دسته‌هایی که سد دفاعی را نازک می‌کنند — ملاک واقعی پرهیز پیش از پروسیجر. */
export const EXFOLIATING_CLASSES: ActiveClass[] = ['retinoid', 'aha', 'bha', 'benzoyl_peroxide'];

/**
 * ویتامین C لایه‌بردار نیست، ولی فرمول‌های L-ascorbic با pH پایین روی
 * سد دفاعیِ تازه آسیب‌دیده می‌سوزند. پس نه در فهرست «قطع کن» جای دارد و
 * نه باید کاملاً نادیده گرفته شود: فقط برای پروسیجرهای شدید و در سطح
 * «با احتیاط» مطرح می‌شود.
 */
export const IRRITANT_ON_COMPROMISED_BARRIER_CLASSES: ActiveClass[] = ['antioxidant'];

/** دسته‌های تسکینی/ترمیمی — این‌ها بعد از پروسیجر پیشنهاد می‌شوند، نه ممنوع. */
export const BARRIER_FRIENDLY_CLASSES: ActiveClass[] = ['hydrator', 'soother', 'barrier'];

/* --------------------------- تطبیق نام و حساسیت --------------------------- */

export { normalizeFa };

/** همهٔ نام‌های شناخته‌شدهٔ یک ترکیب (رسمی فارسی، لاتین، نام‌های رایج). */
export function allNamesOf(ingredient: Ingredient): string[] {
  return [ingredient.nameFa, ingredient.name, ...(ingredient.commonNamesFa || [])];
}

export interface AllergyMatch {
  hit: boolean;
  /** همان متنی که خود کاربر نوشته بود — در توضیح دلیل عیناً نشان داده می‌شود. */
  matchedTermFa?: string;
}

/**
 * تطبیق حساسیت ثبت‌شدهٔ کاربر با یک ترکیب.
 *
 * قبلاً safety.ts فارسی و انگلیسی را چک می‌کرد ولی recommendationEngine
 * فقط `ingredient.nameFa.includes(...)`. نتیجه: کسی که «Retinol» را
 * انگلیسی نوشته بود، در لایهٔ ایمنی هشدار می‌گرفت ولی منبع و شدتِ
 * توصیه‌اش اشتباه ساخته می‌شد. حالا یک تابع، همه‌جا.
 */
export function matchesAllergy(ingredient: Ingredient, allergies: string[] = []): AllergyMatch {
  const names = allNamesOf(ingredient).map(normalizeFa).filter(Boolean);
  for (const raw of allergies) {
    const needle = normalizeFa(raw);
    // کمتر از ۳ کاراکتر تطبیق جزئی نمی‌شود، وگرنه «ا» با همه‌چیز جور می‌شود.
    if (needle.length < 3) continue;
    if (names.some((name) => name.includes(needle) || needle.includes(name))) {
      return { hit: true, matchedTermFa: raw.trim() };
    }
  }
  return { hit: false };
}

/* --------------------------- انتخاب بر اساس دسته --------------------------- */

export function ingredientsOfClass(...classes: ActiveClass[]): Ingredient[] {
  return INGREDIENTS_DATABASE.filter(
    (item) => item.activeClass !== undefined && classes.includes(item.activeClass),
  );
}

export function idsOfClass(...classes: ActiveClass[]): string[] {
  return ingredientsOfClass(...classes).map((item) => item.id);
}

export function isAtLeastPotent(ingredient: Ingredient, minimum: Potency): boolean {
  const rank = POTENCY_RANK[ingredient.potency || 'moderate'];
  return rank >= POTENCY_RANK[minimum];
}

/** رتینوئیدهای تجویزی — رزا هرگز نمی‌گوید دستور پزشک را قطع کن. */
export function isPrescription(ingredient: Ingredient): boolean {
  return ingredient.prescriptionOnly === true;
}

export interface PauseSelection {
  /** ترکیباتی که واقعاً باید در بازهٔ پرهیز قطع شوند. */
  hardIds: string[];
  /** ترکیباتی که فقط «با احتیاط» مطرح می‌شوند (مثل ویتامین C یا شوینده‌های اسیدی). */
  softIds: string[];
  /** ترکیبات تجویزی داخل فهرست — پیام‌شان با پزشک هماهنگ می‌شود، نه قطع خودسرانه. */
  prescriptionIds: string[];
}

export interface PauseSelectionOptions {
  /** شدت پروسیجر: هرچه بالاتر، دامنهٔ پرهیز بازتر. */
  intensity: 'low' | 'medium' | 'high';
  /** حداقل قدرتی که در این پروسیجر اهمیت دارد. */
  minPotency?: Potency;
}

/**
 * قلب فایل: فهرست پرهیز یک پروسیجر را از خود دیتابیس می‌سازد.
 *
 * ملاک اصلی همان فیلدی است که تا امروز هیچ‌جا خوانده نمی‌شد:
 * `pauseBeforeProcedures`. با این کار ترتینوئین، آداپالن، لاکتیک اسید و
 * بنزویل پراکساید خودکار وارد قاعده می‌شوند و ویتامین C از فهرست
 * «قطع کن» بیرون می‌رود و به فهرست «با احتیاط» می‌آید.
 */
export function selectProcedurePauseIds(options: PauseSelectionOptions): PauseSelection {
  const minPotency: Potency = options.minPotency || (options.intensity === 'low' ? 'moderate' : 'gentle');

  const hardIds: string[] = [];
  const softIds: string[] = [];
  const prescriptionIds: string[] = [];

  INGREDIENTS_DATABASE.forEach((ingredient) => {
    const activeClass = ingredient.activeClass;
    const exfoliating = activeClass !== undefined && EXFOLIATING_CLASSES.includes(activeClass);
    const barrierIrritant =
      activeClass !== undefined && IRRITANT_ON_COMPROMISED_BARRIER_CLASSES.includes(activeClass);

    if (ingredient.pauseBeforeProcedures === true && exfoliating && isAtLeastPotent(ingredient, minPotency)) {
      // فقط در شوینده هست؟ تماس کوتاه دارد، پس «احتیاط» کافی است نه «قطع».
      if (ingredient.typicalUse === 'wash_off') softIds.push(ingredient.id);
      else hardIds.push(ingredient.id);

      if (isPrescription(ingredient)) prescriptionIds.push(ingredient.id);
      return;
    }

    // ویتامین C و آنتی‌اکسیدان‌های اسیدی: فقط پروسیجرهای شدید، فقط احتیاط.
    if (barrierIrritant && options.intensity === 'high') softIds.push(ingredient.id);
  });

  return { hardIds, softIds, prescriptionIds };
}

/** ترکیبات تسکینی که بعد از پروسیجر یا در فاز قاعدگی جای اکتیو را می‌گیرند. */
export function barrierRepairIds(): string[] {
  return idsOfClass(...BARRIER_FRIENDLY_CLASSES);
}

/** آیا این ترکیب یک اکتیو تحریک‌کننده است؟ ملاک حالت ملایم روتین. */
export function isIrritatingActive(ingredientId: string): boolean {
  const ingredient = findIngredientById(ingredientId);
  if (!ingredient) return false;
  const activeClass = ingredient.activeClass;
  if (activeClass !== undefined && EXFOLIATING_CLASSES.includes(activeClass)) return true;
  return ingredient.irritationRisk === 'high';
}

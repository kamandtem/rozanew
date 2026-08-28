/**
 * لایه ایمنی.
 *
 * در نسخه ۱، دیتابیس ترکیبات فیلد «ایمنی در بارداری» داشت و کامل هم
 * پر شده بود، ولی هیچ‌جا از کاربر پرسیده نمی‌شد و هیچ هشداری داده
 * نمی‌شد. این جدی‌ترین شکاف اپ بود. اینجا بسته می‌شود.
 */

import { Ingredient, Medication, Product, SkinProfile } from '../types';
import { INGREDIENTS_DATABASE, findIngredientById } from './content/ingredients';
import { isPrescription, matchesAllergy } from './advice/ingredientClasses';
import { getSensitivityLevel, isSensitiveSkin } from './advice/sensitivity';
import { resolveShelfProducts } from './advice/userContext';

export type SafetyLevel = 'blocked' | 'caution' | 'safe';

export interface SafetyVerdict {
  level: SafetyLevel;
  reasonsFa: string[];
}

/** وضعیت ایمنی یک ترکیب برای این کاربر خاص. */
export function evaluateIngredientSafety(
  ingredient: Ingredient,
  profile: SkinProfile,
  activeMedications: Medication[] = [],
): SafetyVerdict {
  const reasons: string[] = [];
  // سطح‌ها جمع می‌شوند و در پایان بالاترین انتخاب می‌شود. قبلاً یک closure
  // مقدار `level` را عوض می‌کرد و همین جلوی تحلیل جریانِ TypeScript را
  // می‌گرفت (خطای «این مقایسه بی‌معنی است» روی همین متغیر).
  const levels: SafetyLevel[] = ['safe'];
  const escalate = (next: SafetyLevel) => {
    levels.push(next);
  };
  const currentLevel = (): SafetyLevel =>
    levels.includes('blocked') ? 'blocked' : levels.includes('caution') ? 'caution' : 'safe';

  if (profile.isPregnant) {
    if (ingredient.pregnancySafety === 'avoid') {
      reasons.push('در دوران بارداری توصیه نمی‌شود.');
      escalate('blocked');
    } else if (ingredient.pregnancySafety === 'consult_doctor') {
      reasons.push('در بارداری قبل از مصرف با پزشک مشورت کنید.');
      escalate('caution');
    }
  }

  if (profile.isBreastfeeding) {
    if (ingredient.breastfeedingSafety === 'avoid') {
      reasons.push('در دوران شیردهی توصیه نمی‌شود.');
      escalate('blocked');
    } else if (ingredient.breastfeedingSafety === 'consult_doctor') {
      reasons.push('در شیردهی با پزشک مشورت کنید.');
      escalate('caution');
    }
  }

  // رتینوئید خوراکی: پوست خیلی حساس می‌شود و لایه‌برداری ممنوع است.
  //
  // قبلاً این شرط فقط `ingredient.id === 'ing_retinol'` بود، یعنی کاربری که
  // ترتینوئین یا آداپالن ثبت کرده بود هیچ هشداری نمی‌گرفت. حالا ملاک
  // activeClass است، پس هر رتینوئیدِ حال و آیندهٔ دیتابیس پوشش دارد.
  if (profile.onOralRetinoid) {
    if (ingredient.activeClass === 'retinoid') {
      reasons.push('همزمان با رتینوئید خوراکی، رتینوئید موضعی لازم نیست و پوست را می‌سوزاند.');
      escalate('blocked');
    }
    if (ingredient.activeClass === 'aha' || ingredient.activeClass === 'bha' || ingredient.category === 'exfoliant') {
      reasons.push('در دوره مصرف رتینوئید خوراکی، لایه‌برداری شیمیایی توصیه نمی‌شود.');
      escalate('blocked');
    }
    if (ingredient.activeClass === 'benzoyl_peroxide') {
      reasons.push('در دوره مصرف رتینوئید خوراکی، پوست خیلی خشک است و بنزویل پراکساید آن را بدتر می‌کند.');
      escalate('caution');
    }
  }

  if (ingredient.avoidSkinTypes.includes(profile.skinType)) {
    reasons.push('برای نوع پوست شما مناسب نیست.');
    escalate('caution');
  }

  // حساسیت از تعریف واحد اپ می‌آید، نه از شرط خام sensitivityScore >= 8
  // که با فرمول getSensitivityLevel ناهم‌خوان بود.
  if (isSensitiveSkin(profile) && ingredient.irritationRisk === 'high') {
    reasons.push('پوست شما حساس است و این ترکیب ریسک تحریک بالایی دارد.');
    escalate('caution');
  } else if (
    getSensitivityLevel(profile) === 'moderate' &&
    ingredient.irritationRisk === 'high' &&
    ingredient.potency === 'strong'
  ) {
    reasons.push('این ترکیب قوی است؛ با شیب ملایم و یک شب در میان شروع کنید.');
    escalate('caution');
  }

  // تطبیق حساسیت از تابع مشترک matchesAllergy می‌آید تا موتور توصیه و این
  // لایه هرگز به دو نتیجهٔ متفاوت نرسند (قبلاً موتور فقط فارسی چک می‌کرد).
  const allergy = matchesAllergy(ingredient, profile.allergies || []);
  if (allergy.hit) {
    reasons.push(`شما «${allergy.matchedTermFa}» را جزو حساسیت‌های خود ثبت کرده‌اید.`);
    escalate('blocked');
  }

  activeMedications
    .filter((medication) => medication.isActive)
    .forEach((medication) => {
      if ((medication.conflictingIngredientIds || []).includes(ingredient.id)) {
        reasons.push(`با داروی در حال مصرف شما (${medication.nameFa}) تداخل دارد.`);
        escalate('blocked');
      }
    });

  // رزا هرگز نمی‌گوید داروی تجویزی را قطع کن؛ سطح از blocked به caution
  // می‌آید و متن به «با پزشکت هماهنگ کن» تغییر می‌کند.
  let level = currentLevel();
  if (level === 'blocked' && isPrescription(ingredient) && !hasHardMedicalBlock(ingredient, profile)) {
    level = 'caution';
    reasons.push('این ترکیب تجویزی است؛ قطع یا ادامه‌اش را با پزشک تجویزکننده هماهنگ کن.');
  }

  return { level, reasonsFa: reasons };
}

/**
 * مواردی که حتی برای یک ترکیب تجویزی هم واقعاً منع مطلق‌اند
 * (بارداری/شیردهی و حساسیت ثبت‌شده). بقیهٔ موارد قابل مذاکره با پزشک‌اند.
 */
function hasHardMedicalBlock(ingredient: Ingredient, profile: SkinProfile): boolean {
  if (profile.isPregnant && ingredient.pregnancySafety === 'avoid') return true;
  if (profile.isBreastfeeding && ingredient.breastfeedingSafety === 'avoid') return true;
  return matchesAllergy(ingredient, profile.allergies || []).hit;
}

/** تداخل دو ترکیب با هم. دوطرفه بررسی می‌شود. */
export function checkPairConflict(
  first: Ingredient,
  second: Ingredient,
): { conflict: boolean; reasonFa: string } {
  if (first.id === second.id) {
    return { conflict: false, reasonFa: 'یک ترکیب یکسان انتخاب شده است. فقط دوز مصرف را کنترل کنید.' };
  }
  const conflict =
    first.avoidCombiningIds.includes(second.id) || second.avoidCombiningIds.includes(first.id);
  if (!conflict) {
    return {
      conflict: false,
      reasonFa: `${first.nameFa} و ${second.nameFa} در دیتابیس ما تداخل شناخته‌شده‌ای ندارند.`,
    };
  }
  const reason = first.conflictReasonFa || second.conflictReasonFa || 'مصرف همزمان این دو توصیه نمی‌شود.';
  return { conflict: true, reasonFa: `${first.nameFa} با ${second.nameFa}: ${reason}` };
}

export interface ShelfConflict {
  firstIngredientId: string;
  secondIngredientId: string;
  reasonFa: string;
  productNamesFa: string[];
  /** تداخل داخل یک محصول است، نه بین دو محصول. متن UI باید متفاوت باشد. */
  sameProduct: boolean;
}

/**
 * تداخل واقعی درون قفسه خود کاربر.
 * فرصتی که در نسخه ۱ کاملاً از دست رفته بود: تداخل‌سنج فقط دو ماده
 * انتخابی را چک می‌کرد، در حالی که می‌توانست بگوید سرم و کرم خودت با هم تداخل دارند.
 */
export function findShelfConflicts(products: Product[]): ShelfConflict[] {
  // ورودی از resolveShelfProducts می‌آید، پس هم customIngredients دستی‌نوشتهٔ
  // کاربر دیده می‌شود و هم تعریف «مالکیت» با بقیهٔ اپ یکی است.
  const owned = resolveShelfProducts(products);
  const conflicts: ShelfConflict[] = [];
  const seen = new Set<string>();

  const pushConflict = (
    idA: string,
    idB: string,
    reasonFa: string,
    productNamesFa: string[],
    sameProduct: boolean,
  ) => {
    const key = [idA, idB].sort().join('|') + '::' + [...productNamesFa].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    conflicts.push({ firstIngredientId: idA, secondIngredientId: idB, reasonFa, productNamesFa, sameProduct });
  };

  const evaluate = (idA: string, idB: string): string | null => {
    if (idA === idB) return null;
    const first = findIngredientById(idA);
    const second = findIngredientById(idB);
    if (!first || !second) return null;
    const result = checkPairConflict(first, second);
    return result.conflict ? result.reasonFa : null;
  };

  // تداخل درون یک محصول — قبلاً کاملاً دیده نمی‌شد چون فقط جفتِ محصولات
  // مقایسه می‌شد، در حالی که یک سرم می‌تواند خودش دو اکتیو ناسازگار داشته باشد.
  owned.forEach((product) => {
    product.ingredientIds.forEach((idA, index) => {
      product.ingredientIds.slice(index + 1).forEach((idB) => {
        const reason = evaluate(idA, idB);
        if (reason) pushConflict(idA, idB, reason, [product.nameFa], true);
      });
    });
  });

  owned.forEach((productA, indexA) => {
    owned.slice(indexA + 1).forEach((productB) => {
      // دو شوینده هرگز روی پوست هم‌زمان نمی‌مانند؛ هشدار تداخل بی‌مورد است.
      if (productA.washOff && productB.washOff) return;
      productA.ingredientIds.forEach((idA) => {
        productB.ingredientIds.forEach((idB) => {
          const reason = evaluate(idA, idB);
          if (reason) pushConflict(idA, idB, reason, [productA.nameFa, productB.nameFa], false);
        });
      });
    });
  });

  return conflicts;
}

/** ترکیباتی که برای این کاربر ممنوعند. موتور روتین از این استفاده می‌کند. */
export function getBlockedIngredientIds(profile: SkinProfile, medications: Medication[] = []): string[] {
  return INGREDIENTS_DATABASE.filter(
    (ingredient) => evaluateIngredientSafety(ingredient, profile, medications).level === 'blocked',
  ).map((ingredient) => ingredient.id);
}

/** جمله هشدار کلی بالای بخش‌های پزشکی. همه‌جا باید دیده شود. */
export const MEDICAL_DISCLAIMER_FA =
  'رزا جای پزشک را نمی‌گیرد و دارو تجویز نمی‌کند. این بخش فقط برای ثبت و یادآوری است. برای تشخیص و درمان به متخصص پوست مراجعه کنید.';

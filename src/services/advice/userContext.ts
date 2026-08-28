/**
 * زمینهٔ واقعی کاربر.
 *
 * دو کار که موتور توصیه قبلاً انجام نمی‌داد:
 *  ۱) می‌گوید کدام active واقعاً در محصولات خود کاربر هست و در کدام محصول.
 *  ۲) علائم واقعی روزهای اخیر پوست را از ثبت‌های خود کاربر درمی‌آورد.
 */

import { Product, SkinSignals } from '../../types';
import { findIngredientById, findIngredientByName } from '../content/ingredients';
import { LocalDB } from '../db';
import { addDays, getTodayIsoDate } from '../jalali';

/**
 * حساسیت یک تعریف دارد و آن در sensitivity.ts است. اینجا فقط برای
 * سازگاری import های موجود، دوباره صادر می‌شود — نه پیاده‌سازی دوباره.
 */
export {
  getSensitivityLevel,
  getSensitivityScore,
  isSensitiveSkin,
  SENSITIVITY_LABEL_FA,
  SENSITIVITY_HINT_FA,
} from './sensitivity';
export type { SensitivityLevel } from './sensitivity';

export interface ShelfActive {
  ingredientId: string;
  ingredientNameFa: string;
  /** نام محصول‌های خود کاربر که این ترکیب را دارند. */
  productNamesFa: string[];
  /** تعداد محصول دارای این active — چند محصول یعنی دوز تجمیعی بیشتر. */
  productCount: number;
  /** حداقل یک محصول ماندنی روی پوست (leave-on) دارد. */
  hasLeaveOn: boolean;
  /** فقط در محصول شسته‌شدنی (شوینده) است — ریسک تحریک کمتر. */
  washOffOnly: boolean;
}

const WASH_OFF_CATEGORIES = ['cleanser', 'mask'];

/**
 * تنها تعریف «این محصول را دارم».
 * قبلاً resolveShelfActives با `owned !== false` کار می‌کرد و بقیهٔ اپ با
 * `owned` truthy؛ یعنی محصولی که owned آن undefined بود در یک جا حساب
 * می‌شد و در جای دیگر نه.
 */
export function isOwned(product: { owned?: boolean }): boolean {
  return product.owned !== false;
}

/**
 * نقشهٔ active های واقعی کاربر.
 * هم ingredientIds خوانده می‌شود و هم متن آزاد customIngredients
 * (تا کاربران قدیمی که ترکیب را دستی نوشته‌اند از قاعده‌ها جا نمانند).
 */
export function resolveShelfActives(products: Product[]): Map<string, ShelfActive> {
  const map = new Map<string, ShelfActive>();

  products
    .filter(isOwned)
    .forEach((product) => {
      const label = `${product.brand || ''} ${product.name}`.trim();
      const washOff = WASH_OFF_CATEGORIES.includes(product.category);

      const ids = resolveProductIngredientIds(product);

      ids.forEach((id) => {
        const ingredient = findIngredientById(id);
        if (!ingredient) return;
        const current = map.get(id);
        if (current) {
          if (!current.productNamesFa.includes(label)) current.productNamesFa.push(label);
          current.productCount += 1;
          current.hasLeaveOn = current.hasLeaveOn || !washOff;
          current.washOffOnly = current.washOffOnly && washOff;
          return;
        }
        map.set(id, {
          ingredientId: id,
          ingredientNameFa: ingredient.nameFa,
          productNamesFa: [label],
          productCount: 1,
          hasLeaveOn: !washOff,
          washOffOnly: washOff,
        });
      });
    });

  return map;
}

/**
 * شناسه‌های ترکیبات یک محصول، شاملِ متن آزادِ customIngredients.
 *
 * findShelfConflicts قبلاً فقط ingredientIds را می‌دید، در حالی که
 * resolveShelfActives هم ingredientIds و هم customIngredients را resolve
 * می‌کرد. نتیجه: کاربری که ترکیب را دستی تایپ کرده بود در توصیه‌های روزانه
 * حساب می‌شد ولی در تداخل‌سنج قفسه نه. حالا هر دو از همین تابع می‌خوانند.
 */
export function resolveProductIngredientIds(product: Product): string[] {
  const ids = new Set<string>(product.ingredientIds || []);
  (product.customIngredients || []).forEach((text) => {
    const found = findIngredientByName(text);
    if (found) ids.add(found.id);
  });
  return Array.from(ids);
}

/** نمای یکدست محصولات قفسه برای هر تحلیلی که به ترکیبات نیاز دارد. */
export interface ResolvedProduct {
  id: string;
  nameFa: string;
  category: string;
  ingredientIds: string[];
  owned: boolean;
  washOff: boolean;
}

export function resolveShelfProducts(products: Product[]): ResolvedProduct[] {
  return products.filter(isOwned).map((product) => ({
    id: product.id,
    nameFa: `${product.brand || ''} ${product.name}`.trim(),
    category: product.category,
    ingredientIds: resolveProductIngredientIds(product),
    owned: true,
    washOff: WASH_OFF_CATEGORIES.includes(product.category),
  }));
}

const EMPTY_SIGNALS: SkinSignals = {
  hasData: false,
  redness: 0,
  dryness: 0,
  irritation: 0,
  acne: 0,
  oiliness: 0,
  daysCovered: 0,
  irritatedNow: false,
  sourceFa: '',
};

function scale10to5(value: number): number {
  return Math.max(0, Math.min(5, Math.round((value / 10) * 5)));
}

/**
 * علائم واقعی پوست در بازهٔ امروز تا دو روز قبل.
 * منبع: ثبت روزانه (rednessScore و ...) و ثبت علائم چرخه.
 * اگر داده‌ای نباشد hasData=false و هیچ قاعده‌ای حق ندارد علامت را حدس بزند.
 */
export function getSkinSignals(dateIso: string = getTodayIsoDate(), lookbackDays = 2): SkinSignals {
  const dates: string[] = [];
  for (let offset = 0; offset <= lookbackDays; offset += 1) dates.push(addDays(dateIso, -offset));

  const logs = LocalDB.getDailyLogs().filter((log) => dates.includes(log.date));
  const symptoms = LocalDB.getCycleSymptoms().filter((entry) => dates.includes(entry.date));
  if (logs.length === 0 && symptoms.length === 0) return EMPTY_SIGNALS;

  const pick = (values: number[]): number => (values.length ? Math.max(...values) : 0);

  const redness = pick([
    ...logs.map((log) => scale10to5(log.rednessScore || 0)),
    ...symptoms.map((entry) => entry.scores?.redness || 0),
  ]);
  const dryness = pick([
    ...logs.map((log) => scale10to5(log.drynessScore || 0)),
    ...symptoms.map((entry) => entry.scores?.dryness || 0),
  ]);
  const irritation = pick(symptoms.map((entry) => entry.scores?.sensitivity || 0));
  const acne = pick([
    ...logs.map((log) => scale10to5(log.acneScore || 0)),
    ...symptoms.map((entry) => entry.scores?.acne || 0),
  ]);
  const oiliness = pick([
    ...logs.map((log) => scale10to5(log.oilinessScore || 0)),
    ...symptoms.map((entry) => entry.scores?.oiliness || 0),
  ]);

  const daysCovered = new Set([...logs.map((log) => log.date), ...symptoms.map((entry) => entry.date)]).size;
  const parts: string[] = [];
  if (redness >= 3) parts.push('قرمزی');
  if (dryness >= 3) parts.push('خشکی');
  if (irritation >= 3) parts.push('سوزش یا حساسیت');

  return {
    hasData: true,
    redness,
    dryness,
    irritation,
    acne,
    oiliness,
    daysCovered,
    irritatedNow: parts.length > 0,
    sourceFa: parts.length > 0 ? `در ثبت‌های خودت ${parts.join(' و ')} ثبت شده` : '',
  };
}

/**
 * جملهٔ قابل‌نمایشِ «چه چیزی در ثبت‌های خودت این را فعال کرد».
 * sourceFa ساخته می‌شد و هیچ‌جا نمایش داده نمی‌شد؛ حالا این تابع تریگرهای
 * آماده برای کارت توصیه می‌دهد.
 */
export function signalTriggersFa(signals: SkinSignals): string[] {
  if (!signals.hasData) return [];
  const triggers: string[] = [];
  if (signals.redness >= 3) triggers.push('قرمزی ثبت‌شده در ثبت‌های خودت');
  if (signals.dryness >= 3) triggers.push('خشکی ثبت‌شده در ثبت‌های خودت');
  if (signals.irritation >= 3) triggers.push('سوزش یا حساسیت ثبت‌شده در ثبت‌های خودت');
  if (signals.acne >= 3) triggers.push('جوش ثبت‌شده در ثبت‌های خودت');
  if (signals.oiliness >= 4) triggers.push('چربی زیاد ثبت‌شده در ثبت‌های خودت');
  return triggers;
}

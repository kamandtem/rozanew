import { Ingredient, SkinConditionInfo, SkinProfile } from '../../types';
import { INGREDIENTS_DATABASE, findIngredientById } from '../content/ingredients';
import { SKIN_CONDITIONS_DATABASE } from '../content/conditions';
import { ARTICLES_DATABASE } from '../content/articles';
import { EXTRA_ARTICLES } from '../content/extraArticles';
import { TREND_ARTICLES } from '../content/trendArticles';
import { GUIDE_TOPICS, GuideTopic } from '../content/guideContent';
import { checkPairConflict, evaluateIngredientSafety } from '../safety';

/**
 * موتور «جستجوی هوشمند» رزا.
 *
 * قانون معماری مهم: این فایل هیچ فهرست دستی جداگانه‌ای از موضوعات
 * قابل‌جستجو ندارد. ایندکس هر بار مستقیماً از همان آرایه‌های دیتای
 * موجود (INGREDIENTS_DATABASE, SKIN_CONDITIONS_DATABASE, GUIDE_TOPICS،
 * و مجموع مقالات) در زمان اجرا ساخته می‌شود. یعنی وقتی یک آیتم جدید به
 * یکی از همان فایل‌های دیتا اضافه شود، بدون هیچ تغییری در این فایل،
 * خودبه‌خود در نتایج جستجو هم ظاهر می‌شود — چون این تابع هر بار از
 * روی همان آرایه‌ها (که رفرنس زنده به دیتای واقعی هستند) دوباره
 * ساخته می‌شود، نه از روی یک کپی یا فهرست ثابت جدا.
 *
 * صددرصد سمت کلاینت و بدون هیچ فراخوانی به مدل زبانی یا سرویس خارجی:
 * فقط نرمال‌سازی متن فارسی + تطبیق توکن + امتیازدهی ساده.
 */

export type SearchResultType = 'ingredient' | 'condition' | 'article' | 'guide' | 'interaction';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  score: number;
  titleFa: string;
  snippetFa: string;
  emoji?: string;
  imageUrl?: string;
  categoryFa?: string;
  /** برای نتایج ماده فعال: وضعیت ایمنی این ماده برای همین کاربر (اگر پروفایل داده شده باشد). */
  safetyLevel?: 'blocked' | 'caution' | 'safe';
  safetyReasonFa?: string;
  /** فقط برای type === 'interaction'. */
  interaction?: {
    firstIngredientId: string;
    secondIngredientId: string;
    conflict: boolean;
  };
}

/* ============================ نرمال‌سازی متن فارسی ============================ */

const STOPWORDS_FA = new Set([
  'و', 'یا', 'با', 'برای', 'از', 'در', 'به', 'که', 'این', 'آن',
  'است', 'هست', 'هستم', 'هستی', 'رو', 'را', 'می', 'شه', 'بشه',
  'چیه', 'چیست', 'چی', 'کن', 'کنم', 'آیا', 'یک', 'من', 'تو',
  'روی', 'بین', 'اگه', 'اگر', 'خیلی', 'یه',
]);

/** یکسان‌سازی حروف عربی/فارسی، حذف اعراب و علائم، تبدیل ارقام فارسی به لاتین. */
function normalizeFa(input: string): string {
  return input
    .replace(/[\u064B-\u0652]/g, '') // اعراب
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[‌\u200c]/g, ' ') // نیم‌فاصله -> فاصله برای تطبیق آسان‌تر
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // حذف علائم نگارشی
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  return normalizeFa(input)
    .split(' ')
    .filter((token) => token.length > 0 && !STOPWORDS_FA.has(token));
}

/* ============================ آیتم قابل‌جستجو (داخلی) ============================ */

interface IndexedItem {
  type: SearchResultType;
  id: string;
  titleFa: string;
  emoji?: string;
  imageUrl?: string;
  categoryFa?: string;
  snippetFa: string;
  /** متن نرمال‌شده‌ی عنوان/نام‌های رایج، برای امتیاز بالاتر. */
  primaryTextNorm: string;
  /** متن نرمال‌شده‌ی بدنه (توضیحات، علائم، تگ‌ها...)، برای امتیاز پایین‌تر. */
  bodyTextNorm: string;
  raw: Ingredient | SkinConditionInfo | GuideTopic | { id: string; titleFa: string };
}

/** مجموع مقالات از هر سه منبع دیتای مقاله؛ دقیقاً همان چیزی که KnowledgeCenter نمایش می‌دهد. */
function getAllArticles() {
  return [...ARTICLES_DATABASE, ...EXTRA_ARTICLES, ...TREND_ARTICLES];
}

/** ایندکس زنده — هر بار از روی آرایه‌های دیتای فعلی ساخته می‌شود. */
function buildIndex(): IndexedItem[] {
  const items: IndexedItem[] = [];

  INGREDIENTS_DATABASE.forEach((ingredient) => {
    const primary = [ingredient.nameFa, ingredient.name, ...(ingredient.commonNamesFa || [])].join(' ');
    const body = [
      ingredient.descriptionFa,
      ...ingredient.benefitsFa,
      ingredient.category,
      ingredient.activeClass || '',
    ].join(' ');
    items.push({
      type: 'ingredient',
      id: ingredient.id,
      titleFa: ingredient.nameFa,
      imageUrl: ingredient.imageUrl,
      categoryFa: 'ترکیبات و تداخل‌سنج',
      snippetFa: ingredient.descriptionFa,
      primaryTextNorm: normalizeFa(primary),
      bodyTextNorm: normalizeFa(body),
      raw: ingredient,
    });
  });

  SKIN_CONDITIONS_DATABASE.forEach((condition) => {
    const primary = condition.nameFa;
    const body = [
      condition.summaryFa,
      condition.descriptionFa,
      ...condition.symptomsFa,
      ...condition.possibleCausesFa,
    ].join(' ');
    items.push({
      type: 'condition',
      id: condition.id,
      titleFa: condition.nameFa,
      imageUrl: condition.imageUrl,
      categoryFa: 'عوارض پوستی',
      snippetFa: condition.summaryFa,
      primaryTextNorm: normalizeFa(primary),
      bodyTextNorm: normalizeFa(body),
      raw: condition,
    });
  });

  GUIDE_TOPICS.forEach((topic) => {
    const primary = topic.titleFa;
    const body = topic.sectionsFa.map((section) => `${section.labelFa} ${section.textFa}`).join(' ');
    items.push({
      type: 'guide',
      id: topic.id,
      titleFa: topic.titleFa,
      emoji: topic.emoji,
      imageUrl: topic.imageUrl,
      categoryFa: 'راهنمای استفاده از رزا',
      snippetFa: topic.sectionsFa[0]?.textFa || '',
      primaryTextNorm: normalizeFa(primary),
      bodyTextNorm: normalizeFa(body),
      raw: topic,
    });
  });

  getAllArticles().forEach((article) => {
    const primary = article.titleFa;
    const body = [article.summaryFa, ...article.tagsFa, article.fullContentFa].join(' ');
    items.push({
      type: 'article',
      id: article.id,
      titleFa: article.titleFa,
      imageUrl: article.imageUrl,
      categoryFa: article.categoryFa,
      snippetFa: article.summaryFa,
      primaryTextNorm: normalizeFa(primary),
      bodyTextNorm: normalizeFa(body),
      raw: article,
    });
  });

  return items;
}

/* ============================ امتیازدهی ============================ */

function scoreItem(item: IndexedItem, queryNorm: string, tokens: string[]): number {
  let score = 0;

  // تطبیق کامل عبارت جستجو در عنوان -> بالاترین امتیاز.
  if (queryNorm.length > 1 && item.primaryTextNorm.includes(queryNorm)) {
    score += 20;
  }

  tokens.forEach((token) => {
    if (token.length < 2) return;
    // تطبیق دقیق کلمه در عنوان/نام‌های رایج
    const primaryWords = item.primaryTextNorm.split(' ');
    if (primaryWords.includes(token)) {
      score += 10;
    } else if (item.primaryTextNorm.includes(token)) {
      score += 6;
    } else if (item.bodyTextNorm.includes(token)) {
      score += 3;
    }
  });

  return score;
}

/* ============================ تشخیص «تداخل X با Y» ============================ */

function findIngredientByLooseName(needleNorm: string): Ingredient | undefined {
  if (!needleNorm) return undefined;
  return INGREDIENTS_DATABASE.find((ingredient) => {
    const names = [ingredient.nameFa, ingredient.name, ...(ingredient.commonNamesFa || [])];
    return names.some((name) => {
      const normalized = normalizeFa(name);
      return normalized === needleNorm || normalized.includes(needleNorm) || needleNorm.includes(normalized);
    });
  });
}

/**
 * اگر جستجو شبیه «رتینول با ویتامین C» یا «تداخل نیاسینامید و رتینول» باشد،
 * سعی می‌کند دو ماده فعال را در همان متن پیدا کند و نتیجه تداخل واقعی را
 * (با استفاده از همان checkPairConflict که تداخل‌سنج اصلی استفاده می‌کند) برگرداند.
 */
function detectInteractionQuery(queryRaw: string): SearchResult | null {
  const normalized = normalizeFa(queryRaw);
  // توجه: \b در JS بر اساس \w (فقط لاتین/ارقام) تعریف می‌شود و روی حروف
  // فارسی درست کار نمی‌کند، پس به‌جای regex با word boundary، متن را
  // به توکن‌های جدا با فاصله می‌شکنیم و پشت‌سرهم توکن‌هایی که «جداکننده»
  // نیستند را به‌عنوان بخش‌های نام ماده به هم می‌چسبانیم.
  const splitWords = new Set(['با', 'و', 'تداخل', 'ترکیب']);
  const words = normalized.split(' ').filter(Boolean);

  const segments: string[] = [];
  let current: string[] = [];
  words.forEach((word) => {
    if (splitWords.has(word)) {
      if (current.length) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(word);
    }
  });
  if (current.length) segments.push(current.join(' '));

  const candidateSegments = segments.map((part) => part.trim()).filter((part) => part.length > 1);
  if (candidateSegments.length < 2) return null;

  let first: Ingredient | undefined;
  let second: Ingredient | undefined;
  for (const segment of candidateSegments) {
    const match = findIngredientByLooseName(segment);
    if (!match) continue;
    if (!first) first = match;
    else if (match.id !== first.id && !second) second = match;
  }

  if (!first || !second) return null;

  const result = checkPairConflict(first, second);
  return {
    type: 'interaction',
    id: `${first.id}__${second.id}`,
    score: 1000, // همیشه بالاترین نتیجه — دقیقاً همان چیزی است که کاربر پرسیده
    titleFa: `${first.nameFa} + ${second.nameFa}`,
    snippetFa: result.reasonFa,
    categoryFa: 'تداخل‌سنج',
    interaction: { firstIngredientId: first.id, secondIngredientId: second.id, conflict: result.conflict },
  };
}

/* ============================ API عمومی ============================ */

const MAX_RESULTS = 10;
/** زیر این امتیاز، تطبیق فقط یک کلمه‌ی عمومی داخل متن بدنه است — به اندازه کافی مرتبط نیست که نشان داده شود. */
const MIN_SCORE = 6;

/**
 * جستجوی هوشمند اصلی. کاملاً سمت کلاینت و آفلاین.
 * @param queryRaw متن جستجوی خام کاربر (فارسی محاوره‌ای، انگلیسی یا ترکیبی)
 * @param profile پروفایل پوستی کاربر (اختیاری) — اگر داده شود، نتایج ماده فعال
 *                بر اساس ایمنی برای همین کاربر برچسب‌گذاری و اولویت‌بندی می‌شوند.
 */
export function searchRoza(queryRaw: string, profile?: SkinProfile): SearchResult[] {
  const query = queryRaw.trim();
  if (query.length < 2) return [];

  const results: SearchResult[] = [];

  const interactionResult = detectInteractionQuery(query);
  if (interactionResult) {
    results.push(interactionResult);
  }

  const queryNorm = normalizeFa(query);
  const tokens = tokenize(query);
  if (tokens.length === 0) return results;

  const index = buildIndex();

  const scored = index
    .map((item) => ({ item, score: scoreItem(item, queryNorm, tokens) }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  scored.forEach(({ item, score }) => {
    let safetyLevel: SearchResult['safetyLevel'];
    let safetyReasonFa: string | undefined;

    if (item.type === 'ingredient' && profile) {
      const ingredient = item.raw as Ingredient;
      const verdict = evaluateIngredientSafety(ingredient, profile);
      safetyLevel = verdict.level;
      safetyReasonFa = verdict.reasonsFa[0];
    }

    results.push({
      type: item.type,
      id: item.id,
      score,
      titleFa: item.titleFa,
      snippetFa: item.snippetFa,
      emoji: item.emoji,
      imageUrl: item.imageUrl,
      categoryFa: item.categoryFa,
      safetyLevel,
      safetyReasonFa,
    });
  });

  // اولویت‌بندی بر اساس پروفایل: نتایجی که برای این کاربر «ممنوع/احتیاط» هستند
  // بالاتر می‌آیند، چون احتمالاً همان چیزی است که کاربر نگرانش است.
  if (profile) {
    const weight = (level?: SearchResult['safetyLevel']) => (level === 'blocked' ? 2 : level === 'caution' ? 1 : 0);
    results.sort((a, b) => {
      if (a.type === 'interaction' || b.type === 'interaction') return 0;
      const weightDiff = weight(b.safetyLevel) - weight(a.safetyLevel);
      if (weightDiff !== 0 && a.score - b.score < 8) return weightDiff;
      return b.score - a.score;
    });
  }

  return results;
}

/** برای تست دستی/دیباگ: اندازه فعلی ایندکس به تفکیک نوع. */
export function getSearchIndexStats(): Record<SearchResultType, number> {
  const index = buildIndex();
  return {
    ingredient: index.filter((item) => item.type === 'ingredient').length,
    condition: index.filter((item) => item.type === 'condition').length,
    guide: index.filter((item) => item.type === 'guide').length,
    article: index.filter((item) => item.type === 'article').length,
    interaction: 0,
  };
}

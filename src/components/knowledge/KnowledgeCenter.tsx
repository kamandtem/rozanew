import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, Clock, Search, ShieldAlert, Tag, X } from 'lucide-react';
import { Article, SkinConditionInfo } from '../../types';
import { ARTICLES_DATABASE } from '../../services/db';
import { EXTRA_ARTICLES } from '../../services/content/extraArticles';
import { TREND_ARTICLES } from '../../services/content/trendArticles';
import { SKIN_CONDITIONS_DATABASE } from '../../services/content/conditions';
import { toPersianDigits } from '../../services/jalali';

/**
 * پایگاه دانش آفلاین.
 *
 * دو زیربخش مجزا دارد: «مقالات» (تایم‌لاین شماره‌دار) و «عوارض پوستی»
 * (که قبلاً داخل بخش ترکیبات/تداخل‌سنج بود و از آنجا به اینجا منتقل شد،
 * چون از نظر محتوایی به دانشنامه نزدیک‌تر است تا به ابزار تداخل‌سنجی).
 * این دو با هم قاطی نمی‌شوند؛ یک سوییچ تب بالای صفحه بینشان جابه‌جا می‌کند.
 */
interface KnowledgeCenterProps {
  /** دیپ‌لینک از جستجوی هوشمند: مستقیم یک مقاله خاص را باز کن. */
  initialArticleId?: string | null;
  /** دیپ‌لینک از جستجوی هوشمند: مستقیم تب عوارض پوستی را باز کن و روی این عارضه اسکرول کن. */
  initialConditionId?: string | null;
  onConsumedInitialDeepLink?: () => void;
}

export const KnowledgeCenter: React.FC<KnowledgeCenterProps> = ({
  initialArticleId,
  initialConditionId,
  onConsumedInitialDeepLink,
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'conditions'>('articles');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Article | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [conditionSearch, setConditionSearch] = useState('');
  const [highlightedConditionId, setHighlightedConditionId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'همه' },
    { id: 'cat_routines', label: 'روتین' },
    { id: 'cat_ingredients', label: 'ترکیبات' },
    { id: 'cat_hormones', label: 'چرخه' },
    { id: 'cat_sun_protection', label: 'ضدآفتاب' },
    { id: 'cat_hair', label: 'مو' },
  ];
  const articles = [...ARTICLES_DATABASE, ...EXTRA_ARTICLES, ...TREND_ARTICLES].filter((article) => {
    const text = `${article.titleFa} ${article.summaryFa} ${article.tagsFa.join(' ')}`;
    return (category === 'all' || article.categoryId === category) && (!query.trim() || text.includes(query.trim()));
  });

  const filteredConditions = SKIN_CONDITIONS_DATABASE.filter((condition) => {
    const needle = conditionSearch.trim();
    if (!needle) return true;
    return (
      condition.nameFa.includes(needle) ||
      condition.summaryFa.includes(needle) ||
      condition.symptomsFa.some((symptom) => symptom.includes(needle))
    );
  });

  // دیپ‌لینک از جستجوی هوشمند: مستقیم همان مقاله را باز کن.
  React.useEffect(() => {
    if (!initialArticleId) return;
    const article = [...ARTICLES_DATABASE, ...EXTRA_ARTICLES, ...TREND_ARTICLES].find(
      (item) => item.id === initialArticleId,
    );
    if (article) {
      setActiveTab('articles');
      setSelected(article);
    }
    onConsumedInitialDeepLink?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialArticleId]);

  // دیپ‌لینک از جستجوی هوشمند: تب عوارض پوستی را باز کن و روی همان عارضه هایلایت بزن.
  React.useEffect(() => {
    if (!initialConditionId) return;
    const exists = SKIN_CONDITIONS_DATABASE.some((item) => item.id === initialConditionId);
    if (exists) {
      setActiveTab('conditions');
      setConditionSearch('');
      setHighlightedConditionId(initialConditionId);
      window.setTimeout(() => {
        document.getElementById(initialConditionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      window.setTimeout(() => setHighlightedConditionId((current) => (current === initialConditionId ? null : current)), 3000);
    }
    onConsumedInitialDeepLink?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConditionId]);

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] pt-3 px-4 max-w-lg mx-auto space-y-4">
      <div className="rounded-[1.7rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <button onClick={() => setIntroOpen((value) => !value)} className="w-full p-4 flex items-center justify-between text-right">
          <span className="flex items-center gap-2 text-sm font-black text-[#263b56] dark:text-white">
            <BookOpen className="w-5 h-5 text-rose-500" />
            پایگاه دانش آفلاین
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${introOpen ? 'rotate-180' : ''}`} />
        </button>
        {introOpen && (
          <div className="px-4 pb-4 space-y-1">
            <h2 className="text-lg font-black text-[#263b56] dark:text-white">یادگیری کوتاه، از پایه تا کاربرد</h2>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">اول خلاصه ساده را بخوان. هر مقاله فقط یک نکته اصلی دارد و اگر خواستی، جزئیات بیشتر را باز کن.</p>
          </div>
        )}
      </div>

      {/* سوییچ مقالات / عوارض پوستی */}
      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
        {(
          [
            { key: 'articles' as const, labelFa: `مقالات (${toPersianDigits(articles.length)})` },
            { key: 'conditions' as const, labelFa: `عوارض پوستی (${toPersianDigits(SKIN_CONDITIONS_DATABASE.length)})` },
          ]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-900 text-[#8e5241] dark:text-rose-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tab.labelFa}
          </button>
        ))}
      </div>

      {/* ------------------------- مقالات ------------------------- */}
      {activeTab === 'articles' && (
        <>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جستجوی مقاله یا ترکیب"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pr-11 pl-4 text-sm font-bold"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {categories.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${category === item.id ? 'bg-[#263b56] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/*
            باگ قبلی: شماره‌ی دایره‌ای هر مقاله با «right-0» نسبت به کارت خودش
            جای‌گذاری می‌شد، نه نسبت به کانتینر بیرونی که خط‌چین رویش است.
            چون آن کارت داخل یک کانتینر با pr-10 (فاصله‌ی رزرو‌شده برای
            خط‌چین) قرار دارد، «right-0» عملاً شماره را روی لبه‌ی خودِ کارت
            می‌انداخت، نه روی خط‌چین کنارش. با یک offset منفی دقیق، الان
            دایره‌ی شماره درست وسط خط‌چین می‌نشیند.
          */}
          <div className="relative pr-10">
            <div className="absolute right-3 top-3 bottom-3 border-r-2 border-dashed border-rose-200 dark:border-rose-900" />
            <div className="space-y-4">
              {articles.map((article, index) => (
                <div key={article.id} className="relative">
                  <span className="absolute right-[-42px] top-5 z-10 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center ring-4 ring-[#faf8f5] dark:ring-slate-950">
                    {toPersianDigits(index + 1)}
                  </span>
                  <button
                    onClick={() => setSelected(article)}
                    className="w-full text-right rounded-[1.4rem] ml-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 pr-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-rose-600">
                        <Tag className="w-3.5 h-3.5" />
                        {article.categoryFa}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {toPersianDigits(article.readTimeMin)} دقیقه
                      </span>
                    </div>
                    {article.imageUrl && (
                      <img src={article.imageUrl} alt="" className="mt-3 w-full h-32 rounded-xl object-cover" loading="lazy" />
                    )}
                    <h3 className="mt-3 text-base font-black text-[#263b56] dark:text-white leading-7">{article.titleFa}</h3>
                    <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400 line-clamp-2">{article.summaryFa}</p>
                    <span className="block mt-3 text-xs font-bold text-rose-600">خواندن خلاصه و جزئیات</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ------------------------- عوارض پوستی ------------------------- */}
      {activeTab === 'conditions' && (
        <div className="space-y-3">
          <div className="relative">
            <input
              value={conditionSearch}
              onChange={(event) => setConditionSearch(event.target.value)}
              placeholder="جستجو در عوارض پوستی"
              className="w-full py-3 pr-11 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 text-sm font-bold"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>

          {filteredConditions.map((condition) => (
            <ConditionCard key={condition.id} condition={condition} highlighted={highlightedConditionId === condition.id} />
          ))}
        </div>
      )}

      {/* با createPortal مستقیم به document.body — وگرنه داخل کانتینر fixed z-20 بخش گیر
          می‌افتد و با وجود z-50 باز هم زیر هدر/نوبار پایین (بیرون از آن کانتینر) دیده می‌شود. */}
      {selected && createPortal(
        <div className="fixed inset-0 z-50 bg-[#20334d]/45 backdrop-blur-xs flex items-center justify-center p-4">
          <article className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[2rem] bg-[#fffdf9] dark:bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-rose-600">{selected.categoryFa}</span>
                <h2 className="mt-1 text-xl font-black text-[#263b56] dark:text-white leading-8">{selected.titleFa}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            {selected.imageUrl && <img src={selected.imageUrl} alt="" className="mt-4 w-full h-44 rounded-2xl object-cover" />}
            <p className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-bold leading-8 text-slate-700 dark:text-slate-200">{selected.summaryFa}</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-600 dark:text-slate-300">{selected.fullContentFa}</p>
            <button onClick={() => setSelected(null)} className="mt-5 w-full rounded-2xl bg-[#263b56] py-3 text-sm font-bold text-white">بستن</button>
          </article>
        </div>,
        document.body,
      )}
    </div>
  );
};

const ConditionCard: React.FC<{ condition: SkinConditionInfo; highlighted?: boolean }> = ({ condition, highlighted }) => {
  const detailsRef = React.useRef<HTMLDetailsElement>(null);

  // وقتی از جستجوی هوشمند به این عارضه هدایت می‌شویم، خودش را باز کن
  // (imperative روی ref، نه prop کنترل‌شده — details اصلاً حالت کنترل‌شده تمیزی در React ندارد).
  React.useEffect(() => {
    if (highlighted && detailsRef.current) detailsRef.current.open = true;
  }, [highlighted]);

  return (
  <details
    ref={detailsRef}
    id={condition.id}
    className={`group rounded-3xl bg-white dark:bg-slate-900 border overflow-hidden transition-colors ${
      highlighted ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900' : 'border-rose-100 dark:border-slate-800'
    }`}
  >
    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      {/* عکس بزرگ و تمام‌عرض — قبلاً فقط تامبنیل ۴۸ در ۴۸ بود و عکس عارضه عملاً دیده نمی‌شد.
          حالا مثل کارت مقالات، عکس تمام‌عرض بالای کارت است. */}
      {condition.imageUrl && (
        <img
          src={condition.imageUrl}
          alt={condition.nameFa}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4 flex items-center gap-3">
        <span className="flex-1 font-black text-sm text-slate-800 dark:text-white">{condition.nameFa}</span>
        <ChevronDown className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" />
      </div>
    </summary>

    <div className="px-4 pb-4 pt-1 space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{condition.descriptionFa}</p>

      {condition.symptomsFa.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-black text-slate-700 dark:text-slate-300">علائم</span>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 pr-4 list-disc leading-relaxed">
            {condition.symptomsFa.map((symptom, index) => (
              <li key={index}>{symptom}</li>
            ))}
          </ul>
        </div>
      )}

      {condition.recommendedHabitsFa.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">عادت‌های مفید</span>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 pr-4 list-disc leading-relaxed">
            {condition.recommendedHabitsFa.map((habit, index) => (
              <li key={index}>{habit}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {condition.needsDoctorFa || 'اگر علامت‌ها شدید یا ماندگار هستند، به متخصص پوست مراجعه کن. رزا تشخیص نمی‌دهد.'}
        </span>
      </p>
    </div>
  </details>
  );
};

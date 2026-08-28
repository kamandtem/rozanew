import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  Compass,
  FlaskConical,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { SkinProfile } from '../../types';
import { SearchResult, searchRoza } from '../../services/search/searchEngine';

/**
 * جستجوی هوشمند رزا.
 *
 * ورودی محاوره‌ای یا کلیدواژه‌ای می‌گیرد و مستقیم به کارت/مودال موجود
 * همان ماده، عارضه، مقاله یا موضوع آموزشی وصل می‌کند — چیزی را اینجا
 * دوباره‌نویسی نمی‌کند. منطق تطبیق و امتیازدهی در
 * services/search/searchEngine.ts است؛ این کامپوننت فقط نمایش می‌دهد.
 */

interface SmartSearchModalProps {
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
  profile?: SkinProfile;
}

const TYPE_META: Record<
  SearchResult['type'],
  { labelFa: string; icon: React.ComponentType<{ className?: string }>; colorClass: string }
> = {
  ingredient: { labelFa: 'ماده فعال', icon: FlaskConical, colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
  condition: { labelFa: 'عارضه پوستی', icon: ShieldAlert, colorClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40' },
  article: { labelFa: 'مقاله', icon: BookOpen, colorClass: 'text-sky-700 bg-sky-50 dark:bg-sky-950/40' },
  guide: { labelFa: 'راهنمای رزا', icon: Compass, colorClass: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40' },
  interaction: { labelFa: 'تداخل‌سنج', icon: AlertTriangle, colorClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40' },
};

const SAFETY_CHIP: Record<NonNullable<SearchResult['safetyLevel']>, string> = {
  blocked: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200',
  caution: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
  safe: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200',
};

const SAFETY_LABEL: Record<NonNullable<SearchResult['safetyLevel']>, string> = {
  blocked: 'برای تو توصیه نمی‌شود',
  caution: 'با احتیاط',
  safe: 'مناسب تو',
};

const EXAMPLE_QUERIES = ['رتینول با ویتامین C اوکیه؟', 'پوستم قرمز شده و می‌سوزه', 'سرسیاه', 'ضدآفتاب'];

export const SmartSearchModal: React.FC<SmartSearchModalProps> = ({ onClose, onSelectResult, profile }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchRoza(query, profile), [query, profile]);
  const trimmed = query.trim();

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-[#20334d]/45 backdrop-blur-xs flex flex-col pt-[calc(var(--safe-top)+0.75rem)] pb-[calc(var(--safe-bottom)+0.75rem)] px-4">
      <div className="max-w-lg w-full mx-auto flex-1 min-h-0 flex flex-col bg-[#faf8f5] dark:bg-slate-950 rounded-[1.8rem] shadow-2xl overflow-hidden">
        {/* هدر جستجو */}
        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-black text-[#263b56] dark:text-white">
              <Sparkles className="w-5 h-5 text-rose-500" />
              جستجوی هوشمند
            </span>
            <button
              onClick={onClose}
              aria-label="بستن"
              className="icon-only p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute right-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="مثلاً «رتینول با ویتامین C اوکیه؟» یا «پوستم قرمز شده»"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pr-11 pl-4 text-sm font-bold text-[#263b56] dark:text-white"
            />
          </div>
        </div>

        {/* نتایج */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
          {trimmed.length < 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                هر چیزی که به ذهنت می‌رسد را بنویس — رزا در ترکیبات، عوارض پوستی، مقالات و راهنما جستجو می‌کند.
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trimmed.length >= 2 && results.length === 0 && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 text-center space-y-1.5">
              <p className="text-sm font-black text-[#263b56] dark:text-white">چیزی پیدا نشد</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                رزا فقط از دیتای همین اپ جواب می‌دهد و چیزی حدسی نمی‌سازد. با کلمه دیگری امتحان کن، یا از بخش «ترکیبات»
                و «پایگاه دانش» بگرد.
              </p>
            </div>
          )}

          {results.map((result) => (
            <SearchResultCard key={`${result.type}_${result.id}`} result={result} onSelect={() => onSelectResult(result)} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const SearchResultCard: React.FC<{ result: SearchResult; onSelect: () => void }> = ({ result, onSelect }) => {
  const meta = TYPE_META[result.type];
  const Icon = meta.icon;

  if (result.type === 'interaction' && result.interaction) {
    return (
      <button
        onClick={onSelect}
        className={`w-full text-right rounded-3xl border p-4 space-y-2 ${
          result.interaction.conflict
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
        }`}
      >
        <div className="flex items-center gap-2">
          {result.interaction.conflict ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="text-sm font-black text-slate-800 dark:text-white">{result.titleFa}</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{result.snippetFa}</p>
        <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
          دیدن در تداخل‌سنج
          <ChevronLeft className="w-3.5 h-3.5" />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      className="w-full text-right rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 flex items-start gap-3"
    >
      {result.imageUrl ? (
        <img src={result.imageUrl} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0" loading="lazy" />
      ) : (
        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${meta.colorClass}`}>
          <Icon className="w-5 h-5" />
        </span>
      )}
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${meta.colorClass}`}>{meta.labelFa}</span>
          {result.safetyLevel && (
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${SAFETY_CHIP[result.safetyLevel]}`}>
              {SAFETY_LABEL[result.safetyLevel]}
            </span>
          )}
        </span>
        <span className="block text-sm font-black text-[#263b56] dark:text-white truncate">{result.titleFa}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
          {result.safetyReasonFa || result.snippetFa}
        </span>
      </span>
      <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
    </button>
  );
};

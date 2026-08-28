import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Flame,
  Droplet,
  ShieldAlert,
  Sun,
  Scissors,
  CalendarClock,
  ChevronLeft,
  AlertTriangle,
  Moon as MoonIcon,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DailyTrackerEntry, Product, UserState, WeatherData } from '../../types';
import { buildDailyGuidance, ingredientNamesFa } from '../../services/recommendationEngine';
import { SEVERITY_HINT_FA, SEVERITY_LABEL_FA, SEVERITY_STYLE } from '../../services/advice/severity';
import { findGuideTopicForSource, findWhyTopicForIngredientAdvice } from '../../services/content/guideContent';
import { findIngredientById } from '../../services/content/ingredients';
import { CATEGORY_LABELS } from '../products/ProductShelf';
import { getUpcomingAppointments } from '../../services/providers/appointmentService';
import { LocalDB } from '../../services/db';
import { formatJalaliDayMonth, formatRelativeDay, toPersianDigits } from '../../services/jalali';
import { HormoneCycleCard } from './HormoneCycleCard';
import { WeatherClimateCard } from './WeatherClimateCard';
import { Monthly30DayTracker } from './Monthly30DayTracker';
import type { NavTab } from '../layout/BottomNavigation';
import type { SectionKey } from '../../App';

/** چهار علامت واقعی پوست که موتور توصیه از آن‌ها می‌خواند. */
const SKIN_SIGNAL_FIELDS: { key: 'rednessScore' | 'drynessScore' | 'acneScore' | 'oilinessScore'; labelFa: string }[] = [
  { key: 'rednessScore', labelFa: 'قرمزی' },
  { key: 'drynessScore', labelFa: 'خشکی یا کشیدگی' },
  { key: 'acneScore', labelFa: 'جوش' },
  { key: 'oilinessScore', labelFa: 'چربی' },
];

/** نام ترکیب به‌همراه مشهورترین شکل محصولش، مثلاً «رتینول ← سرم». */
function ingredientNameWithForm(ingredientId: string, fallbackNameFa: string): string {
  const ingredient = findIngredientById(ingredientId);
  const formLabel = ingredient?.commonCategoryIds?.[0] ? CATEGORY_LABELS[ingredient.commonCategoryIds[0]] : undefined;
  const name = ingredient?.nameFa || fallbackNameFa;
  return formLabel ? `${name} ← ${formLabel}` : name;
}

interface HomeDashboardProps {
  userState: UserState;
  products: Product[];
  todayLog: DailyTrackerEntry;
  weather: WeatherData;
  onRequestWeatherLocation?: () => void;
  weatherLocationLoading?: boolean;
  weatherLocationError?: boolean;
  /** پیام دقیق خطای موقعیت (رد دسترسی، GPS خاموش، Timeout، ...). */
  weatherLocationErrorFa?: string | null;
  cycleVisible: boolean;
  onUpdateDailyLog: (log: DailyTrackerEntry) => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenSection: (section: SectionKey) => void;
  onOpenGuideTopic?: (topicId: string) => void;
  focusRequest?: { target: 'sunscreen'; requestedAt: number } | null;
  /**
   * وقتی focusRequest واقعاً مصرف شد (اسکرول انجام شد) صدا زده می‌شود تا
   * والد آن را null کند. بدون این، چون این کامپوننت هر بار که کاربر از
   * تب دیگری به خانه برمی‌گردد از نو mount می‌شود، همان focusRequest قدیمی
   * (که فقط باید یک‌بار — همان لحظه‌ی زدن «تجدید ضدآفتاب» — اثر کند) دوباره
   * effect را با mount جدید اجرا می‌کرد و هر ورود به خانه را می‌کشاند به
   * کارت ثبت سریع.
   */
  onFocusRequestHandled?: () => void;
}

const WhyButton: React.FC<{ topicId?: string; onOpenGuideTopic?: (topicId: string) => void; className?: string }> = ({ topicId, onOpenGuideTopic, className = '' }) => {
  if (!topicId || !onOpenGuideTopic) return null;
  return (
    <button
      onClick={() => onOpenGuideTopic(topicId)}
      className={`shrink-0 text-[11px] font-black underline underline-offset-2 ${className}`}
    >
      چرا؟
    </button>
  );
};

/**
 * دکمه بستن (×) برای پیام‌های اختیاری/توصیه‌ای پنل خانه.
 *
 * فقط برای پیام‌های راهنمایی/بینش استفاده می‌شود (لایف‌استایل، پرهیز نوبت،
 * هشدار ایمنی، هشدار پیش از قاعدگی) — نه برای کارت «نوبت بعدی» که یک
 * یادآور واقعی نوبت آرایشگاه/پزشک است و عمداً بی‌تغییر ماند.
 */
const DismissButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = '' }) => (
  <button
    onClick={onClick}
    aria-label="بستن این پیام"
    className={`shrink-0 p-1 rounded-full active:scale-90 transition-transform ${className}`}
  >
    <X className="w-3.5 h-3.5" />
  </button>
);

const DISMISS_KEYS = {
  lifestyle: 'roza_dismissed_lifestyle_insight',
  procedure: 'roza_dismissed_procedure_insight',
  pms: 'roza_dismissed_pms_warning',
  safety: 'roza_dismissed_safety_warnings',
} as const;

function readDismissedState() {
  if (typeof window === 'undefined') return { lifestyle: '', procedure: '', pms: '', safety: [] as string[] };
  let safety: string[] = [];
  try { safety = JSON.parse(localStorage.getItem(DISMISS_KEYS.safety) || '[]'); } catch { safety = []; }
  return {
    lifestyle: localStorage.getItem(DISMISS_KEYS.lifestyle) || '',
    procedure: localStorage.getItem(DISMISS_KEYS.procedure) || '',
    pms: localStorage.getItem(DISMISS_KEYS.pms) || '',
    safety,
  };
}

/**
 * داشبورد.
 *
 * حذف شد نسبت به نسخه ۱:
 *  - «امتیاز کل پوست» که از عدد پایه ۷۰ و اهداف سبک زندگی می‌آمد
 *    (نه داده واقعی) و برای همه کاربران تقریباً یکسان بود.
 *  - «سازگاری هورمونی ۸۵٪ عالی» که یک عدد ثابت بی‌معنی بود.
 *  - کارت‌های کشویی که همان محتوای کارت‌های پایین را تکرار می‌کردند.
 *  - کارت چرخه که به همه نشان داده می‌شد، حتی کسی که ردیابی را فعال نکرده بود.
 */
export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  userState,
  products,
  todayLog,
  weather,
  onRequestWeatherLocation,
  weatherLocationLoading,
  weatherLocationError,
  weatherLocationErrorFa,
  cycleVisible,
  onUpdateDailyLog,
  onNavigateTab,
  onOpenSection,
  onOpenGuideTopic,
  focusRequest,
  onFocusRequestHandled,
}) => {
  const guidance = buildDailyGuidance({
    profile: userState.profile,
    lifestyle: userState.lifestyle,
    cycleConfig: cycleVisible ? userState.cycleConfig : { ...userState.cycleConfig, enabled: false },
    weather,
    products,
    medications: LocalDB.getMedications(),
  });

  const [dismissed, setDismissed] = React.useState(readDismissedState);
  const dismissOne = (key: 'lifestyle' | 'procedure' | 'pms', value: string) => {
    try { localStorage.setItem(DISMISS_KEYS[key], value); } catch { /* noop */ }
    setDismissed((prev) => ({ ...prev, [key]: value }));
  };
  const dismissSafetyWarning = (value: string) => {
    setDismissed((prev) => {
      const next = Array.from(new Set([...prev.safety, value]));
      try { localStorage.setItem(DISMISS_KEYS.safety, JSON.stringify(next)); } catch { /* noop */ }
      return { ...prev, safety: next };
    });
  };
  const visibleSafetyWarnings = guidance.safetyWarningsFa.filter((warning) => !dismissed.safety.includes(warning));

  const upcoming = getUpcomingAppointments(2);
  const providers = LocalDB.getProviders();
  const waterTarget = userState.lifestyle.waterTargetGlasses || 8;

  const addWater = () => onUpdateDailyLog({ ...todayLog, waterGlasses: todayLog.waterGlasses + 1 });
  const setSkinScore = (score: number) => onUpdateDailyLog({ ...todayLog, skinStatusScore: score });
  const toggleSunscreen = () => {
    if (todayLog.usedSunscreen) {
      onUpdateDailyLog({ ...todayLog, usedSunscreen: false });
    } else {
      onUpdateDailyLog({
        ...todayLog,
        usedSunscreen: true,
        sunscreenApplyCount: (todayLog.sunscreenApplyCount || 0) + 1,
      });
    }
  };

  const sunscreenCardRef = useRef<HTMLDivElement>(null);
  const [highlightSunscreen, setHighlightSunscreen] = useState(false);
  useEffect(() => {
    if (!focusRequest || focusRequest.target !== 'sunscreen') return;
    sunscreenCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightSunscreen(true);
    // این درخواست فقط باید همان یک‌بار (لحظه‌ی زدن «تجدید ضدآفتاب») اثر کند؛
    // به والد اطلاع می‌دهیم تا آن را null کند، وگرنه دفعه بعد که کاربر از
    // تب دیگری به خانه برمی‌گردد (و این کامپوننت دوباره mount می‌شود)،
    // همین focusRequest قدیمی دوباره کاربر را به این کارت می‌کشاند.
    onFocusRequestHandled?.();
    const timer = window.setTimeout(() => setHighlightSunscreen(false), 2200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] px-4 max-w-lg mx-auto space-y-4">
      {weather.hasData || onRequestWeatherLocation ?       <WeatherClimateCard weather={weather} onRequestLocation={onRequestWeatherLocation} locationLoading={weatherLocationLoading} locationError={weatherLocationError} locationErrorFa={weatherLocationErrorFa} /> : null}

      {/* در حالت بارداری، کارت چرخه به‌جای پیش‌بینی پریود فقط وضعیت بارداری را نشان می‌دهد */}
      {cycleVisible && userState.profile.isPregnant && (
        <button
          onClick={() => onOpenSection('cycle')}
          className="w-full p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-right flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <MoonIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-black text-amber-900 dark:text-amber-100">وضعیت بارداری فعاله</span>
              <span className="block text-xs text-amber-900/70 dark:text-amber-200/70">پریودت شروع شده؟ اینجا ثبتش کن</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-amber-700/60 dark:text-amber-300/60 shrink-0" />
        </button>
      )}
      {cycleVisible && !userState.profile.isPregnant && (
        <HormoneCycleCard cycleConfig={userState.cycleConfig} onOpenCycle={() => onOpenSection('cycle')} compact />
      )}

      {/* هشدارهای ایمنی — بالاترین اولویت */}
      {visibleSafetyWarnings.map((warning, index) => (
        <div
          key={index}
          className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 flex items-start justify-between gap-2">
            <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{warning}</p>
            <div className="shrink-0 flex items-center gap-1 text-amber-800 dark:text-amber-200">
              <WhyButton topicId="guide_l3_why_not_today" onOpenGuideTopic={onOpenGuideTopic} />
              <DismissButton onClick={() => dismissSafetyWarning(warning)} />
            </div>
          </div>
        </div>
      ))}

      {/* پرهیز مربوط به نوبت آرایشگاه یا کلینیک */}
      {guidance.procedureInsightFa && guidance.procedureInsightFa !== dismissed.procedure && (
        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex items-start gap-2">
          <Scissors className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="flex-1 flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-sky-900 dark:text-sky-200">روتین امروز تنظیم شد</h4>
              <p className="text-sm text-sky-900 dark:text-sky-200 leading-relaxed">{guidance.procedureInsightFa}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-sky-800 dark:text-sky-200">
              <WhyButton topicId={findGuideTopicForSource('procedure')?.id} onOpenGuideTopic={onOpenGuideTopic} />
              <DismissButton onClick={() => dismissOne('procedure', guidance.procedureInsightFa!)} />
            </div>
          </div>
        </div>
      )}

      {guidance.pmsWarningFa && guidance.pmsWarningFa !== dismissed.pms && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3.5 rounded-2xl bg-gradient-to-l from-rose-500 to-amber-500 text-white flex items-start gap-2.5"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h4 className="font-black text-sm">مراقبت پیشگیرانه</h4>
              <p className="text-sm leading-relaxed text-rose-50">{guidance.pmsWarningFa}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-white">
              <WhyButton topicId={findGuideTopicForSource('cycle')?.id} onOpenGuideTopic={onOpenGuideTopic} />
              <DismissButton onClick={() => dismissOne('pms', guidance.pmsWarningFa!)} />
            </div>
          </div>
        </motion.div>
      )}

      {/* نوبت بعدی */}
      {upcoming.length > 0 && (
        <button
          onClick={() => onOpenSection(upcoming[0].providerKind === 'salon' ? 'salon' : 'clinic')}
          className="w-full p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 text-right flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-black text-slate-800 dark:text-white truncate">
                {upcoming[0].titleFa || 'نوبت بعدی'} · {formatRelativeDay(upcoming[0].dateIso)}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                {providers.find((provider) => provider.id === upcoming[0].providerId)?.name} ·{' '}
                {formatJalaliDayMonth(upcoming[0].dateIso)}
              </span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      )}

      {/* کارت روتین امروز */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-500 via-rose-400 to-amber-400 text-white space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            روتین امروز
          </span>

          {userState.currentStreakDays > 0 && (
            <div className="px-3 py-2 rounded-2xl bg-white/20 text-center shrink-0">
              <Flame className="w-4 h-4 mx-auto mb-0.5" />
              <span className="block text-xs font-black whitespace-nowrap">
                {toPersianDigits(userState.currentStreakDays)} روز
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigateTab('routine')}
          className="w-full py-3 rounded-2xl bg-white text-rose-600 font-black text-sm active:scale-95 transition-transform"
        >
          شروع روتین
        </button>
      </div>

      {guidance.lifestyleInsightFa && guidance.lifestyleInsightFa !== dismissed.lifestyle && (
        <div className="p-4 rounded-3xl bg-teal-50 dark:bg-teal-950/25 border border-teal-200 dark:border-teal-900/50 flex items-start justify-between gap-2">
          <p className="text-sm text-teal-900 dark:text-teal-200 leading-relaxed">{guidance.lifestyleInsightFa}</p>
          <DismissButton onClick={() => dismissOne('lifestyle', guidance.lifestyleInsightFa!)} className="text-teal-800 dark:text-teal-200" />
        </div>
      )}

      {/* ترکیبات امروز */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3">
        <h4 className="text-sm font-black text-slate-800 dark:text-white">ترکیبات امروز</h4>

        <div className="space-y-2">
          {/*
            فهرست سبز، حالا با دلیل.

            قبلاً یک ماده هم چیپ سبز «پیشنهاد می‌شود» می‌گرفت و هم — چون
            قواعد چرخه/سن/علائم توصیهٔ SUGGESTION تولید می‌کنند — یک کارت
            جداگانه با همان نام پایین‌تر؛ یعنی یک ماده دو بار در یک کارت.
            حالا توصیه‌های «استفاده کن» کارت جدا نمی‌گیرند و دلیلشان روی
            همین چیپ نشسته است.
          */}
          {guidance.recommendedIngredientIds.length > 0 && (
            <div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                پیشنهاد می‌شود
              </span>
              <div className="flex flex-wrap gap-1.5">
                {guidance.recommendedIngredientIds.map((id) => {
                  const whyFa = guidance.recommendedReasonById[id];
                  return (
                    <span
                      key={id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
                    >
                      {ingredientNameWithForm(id, id)}
                      {whyFa && <span className="block font-normal opacity-80 leading-relaxed pt-0.5">{whyFa}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/*
            کارت کامل توصیه.

            قبلاً هر توصیه فقط یک چیپ با نام ماده بود و reasonFa داخل
            attribute title می‌رفت؛ روی اپ لمسی Capacitor آن tooltip هرگز
            ظاهر نمی‌شد، یعنی «چرا رزا امروز این را گفت» عملاً نامرئی بود.
            headlineFa، triggersFa، productNamesFa، untilIso و educationalOnly
            هم ساخته می‌شدند و در هیچ کامپوننتی مصرف نمی‌شدند — نتیجه‌اش همان
            چیزی بود که کامنت types.ts ممنوع کرده بود: کاربر «امروز از X
            استفاده نکن» می‌دید برای ماده‌ای که ندارد.
          */}
          {guidance.ingredientAdvice.length > 0 && (
            <div className="space-y-2">
              {(['PROFESSIONAL_INSTRUCTION', 'IMPORTANT', 'CAUTION', 'SUGGESTION', 'INFO'] as const)
                .map((severity) => ({
                  severity,
                  items: guidance.ingredientAdvice.filter((advice) => advice.severity === severity),
                }))
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.severity} className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                      {SEVERITY_LABEL_FA[group.severity]}
                      <span className="font-normal opacity-70"> — {SEVERITY_HINT_FA[group.severity]}</span>
                    </span>

                    <div className="space-y-1.5">
                      {group.items.map((advice) => {
                        const whyTopicId = findWhyTopicForIngredientAdvice({
                          ingredientId: advice.ingredientId,
                          source: advice.source,
                        })?.id;
                        return (
                          <div
                            key={advice.ruleId}
                            className={`px-3 py-2.5 rounded-2xl border text-xs space-y-1.5 ${SEVERITY_STYLE[advice.severity]}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-black leading-relaxed">{advice.headlineFa}</span>
                              {whyTopicId && onOpenGuideTopic && (
                                <button
                                  onClick={() => onOpenGuideTopic(whyTopicId)}
                                  className="shrink-0 text-[10px] font-black underline underline-offset-2"
                                >
                                  ببین چرا
                                </button>
                              )}
                            </div>

                            {/* دلیل، حالا واقعاً روی صفحه است نه داخل tooltip */}
                            {advice.reasonFa && (
                              <p className="leading-relaxed opacity-90">{advice.reasonFa}</p>
                            )}

                            {/* «تا کِی» — قبلاً در تایپ بود و هرگز به کاربر نمی‌رسید */}
                            {advice.untilIso && (
                              <p className="font-bold opacity-90">
                                تا {formatJalaliDayMonth(advice.untilIso)}
                              </p>
                            )}

                            {advice.scopeFa && (
                              <p className="font-bold opacity-90">دامنه: {advice.scopeFa}</p>
                            )}

                            {/* ماده در قفسه نیست: صریح می‌گوییم، تا شکل دستور نگیرد */}
                            {advice.educationalOnly && (
                              <p className="opacity-75">
                                این ماده در محصولات ثبت‌شدهٔ تو نیست؛ این مورد فقط آموزشی است.
                              </p>
                            )}

                            {advice.triggersFa.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {advice.triggersFa.slice(0, 4).map((trigger) => (
                                  <span
                                    key={trigger}
                                    className="px-2 py-0.5 rounded-lg bg-white/60 dark:bg-slate-900/40 text-[10px] font-bold"
                                  >
                                    {trigger}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* نکته‌های فقط-اطلاعی: فاز چرخه به‌تنهایی دلیل کافی برای منع یک
              اکتیو نیست، پس اینها ممنوعیت نیستند و رنگ هشدار هم نمی‌گیرند. */}
          {guidance.ingredientNotes.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">فقط خوب است بدانی</span>
              {guidance.ingredientNotes.map((note) => (
                <p key={note.ruleId} className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold">{note.ingredientNameFa}:</span> {note.reasonFa}
                </p>
              ))}
            </div>
          )}

          {/* ماده‌هایی که یک قاعده پیشنهاد کرده بود ولی قاعدهٔ دیگری محدودشان
              می‌کند. قبلاً همین‌ها هم‌زمان چیپ سبز «پیشنهاد می‌شود» و چیپ
              نارنجی «با احتیاط» می‌گرفتند. */}
          {guidance.withheldIngredientIds.length > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {ingredientNamesFa(guidance.withheldIngredientIds).join('، ')} برای پوست تو معمولاً مفیدند، ولی
              امروز به‌خاطر موارد بالا از فهرست پیشنهاد بیرون ماندند.
            </p>
          )}

          {guidance.ingredientAdvice.length === 0 && guidance.avoidIngredientIds.length > 0 && (
            <div>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1.5">امروز پرهیز کن</span>
              <div className="flex flex-wrap gap-1.5">
                {guidance.avoidIngredientIds.map((id) => (
                  <span
                    key={id}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-bold"
                  >
                    {ingredientNameWithForm(id, id)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ثبت سریع روزانه */}
      <div
        ref={sunscreenCardRef}
        className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border space-y-4 transition-shadow ${
          highlightSunscreen ? 'border-amber-400 ring-4 ring-amber-200 dark:ring-amber-900/50' : 'border-rose-100 dark:border-slate-800'
        }`}
      >
        <h4 className="text-sm font-black text-slate-800 dark:text-white">ثبت سریع امروز</h4>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Droplet className="w-5 h-5 text-sky-500 shrink-0" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              آب: {toPersianDigits(todayLog.waterGlasses)} از {toPersianDigits(waterTarget)}
            </span>
          </div>
          <button
            onClick={addWater}
            className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold shrink-0"
          >
            یک لیوان +
          </button>
        </div>

        <button
          onClick={toggleSunscreen}
          className={`w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border transition-colors ${
            todayLog.usedSunscreen
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Sun className="w-4 h-4" />
          {todayLog.usedSunscreen
            ? (todayLog.sunscreenApplyCount || 0) >= 2
              ? 'ضدآفتابم را تمدید کردم'
              : 'امروز ضدآفتاب زدم'
            : 'ضدآفتاب زدم؟'}
        </button>

        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">امروز پوستت چطور است؟</span>
          <div className="flex items-center gap-1">
            {[2, 4, 6, 8, 10].map((score) => (
              <button
                key={score}
                onClick={() => setSkinScore(score)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  todayLog.skinStatusScore === score
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {toPersianDigits(score)}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            این عدد ملاک نمودار روند پوست و الگوی چرخه‌ات می‌شود.
          </p>
        </div>

        {/*
          چهار علامت واقعی پوست.

          این چهار فیلد در DailyTrackerEntry وجود داشتند و ورودی مستقیم
          getSkinSignals بودند، ولی هیچ‌جای UI آن‌ها را نمی‌نوشت — فقط مقدار
          پیش‌فرض صفر در App.tsx. یعنی نصف ورودی موتور علائم مرده بود و تنها
          منبع واقعی، فرم ثبت علائم چرخه بود (که کاربران بدون چرخه هرگز
          نمی‌دیدند). حالا نوشته می‌شوند.
        */}
        <div className="space-y-2.5">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
            امروز چه چیزی روی پوستت دیدی؟
          </span>
          {SKIN_SIGNAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{field.labelFa}</span>
              <div className="flex items-center gap-1">
                {[0, 2, 4, 6, 8, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => onUpdateDailyLog({ ...todayLog, [field.key]: score })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      todayLog[field.key] === score
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {score === 0 ? 'ندارم' : toPersianDigits(score)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {guidance.skinSignals.hasData && guidance.skinSignals.sourceFa && (
            // sourceFa ساخته می‌شد و هیچ‌جا نمایش داده نمی‌شد.
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
              {guidance.skinSignals.sourceFa}؛ روتین امروز روی همین تنظیم شد.
            </p>
          )}
        </div>
      </div>

      <Monthly30DayTracker onOpenProgress={() => onNavigateTab('progress')} />
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Sun, Moon, Clock, Play, Pause, RotateCcw, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Product, Routine, RoutineType, UserState, WeatherData } from '../../types';
import { buildDailyGuidance, peakAdviceSeverity } from '../../services/recommendationEngine';
import { loadRoutine, toggleStep } from '../../services/routineService';
import { LocalDB } from '../../services/db';
import { getTodayIsoDate, toPersianDigits } from '../../services/jalali';
import { SEVERITY_HINT_FA, SEVERITY_LABEL_FA, SEVERITY_STYLE } from '../../services/advice/severity';
import { findGuideTopicForSource } from '../../services/content/guideContent';
import type { AdviceSeverity } from '../../types';

interface RoutineViewProps {
  userState: UserState;
  weather: WeatherData;
  products: Product[];
  onOpenGuideTopic?: (topicId: string) => void;
}

const WhyButton: React.FC<{ topicId?: string; onOpenGuideTopic?: (topicId: string) => void }> = ({ topicId, onOpenGuideTopic }) => {
  if (!topicId || !onOpenGuideTopic) return null;
  return (
    <button onClick={() => onOpenGuideTopic(topicId)} className="shrink-0 text-[11px] font-black underline underline-offset-2">
      چرا؟
    </button>
  );
};

/**
 * روتین روزانه.
 *
 * مشکل بزرگ نسخه ۱: تیک مراحل فقط در useState می‌ماند و با بستن
 * اپ همه چیز صفر می‌شد. کلید ذخیره روتین در دیتابیس تعریف شده بود
 * ولی هرگز استفاده نشده بود. یعنی مهم‌ترین کار روزانه کاربر هیچ
 * اثری نمی‌گذاشت: نه زنجیره، نه آمار، نه تقویم.
 */
export const RoutineView: React.FC<RoutineViewProps> = ({ userState, weather, products, onOpenGuideTopic }) => {
  const todayIso = getTodayIsoDate();
  const [activeType, setActiveType] = useState<RoutineType>(() => (new Date().getHours() >= 17 ? 'night' : 'morning'));

  const guidance = useMemo(
    () =>
      buildDailyGuidance({
        profile: userState.profile,
        lifestyle: userState.lifestyle,
        cycleConfig: userState.cycleConfig,
        weather,
        products,
        medications: LocalDB.getMedications(),
      }),
    [userState, weather, products],
  );

  const [morning, setMorning] = useState<Routine>(() =>
    loadRoutine(todayIso, 'morning', guidance.morningRoutine),
  );
  const [night, setNight] = useState<Routine>(() => loadRoutine(todayIso, 'night', guidance.nightRoutine));

  /*
   * پیام سن (مثلاً «در سن نوجوانی، پوست به روتین ساده...») را می‌شود
   * بست. چون متن با تغییر بازه سنی کاربر عوض می‌شود، خودِ متن به‌عنوان
   * کلید ذخیره می‌شود — اگر بعداً به بازه سنی دیگری برسد و پیام عوض
   * شود، دوباره نشان داده می‌شود، نه اینکه برای همیشه پنهان بماند.
   */
  const [dismissedAgeInsight, setDismissedAgeInsight] = useState<string | null>(() => {
    try {
      return localStorage.getItem('roza_dismissed_age_insight');
    } catch {
      return null;
    }
  });
  const dismissAgeInsight = () => {
    if (!guidance.ageInsightFa) return;
    try {
      localStorage.setItem('roza_dismissed_age_insight', guidance.ageInsightFa);
    } catch {
      /* اگر localStorage در دسترس نبود، فقط برای همین جلسه بسته می‌ماند */
    }
    setDismissedAgeInsight(guidance.ageInsightFa);
  };
  const showAgeInsight = !!guidance.ageInsightFa && guidance.ageInsightFa !== dismissedAgeInsight;

  /*
   * هشدارها حالا شدت و منبع‌شان را همراه خودشان می‌آورند.
   *
   * قبلاً یک آرایهٔ متنِ خالی از موتور می‌آمد و همین‌جا یک آرایهٔ شدت موازی
   * ساخته می‌شد که با ایندکس عددی به آن وصل بود؛ یعنی هر تغییری در ترتیب
   * جمله‌های recommendationEngine.ts باعث می‌شد هشدار بارداری برچسب «دستور
   * پزشک» بگیرد. آن اتصال شکننده حذف شد.
   */
  const safetyWarnings = guidance.safetyWarnings;

  /*
   * شدت کارت «چرا روتین امروز ملایم است» از بالاترین شدتِ توصیه‌های پروسیجر
   * می‌آید، نه همیشه PROFESSIONAL_INSTRUCTION. قبلاً یک نوبت وکس آرایشگاه هم
   * با متن «این مورد به تأیید پزشک نیاز دارد» ظاهر می‌شد.
   */
  const gentleSeverity: AdviceSeverity =
    peakAdviceSeverity(guidance.ingredientAdvice.filter((advice) => advice.source === 'procedure')) ||
    (userState.profile.onOralRetinoid ? 'PROFESSIONAL_INSTRUCTION' : 'CAUTION');

  // اگر قالب عوض شد (مثلاً نوبت جدید ثبت شد)، روتین دوباره ساخته می‌شود
  // ولی تیک‌های کاربر حفظ می‌مانند.
  useEffect(() => {
    setMorning(loadRoutine(todayIso, 'morning', guidance.morningRoutine));
    setNight(loadRoutine(todayIso, 'night', guidance.nightRoutine));
  }, [guidance, todayIso]);

  const routine = activeType === 'morning' ? morning : night;
  const completed = routine.steps.filter((step) => step.completed).length;
  const percent = routine.steps.length > 0 ? Math.round((completed / routine.steps.length) * 100) : 0;

  const handleToggle = (stepId: string) => {
    const updated = toggleStep(routine, stepId);
    if (activeType === 'morning') setMorning(updated);
    else setNight(updated);

    if (updated.steps.every((step) => step.completed)) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    }
  };

  /* ---------------------------- تایمر گام ---------------------------- */
  const [timerStepId, setTimerStepId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (isRunning && secondsLeft === 0 && timerStepId) {
      setIsRunning(false);
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
    }
  }, [isRunning, secondsLeft, timerStepId]);

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] px-4 max-w-lg mx-auto space-y-4">
      {/* سویچ صبح و شب */}
      <div className="p-1.5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 flex items-center gap-1">
        <button
          onClick={() => setActiveType('morning')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeType === 'morning' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Sun className="w-4 h-4" />
          صبح
        </button>
        <button
          onClick={() => setActiveType('night')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeType === 'night' ? 'bg-purple-600 text-white' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Moon className="w-4 h-4" />
          شب
        </button>
      </div>

      {/* پیشرفت */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-sm font-black">
          <span className="text-slate-800 dark:text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {toPersianDigits(completed)} از {toPersianDigits(routine.steps.length)} گام
          </span>
          <span className="text-rose-600 dark:text-rose-400">{toPersianDigits(percent)}٪</span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              activeType === 'morning'
                ? 'bg-gradient-to-l from-amber-400 to-rose-500'
                : 'bg-gradient-to-l from-purple-500 to-rose-500'
            }`}
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">تیک‌ها ذخیره می‌شوند و با بستن برنامه پاک نمی‌شوند.</p>
      </div>

      {/* پیام مربوط به بازه سنی — قابل بستن */}
      {showAgeInsight && (
        <div className="p-4 rounded-3xl bg-purple-50 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-900/50 flex items-start gap-2">
          <p className="flex-1 text-sm text-purple-900 dark:text-purple-200 leading-relaxed">{guidance.ageInsightFa}</p>
          <button
            onClick={dismissAgeInsight}
            aria-label="بستن پیام"
            className="icon-only p-1.5 rounded-lg text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* دلیل ملایم بودن روتین — این واقعاً دستور نوبت درمانی است، نه حدس اپ */}
      {guidance.gentleMode && guidance.gentleReasonFa && (
        <div className={`p-3.5 rounded-2xl border flex items-start gap-2 ${SEVERITY_STYLE[gentleSeverity]}`}>
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-black opacity-80">{SEVERITY_LABEL_FA[gentleSeverity]}</span>
              <p className="text-sm leading-relaxed">{guidance.gentleReasonFa}</p>
            </div>
            <WhyButton topicId={findGuideTopicForSource('procedure')?.id} onOpenGuideTopic={onOpenGuideTopic} />
          </div>
        </div>
      )}

      {safetyWarnings.map((warning) => (
        <div
          key={warning.id}
          className={`p-3.5 rounded-2xl border flex items-start gap-2 ${SEVERITY_STYLE[warning.severity]}`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-black opacity-80">{SEVERITY_LABEL_FA[warning.severity]}</span>
              <p className="text-sm leading-relaxed">{warning.textFa}</p>
              <p className="text-[11px] leading-relaxed opacity-75">{SEVERITY_HINT_FA[warning.severity]}</p>
            </div>
            <WhyButton
              topicId={findGuideTopicForSource(warning.source)?.id || 'guide_l3_why_not_today'}
              onOpenGuideTopic={onOpenGuideTopic}
            />
          </div>
        </div>
      ))}

      {/* گام‌ها */}
      <div className="space-y-3">
        {routine.steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`p-4 rounded-3xl border ${
              step.completed
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-white dark:bg-slate-900 border-rose-100 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleToggle(step.id)}
                aria-label={step.completed ? 'لغو تیک' : 'انجام شد'}
                className={`icon-only w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  step.completed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-sm font-black ${
                      step.completed
                        ? 'text-emerald-900 dark:text-emerald-200 line-through opacity-70'
                        : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {step.titleFa}
                  </h4>
                  <span className="text-xs font-bold text-slate-400 shrink-0">
                    {toPersianDigits(index + 1)}
                  </span>
                </div>

                {step.productNameFa && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{step.productNameFa}</p>
                )}

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.descriptionFa}</p>

                {/* شفافیت: جلوی هر گام، دلیلش نوشته می‌شود */}
                {step.reasonFa && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{step.reasonFa}</span>
                  </p>
                )}

                {step.timeSeconds ? (
                  <div className="flex items-center gap-2 pt-1">
                    {timerStepId === step.id ? (
                      <>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-black text-slate-800 dark:text-white tabular-nums">
                          {toPersianDigits(Math.floor(secondsLeft / 60))}:
                          {toPersianDigits(String(secondsLeft % 60).padStart(2, '0'))}
                        </span>
                        <button
                          onClick={() => setIsRunning(!isRunning)}
                          className="icon-only p-2 rounded-xl bg-rose-500 text-white"
                          aria-label={isRunning ? 'توقف' : 'ادامه'}
                        >
                          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setTimerStepId(null);
                            setIsRunning(false);
                          }}
                          className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                          aria-label="بستن تایمر"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setTimerStepId(step.id);
                          setSecondsLeft(step.timeSeconds || 60);
                          setIsRunning(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Clock className="w-4 h-4" />
                        {toPersianDigits(step.timeSeconds)} ثانیه
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

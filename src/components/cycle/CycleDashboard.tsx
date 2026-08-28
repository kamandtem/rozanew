import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Droplet, Check, TrendingUp, Trash2, Info, Sparkles, Activity, ChevronDown, X, HeartPulse } from 'lucide-react';
import { CycleSymptom, MenstrualCycleConfig, MenstrualPhase, SkinProfile, SymptomKey, UserState } from '../../types';
import { LocalDB } from '../../services/db';
import {
  buildPersonalPattern,
  computeCycleState,
  describePattern,
  getOpenPeriod,
  logPeriodEnd,
  logPeriodStart,
} from '../../services/cycle/cycleService';
import { CycleWheel } from './CycleWheel';
import { CyclePhaseHighlights } from './CyclePhaseHighlights';
import { CycleHighlightPhase } from '../../services/content/cycleHighlights';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { EmptyState } from '../common/EmptyState';
import { formatJalaliDate, formatJalaliDayMonth, getTodayIsoDate, toPersianDigits } from '../../services/jalali';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { PHASE_GUIDE } from '../../services/cycle/phaseGuide';
import { proceduresByPhaseSuitability } from '../../services/providers/procedureRules';
import { ingredientNamesFa } from '../../services/recommendationEngine';

interface CycleDashboardProps {
  userState: UserState;
  onUpdateCycleConfig: (config: MenstrualCycleConfig) => void;
  /** برای پایان‌دادن به حالت بارداری وقتی پریود دوباره شروع شده. */
  onUpdateProfile: (profile: SkinProfile) => void;
  /**
   * ثبت/حذف پریود مستقیم روی LocalDB نوشته می‌شود (نه userState)، پس
   * پیش‌بینی PMS/تخمک‌گذاری/شروع پریود که خودِ اعلان‌ها از آن ساخته
   * می‌شوند، بی‌خبر از این تغییر می‌ماند تا resume بعدی اپ. این تابع
   * بلافاصله بعد از هر ثبت یا حذف یک پریود صدا زده می‌شود تا زمان‌بندی
   * اعلان‌ها همان لحظه با پیش‌بینی تازه هماهنگ شود. اختیاری است تا
   * کامپوننت بدون آن هم (مثلاً در تست) قابل استفاده بماند.
   */
  onCycleDataChanged?: () => void;
}

const SYMPTOMS: { key: SymptomKey; labelFa: string; scale: boolean }[] = [
  { key: 'acne', labelFa: 'جوش', scale: true },
  { key: 'oiliness', labelFa: 'چربی پوست', scale: true },
  { key: 'dryness', labelFa: 'خشکی', scale: true },
  { key: 'sensitivity', labelFa: 'حساسیت و سوزش', scale: true },
  { key: 'pain', labelFa: 'درد', scale: true },
  { key: 'bloating', labelFa: 'نفخ', scale: false },
  { key: 'headache', labelFa: 'سردرد', scale: false },
  { key: 'lowMood', labelFa: 'خلق پایین', scale: false },
  { key: 'irritability', labelFa: 'زود عصبانی شدن', scale: false },
  { key: 'fatigue', labelFa: 'خستگی', scale: false },
  { key: 'cravings', labelFa: 'هوس غذایی', scale: false },
  { key: 'badSleep', labelFa: 'خواب بد', scale: false },
];

/**
 * فهرست نهایی do/avoid یک فاز.
 *
 * سه منبع قبلی حذف شده‌اند: متن فاز از phaseGuide می‌آید (همان منبعی که
 * کارت خانه و موتور توصیه هم از آن می‌خوانند) و پرهیز پروسیجرها از
 * procedureRules مشتق می‌شود.
 *
 * تناقض واقعی‌ای که با همین تغییر بسته شد: این کارت با متن هاردکد می‌گفت در
 * فاز لوتئال «نوبت لیزر و اپیلاسیون» نگیر، ولی قواعد نوبت برای لیزر و وکس
 * فقط قاعدگی را منع کرده بودند؛ پس در روز ۱۶ چرخه، بخش چرخه می‌گفت لیزر
 * نگیر و بخش نوبت‌ها همان روز را بی‌اشکال نشان می‌داد.
 */
function buildPhaseLists(phase: MenstrualPhase, inPmsWindow: boolean) {
  const guide = PHASE_GUIDE[phase];
  const procedures = proceduresByPhaseSuitability(phase, inPmsWindow);

  return {
    doFa: [
      ...ingredientNamesFa(guide.recommendedIds),
      ...guide.extraDoFa,
      ...procedures.goodFa.slice(0, 3).map((label) => `زمان مناسب ${label}`),
    ],
    avoidFa: [
      ...guide.extraAvoidFa,
      ...procedures.avoidFa.map((label) => `نوبت ${label}`),
    ],
    cautionFa: [
      ...ingredientNamesFa(guide.cautionIds).map((name) => `${name} را کم کن`),
      ...procedures.cautionFa.map((label) => `نوبت ${label}`),
    ],
    cautionReasonFa: guide.cautionReasonFa,
  };
}

/**
 * بخش چرخه.
 *
 * کار ویژه این بخش (وجه تمایز اپ): بعد از دو چرخه ثبت، به جای متن
 * عمومی مقالات، الگوی واقعی خود کاربر را نشان می‌دهد:
 * «جوش‌های تو معمولاً از روز ۲۳ شروع و روز ۲۷ به اوج می‌رسند».
 * این تنها چیزی است که کاربر جای دیگری تولید نمی‌شود.
 */
export const CycleDashboard: React.FC<CycleDashboardProps> = ({
  userState,
  onUpdateCycleConfig,
  onUpdateProfile,
  onCycleDataChanged,
}) => {
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((value) => value + 1);
  const todayIso = getTodayIsoDate();

  /* ------------------------- حالت بارداری ------------------------- */
  // وقتی «باردار هستم» در پروفایل روشن است، کل بخش چرخه غیرفعال می‌شود
  // و به‌جایش یک کارت جدا دیده می‌شود — چون از نظر علمی در بارداری چرخه
  // قاعدگی وجود ندارد. مهم: این «if» زودهنگام دیگر return نمی‌کند، چون
  // اگر isPregnant بین رندرها عوض شود (دقیقاً همان لحظه‌ای که این کارت
  // کاربر را از بارداری خارج می‌کند)، تعداد Hookهای فراخوانی‌شده در این
  // کامپوننت هم نباید عوض شود. به همین دلیل همه Hookها همیشه (چه باردار
  // چه نه) اجرا می‌شوند و فقط JSX پایانی بر اساس isPregnant شاخه می‌رود.
  const isPregnant = userState.profile.isPregnant;

  const periodLogs = useMemo(() => LocalDB.getPeriodLogs(), [refresh]);
  const symptoms = useMemo(() => LocalDB.getCycleSymptoms(), [refresh]);
  const state = useMemo(
    () => computeCycleState(userState.cycleConfig, periodLogs, todayIso),
    [userState.cycleConfig, periodLogs, todayIso],
  );
  const openPeriod = useMemo(() => getOpenPeriod(), [refresh]);

  const [selectedPhase, setSelectedPhase] = useState<MenstrualPhase>(state.phase || 'follicular');
  const [selectedDay, setSelectedDay] = useState(state.cycleDay || 1);
  // باگ قبلی: با ویرایش تاریخ شروع پریود (مثلاً تصحیح از ۲۰ مرداد به ۱۰
  // مرداد)، «روز» انتخاب‌شده روی چرخ به‌درستی به‌روز می‌شد ولی «فاز»
  // انتخاب‌شده (که راهنما/توصیه‌های زیر چرخ از رویش خوانده می‌شوند)
  // فقط یک‌بار در mount مقداردهی شده بود و دیگر با state.phase هم‌گام
  // نمی‌شد. نتیجه: بعد از ویرایش، روز روی چرخ درست نشان داده می‌شد ولی
  // توصیه‌ها هنوز مال فاز قدیمی (مثلاً «قاعدگی») بودند نه فاز واقعی روز
  // جدید (مثلاً «تخمک‌گذاری»). هر دو باید با تغییر state هم‌گام شوند.
  useEffect(() => {
    if (state.cycleDay !== null) setSelectedDay(state.cycleDay);
    if (state.phase !== null) setSelectedPhase(state.phase);
  }, [state.cycleDay, state.phase]);
  const [manualDate, setManualDate] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // به‌طور پیش‌فرض بسته است؛ کاربر با یک لمس روی هدر بازش می‌کند
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  // راهنمای «این ثبت‌ها فقط روی همین گوشی می‌مانند...» فقط تا وقتی کاربر
  // آن را نخوانده و نبسته نشان داده می‌شود؛ بعد از بستن، دیگر برنمی‌گردد
  // و جای خودش را کامل آزاد می‌کند (رندر نمی‌شود، نه فقط مخفی).
  const [showSymptomInfo, setShowSymptomInfo] = useState(
    () => localStorage.getItem('roza_symptom_info_dismissed_v1') !== '1',
  );
  const dismissSymptomInfo = () => {
    localStorage.setItem('roza_symptom_info_dismissed_v1', '1');
    setShowSymptomInfo(false);
  };
  const [editCycleLength, setEditCycleLength] = useState(userState.cycleConfig.cycleLength || 28);
  const [editPeriodLength, setEditPeriodLength] = useState(userState.cycleConfig.periodLength || 5);
  const [editPmsStartDaysBefore, setEditPmsStartDaysBefore] = useState(userState.cycleConfig.pmsStartDaysBefore);
  const [editPcosFlagged, setEditPcosFlagged] = useState(userState.cycleConfig.pcosFlagged);

  /** باز کردن مودال ویرایش، همراه با تاریخ و طول چرخه‌ی فعلی — نه فرم خالی. */
  const openEditPeriod = () => {
    setManualDate(periodLogs[0]?.startIso || todayIso);
    setEditCycleLength(userState.cycleConfig.cycleLength || 28);
    setEditPeriodLength(userState.cycleConfig.periodLength || 5);
    setEditPmsStartDaysBefore(userState.cycleConfig.pmsStartDaysBefore);
    setEditPcosFlagged(userState.cycleConfig.pcosFlagged);
    setShowManual(true);
  };

  /**
   * ثبت نهایی فرم «ویرایش پریود» — نقطهٔ ورود مشترک، از هر جای اپ که
   * باز شده باشد (چرخ فازها، کارت «هنوز پریودی ثبت نشده»، یا کارت
   * بارداری).
   *
   * باگ قبلی: ثبت اولین پریود از کارت خالی، تنظیمات چرخه (cycleLength و
   * ...) را ذخیره می‌کرد ولی enabled را دست‌نخورده می‌گذاشت؛ اگر کاربر
   * تیک «ردیابی چرخه فعال باشد» را در تنطیمات نزده بود، enabled همچنان
   * false می‌ماند و بعد از ثبت هم چیزی نشان داده نمی‌شد. حالا صرفِ ثبت
   * واقعی یک پریود از همین فرم، یعنی ردیابی چرخه باید روشن باشد — چه از
   * تنطیمات از قبل روشن شده باشد چه نشده باشد.
   *
   * اگر کاربر باردار بود، همین ثبت یعنی پریود واقعاً برگشته: پس در پس‌زمینه
   * هم isPregnant خاموش می‌شود و هم ردیابی چرخه روشن — بدون هیچ گام یا
   * پیام تأیید جداگانه‌ای به کاربر.
   */
  const confirmManualPeriod = () => {
    if (!manualDate) return;
    onUpdateCycleConfig({
      ...userState.cycleConfig,
      cycleLength: editCycleLength,
      periodLength: editPeriodLength,
      pmsStartDaysBefore: editPmsStartDaysBefore,
      pcosFlagged: editPcosFlagged,
      enabled: true,
    });
    logPeriodStart(manualDate);
    if (isPregnant) {
      onUpdateProfile({ ...userState.profile, isPregnant: false });
    }
    setManualDate('');
    setShowManual(false);
    bump();
    onCycleDataChanged?.();
  };

  /* ------------------------- ثبت علائم امروز ------------------------- */
  const existingToday = symptoms.find((item) => item.date === todayIso);
  const [draft, setDraft] = useState<Partial<Record<SymptomKey, number>>>(existingToday?.scores || {});
  const [saved, setSaved] = useState(false);

  const saveSymptoms = () => {
    const entry: CycleSymptom = {
      date: todayIso,
      scores: draft,
      updatedAt: new Date().toISOString(),
    };
    LocalDB.saveCycleSymptom(entry);
    setSaved(true);
    bump();
    setTimeout(() => setSaved(false), 2500);
  };

  /* ------------------------- الگوی شخصی ------------------------- */
  const acnePattern = useMemo(() => buildPersonalPattern('acne', periodLogs, symptoms), [periodLogs, symptoms]);
  const painPattern = useMemo(() => buildPersonalPattern('pain', periodLogs, symptoms), [periodLogs, symptoms]);
  const acneSentence = describePattern(acnePattern, 'جوش');
  const painSentence = describePattern(painPattern, 'درد');
  const maxBucket = Math.max(1, ...(acnePattern?.buckets || []).map((bucket) => bucket.average));

  const phaseGuide = PHASE_GUIDE[selectedPhase];
  // بازهٔ PMS فقط وقتی معنا دارد که فاز انتخابی همان فاز واقعی امروز باشد.
  const phaseLists = buildPhaseLists(selectedPhase, selectedPhase === state.phase && state.inPmsWindow);
  const otherPeriodLogs = useMemo(
    () => periodLogs.filter((log) => log.id !== openPeriod?.id).slice(0, 8),
    [periodLogs, openPeriod],
  );

  // هایلایت‌های فاز چرخه فقط در سه فاز پریودی/تخمک‌گذاری/PMS معنا دارند؛
  // در فولیکولار و بقیه‌ی روزهای لوتئال (خارج از بازه PMS) چیزی نشان
  // داده نمی‌شود و فضا کاملاً عادی می‌ماند — دقیقاً طبق state واقعی روز،
  // نه فاز انتخابی روی چرخ (که کاربر می‌تواند برای مرور روزهای دیگر تغییر دهد).
  const highlightPhase: CycleHighlightPhase | null =
    state.phase === 'menstrual'
      ? 'period'
      : state.phase === 'ovulation'
        ? 'ovulation'
        : state.inPmsWindow
          ? 'pms'
          : null;

  /* مودال ویرایش پریود — طول چرخه، مدت خونریزی و تاریخ شروع، هر سه با هم قابل تصحیح.
     به‌صورت مشترک هم از کارت بارداری و هم از کارت‌های عادی چرخه باز می‌شود، پس یک‌بار
     اینجا ساخته می‌شود و در هر دو شاخهٔ رندر زیر استفاده می‌شود.
     با createPortal مستقیم به document.body می‌رود؛ وگرنه وقتی این کامپوننت از منو
     (به‌صورت Section، داخل کانتینر fixed z-20) باز شده، مودال با وجود z-50 داخل همان
     stacking context گیر می‌افتد و زیر هدر/نوبار پایین (که بیرون از آن کانتینرند) دیده می‌شود. */
  const editPeriodModal =
    showManual &&
    createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
        onClick={() => setShowManual(false)}
      >
        <div
          className="w-full max-w-sm max-h-[94vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-4 space-y-2 text-right shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="text-sm font-black text-slate-800 dark:text-white">ویرایش پریود</h3>

          <div className="space-y-1">
            <div className="space-y-0">
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                <span>طول چرخه شما</span>
                <span className="text-rose-600">{toPersianDigits(editCycleLength)} روز</span>
              </div>
              <input
                type="range"
                min="21"
                max="45"
                value={editCycleLength}
                onChange={(event) => setEditCycleLength(parseInt(event.target.value, 10))}
                className="range-compact w-full accent-rose-500"
              />
            </div>

            <div className="space-y-0">
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                <span>مدت زمان خونریزی</span>
                <span className="text-rose-600">{toPersianDigits(editPeriodLength)} روز</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={editPeriodLength}
                onChange={(event) => setEditPeriodLength(parseInt(event.target.value, 10))}
                className="range-compact w-full accent-rose-500"
              />
            </div>

            <div className="space-y-0">
              <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                <span>چند روز قبل PMS شروع شود؟</span>
                <span className="text-rose-600">{toPersianDigits(editPmsStartDaysBefore)} روز</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                value={editPmsStartDaysBefore}
                onChange={(event) => setEditPmsStartDaysBefore(parseInt(event.target.value, 10))}
                className="range-compact w-full accent-rose-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                چرخه‌ام نامنظم است یا مشکوک به PCOS
              </span>
              <ToggleSwitch
                checked={editPcosFlagged}
                onChange={setEditPcosFlagged}
                labelFa="چرخه‌ام نامنظم است یا مشکوک به PCOS هستم"
              />
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-white">روز اول پریود را انتخاب کن</h4>
            <JalaliDatePicker value={manualDate} onChange={setManualDate} allowFuture={false} inline compact />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setShowManual(false)}
              className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold"
            >
              انصراف
            </button>
            <button
              onClick={confirmManualPeriod}
              disabled={!manualDate}
              className="py-3 rounded-2xl bg-rose-500 disabled:opacity-40 text-white text-sm font-bold"
            >
              ثبت
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  /* ------------------------- کارت بارداری ------------------------- */
  // وقتی «باردار هستم» فعال است، به‌جای چرخ فازها و بقیهٔ بخش‌های چرخه،
  // فقط همین یک کارت دیده می‌شود. دکمهٔ «ثبت پریودی» مستقیماً همان مودال
  // مشترک بالا را باز می‌کند؛ خاموش‌شدن بارداری و روشن‌شدن ردیابی چرخه هر
  // دو در پس‌زمینه، داخل confirmManualPeriod انجام می‌شوند و هیچ‌کدام
  // جداگانه به کاربر نشان داده نمی‌شوند.
  if (isPregnant) {
    return (
      <div className="pb-[calc(var(--safe-bottom)+7rem)] px-4 max-w-lg mx-auto space-y-4">
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-amber-900 dark:text-amber-100">وضعیت بارداری فعال است</h3>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
            شما وضعیت بارداری را فعال کرده‌اید. اگر پریود شدید، با کلیک روی دکمهٔ زیر و ثبت پریودی، حالت بارداری
            غیرفعال می‌شود و چرخه دوباره شروع به کار می‌کند.
          </p>
          <button
            onClick={openEditPeriod}
            className="w-full py-3 rounded-2xl bg-[#8e5241] hover:bg-[#784334] text-white text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Droplet className="w-4 h-4" />
            ثبت پریودی
          </button>
        </div>

        {editPeriodModal}
      </div>
    );
  }

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] px-4 max-w-lg mx-auto space-y-4">
      {/* چرخ فازها */}
      {state.available && state.cycleDay !== null ? (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3 text-center">
          <CycleWheel
            currentDay={state.cycleDay}
            cycleLength={state.cycleLength}
            periodLength={state.stats.averagePeriodLength || userState.cycleConfig.periodLength}
            pmsStartDaysBefore={userState.cycleConfig.pmsStartDaysBefore}
            todayIso={todayIso}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSelectPhase={setSelectedPhase}
            onEditPeriod={openEditPeriod}
          />
        </div>
      ) : (
        // اگر ردیابی چرخه بعداً از تنظیمات فعال شده و هنوز هیچ پریودی ثبت
        // نشده، چرخ فازها (که تنها راه باز کردن فرم ثبت پریود بود) اصلاً
        // رندر نمی‌شود و کاربر هیچ راهی برای شروع ندارد. این کارت همیشه
        // یک راه ورودی مستقل به همان فرم می‌دهد.
        <EmptyState
          icon={Droplet}
          titleFa="هنوز پریودی ثبت نشده"
          descriptionFa="روز اول آخرین پریودت را ثبت کن تا رزا بتواند فاز چرخه و روزهای مناسب لیزر یا فیشیال را نشان بدهد."
          actionLabelFa="ثبت اولین پریودی"
          onAction={openEditPeriod}
        />
      )}

      {/* هایلایت‌های فاز — زیر چرخه، فقط وقتی کاربر واقعاً در یکی از سه فاز باشد */}
      <CyclePhaseHighlights phase={highlightPhase} />

      {editPeriodModal}

      {/* راهنمای فاز */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-black text-slate-800 dark:text-white">فاز {phaseGuide.titleFa}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{phaseGuide.skinFa}</p>

        {phaseLists.doFa.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">مناسب این فاز</span>
            <div className="flex flex-wrap gap-1.5">
              {phaseLists.doFa.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* «حواست باشد» از «پرهیز کن» جدا است. قبلاً هرچه در فهرست پرهیز بود
            قرمز و قطعی نشان داده می‌شد، در حالی که فاز چرخه به‌تنهایی دلیل
            کافی برای منع یک ترکیب یا یک نوبت نیست. */}
        {phaseLists.cautionFa.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-black text-amber-700 dark:text-amber-400">حواست باشد</span>
            <div className="flex flex-wrap gap-1.5">
              {phaseLists.cautionFa.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold"
                >
                  {item}
                </span>
              ))}
            </div>
            {phaseLists.cautionReasonFa && (
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                {phaseLists.cautionReasonFa}
              </p>
            )}
          </div>
        )}

        {phaseLists.avoidFa.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-black text-rose-700 dark:text-rose-400">بهتر است پرهیز کنی</span>
            <div className="flex flex-wrap gap-1.5">
              {phaseLists.avoidFa.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-bold"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-500 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>این محتوا آموزشی است و جای پزشک را نمی‌گیرد.</span>
        </p>
      </div>


      {/* ثبت علائم — به‌شکل آکاردئونی: هدر همیشه دیده می‌شود، فیلدها با یک لمس باز/بسته می‌شوند */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setSymptomsOpen((value) => !value)}
          className="w-full p-4 flex items-center justify-between gap-2 text-right"
        >
          <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-500" />
            علائم امروز
            {existingToday && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">ثبت شده</span>}
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${symptomsOpen ? 'rotate-180' : ''}`} />
        </button>

        {symptomsOpen && (
          <div className="px-4 pb-4 space-y-4">
            {showSymptomInfo && (
              <p className="p-3 rounded-2xl bg-[#fdf3ee] dark:bg-slate-800 text-xs leading-6 text-[#8e5241] dark:text-rose-200 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">این ثبت‌ها فقط روی همین گوشی می‌مانند. بعد از چند چرخه، رزا از همین‌ها الگوی شخصی تو را می‌سازد — مثلاً اینکه جوش یا درد تو معمولاً از کدام روز چرخه شروع می‌شود (پایین همین صفحه) — و به هیچ سروری فرستاده نمی‌شوند.</span>
                <button
                  type="button"
                  onClick={dismissSymptomInfo}
                  aria-label="بستن این راهنما"
                  className="icon-only p-1 -m-1 rounded-lg text-[#8e5241] dark:text-rose-200 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </p>
            )}

            <div className="space-y-3">
              {SYMPTOMS.filter((item) => item.scale).map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                    <span>{item.labelFa}</span>
                    <span className="text-rose-600">{toPersianDigits(draft[item.key] ?? 0)} از ۵</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={draft[item.key] ?? 0}
                    onChange={(event) => setDraft({ ...draft, [item.key]: parseInt(event.target.value, 10) })}
                    className="w-full accent-rose-500"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">امروز کدام‌ها را داشتی؟</span>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOMS.filter((item) => !item.scale).map((item) => {
                  const isOn = (draft[item.key] ?? 0) > 0;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setDraft({ ...draft, [item.key]: isOn ? 0 : 3 })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        isOn
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.labelFa}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={saveSymptoms}
              className="w-full py-3 rounded-2xl bg-[#8e5241] hover:bg-[#784334] text-white text-sm font-bold flex items-center justify-center gap-1.5"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  ذخیره شد
                </>
              ) : (
                'ثبت علائم امروز'
              )}
            </button>
          </div>
        )}
      </div>

      {/* الگوی شخصی — زیر «علائم امروز» */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-800 overflow-hidden">
        <button onClick={() => setPatternOpen((value) => !value)} className="w-full p-4 flex items-center justify-between text-right">
          <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-purple-600" />الگوی شخصی تو</span><span className={`text-slate-400 transition-transform ${patternOpen ? 'rotate-180' : ''}`}>⌄</span>
        </button>
        {patternOpen && <div className="p-4 pt-0 space-y-3">
        {acneSentence || painSentence ? (
          <>
            {acneSentence && (
              <p className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-sm text-purple-900 dark:text-purple-200 leading-relaxed">
                {acneSentence}
                {acnePattern?.riseDay ? ` از روز ${toPersianDigits(Math.max(1, acnePattern.riseDay - 2))} روتین پیشگیرانه را شروع کن.` : ''}
              </p>
            )}

            {painSentence && (
              <p className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-sm text-rose-900 dark:text-rose-200 leading-relaxed">
                {painSentence}
              </p>
            )}

            {/* نمودار از داده واقعی کاربر، نه منحنی ریاضی تزئینی */}
            {acnePattern && acnePattern.buckets.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">شدت جوش در طول چرخه</span>
                <div className="flex items-end gap-1 h-24">
                  {acnePattern.buckets.map((bucket) => (
                    <div
                      key={bucket.fromDay}
                      title={`روز ${bucket.fromDay} تا ${bucket.toDay} — میانگین ${bucket.average}`}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                    >
                      <div
                        className={`w-full rounded-t-lg ${bucket.samples > 0 ? 'bg-purple-500' : 'bg-slate-100 dark:bg-slate-800'}`}
                        style={{ height: `${Math.max(4, (bucket.average / maxBucket) * 100)}%` }}
                      />
                      <span className="text-xs text-slate-400">{toPersianDigits(bucket.fromDay)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Sparkles}
            titleFa="رزا دارد الگوی تو را یاد می‌گیرد"
            descriptionFa="وقتی دو چرخه علائمت را ثبت کنی، می‌توانیم بگوییم جوش‌های تو دقیقاً از کدام روز شروع می‌شوند و از کدام روز باید پیشگیری را شروع کنی."
            progress={{
              current: acnePattern?.cyclesCovered || 0,
              required: 2,
              unitFa: 'چرخه داده‌دار',
            }}
          />
        )}
      </div>}
      </div>

      {/* تاریخچه پریودها — آکاردئونی: فقط پریود در جریان همیشه دیده می‌شود */}
      {periodLogs.length > 0 && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-black text-slate-800 dark:text-white">تاریخچه پریودها</h3>

            {state.stats.averageLength !== null && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                میانگین طول چرخه: {toPersianDigits(state.stats.averageLength)} روز
                {state.stats.shortestLength !== null && state.stats.longestLength !== null
                  ? ` (بین ${toPersianDigits(state.stats.shortestLength)} تا ${toPersianDigits(state.stats.longestLength)})`
                  : ''}
                {state.stats.looksIrregular ? ' · چرخه‌ات نامنظم به نطر می‌رسد.' : ''}
              </p>
            )}

            {state.stats.looksIrregular && (
              <p className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                نامنظم بودن ممکن است دلایل مختلفی داشته باشد. می‌توانی گزارش همین ثبت‌ها را برای پزشک زنانت ببری. رزا تشخیص نمی‌دهد.
              </p>
            )}

            {openPeriod && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  {formatJalaliDate(openPeriod.startIso)} · در جریان
                </span>
                <button
                  onClick={() => {
                    LocalDB.deletePeriodLog(openPeriod.id);
                    bump();
                    onCycleDataChanged?.();
                  }}
                  aria-label="حذف"
                  className="icon-only p-2 rounded-xl text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {otherPeriodLogs.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setHistoryOpen((value) => !value)}
                className="w-full px-4 pb-4 flex items-center justify-between gap-2 text-right"
              >
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {toPersianDigits(otherPeriodLogs.length)} پریود قبلی
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </button>

              {historyOpen && (
                <div className="px-4 pb-4 space-y-1.5">
                  {otherPeriodLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60"
                    >
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatJalaliDate(log.startIso)}
                        {log.endIso ? ` تا ${formatJalaliDayMonth(log.endIso)}` : ' · در جریان'}
                      </span>
                      <button
                        onClick={() => {
                          LocalDB.deletePeriodLog(log.id);
                          bump();
                          onCycleDataChanged?.();
                        }}
                        aria-label="حذف"
                        className="icon-only p-2 rounded-xl text-slate-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { DailyTrackerEntry, Product, UserState } from './types';
import { LocalDB } from './services/db';
import { getTodayIsoDate } from './services/jalali';
import { EMPTY_WEATHER, WeatherSnapshot, fetchWeather, requestWeatherLocation } from './services/weatherService';
import { getLastKnownLocation, getLocationErrorMessageFa } from './services/locationService';
import {
  NotificationScheduleResult,
  onNotificationTap,
  scheduleRozaNotifications,
} from './services/notificationService';
import { isLockConfigured } from './services/security/appLock';
import { computeStreak } from './services/routineService';
import { isFeatureEnabled } from './config/appConfig';

import { Header } from './components/layout/Header';
import { BottomNavigation, NavTab } from './components/layout/BottomNavigation';
import { DrawerMenu } from './components/layout/DrawerMenu';
import { LockScreen } from './components/common/LockScreen';
import { FeatureTourOverlay, TourKey } from './components/common/FeatureTourOverlay';
import { IntroSlides } from './components/onboarding/IntroSlides';

import { HomeDashboard } from './components/home/HomeDashboard';
import { RoutineView } from './components/routine/RoutineView';
import { KnowledgeCenter } from './components/knowledge/KnowledgeCenter';
import { SkinLab } from './components/lab/SkinLab';
import { ProductShelf } from './components/products/ProductShelf';
import { ProgressTracker } from './components/progress/ProgressTracker';
import { ProfileView } from './components/profile/ProfileView';
import { CycleDashboard } from './components/cycle/CycleDashboard';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { FaceMasksView } from './components/masks/FaceMasksView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { MakeupTipsView } from './components/makeup/MakeupTipsView';
import { PersonalRoutineView } from './components/routine/PersonalRoutineView';
import { SplashScreen } from './components/common/SplashScreen';
import { RozaGuideView } from './components/guide/RozaGuideView';
import { SmartSearchModal } from './components/common/SmartSearchModal';
import { SearchResult } from './services/search/searchEngine';

export type SectionKey =
  | 'profile'
  | 'cycle'
  | 'lab'
  | 'products'
  | 'photo'
  | 'masks'
  | 'salon'
  | 'clinic'
  | 'makeup'
  | 'personalRoutine'
  | 'knowledge'
  | 'guide';

const SECTION_TITLES: Record<SectionKey, string> = {
  profile: 'پروفایل و تنطیمات',
  cycle: 'چرخه ماهانه من',
  lab: 'ترکیبات و تداخل‌سنج',
  products: 'قفسه محصولات من',
  photo: 'عکس‌ها و پیشرفت پوست',
  masks: 'ماسک‌های پوستی',
  salon: 'آرایشگاه و نوبت‌های من',
  clinic: 'پزشک و پرونده پوست',
  makeup: 'ترفندهای آرایش',
  personalRoutine: 'روتین پوستی من',
  knowledge: 'مقالات کوتاه',
  guide: 'راهنمای استفاده از رزا',
};

/**
 * این سه بخش خودشان بالای محتوایشان یک عنوان کامل‌تر دارند (مثلاً
 * AppointmentsView یا ProductShelf)، پس عنوان تکراری بالای پنل حذف شد
 * تا در یک صفحه دو بار یک اسم نوشته نشود.
 */
const SECTIONS_WITH_OWN_TITLE = new Set<SectionKey>(['clinic', 'salon', 'products']);

const TAB_TITLES: Record<NavTab, string> = {
  home: 'خانه',
  routine: 'روتین امروز',
  cycle: 'چرخه ماهانه من',
  progress: 'عکس‌ها و پیشرفت پوست',
};

/**
 * فقط این بخش‌ها راهنمای اولین‌بار (تور) دارند؛ بقیه‌ی SectionKey ها
 * (پروفایل/تنطیمات، ترکیبات، عکس‌ها، ماسک‌ها، روتین شخصی) تور ندارند.
 *
 * باگ نسخه قبل: هر SectionKey بدون بررسی به TourKey تبدیل می‌شد
 * (`section as TourKey`). چون TourKey فقط ۹ مقدار دارد ولی SectionKey
 * بیشتر است، باز کردن «تنظیمات» (یا لب/عکس/ماسک/روتین شخصی) برای اولین
 * بار باعث می‌شد FeatureTourOverlay با یک tourKey نامعتبر رندر شود و
 * بلافاصله خطا بدهد — همان صفحه‌ی «متاسفم رزا مشکلی پیدا کرد».
 */
const TOUR_SECTIONS = new Set<string>(['products', 'salon', 'clinic', 'knowledge', 'makeup']);
function sectionTourKey(section: SectionKey): TourKey | null {
  return TOUR_SECTIONS.has(section) ? (section as unknown as TourKey) : null;
}

function createEmptyLog(dateIso: string): DailyTrackerEntry {
  return {
    id: `log_${dateIso}`,
    date: dateIso,
    waterGlasses: 0,
    sleepHours: 0,
    stressLevel: 0,
    exerciseMinutes: 0,
    usedSunscreen: false,
    junkFood: false,
    sugarIntake: 'moderate',
    skinStatusScore: 0,
    mood: '',
    rednessScore: 0,
    drynessScore: 0,
    acneScore: 0,
    oilinessScore: 0,
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const [userState, setUserState] = useState<UserState>(() => LocalDB.getUserState());
  const [products, setProducts] = useState<Product[]>(() => LocalDB.getProducts());
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [homeFocusRequest, setHomeFocusRequest] = useState<{ target: 'sunscreen'; requestedAt: number } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [guideInitialTopicId, setGuideInitialTopicId] = useState<string | null>(null);
  const openGuideTopic = (topicId: string) => {
    setGuideInitialTopicId(topicId);
    setActiveSection('guide');
  };
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [labInitialIngredientId, setLabInitialIngredientId] = useState<string | null>(null);
  const [labInitialConflictPair, setLabInitialConflictPair] = useState<{ firstId: string; secondId: string } | null>(null);
  const [knowledgeInitialArticleId, setKnowledgeInitialArticleId] = useState<string | null>(null);
  const [knowledgeInitialConditionId, setKnowledgeInitialConditionId] = useState<string | null>(null);
  const handleSearchResultSelect = (result: SearchResult) => {
    setIsSearchOpen(false);
    if (result.type === 'ingredient') {
      setLabInitialIngredientId(result.id);
      setActiveSection('lab');
    } else if (result.type === 'interaction' && result.interaction) {
      setLabInitialConflictPair({
        firstId: result.interaction.firstIngredientId,
        secondId: result.interaction.secondIngredientId,
      });
      setActiveSection('lab');
    } else if (result.type === 'condition') {
      setKnowledgeInitialConditionId(result.id);
      setActiveSection('knowledge');
    } else if (result.type === 'article') {
      setKnowledgeInitialArticleId(result.id);
      setActiveSection('knowledge');
    } else if (result.type === 'guide') {
      openGuideTopic(result.id);
    }
  };
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const lastBackAt = React.useRef(0);
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem('roza_intro_seen_v4') !== '1');
  const [tourKey, setTourKey] = useState<TourKey | null>(() => {
    if (localStorage.getItem('roza_intro_seen_v4') !== '1') return null;
    return localStorage.getItem('roza_tour_home_v1') === '1' ? null : 'home';
  });

  const lockRequired = isFeatureEnabled('appLock') && userState.privacy.lockEnabled && isLockConfigured();
  const [isUnlocked, setIsUnlocked] = useState(!lockRequired);

  const todayIso = getTodayIsoDate();
  const [todayLog, setTodayLog] = useState<DailyTrackerEntry>(
    () => LocalDB.getDailyLog(todayIso) || createEmptyLog(todayIso),
  );
  const [weather, setWeather] = useState<WeatherSnapshot>(EMPTY_WEATHER);
  const [weatherLocationStatus, setWeatherLocationStatus] = useState<'idle' | 'loading' | 'denied'>('idle');
  /*
   * پیام دقیق خطای موقعیت.
   *
   * locationService پنج حالت متفاوت را از هم تفکیک می‌کند (رد دسترسی، رد
   * دائمی، GPS خاموش، Timeout، پشتیبانی‌نشدن) و برای هرکدام یک پیام فارسی
   * درست دارد، ولی این صفحه همه را در یک وضعیت 'denied' جمع می‌کرد و همیشه
   * می‌گفت «اجازه موقعیت داده نشد» — حتی وقتی کاربر اجازه داده بود و فقط
   * GPS خاموش بود یا دریافت طول کشیده بود. نتیجه: کاربر می‌رفت تنظیماتِ
   * درستی را عوض کند که از اول درست بود.
   */
  const [weatherLocationErrorFa, setWeatherLocationErrorFa] = useState<string | null>(null);
  // مشکل نسخه قبل: نتیجه scheduleRozaNotifications (که می‌تواند
  // permission-denied باشد) با void دور ریخته می‌شد و کاربر هیچ‌وقت
  // نمی‌فهمید چرا اعلانی نمی‌آید. الان در state نگه داشته و به
  // ProfileView پاس داده می‌شود تا در صورت رد شدن مجوز، هشدار نشان دهد.
  const [notificationStatus, setNotificationStatus] = useState<NotificationScheduleResult | null>(null);
  const requestWeatherGps = async () => {
    setWeatherLocationStatus('loading');
    setWeatherLocationErrorFa(null);
    try {
      const coords = await requestWeatherLocation();
      const value = await fetchWeather(userState.profile.city, userState.profile.skinType, coords);
      setWeather(value);
      setWeatherLocationStatus('idle');
    } catch (error) {
      setWeatherLocationStatus('denied');
      setWeatherLocationErrorFa(getLocationErrorMessageFa(error));
    }
  };

  /* ------------------- حفظ اسکرول پنل‌ها (مثلاً تنظیمات) ------------------- */
  // مشکل نسخه قبل: کانتینر پنل‌ها fixed + overflow-y:auto است. در اندروید،
  // با باز/بسته شدن کیبورد (تایپ در یک اینپوت) یا ظاهر شدن یک overlay با
  // position:fixed داخل همین کانتینر، مرورگر اسکرول کانتینر را صفر می‌کند؛
  // یعنی با تغییر هر مقدار در تنظیمات، صفحه ناگهان به بالا می‌پرید.
  const sectionScrollRef = React.useRef<HTMLDivElement>(null);
  const sectionScrollTop = React.useRef(0);
  useEffect(() => {
    const el = sectionScrollRef.current;
    if (!el) return undefined;
    const onScroll = () => { sectionScrollTop.current = el.scrollTop; };
    const restore = () => {
      requestAnimationFrame(() => {
        if (el && sectionScrollTop.current > 0 && el.scrollTop === 0) {
          el.scrollTop = sectionScrollTop.current;
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', restore);
    window.addEventListener('resize', restore);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.visualViewport?.removeEventListener('resize', restore);
      window.removeEventListener('resize', restore);
    };
  }, [activeSection]);

  /* --------------------------- تم --------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark = userState.themeMode === 'dark' || (userState.themeMode === 'system' && prefersDark);
    root.classList.toggle('dark', Boolean(isDark));
  }, [userState.themeMode]);

  /* --------------------------- آب‌وهوا --------------------------- */
  useEffect(() => {
    let alive = true;
    // موقعیت ذخیره‌شده قبلی (بدون تماس تازه با GPS) — آفلاین‌فرست: اگر
    // موجود باشد همان استفاده می‌شود، حتی اگر اینترنت/GPS الان در دسترس نباشد.
    const lastKnown = getLastKnownLocation();
    const coords = lastKnown ? { latitude: lastKnown.latitude, longitude: lastKnown.longitude } : undefined;
    if (!userState.profile.city && !coords) return;
    void fetchWeather(userState.profile.city, userState.profile.skinType, coords).then((value) => {
      if (alive) setWeather(value);
    });
    return () => { alive = false; };
  }, [userState.profile.city, userState.profile.skinType]);

  /* ----------------------- زنجیره روزهای متوالی ----------------------- */
  // محاسبه واقعی، یک‌بار در هر بوت. در نسخه ۱ این عدد max(streak, 1) بود.
  useEffect(() => {
    if (!userState.onboardingCompleted) return;
    const streak = computeStreak(todayIso);
    if (streak.current === userState.currentStreakDays && streak.best === userState.bestStreakDays) return;
    const updated = { ...userState, currentStreakDays: streak.current, bestStreakDays: streak.best };
    setUserState(updated);
    LocalDB.saveUserState(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState.onboardingCompleted, todayIso]);

  /* --------------------------- اعلان‌ها --------------------------- */
  // یادآوری‌های چرخه و نوبت بر اساس داده‌ای ساخته می‌شوند که خارج از
  // userState زندگی می‌کنند (ثبت پریود، علائم، نوبت‌های جدید — همه
  // مستقیم در LocalDB ذخیره می‌شوند، نه در این state). پس صرفاً به
  // تغییر تنطیمات گوش دادن کافی نیست؛ وگرنه اگر کاربر یک پریود جدید
  // ثبت کند یا نوبتی بسازد، یادآوری‌ها با پیش‌بینی قدیمی می‌مانند تا
  // دفعه بعد که یکی از این تنطیمات را دستی عوض کند. راه‌حل: هر بار
  // اپ به فورگراند برمی‌گردد (باز شدن دوباره — رایج‌ترین لحظه‌ای که
  // داده جدید ثبت شده) هم دوباره زمان‌بندی می‌شود.
  const userStateRef = React.useRef(userState);
  userStateRef.current = userState;

  useEffect(() => {
    if (!userState.onboardingCompleted) return;
    void scheduleRozaNotifications(userState).then(setNotificationStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userState.onboardingCompleted,
    userState.cycleConfig.enabled,
    userState.cycleConfig.pmsStartDaysBefore,
    userState.notifications,
    userState.privacy.hideCycleSection,
  ]);

  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    void CapacitorApp.addListener('resume', () => {
      if (!userStateRef.current.onboardingCompleted) return;
      void scheduleRozaNotifications(userStateRef.current).then(setNotificationStatus);
    })
      .then((listener) => {
        // اگر کامپوننت قبل از resolve شدن این پرامیس unmount شد، همان لحظه
        // listener را حذف کن؛ وگرنه نشتی می‌ماند و بعد از unmount هم
        // زمان‌بندی را صدا می‌زند.
        if (cancelled) {
          void listener.remove();
          return;
        }
        remove = () => void listener.remove();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  /*
   * لمس اعلان → همان صفحه.
   *
   * تا الان لمس هر یادآوری فقط اپ را روی خانه باز می‌کرد. حالا هر اعلان
   * مقصدش را همراه خودش دارد و اینجا به ناوبری واقعی وصل می‌شود: یادآوری
   * دارو به پرونده پزشک، یادآوری نوبت به آرایشگاه، یادآوری روتین به تب
   * روتین و یادآوری‌های چرخه به بخش چرخه.
   */
  useEffect(() => {
    const unsubscribe = onNotificationTap((route) => {
      if (route === 'routine') {
        setActiveSection(null);
        setActiveTab('routine');
        return;
      }
      if (route === 'cycle') {
        setActiveSection(null);
        setActiveTab('cycle');
        return;
      }
      if (route === 'appointments') {
        setActiveTab('home');
        setActiveSection('salon');
        return;
      }
      if (route === 'medications') {
        setActiveTab('home');
        setActiveSection('clinic');
        return;
      }
      setActiveSection(null);
      setActiveTab('home');
    });
    return unsubscribe;
  }, []);

  // نوبت‌ها (ایجاد/انجام‌شد/لغو) مستقیم روی LocalDB نوشته می‌شوند، نه
  // روی userState — پس افکت بالا (که فقط به تغییر userState/resume گوش
  // می‌دهد) از آن‌ها بی‌خبر می‌ماند. بدون این تابع، اعلان یک نوبتِ همان
  // لحظه لغوشده تا باز شدن دوباره اپ (resume بعدی) روی گوشی می‌ماند و
  // نمایش داده می‌شود. AppointmentsView این را بلافاصله بعد از هر
  // ایجاد/انجام‌شد/لغوِ نوبت صدا می‌زند تا زمان‌بندی همان لحظه به‌روز شود.
  const resyncNotifications = useCallback(() => {
    if (!userStateRef.current.onboardingCompleted) return;
    void scheduleRozaNotifications(userStateRef.current).then(setNotificationStatus);
  }, []);

  /* --------------------- دکمه برگشت اندروید --------------------- */
  // مشکل نسخه ۱: پلاگین نصب بود ولی استفاده نمی‌شد؛ کاربر برای بستن
  // یک صفحه، کل اپ را می‌بست.
  const handleBack = useCallback((): boolean => {
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      return true;
    }
    if (activeSection) {
      setActiveSection(null);
      return true;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }
    const now = Date.now();
    if (now - lastBackAt.current < 1800) {
      setShowExitConfirm(true);
      lastBackAt.current = 0;
    } else {
      lastBackAt.current = now;
    }
    return true;
  }, [isDrawerOpen, activeSection, activeTab]);

  useEffect(() => {
    let remove: (() => void) | undefined;
    void CapacitorApp.addListener('backButton', () => {
      const handled = handleBack();
      if (!handled) void CapacitorApp.exitApp();
    })
      .then((listener) => {
        remove = () => void listener.remove();
      })
      .catch(() => undefined);

    return () => remove?.();
  }, [handleBack]);

  /* --------------------------- هندلرها --------------------------- */
  const handleUpdateTodayLog = (log: DailyTrackerEntry) => {
    setTodayLog(log);
    LocalDB.saveDailyLog(log);
  };

  /**
   * باگ قبلی: وقتی دو به‌روزرسانی جدا (مثلاً cycleConfig و profile) پشت سر هم و
   * همزمان (در یک تابع، بدون رندر میانی) صدا زده می‌شدند، هرکدام از روی همان
   * userState «قدیمی» (کلوژر لحظه‌ی رندر) اسپرد می‌شدند؛ پس دومی، تغییر اولی را
   * پاک می‌کرد. مشخصاً در «ثبت پریودی از حالت بارداری»: onUpdateCycleConfig ابتدا
   * enabled را true می‌کرد، اما بلافاصله onUpdateProfile با اسپرد همان userState
   * قدیمی (که هنوز enabled:false در آن بود) این تغییر را از بین می‌برد و کاربر
   * دوباره با «هنوز پریودی ثبت نشده» روبه‌رو می‌شد. حالا هم به شکل تابعی (روی
   * جدیدترین state) و هم به شکل مقدار مستقیم قابل فراخوانی است تا این‌جور
   * زنجیره‌های به‌روزرسانی هرگز همدیگر را از بین نبرند.
   */
  const handleUpdateUserState = (update: UserState | ((prev: UserState) => UserState)) => {
    setUserState((prev) => {
      const next = typeof update === 'function' ? (update as (prev: UserState) => UserState)(prev) : update;
      LocalDB.saveUserState(next);
      return next;
    });
  };

  const handleUpdateProducts = (next: Product[]) => {
    setProducts(next);
    LocalDB.saveProducts(next);
  };

  const handleToggleTheme = () => {
    handleUpdateUserState({ ...userState, themeMode: userState.themeMode === 'dark' ? 'light' : 'dark' });
  };

  /** چرخه فقط وقتی دیده می‌شود که خود کاربر فعالش کرده باشد. */
  const cycleVisible = userState.cycleConfig.enabled && !userState.privacy.hideCycleSection;

  const sectionTitle = useMemo(() => (activeSection ? SECTION_TITLES[activeSection] : ''), [activeSection]);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  if (showIntro) {
    return <IntroSlides onDone={() => { setShowIntro(false); setTourKey(null); }} />;
  }

  if (!userState.onboardingCompleted) {
    return <OnboardingFlow onComplete={(state) => { setUserState(state); setTourKey('home'); }} />;
  }

  if (lockRequired && !isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  const renderSection = () => {
    if (!activeSection) return null;

    return (
      // z-20: زیر هدر ثابت (z-30) می‌ماند تا هدر اصلی روی همه‌ی پنل‌ها — از جمله
      // پنل‌هایی که از منو باز می‌شوند — همیشه دیده شود. قبلاً z-40 بود و هدر را
      // کامل می‌پوشاند، پس اگر پنلی از منو انتخاب می‌شد اصلاً هدری روی آن دیده نمی‌شد.
      <div ref={sectionScrollRef} className="fixed inset-0 z-20 bg-[#faf8f5] dark:bg-slate-950 overflow-y-auto pb-[calc(var(--safe-bottom)+7rem)] pt-[calc(var(--safe-top)+82px)]">
        {!SECTIONS_WITH_OWN_TITLE.has(activeSection) && (
          <div className="max-w-lg mx-auto px-4 mb-3 flex items-center justify-between gap-3 border-b border-rose-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white">{sectionTitle}</h2>
          </div>
        )}

        {activeSection === 'profile' && (
          <ProfileView
            userState={userState}
            onUpdateState={handleUpdateUserState}
            notificationStatus={notificationStatus}
          />
        )}
        {activeSection === 'cycle' && (
          <CycleDashboard
            userState={userState}
            onUpdateCycleConfig={(config) => handleUpdateUserState((prev) => ({ ...prev, cycleConfig: config }))}
            onUpdateProfile={(profile) => handleUpdateUserState((prev) => ({ ...prev, profile }))}
            onCycleDataChanged={resyncNotifications}
          />
        )}
        {activeSection === 'lab' && (
          <SkinLab
            initialTab="ingredients"
            userState={userState}
            products={products}
            initialIngredientId={labInitialIngredientId}
            onConsumedInitialIngredient={() => setLabInitialIngredientId(null)}
            initialConflictPair={labInitialConflictPair}
            onConsumedInitialConflictPair={() => setLabInitialConflictPair(null)}
          />
        )}
        {activeSection === 'products' && (
          <ProductShelf products={products} onUpdateProducts={handleUpdateProducts} userState={userState} />
        )}
        {activeSection === 'photo' && <ProgressTracker initialTab="photos" />}
        {activeSection === 'masks' && <FaceMasksView />}
        {activeSection === 'salon' && (
          <AppointmentsView kind="salon" userState={userState} onAppointmentsChanged={resyncNotifications} />
        )}
        {activeSection === 'clinic' && (
          <AppointmentsView kind="clinic" userState={userState} onAppointmentsChanged={resyncNotifications} />
        )}
        {activeSection === 'makeup' && <MakeupTipsView />}
        {activeSection === 'personalRoutine' && <PersonalRoutineView />}
        {activeSection === 'knowledge' && (
          <KnowledgeCenter
            initialArticleId={knowledgeInitialArticleId}
            initialConditionId={knowledgeInitialConditionId}
            onConsumedInitialDeepLink={() => {
              setKnowledgeInitialArticleId(null);
              setKnowledgeInitialConditionId(null);
            }}
          />
        )}
        {activeSection === 'guide' && (
          <RozaGuideView
            initialTopicId={guideInitialTopicId}
            onConsumedInitialTopic={() => setGuideInitialTopicId(null)}
          />
        )}
      </div>
    );
  };

  // مشکل نسخه قبل: تأیید خروج با یک return جدا و کامل جایگزین کل اپ می‌شد،
  // بنابراین پشت پنجره تأیید فقط سفیدی/پس‌زمینه خالی صفحه دیده می‌شد نه خود برنامه.
  // حالا این پنجره روی همان درخت اصلی اپ (به‌عنوان لایه‌ی روی آن) رندر می‌شود.
  return (
    <div className="min-h-screen pt-[82px] bg-[#faf8f5] dark:bg-slate-950 text-slate-800 dark:text-white relative transition-colors duration-300">
      <Header
        userState={userState}
        weather={weather}
        todayLog={todayLog}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onToggleTheme={handleToggleTheme}
        onNavigateTab={(tab) => { setActiveTab(tab); setActiveSection(null); }}
        onFocusSunscreenCard={() => { setActiveTab('home'); setActiveSection(null); setHomeFocusRequest({ target: 'sunscreen', requestedAt: Date.now() }); }}
        onOpenSection={(section) => { setActiveSection(section); setIsDrawerOpen(false); }}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {isSearchOpen && (
        <SmartSearchModal
          onClose={() => setIsSearchOpen(false)}
          onSelectResult={handleSearchResultSelect}
          profile={userState.profile}
        />
      )}

      <DrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userState={userState}
        cycleVisible={cycleVisible}
        onNavigateTab={(tab) => {
          setActiveSection(null);
          setActiveTab(tab);
          const key = tab as TourKey;
          setTourKey(localStorage.getItem(`roza_tour_${key}_v1`) === '1' ? null : key);
        }}
        onOpenSection={(section) => {
          setActiveSection(section);
          const key = sectionTourKey(section);
          setTourKey(!key || localStorage.getItem(`roza_tour_${key}_v1`) === '1' ? null : key);
        }}
        onToggleTheme={handleToggleTheme}
      />

      {renderSection()}

      {!activeSection && (
        <main className="w-full">
          <div className="max-w-lg mx-auto px-4 flex items-center justify-between gap-3 border-b border-rose-100 dark:border-slate-800 pb-1.5 mb-1.5">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white">{TAB_TITLES[activeTab]}</h2>
          </div>

          {activeTab === 'home' && (
            <HomeDashboard
              userState={userState}
              products={products}
              todayLog={todayLog}
              weather={weather}
              onRequestWeatherLocation={requestWeatherGps}
              weatherLocationLoading={weatherLocationStatus === 'loading'}
              weatherLocationError={weatherLocationStatus === 'denied'}
              weatherLocationErrorFa={weatherLocationErrorFa}
              cycleVisible={cycleVisible}
              onUpdateDailyLog={handleUpdateTodayLog}
              onNavigateTab={(tab) => { setActiveTab(tab); const key = tab as TourKey; setTourKey(localStorage.getItem(`roza_tour_${key}_v1`) === '1' ? null : key); }}
              onOpenSection={(section) => {
                setActiveSection(section);
                const key = sectionTourKey(section);
                setTourKey(!key || localStorage.getItem(`roza_tour_${key}_v1`) === '1' ? null : key);
              }}
              onOpenGuideTopic={openGuideTopic}
              focusRequest={activeTab === 'home' ? homeFocusRequest : null}
              onFocusRequestHandled={() => setHomeFocusRequest(null)}
            />
          )}

          {activeTab === 'routine' && (
            <RoutineView userState={userState} weather={weather} products={products} onOpenGuideTopic={openGuideTopic} />
          )}

          {activeTab === 'cycle' && (
            <CycleDashboard
              userState={userState}
              onUpdateCycleConfig={(config) => handleUpdateUserState((prev) => ({ ...prev, cycleConfig: config }))}
              onUpdateProfile={(profile) => handleUpdateUserState((prev) => ({ ...prev, profile }))}
              onCycleDataChanged={resyncNotifications}
            />
          )}

          {activeTab === 'progress' && <ProgressTracker initialTab="photos" />}
        </main>
      )}

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveSection(null);
          setActiveTab(tab);
          const key = tab as TourKey;
          setTourKey(localStorage.getItem(`roza_tour_${key}_v1`) === '1' ? null : key);
        }}
        onFabClick={() => setActiveSection('personalRoutine')}
        fabLabel="افزودن برنامه شخصی امروز"
      />
      {tourKey && <FeatureTourOverlay tourKey={tourKey} onDone={() => setTourKey(null)} />}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[90] bg-[#20334d]/45 flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-[#fffdf9] dark:bg-slate-900 p-5 text-center shadow-2xl space-y-4">
            <h2 className="text-base font-black text-[#263b56] dark:text-white">از برنامه خارج می‌شوی؟</h2>
            <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">برای بستن برنامه، تأیید کن.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 py-3 text-sm font-bold">انصراف</button>
              <button onClick={() => void CapacitorApp.exitApp()} className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-bold text-white">خروج</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

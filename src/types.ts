/**
 * مدل داده رزا.
 *
 * دو قاعده که برای فازهای بعدی (فروشگاه وب، آرایشگاه و پزشک طرف قرارداد)
 * رعایت شده‌اند:
 *  ۱) هر رکوردی که قرار است روزی با سرور سنکرون شود، SyncMeta دارد.
 *  ۲) هر موجودیتی که می‌تواند هم مال خود کاربر باشد و هم از دایرکتوری
 *     ما بیاید (محصول، آرایشگاه، پزشک) فیلد source دارد.
 */

/* ============================ پایه ============================ */

/** فیلدهای مشترک برای سنک آینده با سرور. حتی در حالت آفلاین پر می‌شوند. */
export interface SyncMeta {
  /** زمان آخرین تغییر (ISO کامل با ساعت). ملاک حل تعارض در سنک. */
  updatedAt: string;
  /** حذف نرم. رکورد می‌ماند تا حذف به سرور هم منتقل شود. */
  deletedAt?: string;
  /** تغییر محلی هنوز به سرور نرفته. */
  dirty?: boolean;
  /** شناسه رکورد در سرور، اگر قبلاً سنک شده باشد. */
  remoteId?: string;
}

/** منبع یک رکورد: خود کاربر وارد کرده یا از دایرکتوری رزا آمده. */
export type RecordSource = 'user' | 'directory';
/* ===================== شدت توصیه ===================== */

/**
 * شدت یک توصیه. قبلاً هر قاعده‌ای که نامش avoid بود، در UI به
 * «امروز پرهیز کن» تبدیل می‌شد و پیشنهاد، احتیاط و منع پزشکی یکی
 * دیده می‌شدند. این پنج سطح همان تفاوت را واقعی می‌کند.
 */
export type AdviceSeverity = 'INFO' | 'SUGGESTION' | 'CAUTION' | 'IMPORTANT' | 'PROFESSIONAL_INSTRUCTION';

/** کاری که از کاربر خواسته می‌شود. عمداً از شدت جداست. */
export type AdviceAction = 'info' | 'use' | 'reduce' | 'pause' | 'stop';

export type AdviceSource =
  | 'pregnancy'
  | 'medication'
  | 'safety'
  | 'procedure'
  | 'cycle'
  | 'symptom'
  | 'skin_profile'
  | 'age';

/**
 * یک توصیه درباره یک ترکیب، برای امروزِ همین کاربر.
 * اگر ترکیب در محصولات کاربر نباشد، educationalOnly روشن می‌شود و
 * UI حق ندارد بگوید «امروز از X استفاده نکن».
 */
export interface IngredientAdvice {
  ruleId: string;
  ingredientId: string;
  ingredientNameFa: string;
  severity: AdviceSeverity;
  action: AdviceAction;
  headlineFa: string;
  /** توضیح سادهٔ «چرا امروز». */
  reasonFa: string;
  /** داده‌هایی که قاعده را فعال کردند. */
  triggersFa: string[];
  productNamesFa: string[];
  inUserShelf: boolean;
  educationalOnly: boolean;
  source: AdviceSource;
  /** تا کِی. حالا همیشه پر می‌شود (قبلاً در تایپ بود و هرگز ست نمی‌شد). */
  untilIso?: string;
  appointmentId?: string;
  /**
   * ناحیهٔ اعمال توصیه. قاعدهٔ ابرو می‌گفت «روی ناحیهٔ ابرو» ولی موتور کل
   * روتین صورت را می‌بست. با این فیلد، پرهیز ناحیه‌ای، ناحیه‌ای می‌ماند.
   */
  scope: AdviceScope;
  /** متن ناحیه برای کاربر، مثلاً «فقط روی ناحیهٔ ابرو». */
  scopeFa?: string;
  /** منابع دیگری که همین ترکیب را نشان کرده‌اند — بعد از ادغام پر می‌شود. */
  alsoFromSources?: AdviceSource[];
}

/**
 * دامنهٔ یک توصیه.
 *  face      : کل روتین صورت
 *  region    : فقط ناحیهٔ محدود جلسه (ابرو، لب، خط رویش)
 *  body      : ناحیهٔ بدن، روتین صورت دست نمی‌خورد
 *  systemic  : ایمنی عمومی (بارداری، دارو) — همه‌جا
 */
export type AdviceScope = 'face' | 'region' | 'body' | 'systemic';

/**
 * هشدار ایمنی سطح روتین.
 *
 * قبلاً `safetyWarningsFa: string[]` بود و شدت‌ها در RoutineView با ایندکس
 * عددی به همان آرایه وصل می‌شد؛ یعنی دو فایل باید همیشه قفل‌به‌قفل ویرایش
 * می‌شدند وگرنه هشدار بارداری برچسب «دستور پزشک» می‌گرفت. حالا شدت و متن
 * در یک شیء با هم سفر می‌کنند.
 */
export interface SafetyWarning {
  id: string;
  textFa: string;
  severity: AdviceSeverity;
  source: AdviceSource;
}

/** علائم واقعی پوست در روزهای اخیر (ثبت روزانه + علائم چرخه). */
export interface SkinSignals {
  hasData: boolean;
  /** همه شدت‌ها ۰ تا ۵. */
  redness: number;
  dryness: number;
  irritation: number;
  acne: number;
  oiliness: number;
  daysCovered: number;
  irritatedNow: boolean;
  sourceFa: string;
}


/* ============================ پوست و پروفایل ============================ */

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive' | 'dehydrated';

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'dark';

export type SkinConcern =
  | 'acne'
  | 'hyperpigmentation'
  | 'wrinkles'
  | 'fine_lines'
  | 'dryness'
  | 'oiliness'
  | 'redness'
  | 'rosacea'
  | 'eczema'
  | 'pores'
  | 'texture'
  | 'dark_circles';

export type HairType = 'straight' | 'wavy' | 'curly' | 'coily';

export interface SkinProfile {
  name?: string;
  avatarUrl?: string;
  /** تاریخ تولد به شکل میلادی YYYY-MM-DD (ذخیره داخلی). خالی یعنی وارد نشده. */
  birthDateIso?: string;
  city: string;
  skinType: SkinType;
  skinTone: SkinTone;
  sensitivityScore: number; // ۱ تا ۱۰
  primaryConcerns: SkinConcern[];
  hairType: HairType;
  hairConcerns: string[];
  /** فیلدهای ایمنی — در موتور توصیه و هشدار ترکیبات استفاده می‌شوند. */
  isPregnant: boolean;
  isBreastfeeding: boolean;
  /** مصرف رتینوئید خوراکی (ایزوترتینوئین/راکوتان). پرهیزهای جدی دارد. */
  onOralRetinoid: boolean;
  medications: string[];
  allergies: string[];
}

export interface LifestyleProfile {
  waterTargetGlasses: number;
  sleepTargetHours: number;
  stressLevel: 'low' | 'medium' | 'high';
  exerciseDaysPerWeek: number;
  sunExposureHours: number;
  junkFoodFrequency: 'rarely' | 'sometimes' | 'frequently';
  sugarIntake: 'low' | 'moderate' | 'high';
  isSmoking: boolean;
}

/* ============================ چرخه ============================ */

export type MenstrualPhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type CycleRegularity = 'regular' | 'somewhat_irregular' | 'irregular' | 'unknown';

export interface MenstrualCycleConfig {
  /** کاملاً اختیاری. اگر false باشد، هیچ محتوای چرخه‌ای در اپ دیده نمی‌شود. */
  enabled: boolean;
  /** طول متوسط چرخه که کاربر اعلام کرده. پیش‌بینی واقعی از تاریخچه می‌آید. */
  cycleLength: number;
  periodLength: number;
  regularity: CycleRegularity;
  /** چند روز قبل از پریود، بازه حساس محسوب شود. */
  pmsStartDaysBefore: number;
  /** مشکوک یا تشخیص‌داده‌شده PCOS — فقط برای تنطیم لحن و گزارش پزشک. */
  pcosFlagged: boolean;
  /** منسوخ: در نسخه ۱ تنها منبع تاریخ بود. فقط برای مایگریشن مانده. */
  lastPeriodDate?: string;
}

/** یک دوره پریود ثبت‌شده. منبع حقیقت برای همه محاسبات چرخه. */
export interface PeriodLog extends SyncMeta {
  id: string;
  startIso: string;
  /** خالی = هنوز در جریان است. */
  endIso?: string;
  flow?: 'light' | 'medium' | 'heavy';
  notesFa?: string;
}

export type SymptomKey =
  | 'acne'
  | 'oiliness'
  | 'dryness'
  | 'redness'
  | 'sensitivity'
  | 'pain'
  | 'bloating'
  | 'headache'
  | 'lowMood'
  | 'irritability'
  | 'fatigue'
  | 'cravings'
  | 'badSleep';

export interface CycleSymptom extends SyncMeta {
  date: string;
  /** شدت‌های ۰ تا ۵. فقط مواردی که کاربر ثبت کرده پر می‌شوند. */
  scores: Partial<Record<SymptomKey, number>>;
  mood?: 'great' | 'calm' | 'anxious' | 'irritated' | 'fatigued';
  notesFa?: string;
}

/* ============================ محصول و ترکیبات ============================ */

export type ProductCategory =
  | 'cleanser'
  | 'moisturizer'
  | 'serum'
  | 'sunscreen'
  | 'treatment'
  | 'mask'
  | 'eyecare'
  | 'toner'
  | 'exfoliant'
  | 'haircare';

export interface Product extends SyncMeta {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  /** شناسه ترکیبات از INGREDIENTS_DATABASE (مانند ing_retinol). ملاک تداخل‌سنجی. */
  ingredientIds: string[];
  /** ترکیباتی که در دیتابیس ما نیستند و کاربر خودش نوشته. */
  customIngredients: string[];
  owned: boolean;
  notes?: string;
  rating?: number;
  openedDate?: string;
  expirationMonths?: number;
  /* --- فاز فروشگاه: این فیلدها الان خالی‌اند و بعداً از کاتالوگ پر می‌شوند --- */
  source: RecordSource;
  /** شناسه محصول در کاتالوگ فروشگاه. */
  catalogId?: string;
  sku?: string;
  priceToman?: number;
  /** تولید در زمان اجرا از SHOP_BASE_URL. هرگز داخل رکورد ذخیره نمی‌شود. */
  purchaseUrl?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  nameFa: string;
  category: 'active' | 'hydrator' | 'soother' | 'exfoliant' | 'antioxidant' | 'barrier_repair' | 'oil';
  /**
   * نام‌های رایج/محاوره‌ای/غلط‌نویسی‌های رایج این ماده (فارسی و انگلیسی).
   * فقط برای جستجو استفاده می‌شود؛ در UI نمایش رسمی نداده نمی‌شود.
   */
  commonNamesFa?: string[];
  benefitsFa: string[];
  risksFa?: string[];
  suitableSkinTypes: SkinType[];
  avoidSkinTypes: SkinType[];
  usageTime: 'morning' | 'night' | 'both';
  pregnancySafety: 'safe' | 'avoid' | 'consult_doctor';
  breastfeedingSafety: 'safe' | 'avoid' | 'consult_doctor';
  /** شناسه‌های ترکیبات سازگار (نه متن آزاد). */
  compatibleIngredientIds: string[];
  /** شناسه‌های ترکیباتی که نباید همزمان مصرف شوند. */
  avoidCombiningIds: string[];
  /** دلیل تداخل، برای نمایش به کاربر. */
  conflictReasonFa?: string;
  sideEffectsFa?: string;
  irritationRisk: 'low' | 'moderate' | 'high';
  descriptionFa: string;
  imageUrl?: string;
  /** دسته فارماکولوژیک. AHA و BHA و رتینوئید را یکی فرض نمی‌کنیم. */
  activeClass?:
    | 'retinoid'
    | 'aha'
    | 'bha'
    | 'benzoyl_peroxide'
    | 'antioxidant'
    | 'niacinamide'
    | 'azelaic'
    | 'hydrator'
    | 'soother'
    | 'barrier'
    | 'other';
  /** قدرت تقریبی: رتینول OTC با ترتینوئین یکی نیست. */
  potency?: 'gentle' | 'moderate' | 'strong';
  /** فقط با تجویز پزشک. در این حالت رزا جلوی دستور پزشک را نمی‌گیرد. */
  prescriptionOnly?: boolean;
  /** ماندنی روی پوست یا شسته‌شدنی. ریسک تحریک کاملاً متفاوت است. */
  typicalUse?: 'leave_on' | 'wash_off' | 'both';
  /** پرهیز همزمان با خدمات زیبایی (لیزر، پیلینگ، اپیلاسیون). */
  pauseBeforeProcedures?: boolean;
  /**
   * دسته‌های محصولی که این ماده معمولاً در آن‌ها فرمولاسیون می‌شود
   * (بر پایه‌ی شیمی فرمولاسیون کازمتیک، نه برند خاص — توصیه‌ای و تقریبی است).
   * مثال: نیاسینامید هم‌زمان در چند دسته رایج است، ترتینوئین فقط در treatment.
   */
  commonCategoryIds?: ProductCategory[];
}

export interface Article {
  id: string;
  titleFa: string;
  categoryId: string;
  categoryFa: string;
  summaryFa: string;
  fullContentFa: string;
  tagsFa: string[];
  readTimeMin: number;
  difficultyFa: 'مقدماتی' | 'متوسط' | 'تخصصی';
  imageUrl?: string;
  relatedIngredients?: string[];
  relatedSkinProblems?: string[];
}

export interface SkinConditionInfo {
  id: string;
  nameFa: string;
  summaryFa: string;
  descriptionFa: string;
  symptomsFa: string[];
  possibleCausesFa: string[];
  lifestyleFactorsFa: string[];
  recommendedHabitsFa: string[];
  suitableIngredients: string[];
  avoidIngredients: string[];
  imageUrl?: string;
  /** اگر true، اپ واضح می‌گوید که این مورد نیاز به پزشک دارد. */
  needsDoctorFa?: string;
}

/* ============================ روتین ============================ */

export type RoutineType = 'morning' | 'night';

export interface RoutineStep {
  id: string;
  titleFa: string;
  category: ProductCategory;
  productId?: string;
  productNameFa?: string;
  completed: boolean;
  timeSeconds?: number;
  descriptionFa: string;
  /** چرا این گام در روتین امروز هست. شفافیت به جای جعبه سیاه. */
  reasonFa?: string;
  isCustom?: boolean;
  /** گام به خاطر نوبت آرایشگاه/کلینیک یا داروی پزشک حذف یا جایگزین شده. */
  blockedReasonFa?: string;
}

export interface Routine extends SyncMeta {
  id: string;
  date: string;
  type: RoutineType;
  steps: RoutineStep[];
  completedAt?: string;
}

/* ============================ ثبت روزانه ============================ */

export interface DailyTrackerEntry extends SyncMeta {
  id: string;
  date: string;
  waterGlasses: number;
  sleepHours: number;
  stressLevel: number; // ۰ = ثبت نشده
  exerciseMinutes: number;
  usedSunscreen: boolean;
  sunscreenApplyCount?: number;
  junkFood: boolean;
  sugarIntake: 'low' | 'moderate' | 'high';
  skinStatusScore: number; // ۰ = ثبت نشده، وگرنه ۱ تا ۱۰
  mood: string;
  /**
   * علائم پوست ۰ تا ۱۰ (۰ = ثبت نشده). این چهار عدد ورودی واقعی
   * getSkinSignals هستند و از کارت «ثبت سریع امروز» نوشته می‌شوند.
   */
  rednessScore: number;
  drynessScore: number;
  acneScore: number;
  oilinessScore: number;
  notes?: string;
}

export interface PhotoProgress extends SyncMeta {
  id: string;
  date: string;
  /** شناسه فایل در مخزن blobs. دیگر base64 در localStorage نیست. */
  blobId: string;
  notes?: string;
  /** امتیاز ی خود کاربر (۰ = امتیاز نداده). هرگز خودکار پر نمی‌شود. */
  skinConditionScore: number;
  tagsFa: string[];
  /** عکس قبل/بعد یک نوبت آرایشگاه یا کلینیک. */
  appointmentId?: string;
  appointmentPhase?: 'before' | 'after';
}

/* ============================ آرایشگاه و پزشک ============================ */

export type ProviderKind = 'salon' | 'clinic';

export type ProviderSpecialty =
  | 'hair'
  | 'skin'
  | 'nail'
  | 'laser'
  | 'makeup'
  | 'dermatologist'
  | 'gynecologist'
  | 'nutritionist';

/**
 * شیوه گرفتن نوبت.
 *  manual  : کاربر خودش هماهنگ کرده، اپ فقط ثبت و یادآوری می‌کند (فاز ۲)
 *  call    : دایرکتوری ما، تماس تلفنی (فاز ۳)
 *  request : درخواست نوبت از طریق اپ، تایید دستی آرایشگاه (فاز ۳)
 *  instant : رزرو آنی روی تقویم واقعی طرف قرارداد (فاز ۳+)
 */
export type BookingMode = 'manual' | 'call' | 'request' | 'instant';

export interface Provider extends SyncMeta {
  id: string;
  kind: ProviderKind;
  source: RecordSource;
  name: string;
  specialties: ProviderSpecialty[];
  contactName?: string;
  phone?: string;
  instagram?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  /** امتیاز خود کاربر، ۱ تا ۵. مستقل از امتیاز دایرکتوری. */
  myRating?: number;
  isFavorite: boolean;
  notesFa?: string;
  bookingMode: BookingMode;
  /* --- فاز دایرکتوری / درآمدزایی --- */
  /** شناسه طرف قرارداد در سمت ما. ملاک تسویه حساب ارجاع. */
  partnerId?: string;
  /** اگر true، در UI باید برچسب «معرفی رزا» بخورد. شفافیت اجباری است. */
  isSponsored?: boolean;
  directoryRating?: number;
  verifiedAt?: string;
}

/**
 * دسته خدمات.
 *
 * مقدارهای جدید تفکیک‌شده (لیزر مو با لیزر پوست یکی نیست، میکروبلیدینگ
 * با رنگ ابرو یکی نیست، پیلینگ سطحی با متوسط یکی نیست) اضافه شدند و
 * مقدارهای قدیم (laser, peeling, brow, facial) باقی ماندند تا رکوردهای
 * ذخیره‌شدهٔ کاربران خراب نشوند (قاعدهٔ عمومیِ محتاط‌تر می‌گیرند).
 */
export type ServiceCategory =
  | 'haircut'
  | 'hair_color'
  | 'highlight'
  | 'keratin'
  | 'hair_treatment'
  /* --- پوست: تفکیک‌شده --- */
  | 'facial'
  | 'facial_hydrating'
  | 'facial_deep'
  | 'cleansing'
  | 'microneedling'
  | 'peeling'
  | 'peel_superficial'
  | 'peel_medium'
  /* --- لیزر: موی زائد با رزورفیسینگ یکی نیست --- */
  | 'laser'
  | 'laser_hair'
  | 'ipl'
  | 'laser_resurfacing'
  /* --- مو و ابرو --- */
  | 'wax'
  | 'threading'
  | 'brow'
  | 'brow_tattoo'
  | 'brow_lift'
  | 'brow_tint'
  | 'lash'
  | 'nail'
  | 'makeup'
  | 'consultation'
  | 'procedure';

export interface ProviderService extends SyncMeta {
  id: string;
  providerId: string;
  nameFa: string;
  category: ServiceCategory;
  durationMin?: number;
  priceToman?: number;
  /** بازه تکرار تقریبی — ملاک یادآوری خودکار جلسه بعدی. */
  repeatIntervalDays?: number;
  aftercareFa?: string[];
}

export type AppointmentStatus = 'planned' | 'requested' | 'confirmed' | 'done' | 'canceled' | 'missed';

export interface Appointment extends SyncMeta {
  id: string;
  providerId: string;
  providerKind: ProviderKind;
  serviceIds: string[];
  /** عنوان آزاد، وقتی کاربر خدمت تعریف‌شده انتخاب نکرده. */
  titleFa?: string;
  dateIso: string;
  timeHhmm?: string;
  status: AppointmentStatus;
  paidToman?: number;
  satisfaction?: number;
  notesFa?: string;
  /** چند روز قبل یادآوری شود. معمولاً [۳، ۱، ۰]. */
  remindersDaysBefore: number[];
  /** تولیدشده توسط موتور هماهنگی: پرهیزهای قبل و بعد جلسه. */
  prepChecklistFa?: string[];
  aftercareChecklistFa?: string[];
  /** ملاک ارجاع: این نوبت از دایرکتوری رزا انجام شده یا دستی. */
  referralId?: string;
}

/* ============================ پرونده پزشکی ============================ */

export interface Visit extends SyncMeta {
  id: string;
  providerId: string;
  dateIso: string;
  complaintFa?: string;
  diagnosisFa?: string;
  ordersFa?: string;
  costToman?: number;
  /** شناسه فایل‌ها در مخزن blobs (عکس نسخه، برگه آزمایش). */
  attachmentBlobIds: string[];
  nextVisitDateIso?: string;
}

export interface Medication extends SyncMeta {
  id: string;
  visitId?: string;
  nameFa: string;
  form: 'topical' | 'oral' | 'injection';
  dose?: string;
  timing: ('morning' | 'noon' | 'night')[];
  startDateIso: string;
  durationDays?: number;
  isActive: boolean;
  /** شناسه ترکیباتی که با این دارو تداخل دارند. موتور روتین رعایت می‌کند. */
  conflictingIngredientIds?: string[];
  cautionsFa?: string[];
}

export interface LabResult extends SyncMeta {
  id: string;
  testNameFa: string;
  dateIso: string;
  value?: string;
  attachmentBlobId?: string;
  nextDueDateIso?: string;
}

/* ============================ گیمیفیکیشن ============================ */

export interface Achievement {
  id: string;
  titleFa: string;
  descriptionFa: string;
  iconName: string;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}

/* ============================ آب‌وهوا ============================ */

export interface WeatherData {
  city: string;
  temp: number;
  conditionFa: string;
  humidity: number;
  uvIndex: number;
  recommendationFa: string;
  weatherCode?: number;
  updatedAt?: string;
  isStale?: boolean;
  /** اگر false، کارت آب‌وهوا کاملاً مخفی می‌شود (بدون نمایش خطا). */
  hasData: boolean;
}

/* ============================ تلمتری و ارجاع ============================ */

/**
 * رویدادهای مربوط به مدل درآمدزایی. الان فقط محلی صف می‌شوند؛
 * وقتی سرور آمد، همین صف برای اثبات ارجاع به آرایشگاه یا پزشک می‌رود.
 * هیچ داده سلامتی یا عکس در این رویدادها قرار نمی‌گیرد.
 */
export type TelemetryEventType =
  | 'provider_viewed'
  | 'provider_called'
  | 'provider_directions'
  | 'booking_created'
  | 'booking_completed'
  | 'booking_canceled'
  | 'product_viewed'
  | 'product_purchase_clicked';

export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  atIso: string;
  /** شناسه طرف قرارداد یا محصول کاتالوگ. بدون این، رویداد ذخیره نمی‌شود. */
  partnerId?: string;
  catalogId?: string;
  referralId?: string;
  synced: boolean;
}

/* ============================ وضعیت کلی ============================ */

export interface NotificationSettings {
  enabled: boolean;
  morningRoutine: boolean;
  morningHour: number;
  morningMinute: number;
  nightRoutine: boolean;
  nightHour: number;
  nightMinute: number;
  /** یادآوری در طول بازه پیش از قاعدگی (PMS). */
  cycleInsight: boolean;
  appointmentReminder: boolean;
  medicationReminder: boolean;
  /** یادآوری روزانه برای ثبت علائم چرخه. */
  symptomReminder: boolean;
  symptomReminderHour: number;
  symptomReminderMinute: number;
  /** یادآوری فاز تخمک‌گذاری. */
  ovulationReminder: boolean;
  /** یادآوری «از فردا وارد PMS می‌شوی» و «فردا پریودت شروع می‌شود». */
  periodReminder: boolean;
  /** هشدار میزان یووی بالا، بر اساس داده هواشناسی. */
  uvAlert: boolean;
  /** متن اعلان‌ها خنطی باشد (روی صفحه قفل چیزی لو نرود). */
  discreetText: boolean;
}

export interface PrivacySettings {
  /** قفل ورود به اپ. */
  lockEnabled: boolean;
  /** در صورت خاموش بودن، بخش چرخه از منو و داشبورد محو می‌شود. */
  hideCycleSection: boolean;
}

export interface UserState {
  /** شناسه بی‌نام دستگاه. برای اتصال به حساب و فروشگاه در فازهای بعد. */
  deviceId: string;
  schemaVersion: number;
  profile: SkinProfile;
  lifestyle: LifestyleProfile;
  cycleConfig: MenstrualCycleConfig;
  currentStreakDays: number;
  bestStreakDays: number;
  onboardingCompleted: boolean;
  themeMode: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

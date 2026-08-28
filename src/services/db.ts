/**
 * لایه دسترسی به داده.
 *
 * همه بخش‌های اپ فقط از اینجا داده می‌خوانند و می‌نویسند. دلیلش این
 * است که وقتی سرور و فروشگاه اضافه شد، فقط همین فایل عوض شود
 * نه ۲۰ کامپوننت. هر رکورد هم SyncMeta دارد تا سنک دوطرفه ممکن باشد.
 */

import {
  Appointment,
  CycleSymptom,
  DailyTrackerEntry,
  LabResult,
  Medication,
  MenstrualCycleConfig,
  PeriodLog,
  PhotoProgress,
  Product,
  Provider,
  ProviderService,
  Routine,
  RoutineType,
  SkinProfile,
  SyncMeta,
  TelemetryEvent,
  UserState,
  Visit,
} from '../types';
import { DATA_SCHEMA_VERSION } from '../config/appConfig';
import { readJson, writeJson } from './storage/persistence';
import { getJalaliToday, jalaliToGregorian, toIsoDate } from './jalali';

/**
 * پیش‌فرض فیلدهایی که در نسخه‌های قبلی ثبت روزانه وجود نداشتند.
 * چهار امتیاز علائم پوست حالا ورودی واقعی موتور توصیه‌اند، پس رکوردهای
 * قدیمی باید عدد داشته باشند نه undefined.
 */
const LEGACY_LOG_DEFAULTS = {
  usedSunscreen: false,
  rednessScore: 0,
  drynessScore: 0,
  acneScore: 0,
  oilinessScore: 0,
} as const;

export { INGREDIENTS_DATABASE, findIngredientById, findIngredientByName } from './content/ingredients';
export { SKIN_CONDITIONS_DATABASE } from './content/conditions';
export { ARTICLES_DATABASE } from './content/articles';

const KEYS = {
  userState: 'roza_user_state_v2',
  products: 'roza_products_v2',
  routines: 'roza_routines_v2',
  dailyLogs: 'roza_daily_logs_v2',
  cycleSymptoms: 'roza_cycle_symptoms_v2',
  periodLogs: 'roza_period_logs_v1',
  photos: 'roza_photos_v2',
  providers: 'roza_providers_v1',
  providerServices: 'roza_provider_services_v1',
  appointments: 'roza_appointments_v1',
  visits: 'roza_visits_v1',
  medications: 'roza_medications_v1',
  labResults: 'roza_lab_results_v1',
  telemetry: 'roza_telemetry_v1',
} as const;

/* ------------------------------- کمکی عمومی ------------------------------- */

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function stampMeta<T extends SyncMeta>(record: T): T {
  return { ...record, updatedAt: new Date().toISOString(), dirty: true };
}

function readList<T>(key: string): T[] {
  const value = readJson<T[]>(key, []);
  return Array.isArray(value) ? value : [];
}

/** رکوردهای حذف‌شده نرم از دید UI پنهان می‌مانند. */
function visible<T extends SyncMeta>(items: T[]): T[] {
  return items.filter((item) => !item.deletedAt);
}

function upsertById<T extends SyncMeta & { id: string }>(key: string, record: T): T[] {
  const items = readList<T>(key);
  const stamped = stampMeta(record);
  const index = items.findIndex((item) => item.id === record.id);
  if (index >= 0) items[index] = stamped;
  else items.push(stamped);
  writeJson(key, items);
  return items;
}

function softDeleteById<T extends SyncMeta & { id: string }>(key: string, id: string): void {
  const items = readList<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  items[index] = { ...items[index], deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dirty: true };
  writeJson(key, items);
}

/* ------------------------------- وضعیت پیش‌فرض ------------------------------- */

export const DEFAULT_CYCLE_CONFIG: MenstrualCycleConfig = {
  enabled: false,
  // مقادیر واقعی و قابل استفاده. در نسخه ۱ این‌ها صفر بودند و همین
  // باعث می‌شد فاز قاعدگی و هشدار پیش از قاعدگی هرگز فعال نشوند.
  cycleLength: 28,
  periodLength: 5,
  regularity: 'unknown',
  pmsStartDaysBefore: 5,
  pcosFlagged: false,
};

export const DEFAULT_USER_STATE: UserState = {
  deviceId: '',
  schemaVersion: DATA_SCHEMA_VERSION,
  profile: {
    birthDateIso: '',
    city: '',
    skinType: 'normal',
    skinTone: 'medium',
    sensitivityScore: 5,
    primaryConcerns: [],
    hairType: 'straight',
    hairConcerns: [],
    isPregnant: false,
    isBreastfeeding: false,
    onOralRetinoid: false,
    medications: [],
    allergies: [],
  },
  lifestyle: {
    waterTargetGlasses: 8,
    sleepTargetHours: 8,
    stressLevel: 'medium',
    exerciseDaysPerWeek: 0,
    sunExposureHours: 0,
    junkFoodFrequency: 'sometimes',
    sugarIntake: 'moderate',
    isSmoking: false,
  },
  cycleConfig: { ...DEFAULT_CYCLE_CONFIG },
  currentStreakDays: 0,
  bestStreakDays: 0,
  onboardingCompleted: false,
  themeMode: 'light',
  notifications: {
    enabled: true,
    morningRoutine: true,
    morningHour: 9,
    morningMinute: 0,
    nightRoutine: true,
    nightHour: 21,
    nightMinute: 0,
    cycleInsight: true,
    appointmentReminder: true,
    medicationReminder: true,
    symptomReminder: false,
    symptomReminderHour: 21,
    symptomReminderMinute: 0,
    ovulationReminder: true,
    periodReminder: true,
    uvAlert: true,
    discreetText: true,
  },
  privacy: {
    lockEnabled: false,
    hideCycleSection: false,
  },
};

/* ------------------------------- مایگریشن ------------------------------- */

/**
 * نسخه‌های قبلی فقط «سن» عددی می‌گرفتند، نه تاریخ تولد. برای این‌که کاربرهای
 * قدیمی از قابلیت‌های وابسته به سن محروم نمانند، یک تاریخ تولد تقریبی
 * (همان روز/ماه امسال، منهای سن) می‌سازیم؛ کاربر می‌تواند بعداً در پروفایل
 * دقیقش کند.
 */
function approximateBirthDateFromLegacyAge(age: number): string {
  const today = getJalaliToday();
  const jy = today.jy - age;
  const { gy, gm, gd } = jalaliToGregorian(jy, today.jm, today.jd);
  return toIsoDate(new Date(gy, gm - 1, gd));
}

function withBirthDateFallback(profile: SkinProfile): SkinProfile {
  if (profile.birthDateIso) return profile;
  const legacyAge = Number((profile as unknown as { age?: number }).age);
  if (Number.isFinite(legacyAge) && legacyAge > 0) {
    return { ...profile, birthDateIso: approximateBirthDateFromLegacyAge(legacyAge) };
  }
  return profile;
}

/** داده نسخه ۱ را به ساختار جدید می‌برد. یک‌بار در بوت اجرا می‌شود. */
export function runMigrations(): void {
  const legacyState = readJson<Record<string, unknown> | null>('roza_user_state_v1', null);
  const alreadyMigrated = readJson<UserState | null>(KEYS.userState, null);
  if (legacyState && !alreadyMigrated) {
    const legacyCycle = (legacyState.cycleConfig || {}) as Record<string, unknown>;
    const migrated: UserState = {
      ...DEFAULT_USER_STATE,
      ...(legacyState as Partial<UserState>),
      schemaVersion: DATA_SCHEMA_VERSION,
      profile: withBirthDateFallback({ ...DEFAULT_USER_STATE.profile, ...((legacyState.profile as object) || {}) }),
      lifestyle: { ...DEFAULT_USER_STATE.lifestyle, ...((legacyState.lifestyle as object) || {}) },
      cycleConfig: {
        ...DEFAULT_CYCLE_CONFIG,
        ...legacyCycle,
        // مقادیر صفر نسخه ۱ را با پیش‌فرض‌های معقول جایگزین می‌کنیم
        cycleLength: Number(legacyCycle.cycleLength) > 0 ? Number(legacyCycle.cycleLength) : 28,
        periodLength: Number(legacyCycle.periodLength) > 0 ? Number(legacyCycle.periodLength) : 5,
        pmsStartDaysBefore: Number(legacyCycle.pmsStartDaysBefore) > 0 ? Number(legacyCycle.pmsStartDaysBefore) : 5,
      } as MenstrualCycleConfig,
      notifications: { ...DEFAULT_USER_STATE.notifications, ...((legacyState.notifications as object) || {}) },
      privacy: { ...DEFAULT_USER_STATE.privacy },
    };
    writeJson(KEYS.userState, migrated);

    // تاریخ آخرین پریود نسخه ۱ را به تاریخچه پریودها تبدیل می‌کنیم
    const lastPeriod = typeof legacyCycle.lastPeriodDate === 'string' ? legacyCycle.lastPeriodDate : '';
    if (lastPeriod && readList<PeriodLog>(KEYS.periodLogs).length === 0) {
      writeJson(KEYS.periodLogs, [
        stampMeta<PeriodLog>({ id: createId('period'), startIso: lastPeriod, updatedAt: '' }),
      ]);
    }
  }

  const legacyLogs = readJson<DailyTrackerEntry[] | null>('roza_daily_logs_v1', null);
  if (legacyLogs && readList<DailyTrackerEntry>(KEYS.dailyLogs).length === 0) {
    writeJson(
      KEYS.dailyLogs,
      // پیش‌فرض‌ها با spread می‌آیند تا داده واقعی رکورد رویشان بنشیند.
      // قبلاً usedSunscreen اسمی و قبل از spread نوشته می‌شد و کامپایلر
      // هم هشدار می‌داد که مقدار واقعی کاربر بازنویسی خواهد شد.
      legacyLogs.map((log) =>
        stampMeta<DailyTrackerEntry>({ ...LEGACY_LOG_DEFAULTS, ...log, updatedAt: '' }),
      ),
    );
  }
}

/* ------------------------------- ریپازیتوری ------------------------------- */

export const LocalDB = {
  /* ---- وضعیت کاربر ---- */
  getUserState(): UserState {
    const stored = readJson<Partial<UserState> | null>(KEYS.userState, null);
    const state: UserState = {
      ...DEFAULT_USER_STATE,
      ...(stored || {}),
      profile: withBirthDateFallback({ ...DEFAULT_USER_STATE.profile, ...(stored?.profile || {}) }),
      lifestyle: { ...DEFAULT_USER_STATE.lifestyle, ...(stored?.lifestyle || {}) },
      cycleConfig: { ...DEFAULT_CYCLE_CONFIG, ...(stored?.cycleConfig || {}) },
      notifications: { ...DEFAULT_USER_STATE.notifications, ...(stored?.notifications || {}) },
      privacy: { ...DEFAULT_USER_STATE.privacy, ...(stored?.privacy || {}) },
      schemaVersion: DATA_SCHEMA_VERSION,
    };
    if (!state.deviceId) {
      state.deviceId = createId('dev');
      writeJson(KEYS.userState, state);
    }
    return state;
  },

  saveUserState(state: UserState): void {
    writeJson(KEYS.userState, state);
  },

  /* ---- محصولات ---- */
  getProducts(): Product[] {
    return visible(readList<Product>(KEYS.products));
  },
  saveProduct(product: Product): void {
    upsertById(KEYS.products, product);
  },
  saveProducts(products: Product[]): void {
    writeJson(KEYS.products, products.map((item) => stampMeta(item)));
  },
  deleteProduct(id: string): void {
    softDeleteById<Product>(KEYS.products, id);
  },

  /* ---- روتین روزانه ---- */
  getRoutines(): Routine[] {
    return visible(readList<Routine>(KEYS.routines));
  },
  getRoutine(date: string, type: RoutineType): Routine | undefined {
    return this.getRoutines().find((item) => item.date === date && item.type === type);
  },
  saveRoutine(routine: Routine): void {
    upsertById(KEYS.routines, routine);
  },

  /* ---- ثبت روزانه ---- */
  getDailyLogs(): DailyTrackerEntry[] {
    return visible(readList<DailyTrackerEntry>(KEYS.dailyLogs));
  },
  getDailyLog(date: string): DailyTrackerEntry | undefined {
    return this.getDailyLogs().find((log) => log.date === date);
  },
  saveDailyLog(log: DailyTrackerEntry): void {
    const logs = readList<DailyTrackerEntry>(KEYS.dailyLogs);
    const index = logs.findIndex((item) => item.date === log.date);
    const stamped = stampMeta(log);
    if (index >= 0) logs[index] = stamped;
    else logs.push(stamped);
    writeJson(KEYS.dailyLogs, logs);
  },

  /* ---- چرخه ---- */
  getPeriodLogs(): PeriodLog[] {
    return visible(readList<PeriodLog>(KEYS.periodLogs)).sort((a, b) => (a.startIso < b.startIso ? 1 : -1));
  },
  savePeriodLog(log: PeriodLog): void {
    upsertById(KEYS.periodLogs, log);
  },
  deletePeriodLog(id: string): void {
    softDeleteById<PeriodLog>(KEYS.periodLogs, id);
  },

  getCycleSymptoms(): CycleSymptom[] {
    return visible(readList<CycleSymptom>(KEYS.cycleSymptoms));
  },
  getCycleSymptom(date: string): CycleSymptom | undefined {
    return this.getCycleSymptoms().find((item) => item.date === date);
  },
  saveCycleSymptom(symptom: CycleSymptom): void {
    const items = readList<CycleSymptom>(KEYS.cycleSymptoms);
    const index = items.findIndex((item) => item.date === symptom.date);
    const stamped = stampMeta(symptom);
    if (index >= 0) items[index] = stamped;
    else items.push(stamped);
    writeJson(KEYS.cycleSymptoms, items);
  },

  /* ---- عکس‌ها ---- */
  getPhotos(): PhotoProgress[] {
    return visible(readList<PhotoProgress>(KEYS.photos)).sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  savePhoto(photo: PhotoProgress): void {
    upsertById(KEYS.photos, photo);
  },
  deletePhoto(id: string): void {
    softDeleteById<PhotoProgress>(KEYS.photos, id);
  },

  /* ---- آرایشگاه و کلینیک ---- */
  getProviders(): Provider[] {
    return visible(readList<Provider>(KEYS.providers));
  },
  saveProvider(provider: Provider): void {
    upsertById(KEYS.providers, provider);
  },
  deleteProvider(id: string): void {
    softDeleteById<Provider>(KEYS.providers, id);
  },

  getProviderServices(): ProviderService[] {
    return visible(readList<ProviderService>(KEYS.providerServices));
  },
  saveProviderService(service: ProviderService): void {
    upsertById(KEYS.providerServices, service);
  },
  deleteProviderService(id: string): void {
    softDeleteById<ProviderService>(KEYS.providerServices, id);
  },

  getAppointments(): Appointment[] {
    return visible(readList<Appointment>(KEYS.appointments)).sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));
  },
  saveAppointment(appointment: Appointment): void {
    upsertById(KEYS.appointments, appointment);
  },
  deleteAppointment(id: string): void {
    softDeleteById<Appointment>(KEYS.appointments, id);
  },

  /* ---- پرونده پزشکی ---- */
  getVisits(): Visit[] {
    return visible(readList<Visit>(KEYS.visits)).sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));
  },
  saveVisit(visit: Visit): void {
    upsertById(KEYS.visits, visit);
  },
  deleteVisit(id: string): void {
    softDeleteById<Visit>(KEYS.visits, id);
  },

  getMedications(): Medication[] {
    return visible(readList<Medication>(KEYS.medications));
  },
  saveMedication(medication: Medication): void {
    upsertById(KEYS.medications, medication);
  },
  deleteMedication(id: string): void {
    softDeleteById<Medication>(KEYS.medications, id);
  },

  getLabResults(): LabResult[] {
    return visible(readList<LabResult>(KEYS.labResults)).sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));
  },
  saveLabResult(result: LabResult): void {
    upsertById(KEYS.labResults, result);
  },

  /* ---- تلمتری ارجاع ---- */
  getTelemetryQueue(): TelemetryEvent[] {
    return readList<TelemetryEvent>(KEYS.telemetry);
  },
  saveTelemetryQueue(events: TelemetryEvent[]): void {
    // سقف ۵۰۰ رویداد؛ قدیمی‌ترین‌ها دور ریخته می‌شوند
    writeJson(KEYS.telemetry, events.slice(-500));
  },

  /* ---- پشتیبان ---- */
  exportBackupData() {
    return {
      app: 'roza',
      schemaVersion: DATA_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      userState: this.getUserState(),
      products: readList<Product>(KEYS.products),
      routines: readList<Routine>(KEYS.routines),
      dailyLogs: readList<DailyTrackerEntry>(KEYS.dailyLogs),
      periodLogs: readList<PeriodLog>(KEYS.periodLogs),
      cycleSymptoms: readList<CycleSymptom>(KEYS.cycleSymptoms),
      photos: readList<PhotoProgress>(KEYS.photos),
      providers: readList<Provider>(KEYS.providers),
      providerServices: readList<ProviderService>(KEYS.providerServices),
      appointments: readList<Appointment>(KEYS.appointments),
      visits: readList<Visit>(KEYS.visits),
      medications: readList<Medication>(KEYS.medications),
      labResults: readList<LabResult>(KEYS.labResults),
    };
  },

  /**
   * ورود فایل پشتیبان با اعتبارسنجی. در نسخه ۱ هر فایل JSONی
   * قبول می‌شد و می‌توانست همه داده را نابود کند.
   */
  importBackupData(payload: unknown): { ok: boolean; errorFa?: string } {
    if (!payload || typeof payload !== 'object') return { ok: false, errorFa: 'فایل پشتیبان خوانده نشد.' };
    const data = payload as Record<string, unknown>;
    if (data.app !== 'roza') return { ok: false, errorFa: 'این فایل متعلق به رزا نیست.' };
    if (Number(data.schemaVersion) > DATA_SCHEMA_VERSION) {
      return { ok: false, errorFa: 'این پشتیبان از نسخه جدیدتر برنامه است. اول برنامه را به‌روز کنید.' };
    }
    if (!data.userState || typeof data.userState !== 'object') {
      return { ok: false, errorFa: 'محتوای فایل پشتیبان کامل نیست.' };
    }

    const listOf = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
    writeJson(KEYS.userState, data.userState);
    writeJson(KEYS.products, listOf<Product>(data.products));
    writeJson(KEYS.routines, listOf<Routine>(data.routines));
    writeJson(KEYS.dailyLogs, listOf<DailyTrackerEntry>(data.dailyLogs));
    writeJson(KEYS.periodLogs, listOf<PeriodLog>(data.periodLogs));
    writeJson(KEYS.cycleSymptoms, listOf<CycleSymptom>(data.cycleSymptoms));
    writeJson(KEYS.photos, listOf<PhotoProgress>(data.photos));
    writeJson(KEYS.providers, listOf<Provider>(data.providers));
    writeJson(KEYS.providerServices, listOf<ProviderService>(data.providerServices));
    writeJson(KEYS.appointments, listOf<Appointment>(data.appointments));
    writeJson(KEYS.visits, listOf<Visit>(data.visits));
    writeJson(KEYS.medications, listOf<Medication>(data.medications));
    writeJson(KEYS.labResults, listOf<LabResult>(data.labResults));

    // توجه: فایل پشتیبان عکس‌ها را شامل نمی‌شود (حجم بالا)؛
    // رکوردها منتقل می‌شوند ولی تصویرشان روی دستگاه جدید نیست.
    return { ok: true };
  },
};

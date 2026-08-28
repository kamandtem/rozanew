/**
 * سرویس نوبت‌ها.
 *
 * نقطه اتصال سه بخش اپ: آرایشگاه/پزشک ←→ روتین پوست ←→ چرخه.
 * بدون این فایل، بخش آرایشگاه فقط یک تقویم است.
 */

import {
  AdviceScope,
  AdviceSeverity,
  Appointment,
  AppointmentStatus,
  MenstrualCycleConfig,
  Provider,
  ProviderKind,
  ProviderService,
  ServiceCategory,
  SkinProfile,
} from '../../types';
import { LocalDB, createId } from '../db';
import { addDays, getDaysDifference, getTodayIsoDate } from '../jalali';
import { computeCycleState } from '../cycle/cycleService';
import {
  DaySuitability,
  PROCEDURE_RULES,
  ProcedureRule,
  findProcedureRule,
  procedurePauseIds,
} from './procedureRules';
import { escalate } from '../advice/severity';
import { getSensitivityLevel, SensitivityLevel } from '../advice/sensitivity';
import { createReferralId, trackReferralEvent } from '../telemetry';

/**
 * وضعیت‌هایی که نوبت را «مرده» می‌کنند.
 *
 * قبلاً 'missed' در getRoutineRestrictionForDate فیلتر می‌شد ولی در
 * getUpcomingAppointments نه؛ یعنی یک نوبت از دست رفته روی روتین اثر
 * نمی‌گذاشت اما در کارت «نوبت بعدی» خانه هنوز دیده می‌شد. یک ثابت مشترک،
 * دیگر جایی برای این ناهم‌خوانی نمی‌گذارد.
 */
export const DEAD_APPOINTMENT_STATUSES: AppointmentStatus[] = ['canceled', 'missed'];

/** نوبتی که هنوز تأیید نشده. اثرش روی روتین باید نرم باشد، نه قطعی. */
export const TENTATIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ['requested'];

export function isDeadAppointment(appointment: Appointment): boolean {
  return DEAD_APPOINTMENT_STATUSES.includes(appointment.status);
}

export function isTentativeAppointment(appointment: Appointment): boolean {
  return TENTATIVE_APPOINTMENT_STATUSES.includes(appointment.status);
}

/* ----------------------------- موجودیت‌ها ----------------------------- */

export function createProvider(input: Partial<Provider> & { name: string; kind: ProviderKind }): Provider {
  const provider: Provider = {
    id: createId('prov'),
    kind: input.kind,
    source: input.source || 'user',
    name: input.name,
    specialties: input.specialties || [],
    contactName: input.contactName,
    phone: input.phone,
    instagram: input.instagram,
    city: input.city,
    address: input.address,
    myRating: input.myRating,
    isFavorite: input.isFavorite ?? false,
    notesFa: input.notesFa,
    bookingMode: input.bookingMode || 'manual',
    partnerId: input.partnerId,
    isSponsored: input.isSponsored,
    updatedAt: new Date().toISOString(),
  };
  LocalDB.saveProvider(provider);
  return provider;
}

export function getServicesOfProvider(providerId: string): ProviderService[] {
  return LocalDB.getProviderServices().filter((service) => service.providerId === providerId);
}

/* ----------------------------- چک‌لیست‌ها ----------------------------- */

function collectRules(categories: ServiceCategory[]): ProcedureRule[] {
  const rules = categories
    .map((category) => findProcedureRule(category))
    .filter((rule): rule is ProcedureRule => Boolean(rule));
  return rules;
}

/** چک‌لیست قبل و بعد جلسه، بر اساس خدمات و وضعیت خود کاربر. */
export function buildChecklists(
  categories: ServiceCategory[],
  profile: SkinProfile,
): { prepFa: string[]; aftercareFa: string[]; warningsFa: string[] } {
  const rules = collectRules(categories);
  const prep = new Set<string>();
  const aftercare = new Set<string>();
  const warnings = new Set<string>();

  rules.forEach((rule) => {
    rule.prepChecklistFa.forEach((item) => prep.add(item));
    rule.aftercareChecklistFa.forEach((item) => aftercare.add(item));

    if (profile.isPregnant && rule.pregnancyCautionFa) warnings.add(rule.pregnancyCautionFa);
    // در شیردهی فقط موادی که از راه تماس/تنفس جذب می‌شوند مهم‌اند (کراتین).
    if (profile.isBreastfeeding && rule.category === 'keratin' && rule.pregnancyCautionFa) {
      warnings.add(rule.pregnancyCautionFa);
    }
    if (profile.onOralRetinoid && rule.blockedOnOralRetinoid) {
      warnings.add(
        `در دوره مصرف رتینوئید خوراکی، ${rule.labelFa} معمولاً توصیه نمی‌شود. قبل از رزرو با پزشکت مشورت کن.`,
      );
    }
  });

  return { prepFa: Array.from(prep), aftercareFa: Array.from(aftercare), warningsFa: Array.from(warnings) };
}

/* ----------------------------- هوشمندی چرخه ----------------------------- */

export type { DaySuitability };

export interface DayAdvice {
  suitability: DaySuitability;
  reasonFa: string;
}

/**
 * می‌گوید یک روز خاص برای این خدمت مناسب است یا نه.
 * اگر چرخه فعال نباشد یا داده کافی نباشد، neutral برمی‌گرداند. هرگز حدس نمی‌زند.
 *
 * تغییر مهم: سطح میانی 'caution' اضافه شد. قبلاً فقط good/neutral/avoid
 * وجود داشت و چون فاز لوتئال و کل بازهٔ PMS داخل «منع» بودند، حدود ۱۹ روز
 * از ۲۸ روز برای پیلینگ و میکرونیدلینگ «avoid» می‌شد و suggestBestDays
 * فقط فولیکولار را قبول می‌کرد. حالا منع واقعی و احتیاط از هم جدا هستند.
 */
export function adviseDayForServices(
  dateIso: string,
  categories: ServiceCategory[],
  cycleConfig: MenstrualCycleConfig,
): DayAdvice {
  const rules = collectRules(categories).filter(
    (rule) =>
      rule.discouragedPhases.length > 0 ||
      rule.cautionPhases.length > 0 ||
      rule.pmsSuitability !== 'fine' ||
      rule.preferredPhases.length > 0,
  );
  if (rules.length === 0) return { suitability: 'neutral', reasonFa: '' };

  const state = computeCycleState(cycleConfig, LocalDB.getPeriodLogs(), dateIso);
  if (!state.available || !state.phase) return { suitability: 'neutral', reasonFa: '' };
  const phase = state.phase;

  const hedge =
    state.confidence === 'high' || state.confidence === 'medium' ? '' : ' (این پیش‌بینی تقریبی است)';
  const context = state.inPmsWindow ? 'بازهٔ پیش از قاعدگی' : `فاز ${state.phaseNameFa}`;

  const blocking = rules.find(
    (rule) => rule.discouragedPhases.includes(phase) || (state.inPmsWindow && rule.pmsSuitability === 'avoid'),
  );
  if (blocking) {
    return {
      suitability: 'avoid',
      reasonFa: `این روز احتمالاً در ${context} است. ${blocking.reasonFa}${hedge}`,
    };
  }

  const cautioning = rules.find(
    (rule) => rule.cautionPhases.includes(phase) || (state.inPmsWindow && rule.pmsSuitability === 'caution'),
  );
  if (cautioning) {
    return {
      suitability: 'caution',
      reasonFa: `این روز احتمالاً در ${context} است. ${
        cautioning.cautionReasonFa || cautioning.reasonFa
      } منعی نیست، فقط اگر انتخاب دیگری داری بهتر است.${hedge}`,
    };
  }

  const preferred = rules.find((rule) => rule.preferredPhases.includes(phase));
  if (preferred) {
    return { suitability: 'good', reasonFa: `روز مناسبی است. ${preferred.reasonFa}` };
  }

  return { suitability: 'neutral', reasonFa: '' };
}

/**
 * بهترین روزهای پیشنهادی در ۴۵ روز آینده برای یک خدمت.
 * اگر هیچ روز «خوبی» پیدا نشد، روزهای بی‌اشکال (neutral) برگردانده می‌شوند —
 * چون خروجی خالی به کاربر می‌گفت «هیچ روزی مناسب نیست» که غلط بود.
 */
export function suggestBestDays(
  categories: ServiceCategory[],
  cycleConfig: MenstrualCycleConfig,
  horizonDays = 45,
): { dateIso: string; reasonFa: string; suitability: DaySuitability }[] {
  const today = getTodayIsoDate();
  const good: { dateIso: string; reasonFa: string; suitability: DaySuitability }[] = [];
  const neutral: { dateIso: string; reasonFa: string; suitability: DaySuitability }[] = [];

  for (let offset = 1; offset <= horizonDays; offset += 1) {
    const dateIso = addDays(today, offset);
    const advice = adviseDayForServices(dateIso, categories, cycleConfig);
    if (advice.suitability === 'good') good.push({ dateIso, reasonFa: advice.reasonFa, suitability: 'good' });
    else if (advice.suitability === 'neutral' && neutral.length < 5) {
      neutral.push({ dateIso, reasonFa: 'این روز اشکالی ندارد.', suitability: 'neutral' });
    }
    if (good.length >= 5) break;
  }

  return good.length > 0 ? good : neutral;
}

/* ----------------------------- تاثیر بر روتین ----------------------------- */

/** یک اثر مشخص از یک نوبت مشخص روی روتین یک روز مشخص. */
export interface ProcedureRestrictionEntry {
  appointmentId: string;
  category: ServiceCategory;
  labelFa: string;
  /** قبل از جلسه، روز جلسه، یا بعد از جلسه. */
  timing: 'before' | 'day' | 'after';
  /** فاصله تا جلسه بر حسب روز (مثبت = آینده). */
  distanceDays: number;
  /** ناحیهٔ واقعی درگیر. region یعنی روتین کل صورت بسته نمی‌شود. */
  scope: AdviceScope;
  scopeFa: string;
  severity: AdviceSeverity;
  /** ترکیباتی که واقعاً باید قطع شوند. */
  hardIds: string[];
  /** ترکیباتی که فقط احتیاط لازم دارند (ویتامین C، اسید در شوینده). */
  softIds: string[];
  /** ترکیبات تجویزی داخل فهرست — پیام‌شان «با پزشکت هماهنگ کن» است. */
  prescriptionIds: string[];
  reasonFa: string;
  /** تا چه تاریخی این محدودیت برقرار است. */
  untilIso: string;
  /** نوبت هنوز تأیید نشده (requested). */
  isTentative: boolean;
  requiresProfessional: boolean;
}

export interface RoutineRestriction {
  /**
   * شناسه ترکیباتی که امروز از روتین صورت حذف می‌شوند.
   * فقط اثرهای دامنهٔ صورت اینجا می‌آیند؛ پرهیز ناحیه‌ای (ابرو، ناحیهٔ لیزر)
   * دیگر کل روتین صورت را نمی‌بندد.
   */
  blockedIngredientIds: string[];
  /** روتین امروز باید ملایم و ترمیمی باشد. */
  gentleMode: boolean;
  /** دلیل قابل نمایش به کاربر. */
  reasonFa: string;
  /** نوبت مربوطه. */
  appointmentId?: string;
  /** همهٔ اثرها، با ناحیه و شدت خودشان. موتور توصیه از این می‌خواند. */
  entries: ProcedureRestrictionEntry[];
}

/**
 * شدت یک اثر پروسیجر.
 *
 * قبلاً همهٔ توصیه‌های پروسیجر یکسان PROFESSIONAL_INSTRUCTION می‌گرفتند،
 * پس یک نوبت وکس آرایشگاه با متن «این مورد به تأیید پزشک نیاز دارد» ظاهر
 * می‌شد. نوع پروسیجر، شدتش و حساسیت پوست هیچ اثری نداشتند و تابع escalate
 * — که دقیقاً برای همین ساخته شده بود — فقط در لایهٔ ایمنی استفاده می‌شد.
 */
export function severityForProcedure(
  rule: ProcedureRule,
  sensitivity: SensitivityLevel,
  isTentative: boolean,
): AdviceSeverity {
  // نوبت تأییدنشده حق ندارد اکتیوها را قطع کند؛ فقط یادآوری آماده‌سازی است.
  if (isTentative) return rule.baseSeverity === 'INFO' ? 'INFO' : 'SUGGESTION';

  let severity = rule.baseSeverity;
  if (sensitivity === 'high') severity = escalate(severity, 1, rule.severityCeiling);
  else if (sensitivity === 'moderate' && rule.intensity === 'high') {
    severity = escalate(severity, 1, rule.severityCeiling);
  }
  return severity;
}

/**
 * مهم‌ترین تابع این فایل.
 * وقتی کاربر نوبت لیزر یا پیلینگ ثبت می‌کند، روتین روزهای قبل و بعد خودکار
 * عوض می‌شود. کاربر لازم نیست چیزی یادش بماند.
 */
export function getRoutineRestrictionForDate(
  dateIso: string = getTodayIsoDate(),
  profile?: SkinProfile,
): RoutineRestriction {
  const services = LocalDB.getProviderServices();
  const appointments = LocalDB.getAppointments().filter((appointment) => !isDeadAppointment(appointment));
  const sensitivity = getSensitivityLevel(profile || LocalDB.getUserState().profile);

  const entries: ProcedureRestrictionEntry[] = [];

  appointments.forEach((appointment) => {
    const categories = appointment.serviceIds
      .map((id) => services.find((service) => service.id === id)?.category)
      .filter((category): category is ServiceCategory => Boolean(category));
    if (categories.length === 0) return;

    const distance = getDaysDifference(dateIso, appointment.dateIso); // منفی = گذشته
    const isTentative = isTentativeAppointment(appointment);

    collectRules(categories).forEach((rule) => {
      const inBefore = distance > 0 && distance <= rule.pauseActivesDaysBefore;
      const inAfter = distance <= 0 && Math.abs(distance) <= rule.gentleRoutineDaysAfter;
      if (!inBefore && !inAfter) return;

      const selection = procedurePauseIds(rule);
      const severity = severityForProcedure(rule, sensitivity, isTentative);
      const timing: ProcedureRestrictionEntry['timing'] = inBefore ? 'before' : distance === 0 ? 'day' : 'after';

      // محدودیت در هر دو حالت (قبل و بعد جلسه) در پایان بازهٔ مراقبتِ
      // پس از جلسه تمام می‌شود؛ پس یک محاسبه، نه دو شاخهٔ یکسان.
      const untilIso = addDays(appointment.dateIso, rule.gentleRoutineDaysAfter);

      const whereFa = rule.scope === 'face' ? '' : ` ${rule.scopeFa}`;
      const reasonFa = isTentative
        ? `${rule.labelFa} درخواست شده ولی هنوز تأیید نشده. اگر تأیید شد، ${rule.pauseActivesDaysBefore} روز قبلش باید ترکیبات فعال${whereFa} قطع شود.`
        : timing === 'before'
          ? `${distance} روز تا ${rule.labelFa}: ترکیبات فعال${whereFa} باید قطع باشند.`
          : timing === 'day'
            ? `امروز ${rule.labelFa}: روتین${whereFa} ملایم و ترمیمی.`
            : `${Math.abs(distance)} روز پس از ${rule.labelFa}: روتین${whereFa} ملایم و ترمیمی.`;

      entries.push({
        appointmentId: appointment.id,
        category: rule.category,
        labelFa: rule.labelFa,
        timing,
        distanceDays: distance,
        scope: rule.scope,
        scopeFa: rule.scopeFa,
        severity,
        // نوبت تأییدنشده هیچ ترکیبی را قطع نمی‌کند؛ همه به فهرست نرم می‌روند.
        hardIds: isTentative ? [] : selection.hardIds,
        softIds: isTentative ? [...selection.hardIds, ...selection.softIds] : selection.softIds,
        prescriptionIds: selection.prescriptionIds,
        reasonFa,
        untilIso,
        isTentative,
        requiresProfessional: rule.requiresProfessional,
      });
    });
  });

  // فقط اثرهای دامنهٔ صورت روتین صورت را می‌بندند. پرهیز ناحیه‌ای در
  // توصیه‌های ترکیبات دیده می‌شود ولی گام‌های روتین را حذف نمی‌کند.
  const faceEntries = entries.filter((entry) => entry.scope === 'face');
  const blocked = new Set<string>();
  faceEntries.forEach((entry) => entry.hardIds.forEach((id) => blocked.add(id)));

  const gentleMode = faceEntries.some(
    (entry) => !entry.isTentative && (entry.timing === 'day' || entry.timing === 'after'),
  );

  const reasons = entries.filter((entry) => !entry.isTentative).map((entry) => entry.reasonFa);
  const primary =
    faceEntries.find((entry) => !entry.isTentative) || entries.find((entry) => !entry.isTentative);

  return {
    blockedIngredientIds: Array.from(blocked),
    gentleMode,
    reasonFa: reasons.join(' '),
    appointmentId: primary?.appointmentId,
    entries,
  };
}

/* ----------------------------- نوبت‌دهی ----------------------------- */

export function createAppointment(input: {
  provider: Provider;
  serviceIds: string[];
  titleFa?: string;
  dateIso: string;
  timeHhmm?: string;
  profile: SkinProfile;
  remindersDaysBefore?: number[];
  notesFa?: string;
}): Appointment {
  const services = LocalDB.getProviderServices();
  const categories = input.serviceIds
    .map((id) => services.find((service) => service.id === id)?.category)
    .filter((category): category is ServiceCategory => Boolean(category));

  const checklists = buildChecklists(categories, input.profile);
  const isPartner = Boolean(input.provider.partnerId);
  const referralId = isPartner ? createReferralId() : undefined;

  const appointment: Appointment = {
    id: createId('appt'),
    providerId: input.provider.id,
    providerKind: input.provider.kind,
    serviceIds: input.serviceIds,
    titleFa: input.titleFa,
    dateIso: input.dateIso,
    timeHhmm: input.timeHhmm,
    status: input.provider.bookingMode === 'request' ? 'requested' : 'planned',
    notesFa: input.notesFa,
    remindersDaysBefore: input.remindersDaysBefore || [3, 1, 0],
    prepChecklistFa: checklists.prepFa,
    aftercareChecklistFa: checklists.aftercareFa,
    referralId,
    updatedAt: new Date().toISOString(),
  };

  LocalDB.saveAppointment(appointment);

  if (isPartner) {
    trackReferralEvent('booking_created', { partnerId: input.provider.partnerId, referralId });
  }
  return appointment;
}

export function updateAppointmentStatus(appointment: Appointment, status: AppointmentStatus): void {
  LocalDB.saveAppointment({ ...appointment, status });

  const provider = LocalDB.getProviders().find((item) => item.id === appointment.providerId);
  if (!provider?.partnerId) return;
  if (status === 'done') {
    trackReferralEvent('booking_completed', { partnerId: provider.partnerId, referralId: appointment.referralId });
  }
  if (status === 'canceled') {
    trackReferralEvent('booking_canceled', { partnerId: provider.partnerId, referralId: appointment.referralId });
  }
}

/** نوبت‌های آینده، مرتب شده از نزدیک‌ترین. */
export function getUpcomingAppointments(limit = 5): Appointment[] {
  const today = getTodayIsoDate();
  return LocalDB.getAppointments()
    .filter(
      (appointment) =>
        getDaysDifference(today, appointment.dateIso) >= 0 &&
        !isDeadAppointment(appointment) &&
        appointment.status !== 'done',
    )
    // بدون این مرتب‌سازی، «نزدیک‌ترین نوبت» فقط به ترتیب ذخیره‌سازی بود.
    .sort((a, b) => (a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : 0))
    .slice(0, limit);
}

/**
 * جلساتی که بر اساس بازه تکرار، موعدشان رسیده ولی نوبتی ثبت نشده.
 * منبع یادآوری خودکار مانند «۲۸ روز از رنگ ریشه گذشته».
 */
export function getDueServices(): { service: ProviderService; provider?: Provider; daysSince: number }[] {
  const today = getTodayIsoDate();
  const appointments = LocalDB.getAppointments().filter((appointment) => appointment.status === 'done');
  const providers = LocalDB.getProviders();
  const results: { service: ProviderService; provider?: Provider; daysSince: number }[] = [];

  LocalDB.getProviderServices().forEach((service) => {
    const interval = service.repeatIntervalDays || findProcedureRule(service.category)?.typicalIntervalDays;
    if (!interval) return;

    const past = appointments
      .filter((appointment) => appointment.serviceIds.includes(service.id))
      .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));
    if (past.length === 0) return;

    const daysSince = getDaysDifference(past[0].dateIso, today);
    if (daysSince < interval) return;

    const alreadyPlanned = LocalDB.getAppointments().some(
      (appointment) =>
        appointment.serviceIds.includes(service.id) &&
        appointment.status !== 'done' &&
        !isDeadAppointment(appointment) &&
        getDaysDifference(today, appointment.dateIso) >= 0,
    );
    if (alreadyPlanned) return;

    results.push({
      service,
      provider: providers.find((provider) => provider.id === service.providerId),
      daysSince,
    });
  });

  return results.sort((a, b) => b.daysSince - a.daysSince);
}

export { PROCEDURE_RULES };

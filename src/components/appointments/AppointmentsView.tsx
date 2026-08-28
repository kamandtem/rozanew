import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import {
  Plus,
  Phone,
  Instagram,
  Star,
  Trash2,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  BadgeCheck,
  Wallet,
  X,
} from 'lucide-react';
import {
  Appointment,
  Provider,
  ProviderKind,
  ProviderService,
  ServiceCategory,
  UserState,
} from '../../types';
import { LocalDB, createId } from '../../services/db';
import {
  adviseDayForServices,
  buildChecklists,
  createAppointment,
  createProvider,
  getDueServices,
  suggestBestDays,
  updateAppointmentStatus,
} from '../../services/providers/appointmentService';
import { PROCEDURE_RULES, findProcedureRule } from '../../services/providers/procedureRules';
import { MEDICAL_DISCLAIMER_FA } from '../../services/safety';
import { formatJalaliDate, formatRelativeDay, getTodayIsoDate, toPersianDigits } from '../../services/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { PrettySelect } from '../common/PrettySelect';
import { EmptyState } from '../common/EmptyState';
import { trackReferralEvent } from '../../services/telemetry';

interface AppointmentsViewProps {
  kind: ProviderKind;
  userState: UserState;
  /**
   * نوبت‌ها مستقیم روی LocalDB نوشته می‌شوند (نه userState)، پس ایجاد،
   * انجام‌شد یا لغو یک نوبت به‌تنهایی زمان‌بندی اعلان‌ها را به‌روز نمی‌کند —
   * تا اینجا فراخوانی نشود، اعلان نوبتِ لغوشده تا resume بعدی اپ همچنان
   * روی گوشی زمان‌بندی‌شده می‌ماند. اختیاری است تا کامپوننت بدون آن هم
   * (مثلاً در تست) قابل استفاده بماند.
   */
  onAppointmentsChanged?: () => void;
}

const SALON_CATEGORIES: ServiceCategory[] = [
  'haircut',
  'hair_color',
  'highlight',
  'keratin',
  'hair_treatment',
  // دسته‌های ریز اول می‌آیند تا کاربر همان را انتخاب کند و قاعدهٔ دقیق‌تری
  // بگیرد. دسته‌های کلیِ قدیمی فقط برای رکوردهای ذخیره‌شده مانده‌اند.
  'facial_hydrating',
  'facial_deep',
  'cleansing',
  'laser_hair',
  'ipl',
  'wax',
  'threading',
  'brow_tattoo',
  'brow_lift',
  'brow_tint',
  'lash',
  'nail',
  'makeup',
];

const CLINIC_CATEGORIES: ServiceCategory[] = [
  'consultation',
  'peel_superficial',
  'peel_medium',
  'microneedling',
  'laser_resurfacing',
  'laser_hair',
  'procedure',
];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  haircut: 'کوتاهی مو',
  hair_color: 'رنگ مو',
  highlight: 'هایلایت و دکلره',
  keratin: 'کراتین و احیا',
  hair_treatment: 'ترمیم مو',
  /* --- پوست: دسته‌های تفکیک‌شده --- */
  facial: 'فیشیال (نوع نامشخص)',
  facial_hydrating: 'فیشیال آبرسان',
  facial_deep: 'فیشیال با تخلیه',
  cleansing: 'پاکسازی پوست',
  microneedling: 'میکرونیدلینگ',
  peeling: 'پیلینگ (عمق نامشخص)',
  peel_superficial: 'پیلینگ سطحی',
  peel_medium: 'پیلینگ متوسط',
  /* --- لیزر --- */
  laser: 'لیزر (نوع نامشخص)',
  laser_hair: 'لیزر موی زائد',
  ipl: 'آی‌پی‌ال',
  laser_resurfacing: 'لیزر رزورفیسینگ',
  /* --- مو و ابرو --- */
  wax: 'اپیلاسیون و وکس',
  threading: 'بند و اصلاح',
  brow: 'ابرو (نوع نامشخص)',
  brow_tattoo: 'تاتو یا میکروبلیدینگ ابرو',
  brow_lift: 'لیفت ابرو',
  brow_tint: 'رنگ یا هنا ابرو',
  lash: 'مژه',
  nail: 'ناخن',
  makeup: 'میکاپ',
  consultation: 'ویزیت و مشاوره',
  procedure: 'خدمت پوستی دیگر',
};

function formatToman(value?: number): string {
  if (!value) return '';
  return `${toPersianDigits(value.toLocaleString('en-US'))} تومان`;
}

/**
 * بخش آرایشگاه و پزشک.
 *
 * مدل فاز فعلی: دفترچه شخصی کاربر، ۱۰۰٪ آفلاین.
 * معماری طوری است که فاز بعد (دایرکتوری آرایشگاه طرف قرارداد + رزرو
 * نوبت) فقط با روشن کردن فلگ و پر کردن API_BASE_URL اضافه می‌شود:
 * Provider.source و partnerId و bookingMode از الان در مدل هستند.
 */
export const AppointmentsView: React.FC<AppointmentsViewProps> = ({ kind, userState, onAppointmentsChanged }) => {
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((value) => value + 1);

  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [introOpen, setIntroOpen] = useState(kind === 'clinic');

  const categories = kind === 'salon' ? SALON_CATEGORIES : CLINIC_CATEGORIES;

  const providers = useMemo(
    () => LocalDB.getProviders().filter((provider) => provider.kind === kind),
    [refresh, kind],
  );
  const services = useMemo(() => LocalDB.getProviderServices(), [refresh]);
  const appointments = useMemo(
    () => LocalDB.getAppointments().filter((appointment) => appointment.providerKind === kind),
    [refresh, kind],
  );
  const dueServices = useMemo(
    () => getDueServices().filter((item) => providers.some((provider) => provider.id === item.service.providerId)),
    [refresh, providers],
  );

  const todayIso = getTodayIsoDate();
  const upcoming = appointments.filter(
    (appointment) =>
      appointment.dateIso >= todayIso && appointment.status !== 'done' && appointment.status !== 'canceled',
  );
  const past = appointments
    .filter((appointment) => appointment.dateIso < todayIso || appointment.status === 'done')
    .reverse();

  const totalSpent = appointments
    .filter((appointment) => appointment.status === 'done')
    .reduce((sum, appointment) => sum + (appointment.paidToman || 0), 0);

  /* -------------------- فرم افزودن مرکز -------------------- */
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const submitProvider = () => {
    if (!formName.trim()) return;
    createProvider({
      kind,
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      instagram: formInstagram.trim() || undefined,
      address: formAddress.trim() || undefined,
      notesFa: formNotes.trim() || undefined,
      city: userState.profile.city || undefined,
      isFavorite: providers.length === 0,
    });
    setFormName('');
    setFormPhone('');
    setFormInstagram('');
    setFormAddress('');
    setFormNotes('');
    setShowProviderForm(false);
    bump();
  };

  /* -------------------- فرم نوبت جدید -------------------- */
  const [apptProviderId, setApptProviderId] = useState('');
  const [apptCategory, setApptCategory] = useState<ServiceCategory>(categories[0]);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptPrice, setApptPrice] = useState('');
  const [apptNotes, setApptNotes] = useState('');

  const dayAdvice = apptDate ? adviseDayForServices(apptDate, [apptCategory], userState.cycleConfig) : null;
  const bestDays = useMemo(
    () => suggestBestDays([apptCategory], userState.cycleConfig),
    [apptCategory, userState.cycleConfig, refresh],
  );
  const previewChecklists = buildChecklists([apptCategory], userState.profile);
  const rule = findProcedureRule(apptCategory);

  const submitAppointment = () => {
    const provider = providers.find((item) => item.id === apptProviderId);
    if (!provider || !apptDate) return;

    // خدمت را به صورت رکورد مستقل می‌سازیم تا بازه تکرار و قواعد پرهیز کار کنند
    let service = services.find(
      (item) => item.providerId === provider.id && item.category === apptCategory,
    );
    if (!service) {
      service = {
        id: createId('svc'),
        providerId: provider.id,
        nameFa: CATEGORY_LABELS[apptCategory],
        category: apptCategory,
        priceToman: apptPrice ? parseInt(apptPrice.replace(/\D/g, ''), 10) : undefined,
        repeatIntervalDays: rule?.typicalIntervalDays,
        updatedAt: new Date().toISOString(),
      };
      LocalDB.saveProviderService(service);
    }

    createAppointment({
      provider,
      serviceIds: [service.id],
      titleFa: CATEGORY_LABELS[apptCategory],
      dateIso: apptDate,
      timeHhmm: apptTime || undefined,
      profile: userState.profile,
      notesFa: apptNotes.trim() || undefined,
    });

    setApptDate('');
    setApptTime('');
    setApptPrice('');
    setApptNotes('');
    setShowAppointmentForm(false);
    bump();
    onAppointmentsChanged?.();
  };

  const serviceNamesOf = (appointment: Appointment): string =>
    appointment.serviceIds
      .map((id) => services.find((service) => service.id === id)?.nameFa)
      .filter(Boolean)
      .join('، ') || appointment.titleFa || 'نوبت';

  const providerOf = (appointment: Appointment): Provider | undefined =>
    providers.find((provider) => provider.id === appointment.providerId);

  const handleCall = (provider: Provider) => {
    if (provider.partnerId) trackReferralEvent('provider_called', { partnerId: provider.partnerId });
    window.location.href = `tel:${provider.phone}`;
  };

  const markDone = (appointment: Appointment, paidToman?: number) => {
    updateAppointmentStatus({ ...appointment, paidToman }, 'done');
    bump();
    onAppointmentsChanged?.();
  };

  return (
    <div className="pb-[calc(var(--safe-bottom)+220px)] px-4 max-w-lg mx-auto space-y-4">
      {/* معرفی بخش */}
      <div className="rounded-3xl bg-gradient-to-l from-rose-500/10 to-amber-500/10 border border-rose-200 dark:border-slate-800 overflow-hidden">
        <button onClick={() => setIntroOpen((value) => !value)} className="w-full p-4 flex items-center justify-between gap-3 text-right">
          <h2 className="text-base font-black text-slate-800 dark:text-white">{kind === 'salon' ? 'آرایشگاه و نوبت‌های من' : 'پزشک پوست و ویزیت‌ها'}</h2>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${introOpen ? 'rotate-180' : ''}`} />
        </button>
        {introOpen && <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-7">{kind === 'salon' ? 'نوبت‌هایت را ثبت کن تا رزا روتین روزهای قبل و بعد را خودکار تنظیم کند و روزهای مناسب‌تر را پیشنهاد دهد.' : MEDICAL_DISCLAIMER_FA}</p>}
      </div>

      {/* یادآوری خودکار جلسه بعدی */}
      {dueServices.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 space-y-2">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-amber-600" />
            موعدش رسیده
          </h3>
          {dueServices.slice(0, 3).map((item) => (
            <p key={item.service.id} className="text-sm text-slate-700 dark:text-slate-300">
              {toPersianDigits(item.daysSince)} روز از «{item.service.nameFa}» گذشته
              {item.provider ? ` (${item.provider.name})` : ''}.
            </p>
          ))}
        </div>
      )}

      {/* لیست مراکز */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <h3 className="text-sm font-black text-slate-800 dark:text-white">
          {kind === 'salon' ? 'آرایشگاه‌های من' : 'پزشکان من'}
        </h3>
        <button
          onClick={() => setShowProviderForm(true)}
          className="px-4 py-2 rounded-2xl bg-[#8e5241] hover:bg-[#784334] text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          افزودن
        </button>
      </div>

      {providers.length === 0 ? (
        <EmptyState
          titleFa={kind === 'salon' ? 'هنوز آرایشگاهی اضافه نکرده‌ای' : 'هنوز پزشکی اضافه نکرده‌ای'}
          descriptionFa={
            kind === 'salon'
              ? 'آرایشگاهی که می‌روی را اضافه کن تا نوبت‌ها، فرمول رنگ و هزینه‌ها یک جا جمع شوند.'
              : 'پزشک پوست، زنان یا تغذیه‌ات را اضافه کن تا پرونده‌ات مرتب بماند.'
          }
          actionLabelFa="افزودن"
          onAction={() => setShowProviderForm(true)}
        />
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm text-slate-800 dark:text-white">{provider.name}</h4>
                    {/* شفافیت اجباری: مراکز طرف قرارداد برچسب می‌خورند */}
                    {provider.isSponsored && (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        معرفی رزا
                      </span>
                    )}
                  </div>
                  {provider.address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{provider.address}</p>
                  )}
                  {provider.notesFa && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{provider.notesFa}</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    LocalDB.deleteProvider(provider.id);
                    bump();
                  }}
                  aria-label="حذف"
                  className="icon-only p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {provider.phone && (
                  <button
                    onClick={() => handleCall(provider)}
                    className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-4 h-4" />
                    تماس
                  </button>
                )}
                {provider.instagram && (
                  <a
                    href={`https://instagram.com/${provider.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Instagram className="w-4 h-4" />
                    اینستاگرام
                  </a>
                )}
                <button
                  onClick={() => {
                    setApptProviderId(provider.id);
                    setShowAppointmentForm(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#8e5241] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <CalendarClock className="w-4 h-4" />
                  نوبت جدید
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نوبت بعدی */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-800 dark:text-white px-1">نوبت‌های پیش رو</h3>

          {upcoming.map((appointment) => {
            const provider = providerOf(appointment);
            return (
              <div
                key={appointment.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-slate-800 dark:text-white">{serviceNamesOf(appointment)}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {provider?.name} · {formatJalaliDate(appointment.dateIso)}
                      {appointment.timeHhmm ? ` · ساعت ${toPersianDigits(appointment.timeHhmm)}` : ''}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-black shrink-0">
                    {formatRelativeDay(appointment.dateIso)}
                  </span>
                </div>

                {/* چک‌لیست قبل از جلسه — مهم‌ترین بخش */}
                {(appointment.prepChecklistFa || []).length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-1.5">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4" />
                      قبل از جلسه
                    </span>
                    <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 pr-4 list-disc leading-relaxed">
                      {(appointment.prepChecklistFa || []).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markDone(appointment)}
                    className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    انجام شد
                  </button>
                  <button
                    onClick={() => {
                      updateAppointmentStatus(appointment, 'canceled');
                      bump();
                      onAppointmentsChanged?.();
                    }}
                    className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                  >
                    لغو
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* گزارش هزینه — از داده واقعی */}
      {totalSpent > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-teal-600" />
            هزینه ثبت‌شده
          </h3>
          <p className="text-base font-black text-teal-700 dark:text-teal-300">{formatToman(totalSpent)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            مجموع {toPersianDigits(past.filter((item) => item.paidToman).length)} جلسه که مبلغش را ثبت کرده‌ای.
          </p>
        </div>
      )}

      {/* تاریخچه */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black text-slate-800 dark:text-white px-1">تاریخچه</h3>
          {past.slice(0, 10).map((appointment) => (
            <div
              key={appointment.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-800 dark:text-white truncate">
                  {serviceNamesOf(appointment)}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {formatJalaliDate(appointment.dateIso)} · {providerOf(appointment)?.name}
                </span>
              </div>
              {appointment.paidToman ? (
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300 shrink-0">
                  {formatToman(appointment.paidToman)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* --------------------------- مودال افزودن مرکز --------------------------- */}
      {showProviderForm && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[calc(var(--safe-bottom)+1rem)]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-800 dark:text-white">
                {kind === 'salon' ? 'آرایشگاه جدید' : 'پزشک جدید'}
              </h3>
              <button
                onClick={() => setShowProviderForm(false)}
                aria-label="بستن"
                className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder={kind === 'salon' ? 'نام آرایشگاه یا آرایشگر' : 'نام پزشک'}
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            />
            <input
              value={formPhone}
              onChange={(event) => setFormPhone(event.target.value)}
              inputMode="tel"
              placeholder="شماره تماس (اختیاری)"
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            />
            {kind === 'salon' && (
              <input
                value={formInstagram}
                onChange={(event) => setFormInstagram(event.target.value)}
                placeholder="ایدی اینستاگرام (اختیاری)"
                className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
              />
            )}
            <input
              value={formAddress}
              onChange={(event) => setFormAddress(event.target.value)}
              placeholder="آدرس (اختیاری)"
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            />
            <textarea
              value={formNotes}
              onChange={(event) => setFormNotes(event.target.value)}
              placeholder={
                kind === 'salon'
                  ? 'یادداشت: مثلاً فرمول رنگ ۷.۱ با اکسیدان ۶٪، ۳۵ دقیقه'
                  : 'یادداشت درباره پزشک'
              }
              rows={3}
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed"
            />

            <button
              onClick={submitProvider}
              disabled={!formName.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#8e5241] disabled:opacity-40 text-white font-bold text-sm"
            >
              ذخیره
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* --------------------------- مودال نوبت جدید --------------------------- */}
      {showAppointmentForm && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[calc(var(--safe-bottom)+1rem)]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-4 max-h-[82vh] overflow-y-auto pb-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-800 dark:text-white">نوبت جدید</h3>
              <button
                onClick={() => setShowAppointmentForm(false)}
                aria-label="بستن"
                className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PrettySelect label="مرکز" value={apptProviderId} onChange={setApptProviderId} options={providers.map((provider) => ({ value: provider.id, label: provider.name, description: provider.address || provider.phone }))} />

            <PrettySelect label="نوع خدمت" value={apptCategory} onChange={(value) => setApptCategory(value as ServiceCategory)} options={categories.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }))} />

            <JalaliDatePicker labelFa="تاریخ نوبت" value={apptDate} onChange={setApptDate} allowPast={false} />

            {/* هوشمندی چرخه روی انتخاب روز — برگ برنده این بخش */}
            {/* سه سطح، نه دو سطح: «منع» با «حواست باشد» یکی نیست. قبلاً هر
                چیزی که good نبود قرمز نمایش داده می‌شد. */}
            {dayAdvice && dayAdvice.suitability !== 'neutral' && (
              <div
                className={`p-3.5 rounded-2xl border text-sm leading-relaxed flex items-start gap-2 ${
                  dayAdvice.suitability === 'avoid'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                    : dayAdvice.suitability === 'caution'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {dayAdvice.suitability === 'good' ? (
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <span>{dayAdvice.reasonFa}</span>
              </div>
            )}

            {bestDays.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">روزهای پیشنهادی</span>
                <div className="flex flex-wrap gap-1.5">
                  {bestDays.map((day) => (
                    <button
                      key={day.dateIso}
                      onClick={() => setApptDate(day.dateIso)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
                    >
                      {formatJalaliDate(day.dateIso)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">ساعت</label>
                <input
                  type="time"
                  value={apptTime}
                  onChange={(event) => setApptTime(event.target.value)}
                  className="w-full py-3 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">هزینه (تومان)</label>
                <input
                  value={apptPrice}
                  onChange={(event) => setApptPrice(event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="اختیاری"
                  className="w-full py-3 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>
            </div>

            {/* پیش‌نمایش تاثیر روی روتین */}
            {previewChecklists.prepFa.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  رزا روتین این روزها را خودکار تنطیم می‌کند
                </span>
                <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 pr-4 list-disc leading-relaxed">
                  {previewChecklists.prepFa.slice(0, 3).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewChecklists.warningsFa.map((warning, index) => (
              <div
                key={index}
                className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-sm text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}

            <textarea
              value={apptNotes}
              onChange={(event) => setApptNotes(event.target.value)}
              placeholder="یادداشت (اختیاری)"
              rows={2}
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed"
            />

            <button
              onClick={submitAppointment}
              disabled={!apptProviderId || !apptDate}
              className="w-full py-3.5 rounded-2xl bg-[#8e5241] disabled:opacity-40 text-white font-bold text-sm"
            >
              ثبت نوبت
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* راهنمای قواعد پرهیز */}
      {kind === 'salon' && (
        <details className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <summary className="text-sm font-black text-slate-800 dark:text-white cursor-pointer">
            قواعد پرهیز قبل و بعد خدمات
          </summary>
          <div className="pt-3 space-y-3">
            {PROCEDURE_RULES.filter(
              (item) => item.pauseActivesDaysBefore > 0 || item.gentleRoutineDaysAfter > 0,
            ).map((item) => (
              <div key={item.category} className="space-y-1">
                <h5 className="text-sm font-bold text-slate-800 dark:text-white">{item.labelFa}</h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.pauseActivesDaysBefore > 0 &&
                    `${toPersianDigits(item.pauseActivesDaysBefore)} روز قبل، ترکیبات فعال قطع شود. `}
                  {item.gentleRoutineDaysAfter > 0 &&
                    `${toPersianDigits(item.gentleRoutineDaysAfter)} روز بعد، روتین ملایم و ترمیمی.`}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

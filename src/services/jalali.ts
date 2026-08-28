/**
 * تقویم جلالی و ابزارهای تاریخ.
 *
 * قاعده مهم: تمام تاریخ‌ها داخل اپ به شکل «YYYY-MM-DD محلی»
 * نگهداری می‌شوند. هرگز از toISOString() برای ساختن تاریخ
 * استفاده نکن؛ با اختلاف +۳:۳۰ ایران، بعد از ظهر یک روز جلو می‌افتد.
 */

export const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

/** ایندکس بر اساس Date.getDay() که ۰ = یکشنبه است. */
export const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

/** سرستون هفته به ترتیب ایرانی: شنبه تا جمعه. */
export const PERSIAN_WEEK_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const EN_TO_FA_DIGITS: Record<string, string> = {
  '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
  '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
};

export function toPersianDigits(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[0-9]/g, (digit) => EN_TO_FA_DIGITS[digit]);
}

export function toEnglishDigits(value: string): string {
  return value.replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/* -------------------------- تبدیل تقویم -------------------------- */

export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let year = gy - (gy <= 1600 ? 621 : 1600);
  const leapRef = gm > 2 ? year + 1 : year;
  let days =
    365 * year +
    Math.floor((leapRef + 3) / 4) -
    Math.floor((leapRef + 99) / 100) +
    Math.floor((leapRef + 399) / 400) -
    80 +
    gd +
    monthDays[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let gy = jy <= 979 ? 621 : 1600;
  const year = jy - (jy <= 979 ? 0 : 979);
  let days =
    365 * year +
    Math.floor(year / 33) * 8 +
    Math.floor(((year % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthLengths = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12; gm += 1) {
    if (gd <= monthLengths[gm]) break;
    gd -= monthLengths[gm];
  }
  return { gy, gm, gd };
}

/** تعداد روزهای یک ماه شمسی. */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const nextYearStart = jalaliToGregorian(jy + 1, 1, 1);
  const esfandStart = jalaliToGregorian(jy, 12, 1);
  const diff = Math.round(
    (Date.UTC(nextYearStart.gy, nextYearStart.gm - 1, nextYearStart.gd) -
      Date.UTC(esfandStart.gy, esfandStart.gm - 1, esfandStart.gd)) /
      86400000,
  );
  return diff;
}

/* -------------------------- تاریخ محلی -------------------------- */

/** تبدیل Date به YYYY-MM-DD بر اساس تقویم محلی کاربر. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayIsoDate(): string {
  return toIsoDate(new Date());
}

/** تبدیل YYYY-MM-DD به Date محلی (نه UTC). */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map((part) => parseInt(part, 10));
  return new Date(year, (month || 1) - 1, day || 1);
}

export function isValidIsoDate(iso: string | undefined | null): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = fromIsoDate(iso);
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === iso;
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** اختلاف روز بین دو تاریخ (مقاوم به ساعت تابستانی و منطقه زمانی). */
export function getDaysDifference(fromIso: string, toIso: string): number {
  const from = fromIsoDate(fromIso);
  const to = fromIsoDate(toIso);
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

/* -------------------------- قالب‌بندی -------------------------- */

export function formatJalaliDate(iso: string): string {
  if (!isValidIsoDate(iso)) return '';
  const [gy, gm, gd] = iso.split('-').map((part) => parseInt(part, 10));
  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  return `${toPersianDigits(jd)} ${PERSIAN_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;
}

/** بدون سال، مناسب برای تاریخ‌های نزدیک: «۱۲ مرداد» */
export function formatJalaliDayMonth(iso: string): string {
  if (!isValidIsoDate(iso)) return '';
  const [gy, gm, gd] = iso.split('-').map((part) => parseInt(part, 10));
  const { jm, jd } = gregorianToJalali(gy, gm, gd);
  return `${toPersianDigits(jd)} ${PERSIAN_MONTH_NAMES[jm - 1]}`;
}

export function formatJalaliShort(iso: string): string {
  if (!isValidIsoDate(iso)) return '';
  const [gy, gm, gd] = iso.split('-').map((part) => parseInt(part, 10));
  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  return `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, '0'))}/${toPersianDigits(String(jd).padStart(2, '0'))}`;
}

/** «سه‌شنبه ۲۷ مرداد» — بدون ویرگول، برای هدر دایره چرخه. */
export function formatWeekdayDayMonth(iso: string): string {
  if (!isValidIsoDate(iso)) return '';
  const weekday = PERSIAN_WEEKDAYS[fromIsoDate(iso).getDay()];
  return `${weekday} ${formatJalaliDayMonth(iso)}`;
}

export function getTodayPersianHeader(): string {
  const today = new Date();
  return `${PERSIAN_WEEKDAYS[today.getDay()]}، ${formatJalaliDate(getTodayIsoDate())}`;
}

/** «امروز»، «دیروز»، «۳ روز پیش»، «۴ روز دیگر» */
export function formatRelativeDay(iso: string): string {
  if (!isValidIsoDate(iso)) return '';
  const diff = getDaysDifference(getTodayIsoDate(), iso);
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'فردا';
  if (diff === -1) return 'دیروز';
  if (diff > 1) return `${toPersianDigits(diff)} روز دیگر`;
  return `${toPersianDigits(Math.abs(diff))} روز پیش`;
}

/** روزهای یک ماه شمسی به شکل گرید تقویم (از شنبه). */
export function buildJalaliMonthGrid(jy: number, jm: number): { iso: string | null; jd: number | null }[] {
  const length = jalaliMonthLength(jy, jm);
  const first = jalaliToGregorian(jy, jm, 1);
  const firstDate = new Date(first.gy, first.gm - 1, first.gd);
  // getDay(): 0=یکشنبه ... 6=شنبه → در گرید ما شنبه اول است
  const leadingBlanks = (firstDate.getDay() + 1) % 7;
  const cells: { iso: string | null; jd: number | null }[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push({ iso: null, jd: null });
  for (let day = 1; day <= length; day += 1) {
    const g = jalaliToGregorian(jy, jm, day);
    cells.push({ iso: toIsoDate(new Date(g.gy, g.gm - 1, g.gd)), jd: day });
  }
  return cells;
}

export function getJalaliToday(): { jy: number; jm: number; jd: number } {
  const today = new Date();
  return gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

/* -------------------------- تاریخ تولد و سن -------------------------- */

/** قدیمی‌ترین سالی که در انتخاب‌گر تاریخ تولد نمایش داده می‌شود. */
export const BIRTH_YEAR_MIN = 1350;

/** جدیدترین سال قابل انتخاب برای تاریخ تولد؛ همیشه سال جلالی امروز است. */
export function getBirthYearMax(): number {
  return getJalaliToday().jy;
}

/**
 * سن دقیق را از تاریخ تولد (ذخیره‌شده به شکل میلادی YYYY-MM-DD) حساب می‌کند.
 * محاسبه بر مبنای سال شمسی انجام می‌شود چون تاریخ تولد هم از تقویم شمسی
 * وارد شده؛ نتیجه با محاسبه میلادی یکسان است، فقط با ارقام آشنا برای کاربر.
 */
export function getAgeFromBirthDate(birthIso: string | undefined | null, todayIso: string = getTodayIsoDate()): number {
  if (!isValidIsoDate(birthIso)) return 0;
  const [by, bm, bd] = (birthIso as string).split('-').map((part) => parseInt(part, 10));
  const [ty, tm, td] = todayIso.split('-').map((part) => parseInt(part, 10));
  const birth = gregorianToJalali(by, bm, bd);
  const now = gregorianToJalali(ty, tm, td);
  let age = now.jy - birth.jy;
  if (now.jm < birth.jm || (now.jm === birth.jm && now.jd < birth.jd)) age -= 1;
  return Math.max(0, age);
}

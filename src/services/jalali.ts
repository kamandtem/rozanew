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
// پیاده‌سازی الگوریتم استاندارد و کاملاً تست‌شده jalaali (بر پایه‌ی جدول
// دقیق سال‌های کبیسه، نه یک فرمول تقریبی).
//
// باگ نسخه قبل: فرمول قبلی (closed-form بدون جدول کبیسه) برای بیشتر
// تاریخ‌ها درست بود، اما در سه‌ماهه‌ی پایانی هر سال کبیسه‌ی جلالی (مثلاً
// دی تا اسفند ۱۴۰۳ که با دسامبر ۲۰۲۴ تا مارس ۲۰۲۵ میلادی همپوشانی دارد)
// دقیقاً یک روز اشتباه محاسبه می‌کرد — یعنی تبدیل رفت‌وبرگشت (میلادی←جلالی←میلادی)
// یک روز جابه‌جا می‌شد. چون این فقط در بخشی از سال‌های کبیسه رخ می‌داد (بعدی:
// ۱۴۰۸ ≈ اسفند ۱۴۰۸/زمستان ۱۴۲۹–۳۰ خورشیدی)، در تست‌های عادی دیده نمی‌شد.

function jdiv(a: number, b: number): number {
  return Math.trunc(a / b);
}
function jmod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

/** نقاط شکست چرخه‌ی کبیسه‌ی جلالی (الگوریتم استاندارد jalaali، معتبر تا سال ۳۱۷۷). */
const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = JALALI_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALALI_BREAKS[0];
  let jm = jp;
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    jm = JALALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + jdiv(jump, 33) * 8 + jdiv(jmod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + jdiv(n, 33) * 8 + jdiv(jmod(n, 33) + 3, 4);
  if (jmod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = jdiv(gy, 4) - jdiv((jdiv(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + jdiv(jump + 4, 33) * 33;
  let leap = jmod(jmod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

/** تاریخ میلادی → شماره روز ژولینی (JDN). */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    jdiv((gy + jdiv(gm - 8, 6) + 100100) * 1461, 4) + jdiv(153 * jmod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - jdiv(jdiv(gy + 100100 + jdiv(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** شماره روز ژولینی (JDN) → تاریخ میلادی. */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + jdiv(jdiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = jdiv(jmod(j, 1461), 4) * 5 + 308;
  const gd = jdiv(jmod(i, 153), 5) + 1;
  const gm = jmod(jdiv(i, 153), 12) + 1;
  const gy = jdiv(j, 1461) - 100100 + jdiv(8 - gm, 6);
  return { gy, gm, gd };
}

/** تاریخ جلالی → شماره روز ژولینی (JDN). */
function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - jdiv(jm, 7) * (jm - 7) + jd - 1;
}

/** شماره روز ژولینی (JDN) → تاریخ جلالی. */
function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + jdiv(k, 31);
      jd = jmod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + jdiv(k, 30);
  jd = jmod(k, 30) + 1;
  return { jy, jm, jd };
}

export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  return d2j(g2d(gy, gm, gd));
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
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

/**
 * هایلایت‌های فاز چرخه — شبیه هایلایت‌های استوری اینستاگرام.
 *
 * هر فاز (پریودی / تخمک‌گذاری / PMS) حداقل سه هایلایت دارد و هر هایلایت
 * از میان حداقل چهار عکس موقتِ همان فاز تغذیه می‌شود. عکس‌ها و محتوای
 * واقعی بعداً توسط طراح جایگزین همین فایل‌ها در public/assets/highlights
 * می‌شود؛ فعلاً فقط placeholder با ابعاد صحیح (۱۰۸۰×۱۹۲۰) هستند.
 *
 * این فایل فقط داده است — منطق نمایش/فاز در CyclePhaseHighlights.tsx است.
 */

/** سه فازی که هایلایت برایشان تعریف شده؛ در بقیه‌ی روزهای چرخه هیچ هایلایتی نشان داده نمی‌شود. */
export type CycleHighlightPhase = 'period' | 'ovulation' | 'pms';

export interface CycleHighlight {
  id: string;
  phase: CycleHighlightPhase;
  /** عنوان کوتاه زیر دایره، مثل کپشن هایلایت اینستاگرام. */
  titleFa: string;
  /** تصویر کاور که داخل دایره نشان داده می‌شود. */
  coverImage: string;
  /** اسلایدهای استوری؛ حداقل یکی، از میان عکس‌های موقت همان فاز. */
  images: string[];
}

const PERIOD_IMAGES = [
  '/assets/highlights/period-1.jpg',
  '/assets/highlights/period-2.jpg',
  '/assets/highlights/period-3.jpg',
  '/assets/highlights/period-4.jpg',
];

const OVULATION_IMAGES = [
  '/assets/highlights/ovulation-1.jpg',
  '/assets/highlights/ovulation-2.jpg',
  '/assets/highlights/ovulation-3.jpg',
  '/assets/highlights/ovulation-4.jpg',
];

const PMS_IMAGES = [
  '/assets/highlights/pms-1.jpg',
  '/assets/highlights/pms-2.jpg',
  '/assets/highlights/pms-3.jpg',
  '/assets/highlights/pms-4.jpg',
];

export const CYCLE_HIGHLIGHTS: CycleHighlight[] = [
  // ------------------------------ پریودی ------------------------------
  {
    id: 'period_1',
    phase: 'period',
    titleFa: 'نکته ۱',
    coverImage: PERIOD_IMAGES[0],
    images: [PERIOD_IMAGES[0]],
  },
  {
    id: 'period_2',
    phase: 'period',
    titleFa: 'نکته ۲',
    coverImage: PERIOD_IMAGES[1],
    images: [PERIOD_IMAGES[1]],
  },
  {
    id: 'period_3',
    phase: 'period',
    titleFa: 'نکته ۳',
    coverImage: PERIOD_IMAGES[2],
    images: [PERIOD_IMAGES[2], PERIOD_IMAGES[3]],
  },

  // ---------------------------- تخمک‌گذاری ----------------------------
  {
    id: 'ovulation_1',
    phase: 'ovulation',
    titleFa: 'نکته ۱',
    coverImage: OVULATION_IMAGES[0],
    images: [OVULATION_IMAGES[0]],
  },
  {
    id: 'ovulation_2',
    phase: 'ovulation',
    titleFa: 'نکته ۲',
    coverImage: OVULATION_IMAGES[1],
    images: [OVULATION_IMAGES[1]],
  },
  {
    id: 'ovulation_3',
    phase: 'ovulation',
    titleFa: 'نکته ۳',
    coverImage: OVULATION_IMAGES[2],
    images: [OVULATION_IMAGES[2], OVULATION_IMAGES[3]],
  },

  // -------------------------------- PMS --------------------------------
  {
    id: 'pms_1',
    phase: 'pms',
    titleFa: 'نکته ۱',
    coverImage: PMS_IMAGES[0],
    images: [PMS_IMAGES[0]],
  },
  {
    id: 'pms_2',
    phase: 'pms',
    titleFa: 'نکته ۲',
    coverImage: PMS_IMAGES[1],
    images: [PMS_IMAGES[1]],
  },
  {
    id: 'pms_3',
    phase: 'pms',
    titleFa: 'نکته ۳',
    coverImage: PMS_IMAGES[2],
    images: [PMS_IMAGES[2], PMS_IMAGES[3]],
  },
];

export function getHighlightsForPhase(phase: CycleHighlightPhase | null): CycleHighlight[] {
  if (!phase) return [];
  return CYCLE_HIGHLIGHTS.filter((item) => item.phase === phase);
}

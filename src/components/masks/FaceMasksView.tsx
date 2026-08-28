import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Search, Clock, CheckCircle2, X, Info, Flame, Droplet, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { toPersianDigits } from '../../services/jalali';

export interface FaceMask {
  id: string;
  titleFa: string;
  category: 'natural' | 'dermatological';
  categoryFa: string;
  targetSkinTypesFa: string[];
  durationMinutes: number;
  imageUrl: string;
  summaryFa: string;
  ingredientsFa: string[];
  stepsFa: string[];
  benefitsFa: string[];
  warningsFa?: string;
}

export const FACE_MASKS_DATABASE: FaceMask[] = [
  {
    id: 'mask_1',
    titleFa: 'ماسک عسل خام، زردچوبه و ماست',
    category: 'natural',
    categoryFa: 'طبیعی و خانگی',
    targetSkinTypesFa: ['پوست‌های مستعد جوش', 'پوست‌های کدر و دارای لک'],
    durationMinutes: 15,
    imageUrl: '/assets/real/masks/set1-1.webp',
    summaryFa: 'یک ماسک فوق‌العاده ضدالتهاب، آنتی‌باکتریال و درخشان‌کننده برای کاهش قرمزی جوش‌ها و یکدست‌سازی رنگ صورت.',
    ingredientsFa: ['۱ قاشق غذاخوری عسل طبیعی', '۱/۲ قاشق چای‌خوری کورکومین (زردچوبه)', '۱ قاشق غذاخوری ماست کم‌چرب'],
    stepsFa: [
      'مواد را در یک کاسه کوچک تمیز مخلوط کنید تا خمیری یکدست ایجاد شود.',
      'روی صورت تمیز (به جز اطراف چشم و لب) لایه‌ای یکنواخت بمالید.',
      '۱۵ دقیقه صبر کنید و سپس با آب ولرم ماساژ داده و بشویید.',
      'مرطوب‌کننده ملایم خود را استفاده کنید.'
    ],
    benefitsFa: ['کاهش باکتری عامل آکنه', 'کم‌رنگ کردن جای جوش‌ها', 'آبرسانی و تسکین قرمزی'],
    warningsFa: 'به دلیل وجود زردچوبه ممکن است تا چند دقیقه زردی بسیار ملایمی بماند که با شستشو پاک می‌شود.'
  },
  {
    id: 'mask_2',
    titleFa: 'ماسک خنک‌کننده خیار و آلوئه‌ورا',
    category: 'natural',
    categoryFa: 'طبیعی و خانگی',
    targetSkinTypesFa: ['پوست حساس', 'پوست دهیدراته و آفتاب‌سوخته'],
    durationMinutes: 20,
    imageUrl: '/assets/real/masks/set1-2.webp',
    summaryFa: 'بمب آبرسانی و خنک‌کننده فوری برای تسکین داغی، التهاب رزاسه و کم‌آبی شدید پوست.',
    ingredientsFa: ['۲ قاشق غذاخوری ژل آلوئه‌ورای خالص', 'نصف خیار رنده‌شده و پوره شده'],
    stepsFa: [
      'ژل آلوئه‌ورا و پوره‌ی خیار را به مدت ۱۰ دقیقه در یخچال بگذارید تا خنک شود.',
      'مخلوط را روی پوست بزنید و آرامی بخوابید.',
      'پس از ۲۰ دقیقه با آب سرد آبکشی کنید.'
    ],
    benefitsFa: ['رفع عطش و خشکی پوست', 'کاهش پف و سوزش', 'افزایش شفافیت طبیعی']
  },
  {
    id: 'mask_3',
    titleFa: 'ماسک خاک رس بنتونیت و زینک',
    category: 'dermatological',
    categoryFa: 'تخصصی و درمانی',
    targetSkinTypesFa: ['پوست چرب', 'منافذ باز و جوش سرسیاه'],
    durationMinutes: 10,
    imageUrl: '/assets/real/masks/set1-3.webp',
    summaryFa: 'پاکسازی عمیق منافذ از چربی و آلودگی‌های محیطی، مات‌کننده چربی بی‌رویه فاز PMS.',
    ingredientsFa: ['۱ قاشق پودر خاک رس بنتونیت', '۱ قاشق آب یا گلاب ملایم', 'چند قطره سرم زینک PCA'],
    stepsFa: [
      'ترکیبات را در ظرف غیرفلزی مخلوط کرده تا حالت خمیری شکل بگیرد.',
      'روی مناطق چرب (ناحیه T صورت) قرار دهید.',
      'قبل از خشک شدن کامل (حدود ۱۰ دقیقه) با آب ولرم بشویید.'
    ],
    benefitsFa: ['جذب چربی اضافی سبوم', 'کوچک‌تر نشان دادن منافذ', 'پیشگیری از جوش‌های سرسیاه'],
    warningsFa: 'اجازه ندهید ماسک خاک رس کاملاً روی صورت خشک و ترک خورده شود زیرا رطوبت پوست را می‌گیرد.'
  },
  {
    id: 'mask_4',
    titleFa: 'ماسک تسکین‌دهنده جو دو سر و ماست',
    category: 'natural',
    categoryFa: 'طبیعی و خانگی',
    targetSkinTypesFa: ['پوست خشک و شکننده', 'پوست دارای آسیب سد دفاعی'],
    durationMinutes: 15,
    imageUrl: '/assets/real/masks/set1-4.webp',
    summaryFa: 'مرهمی بی‌نظیر برای بازسازی سد دفاعی پوست با پودر پربیوتیک جو دو سر.',
    ingredientsFa: ['۲ قاشق غذاخوری پرک جو دو سر آسیاب‌شده', '۱ قاشق غذاخوری ماست پرچرب یا شیر'],
    stepsFa: [
      'جو دو سر و ماست را مخلوط کنید و ۵ دقیقه زمان دهید تا نرم شود.',
      'لایه ضخیمی روی پوست پخش کنید.',
      'با آب ولرم بشویید.'
    ],
    benefitsFa: ['تقویت میکروبیوم پوست', 'کاهش سوزش و پوسته ریزی', 'نرم‌کنندگی فوق‌العاده']
  },
  {
    id: 'mask_5',
    titleFa: 'ماسک آووکادو، روغن زیتون و ویتامین E',
    category: 'natural',
    categoryFa: 'طبیعی و خانگی',
    targetSkinTypesFa: ['پوست‌های بسیار خشک و دهیدراته', 'پوست‌های بالغ'],
    durationMinutes: 20,
    imageUrl: '/assets/real/masks/set2-1.webp',
    summaryFa: 'تغذیه عمیق سلولی با اسیدهای چرب ضروری امگا ۳ و آنتی‌اکسیدان ویتامین E.',
    ingredientsFa: ['۱/۴ آووکادوی له شده', '۱ قاشق چای‌خوری روغن زیتون خمیر شده', 'کپسول ویتامین E'],
    stepsFa: [
      'آووکادو را کاملاً له کرده و روغن زیتون و ویتامین E را اضافه کنید.',
      '۲۰ دقیقه روی صورت تمیز بگذارید.',
      'با دستمال مرطوب ولرم پاک کنید.'
    ],
    benefitsFa: ['پرکننده خطوط ناشی از خشکی', 'تغذیه عمیق بافت پوست', 'ایجاد درخشش و شادابی']
  },
  {
    id: 'mask_6',
    titleFa: 'ماسک چای سبز، عصاره برنج و نیاسینامید',
    category: 'dermatological',
    categoryFa: 'تخصصی و درمانی',
    targetSkinTypesFa: ['انواع پوست', 'پوست‌های خسته و کدر'],
    durationMinutes: 15,
    imageUrl: '/assets/real/masks/set2-2.webp',
    summaryFa: 'اکسیر آنتی‌اکسیدان برای مقابله با رادیکال‌های آزاد آلودگی هوا و شفاف‌سازی چهره.',
    ingredientsFa: ['۱ کیسه چای سبز دم شده خنک', '۱ قاشق آرد برنج خمیر شده', '۲ قطره سرم نیاسینامید'],
    stepsFa: [
      'چای سبز خنک را با آرد برنج و نیاسینامید ترکیب کنید.',
      'با پد یا دست روی پوست مالیده و ۱۵ دقیقه صبر کنید.',
      'با آب خنک بشویید.'
    ],
    benefitsFa: ['محافظت در برابر آلودگی', 'کاهش لکه‌های سطحی', 'روشن‌کننده فوری']
  },
  {
    id: 'mask_7',
    titleFa: 'ماسک ورقه‌ای ورقی هیالورونیک اسید و سرامید',
    category: 'dermatological',
    categoryFa: 'تخصصی و درمانی',
    targetSkinTypesFa: ['پوست کم‌آب', 'قبل از مهمانی و آرایش'],
    durationMinutes: 15,
    imageUrl: '/assets/real/masks/set2-3.webp',
    summaryFa: 'ماسک ورقه‌ای آماده هیدرولیزشده برای تزریق ۲۴ ساعته آب به لایه‌های عمقی.',
    ingredientsFa: ['پد ورقه‌ای پنبه‌ای', 'سرم هیالورونیک اسید', 'اسنس مرطوب‌کننده'],
    stepsFa: [
      'ماسک ورقه‌ای را روی صورت تمیز تنظیم کنید.',
      '۱۵ الی ۲۰ دقیقه آرام استراحت کنید.',
      'ماسک را برداشته و باقی‌مانده اسنس را با ضربات آرام جذب پوست کنید.'
    ],
    benefitsFa: ['شادابی و تپلی فوری صورت', 'زیرسازی عالی برای آرایش', 'تسکین خستگی']
  },
  {
    id: 'mask_8',
    titleFa: 'ماسک خواب ترمیم‌کننده سرامید و پانتنول (Sleeping Pack)',
    category: 'dermatological',
    categoryFa: 'تخصصی و درمانی',
    targetSkinTypesFa: ['پوست‌های خسته', 'پوست‌های در حال بازسازی شبانه'],
    durationMinutes: 480, // Overnight
    imageUrl: '/assets/real/masks/set2-4.webp',
    summaryFa: 'ماسک شبانه بدون نیاز به آبکشی که تا صبح سلول‌های آسیب‌دیده را بازسازی می‌کند.',
    ingredientsFa: ['کرم مرطوب‌کننده غنی از سرامید', 'سرم B5 پانتنول'],
    stepsFa: [
      'در آخرین گام روتین شب لایه ضخیم‌تری از کرم را روی صورت بزنید.',
      'بدون آبکشی بخوابید.',
      'صبح صورت را با آب ولرم بشویید.'
    ],
    benefitsFa: ['قفل کردن کامل رطوبت در طول شب', 'پوست نرم و مخملی هنگام بیدار شدن']
  },
  {
    id: 'mask_9',
    titleFa: 'ماسک زغال فعال و اسید سالیسیلیک',
    category: 'dermatological',
    categoryFa: 'تخصصی و درمانی',
    targetSkinTypesFa: ['پوست چرب و آکنه‌ای'],
    durationMinutes: 10,
    imageUrl: '/assets/real/masks/set3-1.webp',
    summaryFa: 'سم‌زدایی کامل از منافذ پوستی و جذب فلزات سنگین و دود آلودگی‌های شهری.',
    ingredientsFa: ['کپسول زغال فعال طبی', 'ژل سالیسیلیک اسید', 'کمی آب مقطر'],
    stepsFa: [
      'پودر زغال را با ژل سالیسیلیک اسید مخلوط کنید.',
      'روی بینی و چانه بزنید.',
      'پس از ۱۰ دقیقه بشویید.'
    ],
    benefitsFa: ['پاکسازی باکتری‌های مضر', 'کاهش جوش‌های زیرپوستی']
  },
  {
    id: 'mask_10',
    titleFa: 'ماسک پیلینگ ملایم AHA اسید میوه و گلاب',
    category: 'dermatological',
    categoryFa: 'تخصصی و درمانی',
    targetSkinTypesFa: ['پوست‌های کدر و دارای بافت ناهموار'],
    durationMinutes: 8,
    imageUrl: '/assets/real/masks/set3-2.webp',
    summaryFa: 'لایه‌برداری ملایم سطحی برای ریختن سلول‌های مرده و درخشان شدن فوری چهره.',
    ingredientsFa: ['چند قطره سرم گلیکولیک یا لاکتیک اسید ۵٪', 'گلاب خالص'],
    stepsFa: [
      'روی پوست خشک لایه‌ای خلیی نازک بمالید.',
      'حداکثر ۸ دقیقه زمان دهید.',
      'با آب خنک کامل بشویید و بلافاصله آبرسان بزنید.'
    ],
    benefitsFa: ['صاف شدن بافت پوست', 'افزایش جذب کرم‌های روزانه'],
    warningsFa: 'در صورت احساس سوزش شدید سریعاً با آب فراوان بشویید.'
  }
];

export const FaceMasksView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'natural' | 'dermatological'>('all');
  const [search, setSearch] = useState('');
  const [selectedMask, setSelectedMask] = useState<FaceMask | null>(null);

  const filteredMasks = FACE_MASKS_DATABASE.filter((m) => {
    const matchesCategory = filter === 'all' || m.category === filter;
    const matchesSearch =
      search.trim() === '' ||
      (m.titleFa && m.titleFa.includes(search)) ||
      (m.summaryFa && m.summaryFa.includes(search)) ||
      (m.ingredientsFa && m.ingredientsFa.some((i) => i && i.includes(search)));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] pt-2 px-4 max-w-lg mx-auto space-y-4 font-['Vazirmatn',sans-serif] text-slate-800 dark:text-white">
      {/* Title Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-200 dark:border-slate-800 text-right space-y-1">
        <h2 className="text-base font-extrabold flex items-center gap-2 text-slate-800 dark:text-white">
          <Sparkles className="w-5 h-5 text-rose-500" />
          ۱۰ ماسک مشهور و کاربردی پوست
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          آموزش گام‌به‌گام تهیه و استفاده از بهترین ماسک‌های طبیعی خانگی و درمانی برای انواع پوست.
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی ماسک (عسل، آلوئه‌ورا، زینک، آبرسان)..."
            className="w-full py-2.5 pr-10 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-400"
          />
          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
        </div>

        <div className="p-1 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 flex gap-1 text-xs font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
            }`}
          >
            همه ماسک‌ها ({toPersianDigits(10)})
          </button>
          <button
            onClick={() => setFilter('natural')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              filter === 'natural'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
            }`}
          >
            طبیعی و خانگی
          </button>
          <button
            onClick={() => setFilter('dermatological')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              filter === 'dermatological'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
            }`}
          >
            تخصصی و درمانی
          </button>
        </div>
      </div>

      {/* Masks Cards List */}
      <div className="space-y-3">
        {filteredMasks.map((mask) => (
          <motion.div
            key={mask.id}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedMask(mask)}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 shadow-xs hover:border-rose-300 transition-all cursor-pointer text-right space-y-3"
          >
            <div className="flex gap-3">
              <img
                src={mask.imageUrl}
                alt={mask.titleFa}
                className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
              />

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      mask.category === 'natural'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                    }`}
                  >
                    {mask.categoryFa}
                  </span>

                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {toPersianDigits(mask.durationMinutes)} دقیقه
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  {mask.titleFa}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {mask.summaryFa}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 pt-1 border-t border-rose-50 dark:border-slate-800/80">
              {mask.targetSkinTypesFa.map((st, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold"
                >
                  ✓ {st}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mask Modal Detail */}
      {/* با createPortal مستقیم به document.body — وگرنه داخل کانتینر fixed z-20 بخش گیر
          می‌افتد و با وجود z-50 باز هم زیر هدر/نوبار پایین (بیرون از آن کانتینر) دیده می‌شود.
          ارتفاع هم کمی کوچک‌تر شد تا حتی در گوشی‌های کوچک، همیشه داخل صفحه بماند و خودش اسکرول بخورد. */}
      {/* بدون AnimatePresence دور createPortal: این ترکیب باعث می‌شد مودال اصلاً
          نمایش داده نشود (AnimatePresence نمی‌تواند پورتال را به‌عنوان فرزند
          انیمیشنی ردیابی کند). با همان الگویی که در راهنما/مقالات درست کار
          می‌کند جایگزین شد: portal مستقیم + motion.div با initial/animate. */}
      {selectedMask && createPortal(
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 pt-[calc(var(--safe-top)+1rem)] pb-[calc(var(--safe-bottom)+1rem)]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg max-h-[72vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-slate-900 text-right space-y-4 shadow-2xl border border-rose-100 dark:border-slate-800 font-['Vazirmatn',sans-serif]"
            >
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                    {selectedMask.titleFa}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMask(null)}
                  className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <img
                src={selectedMask.imageUrl}
                alt={selectedMask.titleFa}
                className="w-full h-44 rounded-2xl object-cover shadow-xs border border-rose-100 dark:border-slate-800"
              />

              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-rose-50/50 dark:bg-slate-800/60 p-3 rounded-2xl border border-rose-100 dark:border-slate-700">
                {selectedMask.summaryFa}
              </p>

              {/* Ingredients List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  🧪 مواد و ترکیبات لازم:
                </h4>
                <ul className="text-xs text-slate-700 dark:text-slate-200 space-y-1.5 pr-4 list-disc">
                  {selectedMask.ingredientsFa.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  📝 مراحل آماده‌سازی و استفاده:
                </h4>
                <ol className="text-xs text-slate-700 dark:text-slate-200 space-y-2 pr-4 list-decimal">
                  {selectedMask.stepsFa.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ✨ نتایج و فواید برای پوست:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMask.benefitsFa.map((b, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900"
                    >
                      ✓ {b}
                    </span>
                  ))}
                </div>
              </div>

              {selectedMask.warningsFa && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 text-xs font-medium">
                  <strong>نکته احتیاط: </strong>
                  {selectedMask.warningsFa}
                </div>
              )}

              <button
                onClick={() => setSelectedMask(null)}
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md mt-2"
              >
                متوجه شدم
              </button>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

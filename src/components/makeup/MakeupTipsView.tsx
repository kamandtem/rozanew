import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Brush, Clock, Search, Sparkles, Tag, X } from 'lucide-react';
import { toPersianDigits } from '../../services/jalali';

/**
 * عکس‌ها — فعلاً جای‌گیر (placeholder) هستند، نه svg.
 *
 * چون امکان دانلود عکس واقعی از اینترنت نبود، به‌جایش ۲۰ تصویر رنگی
 * شماره‌دار و آفلاین ساخته شد (هرکدام یک PNG واقعی، رنگ متفاوت،
 * شماره‌ی همان ترفند وسطش). این فایل‌ها داخل پروژه‌اند، پس آفلاین هم
 * کار می‌کنند:
 *   public/assets/makeup_photos/tip-01-foundation.png … tip-10-nails.png (نسخه اول)
 *   public/assets/makeup_photos/tip-11-contour.png … tip-20-lash-care.png (۱۰ مطلب جدید)
 *
 * برای جایگزینی با عکس واقعی: هر فایل PNG را با عکس خودت (با همان
 * اسم و همان مسیر) عوض کن — کد هیچ تغییری لازم ندارد. اگر اسم فایل
 * را هم عوض کردی، همان اسم را در فیلد image هر آیتم زیر بنویس.
 */
const tips = [
  { title: 'تینت پوست', category: 'پایه آرایش', image: '/assets/makeup_photos/tip-01-foundation.png', text: 'برای شروع، تینت سبک را از مرکز صورت به بیرون پخش کن. لایه نازک بهتر از پوشش سنگین است و هرجا لازم بود فقط همان نقطه را بیشتر کار کن.', note: 'الهام از توصیه آرتیست‌های آرایش برای محصولات سبک و قابل ساختن.' },
  { title: 'تونر', category: 'آماده‌سازی پوست', image: '/assets/makeup_photos/tip-02-toner.png', text: 'تونر برای همه ضروری نیست. اگر استفاده می‌کنی، روی پوست تمیز با دست یا پد نرم بزن و بعد مرطوب‌کننده را فراموش نکن. تونر جای شوینده یا درمان را نمی‌گیرد.' },
  { title: 'رژ لب محو', category: 'لب', image: '/assets/makeup_photos/tip-03-lipstick.png', text: 'رنگ را وسط لب بزن، با انگشت به سمت لبه‌ها محو کن و فقط مرکز لب را کمی براق‌تر بگذار. این روش خطای کمتری از کشیدن یک خط کامل دارد.' },
  { title: 'رژگونه کرمی', category: 'گونه', image: '/assets/makeup_photos/tip-04-blush.png', text: 'رژگونه کرمی را کم‌کم روی برجستگی گونه بزن و به سمت شقیقه محو کن. فرمول‌های قابل ساختن برای شروع بهترند چون راحت‌تر کنترل می‌شوند.' },
  { title: 'خط چشم قهوه‌ای', category: 'چشم', image: '/assets/makeup_photos/tip-05-eyeliner.png', text: 'برای آرایش روزانه، خط قهوه‌ای را از نیمه پلک شروع کن و گوشه بیرونی را کمی بالا ببر. قبل از خشک شدن، لبه آن را کمی محو کن.' },
  { title: 'ریمل مرتب', category: 'چشم', image: '/assets/makeup_photos/tip-06-mascara.png', text: 'اضافه ریمل را از برس بگیر، برس را نزدیک ریشه قرار بده و با حرکت آرام به سمت نوک بکش. دو لایه نازک از یک لایه سنگین تمیزتر است.' },
  { title: 'ابروی طبیعی', category: 'ابرو', image: '/assets/makeup_photos/tip-07-brow.png', text: 'موهای ابرو را رو به بالا شانه کن و فقط جاهای خالی را با خط‌های کوتاه پر کن. ابتدای ابرو را پررنگ نکن تا چهره طبیعی بماند.' },
  { title: 'هایلایتر کم‌حجم', category: 'چهره', image: '/assets/makeup_photos/tip-08-highlighter.png', text: 'هایلایتر را روی بالای گونه و گوشه داخلی چشم بزن. مقدار کم و پخش‌شده، شیک‌تر از یک نقطه خیلی براق دیده می‌شود.' },
  { title: 'براش تمیز', category: 'ابزار', image: '/assets/makeup_photos/tip-09-brush.png', text: 'براش‌های صورت را مرتب بشوی و کامل خشک کن. براش کثیف هم نتیجه را لک‌دار می‌کند، هم می‌تواند پوست را تحریک کند.' },
  { title: 'لاک مینیمال', category: 'ناخن', image: '/assets/makeup_photos/tip-10-nails.png', text: 'سطح ناخن را خشک کن، سه حرکت باریک بزن و بین لایه‌ها زمان بده. برای ظاهر امروزی، رنگ‌های شیری، صورتی شفاف و زرد کره‌ای انتخاب‌های ساده و قابل استفاده‌اند.' },
  { title: 'کانتور طبیعی', category: 'چهره', image: '/assets/makeup_photos/tip-11-contour.png', text: 'به‌جای خط‌های تیز، کانتور کِرمی را فقط زیر گونه، کنار خط رویش مو و دو طرف بینی بزن و بلافاصله با اسفنج نم‌دار محو کن. هدف حجم‌دهی طبیعی است، نه یک نقشه هندسی روی صورت.' },
  { title: 'پرایمر چشم', category: 'چشم', image: '/assets/makeup_photos/tip-12-eye-primer.png', text: 'یک لایه نازک پرایمر چشم قبل از سایه بزن تا هم رنگ سایه واضح‌تر بماند و هم داخل خط پلک کمتر جمع شود. صبر کن کاملاً بنشیند، بعد سایه را با برس اضافه کن.' },
  { title: 'اسپری فیکس‌کننده', category: 'دوام آرایش', image: '/assets/makeup_photos/tip-13-setting-spray.png', text: 'بعد از تمام کردن آرایش، اسپری فیکس‌کننده را از فاصله یک وجب و به‌شکل ضربدری روی صورت بزن. صبر کن خودش خشک شود؛ دستمال کشیدن بلافاصله بعد از اسپری، آرایش را به‌هم می‌ریزد.' },
  { title: 'کانسیلر هلالی', category: 'چشم', image: '/assets/makeup_photos/tip-14-concealer.png', text: 'کانسیلر را به‌شکل مثلث وارونه زیر چشم بزن، نه فقط یک نقطه. با انگشت یا اسفنج به‌آرامی ضربه بزن تا محو شود؛ کشیدنش باعث می‌شود در چین‌های ریز جمع شود.' },
  { title: 'برنزر گونه', category: 'گونه', image: '/assets/makeup_photos/tip-15-bronzer.png', text: 'برنزر را با برس بزرگ روی جاهایی بزن که نور آفتاب مستقیم به آن‌ها می‌خورد؛ پیشانی، بالای گونه‌ها و نوک بینی. کمی از زیر چانه هم فراموش نشود تا رنگ صورت با گردن یکدست بماند.' },
  { title: 'خط لب نامرئی', category: 'لب', image: '/assets/makeup_photos/tip-16-lip-liner.png', text: 'خط لب هم‌رنگ رژ لب را فقط دور مرز طبیعی لب بزن، نه بیرون از آن. این کار عمر رژ لب را بیشتر می‌کند و از پخش شدن رنگ دور لب جلوگیری می‌کند.' },
  { title: 'ژل ابرو', category: 'ابرو', image: '/assets/makeup_photos/tip-17-brow-gel.png', text: 'موهای ابرو را با برس مخصوص یا مسواک تمیز رو به بالا و بیرون شانه کن، بعد ژل شفاف یا هم‌رنگ ابرو بزن. این روش حالت پرپشت و مرتب می‌دهد بدون خط‌های مصنوعی روی صورت.' },
  { title: 'پاکسازی دو مرحله‌ای آرایش', category: 'پاکسازی', image: '/assets/makeup_photos/tip-18-double-cleanse.png', text: 'شب‌ها اول با روغن یا بالم پاک‌کننده، آرایش و ضدآفتاب را حل کن، بعد با شوینده معمولی دوباره صورت را بشوی. یک بار شستن با شوینده آبی، آرایش مقاوم و ضدآفتاب را کامل پاک نمی‌کند.' },
  { title: 'آرایش مقاوم به گرما', category: 'دوام آرایش', image: '/assets/makeup_photos/tip-19-heat-proof.png', text: 'در هوای گرم، بین لایه‌های آرایش (بعد از پرایمر، بعد از فون، قبل از پودر) کمی صبر کن تا هر لایه بنشیند. لایه‌های نازک و فاصله‌دار بهتر از یک لایه ضخیم یک‌باره دوام می‌آورند.' },
  { title: 'مراقبت از مژه مصنوعی', category: 'ابزار', image: '/assets/makeup_photos/tip-20-lash-care.png', text: 'مژه مصنوعی را از گوشه بیرونی چشم و به‌آرامی جدا کن، نه با کشیدن ناگهانی. بعد از جدا کردن، چسب باقی‌مانده را با گوش‌پاک‌کن آغشته به پاک‌کننده روغنی تمیز کن تا دوباره قابل استفاده بماند.' },
];

const categories = ['همه', ...Array.from(new Set(tips.map((tip) => tip.category)))];

/**
 * ترفندهای آرایش — تایم‌لاین شماره‌دار، دقیقاً هم‌ساختار با تایم‌لاین
 * «مقالات» در پایگاه دانش.
 *
 * باگ قبلی: هر کارت با آکاردئون داخل خودش باز/بسته می‌شد، و چون عکس
 * بالای دکمه بود ولی محتوای متن زیرش با ارتفاع متغیر اضافه/کم می‌شد،
 * موقعیت عکس نسبت به وسط صفحه هر بار فرق می‌کرد (گاهی بالای صفحه
 * می‌افتاد، گاهی پایین‌تر). با انتقال جزئیات به یک مودال ثابت (مثل
 * مودال مقالات)، کارت‌های لیست دیگر تغییر ارتفاع نمی‌دهند و این رفتار
 * تصادفی از بین می‌رود.
 */
export const MakeupTipsView: React.FC = () => {
  const [selected, setSelected] = useState<(typeof tips)[number] | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('همه');

  const filteredTips = useMemo(() => {
    const needle = query.trim();
    return tips.filter((tip) => {
      const matchesCategory = category === 'همه' || tip.category === category;
      const matchesQuery = !needle || `${tip.title} ${tip.category} ${tip.text}`.includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <div className="pb-[calc(var(--safe-bottom)+220px)] pt-3 px-4 max-w-lg mx-auto space-y-4">
      <div className="p-5 rounded-[2rem] bg-gradient-to-br from-[#fff3e8] to-[#f3efff] border border-[#f0dfd2] space-y-2">
        <div className="flex items-center gap-2 text-[#263b56]">
          <Brush className="w-5 h-5" />
          <h2 className="text-lg font-black">ترفندهای آرایش</h2>
        </div>
        <p className="text-sm leading-7 text-slate-600">روش‌های کوتاه، طبیعی و قابل انجام. قرار نیست برای یک آرایش ساده، کیف پر از ابزار داشته باشی.</p>
      </div>

      {/* فیلتر: جستجو + دسته‌بندی، هم‌ساختار با فیلتر بخش «مقالات» در پایگاه دانش. */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-4 top-3.5 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی ترفند آرایش"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pr-11 pl-4 text-sm font-bold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${category === item ? 'bg-[#263b56] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filteredTips.length === 0 && (
        <div className="p-6 rounded-[1.4rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500">
          ترفندی با این فیلتر پیدا نشد.
        </div>
      )}

      <div className="relative pr-10">
        <div className="absolute right-3 top-3 bottom-3 border-r-2 border-dashed border-rose-200 dark:border-rose-900" />
        <div className="space-y-4">
          {filteredTips.map((tip, index) => (
            <div key={tip.title} className="relative">
              <span className="absolute right-[-42px] top-5 z-10 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center ring-4 ring-[#faf8f5] dark:ring-slate-950">
                {toPersianDigits(index + 1)}
              </span>
              <button
                onClick={() => setSelected(tip)}
                className="w-full text-right rounded-[1.4rem] ml-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 pr-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-rose-600">
                    <Tag className="w-3.5 h-3.5" />
                    {tip.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    نیم دقیقه
                  </span>
                </div>
                <img src={tip.image} alt="" className="mt-3 w-full h-32 rounded-xl object-cover" loading="lazy" />
                <h3 className="mt-3 text-base font-black text-[#263b56] dark:text-white leading-7">{tip.title}</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400 line-clamp-2">{tip.text}</p>
                <span className="block mt-3 text-xs font-bold text-rose-600">خواندن ترفند کامل</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* با createPortal مستقیم به document.body — وگرنه داخل کانتینر fixed z-20 بخش گیر
          می‌افتد و با وجود z-50 باز هم زیر هدر/نوبار پایین (بیرون از آن کانتینر) دیده می‌شود. */}
      {selected && createPortal(
        <div className="fixed inset-0 z-50 bg-[#20334d]/45 flex items-center justify-center p-4">
          <article className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[2rem] bg-[#fffdf9] dark:bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-rose-600">{selected.category}</span>
                <h2 className="mt-1 text-xl font-black text-[#263b56] dark:text-white leading-8">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={selected.image} alt="" className="mt-4 w-full h-44 rounded-2xl object-cover" />
            <p className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-bold leading-8 text-slate-700 dark:text-slate-200 flex gap-2">
              <Sparkles className="w-4 h-4 mt-1 text-amber-500 shrink-0" />
              <span>{selected.text}</span>
            </p>
            {selected.note && (
              <p className="mt-3 text-xs leading-6 text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">{selected.note}</p>
            )}
            <button onClick={() => setSelected(null)} className="mt-5 mb-1 w-full rounded-2xl bg-[#263b56] py-3 text-sm font-bold text-white">بستن</button>
          </article>
        </div>,
        document.body,
      )}
    </div>
  );
};

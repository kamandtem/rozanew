import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { toPersianDigits } from '../../services/jalali';

interface IntroSlidesProps { onDone: () => void; }

/**
 * سه اسلاید معرفی.
 *
 * تصویرها از پوشه assets/onboarding می‌آیند (نسخه‌ی اصلی و رنگی، نه
 * رنگ‌آمیزی‌شده با پالت برند که کاراکترها را کدر می‌کرد).
 *
 * جانمایی نوار بالا و دکمه پایین:
 * قبلاً «min-h-screen» به‌کار رفته بود که روی اندروید (به‌خصوص وقتی
 * ناوبری با ژست است) ارتفاع واقعی صفحه را درست محاسبه نمی‌کند و دکمه‌ی
 * پایین را عملاً به لبه‌ی صفحه می‌چسباند و «رد کردن» را هم پایین‌تر از
 * حد انتظار می‌کشید. با «100dvh» + پدینگ صریح (safe-area + حداقل چند
 * پیکسل ثابت) به‌جای اتکای کامل به safe-area، هم نوار بالا در گوشه
 * می‌نشیند (نه چسبیده به نوار وضعیت، نه خیلی پایین) و هم دکمه‌ی پایین
 * از لبه صفحه فاصله واضح دارد.
 */
const slides = [
  { title: 'مراقبت را ساده شروع کن', text: 'رزا با چند سؤال کوتاه، روتینی متناسب با پوست و سبک زندگی تو می‌سازد.', image: '/assets/onboarding/intro-b.svg' },
  { title: 'الگوی پوستت را بشناس', text: 'اگر خواستی چرخه و علائمت را ثبت کن تا الگوی واقعی بدنت را ببینی.', image: '/assets/onboarding/intro-c.svg' },
  { title: 'همه مراقبت‌ها یک‌جا', text: 'محصولات، نوبت‌های آرایشگاه و پزشک، عکس‌ها و آموزش‌های کوتاه در یک مسیر.', image: '/assets/onboarding/skincare-bro.svg' },
];

export const IntroSlides: React.FC<IntroSlidesProps> = ({ onDone }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const finish = () => { localStorage.setItem('roza_intro_seen_v4', '1'); onDone(); };

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-[#fffdf7] overflow-hidden">
      {/* نوار بالا: با کمترین فاصله ممکن از گوشه واقعی صفحه (فقط safe-area، بدون کف
          ثابت زیاد) تا واقعاً در گوشه بنشیند، نه پایین‌تر از آن. */}
      <header
        className="w-full max-w-md mx-auto flex items-center justify-between shrink-0 px-2.5"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 2px)', paddingBottom: '2px' }}
      >
        <span className="text-sm font-black text-[#263b56]">
          معرفی رزا <span className="text-slate-400 font-bold">({toPersianDigits(index + 1)} از {toPersianDigits(slides.length)})</span>
        </span>
        <button onClick={finish} className="text-xs font-bold text-slate-500 py-1.5 px-1">رد کردن</button>
      </header>

      {/* محتوای اسلاید در میانه‌ی فضای باقی‌مانده، وسط‌چین. overflow-y-auto تا در صفحه‌های کوتاه چیزی به کنترل‌های پایین فشار نیاورد */}
      <section className="flex-1 min-h-0 w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-5 text-center px-5 overflow-y-auto">
        <div className="h-[260px] w-full flex items-center justify-center overflow-hidden shrink-0">
          <img src={slide.image} alt="تصویرسازی معرفی رزا" className="h-full w-full object-contain" />
        </div>
        <div className="space-y-2 px-1">
          <h1 className="text-xl font-black text-[#20334d] leading-8">{slide.title}</h1>
          <p className="text-sm leading-7 text-slate-600">{slide.text}</p>
        </div>
      </section>

      {/* نقطه‌ها و دکمه‌ها: با فاصله‌ی واضح از لبه‌ی پایین صفحه، نه چسبیده به آن.
          روی گوشی‌های اندرویدی با ناوبری سه‌دکمه‌ای (خانه/برگشت/برنامه‌های اخیر)،
          env(safe-area-inset-bottom) معمولاً صفر برمی‌گردد چون آن نوار به‌شکل
          قابل‌اتکایی مثل خط خانه‌ی آیفون گزارش نمی‌شود؛ به همین دلیل یک فاصله‌ی
          ثابت و بزرگ (نه فقط safe-area) اضافه شده تا دکمه همیشه بالاتر از آن
          سه دکمه بماند. */}
      <div
        className="w-full max-w-md mx-auto space-y-5 shrink-0 px-5 pt-6"
        style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 20px) + 64px)' }}
      >
        <div className="flex justify-center gap-2">{slides.map((item, itemIndex) => <span key={item.title} className={`h-2 rounded-full transition-all ${itemIndex === index ? 'w-8 bg-[#c47b62]' : 'w-2 bg-[#ddcfc0]'}`} />)}</div>
        <div className="flex items-center gap-3">
          {index > 0 && <button onClick={() => setIndex((value) => value - 1)} className="rounded-2xl bg-[#f1ece6] px-5 py-3.5 text-sm font-bold text-[#40506a]">قبلی</button>}
          <button onClick={() => (isLast ? finish() : setIndex((value) => value + 1))} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#263b56] py-3.5 text-sm font-bold text-white shadow-md">
            {isLast ? <><Check className="h-4 w-4" /> شروع</> : <>مرحله بعد <ArrowLeft className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </main>
  );
};

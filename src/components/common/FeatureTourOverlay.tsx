import React, { useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
export type TourKey = 'home' | 'routine' | 'cycle' | 'products' | 'progress' | 'salon' | 'clinic' | 'knowledge' | 'makeup';
interface Props { tourKey: TourKey; onDone: () => void; }
const copy: Record<TourKey, { title: string; text: string }> = {
  home: { title: 'اینجا خانه رزا است', text: 'پیشنهاد امروز، ثبت سریع و وضعیت پوستت را یک‌جا می‌بینی.' },
  routine: { title: 'روتین امروز', text: 'هر گام را انجام دادی تیک بزن؛ ثبت‌ها ذخیره می‌شوند.' },
  cycle: { title: 'چرخه ماهانه', text: 'روز پریود و علائم را ثبت کن تا الگوی شخصی‌ات ساخته شود.' },
  products: { title: 'قفسه محصولات', text: 'محصولاتت را اضافه کن و ترکیبات فعال را از داخل فهرست انتخاب کن.' },
  progress: { title: 'پیشرفت واقعی', text: 'تقویم و آمار فقط از ثبت‌های واقعی خودت ساخته می‌شوند.' },
  salon: { title: 'نوبت‌های زیبایی', text: 'نوبت را ثبت کن تا رزا مراقبت قبل و بعد را یادآوری کند.' },
  clinic: { title: 'پرونده پزشک', text: 'ویزیت، دارو و یادداشت‌ها را مرتب نگه دار. رزا جای پزشک نیست.' },
  knowledge: { title: 'مقالات کوتاه', text: 'اول خلاصه ساده را بخوان، جزئیات علمی را فقط در صورت نیاز باز کن.' },
  makeup: { title: 'ترفندهای آرایش', text: 'ترفندهای کوتاه و قابل انجام برای لب، چشم، گونه و ناخن.' },
};
export const FeatureTourOverlay: React.FC<Props> = ({ tourKey, onDone }) => {
  useEffect(() => { const timer = window.setTimeout(onDone, 6500); return () => window.clearTimeout(timer); }, [onDone]);
  const finish = () => { localStorage.setItem(`roza_tour_${tourKey}_v1`, '1'); onDone(); };
  return <div className="fixed inset-0 z-[60] pointer-events-none"><div className="absolute inset-0 bg-[#20334d]/10" /><div className="pointer-events-auto absolute bottom-24 left-5 right-5 mx-auto max-w-md rounded-[1.7rem] bg-[#fffdf9] p-5 shadow-2xl border border-[#f0e5d6] dark:bg-slate-900 dark:border-slate-800"><div className="flex items-start gap-3"><span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></span><div className="flex-1"><h2 className="text-base font-black text-[#263b56] dark:text-white">{copy[tourKey].title}</h2><p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy[tourKey].text}</p></div></div><button onClick={finish} className="mt-4 w-full rounded-2xl bg-[#263b56] py-3 text-sm font-bold text-white flex items-center justify-center gap-2"><Check className="w-4 h-4" /> فهمیدم</button></div></div>;
};

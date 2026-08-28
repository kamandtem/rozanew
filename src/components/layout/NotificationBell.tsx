import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Egg, Moon, Sparkles, Sun, X } from 'lucide-react';
import { LocalDB } from '../../services/db';
import { getTodayCycleState } from '../../services/cycle/cycleService';
import { getUpcomingAppointments } from '../../services/providers/appointmentService';
import { getCachedWeather } from '../../services/weatherService';
import { getTodayIsoDate, getDaysDifference, toPersianDigits } from '../../services/jalali';
import type { DailyTrackerEntry } from '../../types';
import type { NavTab } from './BottomNavigation';
import type { SectionKey } from '../../App';

interface Props { todayLog: DailyTrackerEntry; onNavigateTab: (tab: NavTab) => void; onOpenSection: (section: SectionKey) => void; onFocusSunscreenCard: () => void; }
interface Notice { id: string; text: string; icon: React.ElementType; action: () => void; }

/** زنگوله واقعی: فقط یادآوری‌های قابل اقدام را نشان می‌دهد، نه تاریخ و دما. */
export const NotificationBell: React.FC<Props> = ({ todayLog, onNavigateTab, onOpenSection, onFocusSunscreenCard }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const user = LocalDB.getUserState();
  const notices: Notice[] = [];
  const appointments = getUpcomingAppointments(3);
  const providers = LocalDB.getProviders();
  const today = getTodayIsoDate();

  appointments.slice(0, 2).forEach((appointment) => {
    const days = getDaysDifference(today, appointment.dateIso);
    if (days <= 3) notices.push({ id: appointment.id, text: `${days === 0 ? 'امروز' : `${toPersianDigits(days)} روز دیگر`} نوبت ${providers.find((p) => p.id === appointment.providerId)?.name || ''}`, icon: CalendarClock, action: () => onOpenSection(appointment.providerKind === 'salon' ? 'salon' : 'clinic') });
  });

  if (user.cycleConfig.enabled && !user.privacy.hideCycleSection && !user.profile.isPregnant) {
    const cycle = getTodayCycleState(user.cycleConfig);
    if (cycle.available) {
      if (cycle.inPmsWindow) {
        notices.push({ id: 'pms', text: 'برای روزهای پیش از قاعدگی، روتین ملایم‌تری را ببین', icon: Moon, action: () => onOpenSection('cycle') });
      } else if (cycle.pmsStartIso && getDaysDifference(today, cycle.pmsStartIso) === 1) {
        notices.push({ id: 'pms-tomorrow', text: 'از فردا احتمالاً وارد بازه پیش از قاعدگی می‌شوی', icon: Moon, action: () => onOpenSection('cycle') });
      }

      if (cycle.phase === 'ovulation') {
        notices.push({ id: 'ovulation', text: 'الان احتمالاً در فاز تخمک‌گذاری هستی؛ مراقب باش', icon: Egg, action: () => onOpenSection('cycle') });
      }

      if (cycle.predictedPeriodStartIso && getDaysDifference(today, cycle.predictedPeriodStartIso) === 1 && cycle.confidence !== 'none') {
        notices.push({ id: 'period-tomorrow', text: 'به احتمال زیاد فردا پریودت شروع می‌شود', icon: Moon, action: () => onOpenSection('cycle') });
      }
    }
  }

  const weather = getCachedWeather();
  /*
   * وقتی کاربر از همین کارت (یا از کارت «ثبت سریع امروز» در پنل خانه)
   * ضدآفتاب زدنش را ثبت کند، todayLog.usedSunscreen به true تغییر
   * می‌کند و همین شرط باعث می‌شود این یادآوری خودش از زنگوله حذف شود —
   * چون واقعاً انجام شده، نه چون یک پرچم جدا و جدا از داده‌ی واقعی
   * «دیده‌شده» علامت خورده.
   */
  if (weather?.hasData && !weather.isStale && weather.uvIndex >= 6 && !todayLog.usedSunscreen) {
    notices.push({
      id: 'uv',
      text: `شاخص یووی${weather.city ? ` در ${weather.city}` : ''} امروز بالاست؛ ضدآفتاب را تجدید کن`,
      icon: Sun,
      // به کارت «ثبت سریع امروز» در پنل خانه می‌برد و مستقیم روی دکمه ضدآفتاب فوکوس می‌کند
      action: onFocusSunscreenCard,
    });
  }

  const products = LocalDB.getProducts();
  if (products.length === 0) notices.push({ id: 'products', text: 'محصولاتت را اضافه کن تا روتین شخصی‌تر شود', icon: Sparkles, action: () => onOpenSection('products') });

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return <div ref={rootRef} className="relative">
    <button onClick={() => setOpen((value) => !value)} aria-label="یادآوری‌ها" className="icon-only relative p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-[#23334b] dark:text-slate-200 border border-slate-100 dark:border-slate-700">
      <Bell className="w-5 h-5" />
      {notices.length > 0 && <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900">{notices.length > 9 ? '۹+' : toPersianDigits(notices.length)}</span>}
    </button>
    {open && <div dir="rtl" className="absolute left-0 top-[calc(100%+10px)] z-50 w-80 max-w-[85vw] rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800"><strong className="text-sm font-black text-slate-800 dark:text-white">یادآوری‌های رزا</strong><button onClick={() => setOpen(false)} className="icon-only p-1.5 rounded-lg text-slate-400"><X className="w-4 h-4" /></button></div>
      <div className="p-2 max-h-80 overflow-y-auto">{notices.length === 0 ? <div className="py-7 text-center text-sm font-bold text-slate-500"><CheckCircle2 className="mx-auto mb-2 w-7 h-7 text-emerald-500" />فعلاً یادآوری‌ای نداری</div> : notices.map((notice) => { const Icon = notice.icon; return <button key={notice.id} onClick={() => { notice.action(); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-right hover:bg-slate-50 dark:hover:bg-slate-800"><span className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span><span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-6">{notice.text}</span></button>; })}</div>
    </div>}
  </div>;
};

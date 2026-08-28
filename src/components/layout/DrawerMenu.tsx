import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Camera, ChevronDown, Droplet, FlaskConical, GraduationCap, Moon, Package, Scissors, Settings, ShoppingBag, Sparkles, Stethoscope, Sun } from 'lucide-react';
import { UserState } from '../../types';
import { isFeatureEnabled } from '../../config/appConfig';
import { INGREDIENTS_DATABASE } from '../../services/content/ingredients';
import { toPersianDigits } from '../../services/jalali';
import { GuideBadge } from '../guide/GuideBadge';
import type { SectionKey } from '../../App';
import type { NavTab } from './BottomNavigation';

interface Props { isOpen: boolean; onClose: () => void; userState: UserState; cycleVisible: boolean; onNavigateTab: (tab: NavTab) => void; onOpenSection: (key: SectionKey) => void; onToggleTheme: () => void; }
const INSTAGRAM_URL = 'https://www.instagram.com/roza_app'; const TELEGRAM_URL = 'https://t.me/roza_app';

const InstagramGlyph = ({ className = '' }: { className?: string }) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" /></svg>;
const TelegramGlyph = ({ className = '' }: { className?: string }) => <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M21.8 4.5 3.2 11.7c-1 .4-1 1 .1 1.3l4.7 1.5 1.8 5.7c.2.6.4.8.8.8.3 0 .5-.1.7-.3l2.5-2.4 4.9 3.6c.7.4 1.2.2 1.4-.6l3.1-14.4c.3-1-.4-1.5-1.4-1.4zM8.6 14.2l9.8-6.1c.5-.3.9-.1.5.2L10.5 15l-.3 3.4-1.6-4.2z" /></svg>;

/**
 * منوی اصلی.
 *
 * «خانه» و «روتین امروز» از این منو حذف شدند — هر دو همیشه از نوبار پایین
 * یک کلیک فاصله دارند، پس تکرارشان اینجا فقط منو را شلوغ می‌کرد.
 *
 * فهرست زیر سه دستهٔ سرتیتردار دارد (الگو از عکس مرجع): «راهنما» (فقط
 * راهنمای استفاده از رزا)، «خدمات» (چرخه، قفسه محصولات، آرایشگاه، پزشک،
 * عکس‌ها و پیشرفت) و «آموزش» (آکاردئونی؛ ماسک‌ها، ترفندهای آرایش، ترکیبات،
 * مقالات). فلش تاشدنی فقط روی «آموزش» می‌ماند چون زیرمجموعه دارد؛ بقیهٔ
 * ردیف‌ها فلش ندارند و به‌جایش با رنگ‌گرفتن هنگام لمس (active:) بازخورد
 * می‌دهند.
 */
export const DrawerMenu: React.FC<Props> = ({ isOpen, onClose, userState, cycleVisible, onNavigateTab, onOpenSection, onToggleTheme }) => {
  const drawerRef = useRef<HTMLElement>(null); const touchRef = useRef<{ x: number; y: number } | null>(null); const [dragX, setDragX] = useState(0); const [dragging, setDragging] = useState(false);
  const [eduOpen, setEduOpen] = useState(false);
  const eduSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);
  // وقتی «آموزش» باز می‌شود، منو خودش به‌سمت آن اسکرول می‌کند تا کاربر بلافاصله
  // زیرمجموعه‌ها را ببیند و فکر نکند این یک دکمه‌ی بی‌اثر است.
  useEffect(() => {
    if (!eduOpen) return;
    const timer = setTimeout(() => { eduSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    return () => clearTimeout(timer);
  }, [eduOpen]);
  useEffect(() => { if (!isOpen) setEduOpen(false); }, [isOpen]);
  const goTab = (tab: NavTab) => { onNavigateTab(tab); onClose(); }; const goSection = (key: SectionKey) => { onOpenSection(key); onClose(); };
  const handleStart = (e: React.TouchEvent) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; };
  const handleMove = (e: React.TouchEvent) => { if (!touchRef.current) return; const t = e.touches[0]; const dx = t.clientX - touchRef.current.x; const dy = t.clientY - touchRef.current.y; if (Math.abs(dx) > Math.abs(dy) && dx > 8) { setDragging(true); setDragX(dx); } };
  const handleEnd = () => { if (dragX > (drawerRef.current?.offsetWidth || 320) * 0.28) onClose(); setDragX(0); setDragging(false); touchRef.current = null; };

  const guideItem = { label: 'راهنمای استفاده از رزا', desc: 'راهنمای استفاده از برنامه', icon: GraduationCap, click: () => goSection('guide') };

  const serviceItems = [
    ...(cycleVisible ? [{ label: 'چرخه ماهانه من', desc: 'ثبت پریود و علائم', icon: Moon, click: () => goSection('cycle') }] : []),
    { label: 'قفسه محصولات', desc: 'محصولات و تاریخ انقضا', icon: Package, click: () => goSection('products') },
    { label: 'آرایشگاه و نوبت‌ها', desc: 'خدمات زیبایی و یادآوری', icon: Scissors, click: () => goSection('salon') },
    { label: 'پزشک و پرونده پوست', desc: 'ویزیت، دارو و یادداشت', icon: Stethoscope, click: () => goSection('clinic') },
    { label: 'عکس‌ها و پیشرفت', desc: 'تقویم و عکس‌های خصوصی', icon: Camera, click: () => goSection('photo') },
  ];

  const itemBtnClass = 'group w-full min-h-[56px] rounded-2xl px-2.5 py-1.5 flex items-center gap-2.5 text-right transition-colors active:bg-[#eef3fa] dark:active:bg-slate-800/80';
  const itemIconBase = 'rounded-xl bg-[#f1f5fb] dark:bg-slate-800 text-[#93a5bb] flex items-center justify-center shrink-0 transition-colors group-active:bg-[#dde8f7] dark:group-active:bg-slate-700 group-active:text-[#22344e] dark:group-active:text-white';
  const itemIconClass = `w-9 h-9 ${itemIconBase}`;
  const itemIconClassSm = `w-8 h-8 ${itemIconBase}`;
  const sectionHeaderClass = 'px-2 pb-1.5 text-[11px] font-black text-[#a3b0c2] dark:text-slate-500 tracking-wide';

  const educationItems = [
    { label: 'ماسک‌های پوستی', desc: 'انواع ماسک‌های پوستی', icon: Droplet, click: () => goSection('masks') },
    { label: 'ترفندهای آرایش', desc: 'رژ لب، خط چشم، رژگونه و لاک', icon: Sparkles, click: () => goSection('makeup') },
    { label: 'ترکیبات و تداخل‌سنج', desc: `${toPersianDigits(INGREDIENTS_DATABASE.length)} ترکیب ثبت‌شده`, icon: FlaskConical, click: () => goSection('lab') },
    { label: 'مقالات کوتاه', desc: 'دانش کاربردی پوست و مو', icon: BookOpen, click: () => goSection('knowledge') },
  ];

  return <AnimatePresence>{isOpen && <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-[#23334b]/35" /><motion.aside ref={drawerRef} onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd} style={dragging ? { transform: `translateX(${dragX}px)`, transition: 'none' } : undefined} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }} className="fixed top-[calc(var(--safe-top)+12px)] bottom-[calc(var(--safe-bottom)+12px)] right-0 z-50 w-80 max-w-[85vw] rounded-[28px] bg-[#fffdfb] dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden border border-white dark:border-slate-800 touch-pan-y">
    <div className="overflow-y-auto flex-1">
      <div className="sticky top-0 z-20 p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-[#fffdfb] dark:bg-slate-900"><div className="flex items-center gap-2.5 text-right">
        <button onClick={() => goSection('profile')} aria-label="پروفایل" className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-[#fff0d8] dark:bg-amber-950/40 border-2 border-[#f2ba61] flex items-center justify-center text-3xl overflow-hidden">{userState.profile.avatarUrl?.startsWith('data:') ? <img src={userState.profile.avatarUrl} alt="" className="w-full h-full object-cover" /> : userState.profile.avatarUrl || '🌸'}</div>
          <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-500 text-white shadow-md ring-2 ring-[#fffdfb] dark:ring-slate-900"><Camera className="w-3 h-3" /></span>
        </button>

        <div role="button" tabIndex={0} onClick={() => goSection('profile')} onKeyDown={(event) => { if (event.key === 'Enter') goSection('profile'); }} className="flex-1 min-w-0 flex flex-col justify-end gap-1 items-start text-right cursor-pointer py-0.5">
          <p className="text-[12px] leading-tight text-slate-500 dark:text-slate-400">روز بخیر 🌹</p>
          <h2 className="text-[17px] font-black text-[#17263b] dark:text-white truncate leading-tight w-full">{userState.profile.name || 'کاربر رزا'}</h2>
          <div onClick={(event) => event.stopPropagation()}><GuideBadge onClick={() => goSection('guide')} /></div>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-1.5"><button onClick={() => goSection('profile')} aria-label="تنظیمات" className="icon-only p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500"><Settings className="w-[18px] h-[18px]" /></button><button onClick={onToggleTheme} aria-label="تغییر تم" className="icon-only p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-indigo-300">{userState.themeMode === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}</button></div>
      </div></div>
      <div className="px-3 py-3 space-y-4">
        <div>
          <p className={sectionHeaderClass}>راهنما</p>
          <div className="space-y-1">
            <button onClick={guideItem.click} className={itemBtnClass}><span className={itemIconClass}><guideItem.icon className="w-4 h-4" /></span><span className="flex-1 min-w-0"><strong className="block text-[13px] font-black text-[#26384f] dark:text-white">{guideItem.label}</strong><small className="block text-[10px] text-slate-400 mt-0.5">{guideItem.desc}</small></span></button>
          </div>
        </div>

        <div>
          <p className={sectionHeaderClass}>خدمات</p>
          <div className="space-y-1">
            {serviceItems.map(({ label, desc, icon: Icon, click }) => <button key={label} onClick={click} className={itemBtnClass}><span className={itemIconClass}><Icon className="w-4 h-4" /></span><span className="flex-1 min-w-0"><strong className="block text-[13px] font-black text-[#26384f] dark:text-white">{label}</strong><small className="block text-[10px] text-slate-400 mt-0.5">{desc}</small></span></button>)}
          </div>
        </div>

        <div ref={eduSectionRef}>
          <p className={sectionHeaderClass}>آموزش</p>
          {/* دسته آموزش — آکاردئونی؛ چون زیرمجموعه دارد، فلش تاشدنی نگه داشته می‌شود */}
          <div className="rounded-2xl overflow-hidden">
            <button onClick={() => setEduOpen((value) => !value)} className={itemBtnClass}>
              <span className={itemIconClass}><BookOpen className="w-4 h-4" /></span>
              <span className="flex-1 min-w-0"><strong className="block text-[13px] font-black text-[#26384f] dark:text-white">آموزش</strong><small className="block text-[10px] text-slate-400 mt-0.5">ماسک، آرایش، ترکیبات و مقالات</small></span>
              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${eduOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {eduOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="pr-4 pt-1 pb-1 space-y-1">
                    {educationItems.map(({ label, desc, icon: Icon, click }) => <button key={label} onClick={click} className={itemBtnClass}><span className={itemIconClassSm}><Icon className="w-3.5 h-3.5" /></span><span className="flex-1 min-w-0"><strong className="block text-[12.5px] font-black text-[#26384f] dark:text-white">{label}</strong><small className="block text-[10px] text-slate-400 mt-0.5">{desc}</small></span></button>)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {isFeatureEnabled('shop') && <button onClick={onClose} className={itemBtnClass}><span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0"><ShoppingBag className="w-4 h-4" /></span><strong className="text-[13px] font-black">فروشگاه رزا</strong></button>}
      </div>
    </div>
    <div className="border-t border-slate-100 dark:border-slate-800 px-4 pt-3 pb-3">
      <div className="flex items-center justify-center gap-2">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام رزا" className="icon-only w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"><InstagramGlyph className="w-5 h-5" /></a>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="تلگرام رزا" className="icon-only w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"><TelegramGlyph className="w-5 h-5" /></a>
      </div>
      <p className="mt-1.5 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">ما را در شبکه‌های اجتماعی دنبال کنید</p>
    </div>
  </motion.aside></>}</AnimatePresence>;
};

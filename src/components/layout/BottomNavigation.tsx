import React from 'react';
import { Home, CheckCircle2, Moon, TrendingUp, Plus } from 'lucide-react';
import { motion } from 'motion/react';

export type NavTab = 'home' | 'routine' | 'cycle' | 'progress';
interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** اگر داده شود، یک دکمه‌ی دایره‌ای جدا کنار «خانه» نمایش داده می‌شود (الگوی مرجع). */
  onFabClick?: () => void;
  fabLabel?: string;
}

/**
 * نوبار پایین با الگوی مرجع: کپسول سفید برای تب‌ها، و یک دکمه‌ی دایره‌ای
 * کاملاً جدا (نه داخل کپسول) که همیشه کنار تب «خانه» می‌نشیند.
 * چون اپ راست‌به‌چپ است، اولین فرزند فلکس در راست‌ترین نقطه رندر می‌شود؛
 * بنابراین دایره‌ی شناور را پیش از کپسول قرار می‌دهیم تا دقیقاً کنار «خانه» بیفتد.
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange, onFabClick, fabLabel }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'خانه', icon: Home },
    { id: 'routine' as NavTab, label: 'روتین', icon: CheckCircle2 },
    { id: 'cycle' as NavTab, label: 'سیکل', icon: Moon },
    { id: 'progress' as NavTab, label: 'پیشرفت', icon: TrendingUp },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(var(--safe-bottom)+1rem)] pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto flex items-center gap-3">
        {onFabClick && (
          <button
            type="button"
            onClick={onFabClick}
            aria-label={fabLabel || 'افزودن'}
            className="shrink-0 w-14 h-14 rounded-full bg-[#263b56] dark:bg-white text-white dark:text-[#263b56] shadow-[0_10px_26px_rgba(38,59,86,.35)] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={2.4} />
          </button>
        )}
        <nav className="flex-1 min-w-0 rounded-[2rem] bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(39,55,82,0.14)] p-2 flex items-center gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`relative flex-1 min-h-[52px] rounded-[1.35rem] flex flex-col items-center justify-center gap-0.5 text-sm font-bold transition-colors ${active ? 'text-[#22344e] dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {active && <motion.div layoutId="nav-active" className="absolute inset-0 rounded-[1.35rem] bg-[#eef3fa] dark:bg-slate-800" transition={{ duration: 0.22 }} />}
                <Icon className="relative z-10 w-5 h-5" strokeWidth={active ? 2.6 : 2} />
                <span className="relative z-10 text-xs">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

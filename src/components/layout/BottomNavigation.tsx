import React, { useState } from 'react';
import { Home, CheckCircle2, Moon, TrendingUp, Plus, FlaskConical, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type NavTab = 'home' | 'routine' | 'cycle' | 'progress';

export interface FabAction {
  key: string;
  labelFa: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** رنگ چیپ آیکون؛ اگر ندهی، رنگ پیش‌فرض FAB استفاده می‌شود. */
  accentClass?: string;
  onClick: () => void;
}

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /**
   * اگر داده شود، دکمه‌ی دایره‌ای FAB نمایش داده می‌شود و با اولین تپ،
   * به‌جای اجرای مستقیم یک عمل، یک Floating Action Menu با این گزینه‌ها باز
   * می‌شود (الگوی iOS speed-dial). حداقل یک گزینه لازم است.
   */
  fabActions?: FabAction[];
}

/** Easing نرم و «iOS-ای» — همان منحنی که DrawerMenu.tsx برای کشوی کناری استفاده می‌کند. */
const PREMIUM_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * نوبار پایین با الگوی مرجع: کپسول سفید برای تب‌ها، و یک دکمه‌ی دایره‌ای
 * کاملاً جدا (نه داخل کپسول) که همیشه کنار تب «خانه» می‌نشیند.
 * چون اپ راست‌به‌چپ است، اولین فرزند فلکس در راست‌ترین نقطه رندر می‌شود؛
 * بنابراین دایره‌ی شناور را پیش از کپسول قرار می‌دهیم تا دقیقاً کنار «خانه» بیفتد.
 *
 * با React.memo پیچیده شده: قبلاً با هر تغییر state بی‌ربط در بالای درخت
 * (مثلاً هر تپ روی گزینه‌های «امروز چه چیزی روی پوستت دیدی؟» که todayLog را
 * در App به‌روزرسانی می‌کند)، کل اپ و در نتیجه همین کامپوننت هم دوباره رندر
 * می‌شد؛ چون motion.div با layoutId="nav-active" روی هر رندر دوباره اندازه‌گیری
 * می‌شود، آیکون/کپسول «خانه» یک لرزش یا جابه‌جایی محسوس داشت، انگار خودش
 * «تغییر می‌کرد». حالا با memo + هندلرهای پایدار (useCallback در App)، این
 * کامپوننت فقط وقتی activeTab یا خود هندلرها واقعاً عوض شوند رندر می‌شود.
 *
 * FAB (قبلاً): با یک تپ مستقیم وارد «افزودن به روتین پوستی» می‌شد — یعنی
 * گزینه‌ی «افزودن محصول» عملاً از این دکمه غیرقابل‌دسترس بود. حالا اولین تپ
 * فقط یک منوی دو-گزینه‌ای شیشه‌ای باز می‌کند (محصول پوستی / به روتین پوستی)
 * و خودِ صفحات مقصد (ProductShelf، PersonalRoutineView) دست‌نخورده مانده‌اند —
 * فقط مسیر ورود عوض شده، نه چیزی داخل آن صفحات.
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = React.memo(({ activeTab, onTabChange, fabActions }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'home' as NavTab, label: 'خانه', icon: Home },
    { id: 'routine' as NavTab, label: 'روتین', icon: CheckCircle2 },
    { id: 'cycle' as NavTab, label: 'سیکل', icon: Moon },
    { id: 'progress' as NavTab, label: 'پیشرفت', icon: TrendingUp },
  ];

  const hasMenu = !!fabActions && fabActions.length > 0;
  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);
  const runAction = (action: FabAction) => {
    // اول منو با انیمیشن خروج بسته شود، بعد صفحه مقصد باز شود — همزمانی این
    // دو باعث می‌شد بسته‌شدن منو وسط جابه‌جایی صفحه قطع/پرش بخورد.
    closeMenu();
    action.onClick();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(var(--safe-bottom)+1rem)] pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto flex items-center gap-3">
        {hasMenu && (
          <div className="relative shrink-0">
            {/* بک‌دراپ: تپ روی فضای خالی، منو را می‌بندد. */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={closeMenu}
                  className="fixed inset-0 z-40 bg-[#20334d]/20 backdrop-blur-[2px]"
                />
              )}
            </AnimatePresence>

            {/* گزینه‌های منو — بالای FAB، ردیفی و مرحله‌ای ظاهر می‌شوند. */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial="closed"
                  animate="open"
                  exit="closed"
                  variants={{ open: { transition: { staggerChildren: 0.045 } }, closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } } }}
                  className="absolute z-50 bottom-[calc(100%+14px)] right-0 flex flex-col items-end gap-3"
                >
                  {fabActions!.map((action) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.key}
                        type="button"
                        onClick={() => runAction(action)}
                        variants={{
                          closed: { opacity: 0, scale: 0.7, y: 14 },
                          open: { opacity: 1, scale: 1, y: 0 },
                        }}
                        transition={{ duration: 0.24, ease: PREMIUM_EASE }}
                        className="flex items-center gap-3 active:scale-95 transition-transform"
                      >
                        <span className="whitespace-nowrap text-sm font-bold text-[#263b56] dark:text-white bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/70 dark:border-slate-700/70 shadow-[0_8px_24px_rgba(38,59,86,.16)]">
                          {action.labelFa}
                        </span>
                        <span
                          className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center shadow-[0_10px_24px_rgba(38,59,86,.28)] border border-white/40 ${action.accentClass || 'bg-[#263b56] dark:bg-white'}`}
                        >
                          <Icon className={`w-5 h-5 ${action.accentClass ? 'text-white' : 'text-white dark:text-[#263b56]'}`} strokeWidth={2.3} />
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={toggleMenu}
              aria-label={menuOpen ? 'بستن منو' : 'افزودن'}
              aria-expanded={menuOpen}
              animate={{ rotate: menuOpen ? 135 : 0 }}
              transition={{ duration: 0.28, ease: PREMIUM_EASE }}
              className="relative z-50 w-14 h-14 rounded-full bg-[#263b56] dark:bg-white text-white dark:text-[#263b56] shadow-[0_10px_26px_rgba(38,59,86,.35)] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" strokeWidth={2.4} />
            </motion.button>
          </div>
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
});

/** آیکون‌های پیش‌فرض دو گزینه اصلی FAB — برای استفاده در App.tsx. */
export const FAB_PRODUCT_ICON = FlaskConical;
export const FAB_ROUTINE_ICON = Sparkles;

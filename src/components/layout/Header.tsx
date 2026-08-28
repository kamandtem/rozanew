import React from 'react';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import { DailyTrackerEntry, UserState, WeatherData } from '../../types';
import { NotificationBell } from './NotificationBell';
import type { NavTab } from './BottomNavigation';
import type { SectionKey } from '../../App';

interface HeaderProps {
  userState: UserState;
  weather: WeatherData;
  todayLog: DailyTrackerEntry;
  onOpenDrawer: () => void;
  onToggleTheme: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenSection: (section: SectionKey) => void;
  onFocusSunscreenCard: () => void;
  onOpenSearch: () => void;
}
export const Header: React.FC<HeaderProps> = ({ userState, todayLog, onOpenDrawer, onToggleTheme, onNavigateTab, onOpenSection, onFocusSunscreenCard, onOpenSearch }) => {
  const isDark = userState.themeMode === 'dark';
  return <header className="!fixed !top-0 !left-0 !right-0 z-30 [transform:translateZ(0)] w-full px-4 pt-[calc(var(--safe-top)+6px)] pb-1.5 bg-[#faf8f5] dark:bg-slate-950">
    <div className="max-w-lg mx-auto h-[68px] rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_24px_rgba(39,55,82,0.08)] flex items-center justify-between gap-3 px-4">
      <button onClick={onOpenDrawer} aria-label="منوی اصلی" className="icon-only p-3 rounded-2xl bg-[#fffaf2] dark:bg-slate-800 text-[#23334b] dark:text-slate-200 border border-[#f2e4d0] dark:border-slate-700"><Menu className="w-6 h-6" /></button>
      <h1 className="flex-1 text-center text-2xl font-black text-[#17263b] dark:text-white">رزا</h1>
      <div className="flex items-center gap-1.5">
        <button onClick={onOpenSearch} aria-label="جستجوی هوشمند" className="icon-only p-3 rounded-2xl bg-[#fffaf2] dark:bg-slate-800 text-[#23334b] dark:text-slate-200 border border-[#f2e4d0] dark:border-slate-700"><Search className="w-5 h-5" /></button>
        <NotificationBell todayLog={todayLog} onNavigateTab={onNavigateTab} onOpenSection={onOpenSection} onFocusSunscreenCard={onFocusSunscreenCard} />
        <button onClick={onToggleTheme} aria-label={isDark ? 'تم روشن' : 'تم تاریک'} className="hidden icon-only p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Sun className="w-5 h-5" /></button>
      </div>
    </div>
  </header>;
};

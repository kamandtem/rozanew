import React, { useEffect } from 'react';

interface SplashScreenProps { onDone: () => void; }
/** اسپلش کوتاه و سبک برای وب، اندروید هم از تنظیمات بومی اسپلش استفاده می‌کند. */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  useEffect(() => { const timer = window.setTimeout(onDone, 900); return () => window.clearTimeout(timer); }, [onDone]);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#fff7f3] via-[#fffdf9] to-[#f8eaf1]" role="status" aria-label="در حال باز شدن رزا"><div className="flex flex-col items-center gap-4"><img src="/assets/roza-icon.png" alt="رزا" className="w-28 h-28 rounded-[2rem] shadow-xl" /><div className="text-center"><span className="block text-xl font-black text-[#263b56]">رزا</span><span className="mt-1 block text-xs text-slate-500">برنامه‌نویس: محمدرضا ارجمند</span></div></div></div>;
};

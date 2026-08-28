import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';

interface SummaryRow {
  label: string;
  value: string;
}

interface ProfileSummaryRevealProps {
  name?: string;
  rows: SummaryRow[];
  onContinue: () => void;
}

/**
 * صفحه میانی بعد از تکمیل مرحله ۵ و قبل از onComplete.
 *
 * onComplete واقعی (ورود به اپ اصلی) فقط با تپ روی دکمه اتفاق می‌افتد؛
 * finish() در OnboardingFlow فقط state را می‌سازد و ذخیره می‌کند، اما
 * صدا زدن onComplete را تا همین لحظه به تعویق می‌اندازد.
 */
export const ProfileSummaryReveal: React.FC<ProfileSummaryRevealProps> = ({ name, rows, onContinue }) => {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 32,
      origin: { y: 0.55 },
      colors: ['#8e5241', '#ca7f6a', '#f4d8ca', '#fbe3d6'],
      scalar: 0.9,
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="space-y-4 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
        className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#8e5241] to-[#ca7f6a] text-white flex items-center justify-center shadow-lg"
      >
        <Check className="w-8 h-8" />
      </motion.div>

      <h2 className="text-lg font-black text-[#2e2621] dark:text-white">
        {name ? `${name}، کارت پروفایل پوستی‌ات ساخته شد` : 'کارت پروفایل پوستی ساخته شد'}
      </h2>
      <p className="text-sm text-[#6e5d50] dark:text-slate-400 leading-relaxed">
        از این به بعد، پیشنهادهای رزا بر اساس همین اطلاعات شخصی‌سازی می‌شوند.
      </p>

      <div className="text-right p-4 rounded-2xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/60 dark:border-slate-700/60 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-[#8a766c] dark:text-slate-500 font-bold">{row.label}</span>
            <span className="text-[#3a2f27] dark:text-slate-200 font-black">{row.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3.5 rounded-2xl bg-[#8e5241] hover:bg-[#784334] text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        ورود به اپ
      </button>
    </motion.div>
  );
};

import React, { useId } from 'react';
import { motion } from 'motion/react';

interface CareProgressJarProps {
  /** عدد بین ۰ تا ۱ */
  progress: number;
}

/**
 * جایگزین نوار پیشرفت خطی قبلی: یک شیشه کِرِم که با پیشرفت onboarding
 * پر می‌شود. هماهنگ با تم اسکین‌کر اپ (به‌جای ۴ خط ساده که هیچ ارتباطی
 * با محتوا نداشت).
 *
 * علاوه بر شیشه، یک نوار نازک هم کنارش هست تا درصد پیشرفت برای کسی که
 * عجله دارد هم به‌سرعت قابل تشخیص باشد — شیشه فقط برای حس‌وحال بصری است.
 */
export const CareProgressJar: React.FC<CareProgressJarProps> = ({ progress }) => {
  const clipId = useId();
  const clamped = Math.min(1, Math.max(0, progress));

  const jarTop = 24;
  const jarBottom = 74;
  const jarHeight = jarBottom - jarTop;
  const fillHeight = jarHeight * clamped;
  const fillY = jarBottom - fillHeight;

  return (
    <div className="flex items-center gap-3">
      <svg width="34" height="44" viewBox="0 0 64 84" className="shrink-0" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x="10" y={jarTop} width="44" height={jarHeight} rx="9" />
          </clipPath>
        </defs>

        {/* درب شیشه */}
        <rect x="20" y="6" width="24" height="10" rx="3.5" fill="#8e5241" />
        <rect x="15" y="14" width="34" height="9" rx="3" fill="#a9705c" />

        {/* بدنه شیشه */}
        <rect
          x="10"
          y={jarTop}
          width="44"
          height={jarHeight}
          rx="9"
          fill="none"
          stroke="#8e5241"
          strokeWidth="2.5"
          opacity="0.5"
        />

        {/* کِرِم داخل شیشه — با پیشرفت onboarding بالا می‌آید */}
        <motion.rect
          x="10"
          width="44"
          rx="9"
          fill="#e3ac96"
          clipPath={`url(#${clipId})`}
          initial={false}
          animate={{ y: fillY, height: fillHeight }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.rect
          x="17"
          width="10"
          height="3"
          rx="1.5"
          fill="#fff"
          opacity="0.75"
          initial={false}
          animate={{ y: fillY + 4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>

      <div className="flex-1 h-1.5 rounded-full bg-white/50 dark:bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#8e5241]"
          initial={false}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

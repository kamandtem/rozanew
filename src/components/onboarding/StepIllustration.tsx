import React from 'react';
import { motion } from 'motion/react';

interface StepIllustrationProps {
  src: string;
  alt?: string;
}

/**
 * باکس تصویرسازی بالای هر مرحله onboarding.
 *
 * ارتفاع ثابت (به‌جای auto) تا با تغییر تصویر بین مراحل، کارت شیشه‌ای
 * جابه‌جا/پرش نکند — دقیقاً همان الگوی IntroSlides.tsx (h-[...] + object-contain).
 * انیمیشن fade+slide با تایمینگ نزدیک به motion.div خود مرحله هماهنگ است.
 */
export const StepIllustration: React.FC<StepIllustrationProps> = ({ src, alt }) => (
  <motion.div
    key={src}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
    className="h-[190px] w-full flex items-center justify-center overflow-hidden shrink-0"
  >
    <img src={src} alt={alt ?? ''} className="h-full w-full object-contain" draggable={false} />
  </motion.div>
);

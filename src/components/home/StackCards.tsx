import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles, Moon, Sun, Droplet, ShieldCheck, Heart } from 'lucide-react';
import { toPersianDigits } from '../../services/jalali';

export interface StackCardData {
  id: string;
  titleFa: string;
  subtitleFa: string;
  contentFa: string;
  accentColor: string;
  badgeTextFa: string;
  iconName: 'Moon' | 'Sun' | 'Sparkles' | 'Droplet';
  actionButtonTextFa?: string;
  onAction?: () => void;
}

interface StackCardsProps {
  cards: StackCardData[];
}

export const StackCards: React.FC<StackCardsProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!cards || cards.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const visibleCards = [
    cards[currentIndex],
    cards[(currentIndex + 1) % cards.length],
    cards[(currentIndex + 2) % cards.length],
  ].filter(Boolean);

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Moon':
        return <Moon className="w-4 h-4 text-purple-600 dark:text-purple-300" />;
      case 'Sun':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'Droplet':
        return <Droplet className="w-4 h-4 text-sky-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="relative w-full py-1">
      {/* Cards Deck Container */}
      <div className="relative h-64 sm:h-72 w-full flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {visibleCards.map((card, idx) => {
            const isTop = idx === 0;

            // Stack scale and offset math
            const scale = 1 - idx * 0.05;
            const translateY = idx * 14;
            const opacity = 1 - idx * 0.25;

            return (
              <motion.div
                key={`${card.id}-${currentIndex + idx}`}
                layout
                initial={{ scale: scale - 0.05, y: translateY + 20, opacity: 0 }}
                animate={{ scale, y: translateY, opacity }}
                exit={{ scale: 0.9, y: -40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="absolute inset-x-0 mx-auto max-w-lg p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 shadow-md flex flex-col justify-between cursor-pointer select-none text-right font-['Vazirmatn',sans-serif]"
                style={{
                  zIndex: 30 - idx,
                  pointerEvents: isTop ? 'auto' : 'none',
                }}
                onClick={isTop ? handleNext : undefined}
              >
                {/* Header Badge */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs">
                      {renderIcon(card.iconName)}
                      {card.badgeTextFa}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                      کارت {toPersianDigits(currentIndex + 1)} از {toPersianDigits(cards.length)}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white leading-tight mb-1">
                    {card.titleFa}
                  </h3>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2.5">
                    {card.subtitleFa}
                  </p>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    {card.contentFa}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {card.actionButtonTextFa ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (card.onAction) card.onAction();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                    >
                      <span>{card.actionButtonTextFa}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      برای کارت بعدی لمس کنید
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      aria-label="کارت قبلی"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      aria-label="کارت بعدی"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

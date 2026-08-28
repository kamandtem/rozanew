import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CycleHighlight, CycleHighlightPhase, getHighlightsForPhase } from '../../services/content/cycleHighlights';
import { RED, TEAL, ORANGE } from './CycleWheel';

interface CyclePhaseHighlightsProps {
  /**
   * فاز جاری برای هایلایت — فقط این سه مقدار هایلایت دارند. اگر کاربر در
   * هیچ‌کدام از این سه فاز نباشد (یعنی فولیکولار و خارج از بازه PMS)،
   * phase باید null باشد تا این کامپوننت اصلاً چیزی رندر نکند (نه‌فقط
   * مخفی، بلکه بدون فضای خالی) — فضا دقیقاً مثل قبل عادی می‌ماند.
   */
  phase: CycleHighlightPhase | null;
}

const PHASE_COLOR: Record<CycleHighlightPhase, string> = {
  period: RED,
  ovulation: TEAL,
  pms: ORANGE,
};

const SEEN_STORAGE_KEY = 'roza_highlight_seen_v1';

function readSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistSeenIds(ids: Set<string>) {
  localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

const SLIDE_DURATION_MS = 5000;

export const CyclePhaseHighlights: React.FC<CyclePhaseHighlightsProps> = ({ phase }) => {
  const highlights = useMemo(() => getHighlightsForPhase(phase), [phase]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => readSeenIds());
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // اگر فاز عوض شد (مثلاً از پریود به تخمک‌گذاری رسید)، اگر ویوئر باز بود می‌بندیم
  // چون دیگر هایلایت‌های همان فاز موجود نیستند.
  useEffect(() => {
    setOpenIndex(null);
  }, [phase]);

  if (!phase || highlights.length === 0) return null;

  const markSeen = (id: string) => {
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistSeenIds(next);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-4 justify-center overflow-x-auto px-1 py-1 no-scrollbar" dir="rtl">
        {highlights.map((highlight, index) => {
          const seen = seenIds.has(highlight.id);
          const ringColor = seen ? '#d1d5db' : PHASE_COLOR[phase];
          return (
            <button
              key={highlight.id}
              onClick={() => setOpenIndex(index)}
              className="flex flex-col items-center gap-1 shrink-0 w-16"
            >
              <span
                className="rounded-full p-[2.5px] transition-colors"
                style={{ backgroundColor: ringColor }}
              >
                <span className="block rounded-full p-[2px] bg-[#fffdfa] dark:bg-slate-900">
                  <img
                    src={highlight.coverImage}
                    alt={highlight.titleFa}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                </span>
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate w-full text-center">
                {highlight.titleFa}
              </span>
            </button>
          );
        })}
      </div>

      {openIndex !== null &&
        createPortal(
          <StoryViewer
            highlights={highlights}
            startIndex={openIndex}
            accentColor={PHASE_COLOR[phase]}
            onMarkSeen={markSeen}
            onClose={() => setOpenIndex(null)}
          />,
          document.body,
        )}
    </div>
  );
};

/* ------------------------------- ویوئر تمام‌صفحه ------------------------------- */

interface StoryViewerProps {
  highlights: CycleHighlight[];
  startIndex: number;
  accentColor: string;
  onMarkSeen: (id: string) => void;
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ highlights, startIndex, accentColor, onMarkSeen, onClose }) => {
  const [highlightIndex, setHighlightIndex] = useState(startIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // ۰ تا ۱ برای اسلاید جاری
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const pausedElapsedRef = useRef<number>(0);

  const currentHighlight = highlights[highlightIndex];
  const images = currentHighlight?.images || [];

  useEffect(() => {
    if (currentHighlight) onMarkSeen(currentHighlight.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHighlight?.id]);

  const goToSlide = (hIdx: number, sIdx: number) => {
    if (hIdx < 0) {
      onClose();
      return;
    }
    if (hIdx >= highlights.length) {
      onClose();
      return;
    }
    const targetImages = highlights[hIdx].images;
    if (sIdx < 0) {
      // برو به آخرین اسلاید هایلایت قبلی
      goToSlide(hIdx - 1, (highlights[hIdx - 1]?.images.length || 1) - 1);
      return;
    }
    if (sIdx >= targetImages.length) {
      goToSlide(hIdx + 1, 0);
      return;
    }
    setHighlightIndex(hIdx);
    setSlideIndex(sIdx);
  };

  const goNext = () => goToSlide(highlightIndex, slideIndex + 1);
  const goPrev = () => goToSlide(highlightIndex, slideIndex - 1);

  // تایمر پیشرفت خودکار
  useEffect(() => {
    setProgress(0);
    startedAtRef.current = Date.now();
    pausedElapsedRef.current = 0;
    if (paused) return undefined;

    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const ratio = Math.min(1, elapsed / SLIDE_DURATION_MS);
      setProgress(ratio);
      if (ratio >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightIndex, slideIndex, paused]);

  if (!currentHighlight) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black flex items-center justify-center select-none"
      dir="ltr"
    >
      <div className="relative w-full h-full max-w-md mx-auto overflow-hidden">
        {/* object-contain: تصویر عمودی ۹:۱۶ باید کامل و بدون برش دیده بشود؛ با
            object-cover قبلی، روی گوشی‌هایی که نسبت صفحه‌شان از ۹:۱۶ کشیده‌تر
            بود (اکثر گوشی‌های امروزی)، تصویر برای پرکردن کل صفحه بزرگ‌نمایی
            و از چپ/راست برش می‌خورد — همان چیزی که به‌نظر «کش‌آمده» می‌رسید.
            پس‌زمینه مشکی پشت خودِ کانتینر، هر فضای خالی احتمالی بالا/پایین
            یا کنار را هم به‌شکل نوار مشکیِ استاندارد استوری پر می‌کند. */}
        <img
          src={images[slideIndex]}
          alt={currentHighlight.titleFa}
          className="w-full h-full object-contain"
          draggable={false}
        />

        {/* نواحی لمسی: راست = بعدی، چپ = قبلی، نگه‌داشتن = توقف — این لایه باید
            زیر نوار پیشرفت و دکمه بستن باشد وگرنه کلیک آن‌ها را قاپ می‌زند */}
        <div className="absolute inset-0 flex">
          <button
            className="w-1/2 h-full"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onClick={goPrev}
            aria-label="اسلاید قبلی"
          />
          <button
            className="w-1/2 h-full"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onClick={goNext}
            aria-label="اسلاید بعدی"
          />
        </div>

        {/* نوارهای پیشرفت بالا */}
        <div className="absolute top-3 inset-x-3 z-10 flex gap-1.5 pointer-events-none">
          {images.map((_, idx) => (
            <div key={idx} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: idx < slideIndex ? '100%' : idx === slideIndex ? `${progress * 100}%` : '0%',
                  transition: idx === slideIndex ? 'none' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* عنوان + دکمه بستن */}
        <div className="absolute top-8 inset-x-3 z-10 flex items-center justify-between">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold text-white pointer-events-none"
            style={{ backgroundColor: accentColor }}
          >
            {currentHighlight.titleFa}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center text-white"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

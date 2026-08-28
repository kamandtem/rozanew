import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Check, ChevronDown, Lock, Sparkles, X } from 'lucide-react';
import {
  GuideLevel,
  GuideTopic,
  findGuideTopicById,
  guideTopicsForLevel,
} from '../../services/content/guideContent';
import {
  LEVEL_COMPLETION_MESSAGES,
  getGuideTier,
  guideProgressSummary,
  isLevelComplete,
  isLevelUnlocked,
  isTopicRead,
  markGuideTopicRead,
  useGuideProgress,
} from '../../services/guide/guideProgress';
import { toPersianDigits } from '../../services/jalali';

interface RozaGuideViewProps {
  /** وقتی از یک هشدار واقعی («چرا؟») به اینجا هدایت می‌شویم، شناسه همان موضوع. */
  initialTopicId?: string | null;
  onConsumedInitialTopic?: () => void;
}

const LEVEL_TITLES: Record<GuideLevel, string> = {
  1: 'مواد فعال را بشناس',
  2: 'بفهم چرا رزا هشدار می‌دهد',
  3: 'منطق رزا را یاد بگیر',
};

export const RozaGuideView: React.FC<RozaGuideViewProps> = ({ initialTopicId, onConsumedInitialTopic }) => {
  const progress = useGuideProgress();
  const [openTopic, setOpenTopic] = useState<GuideTopic | null>(null);
  const [justCompletedLevel, setJustCompletedLevel] = useState<GuideLevel | null>(null);
  const prevCompleteRef = useRef<Record<GuideLevel, boolean>>({
    1: isLevelComplete(1, progress),
    2: isLevelComplete(2, progress),
    3: isLevelComplete(3, progress),
  });

  const summary = guideProgressSummary(progress);
  const tier = getGuideTier(progress);

  // دیپ‌لینک از یک هشدار واقعی: مستقیم مطلب مرتبط را باز کن.
  useEffect(() => {
    if (!initialTopicId) return;
    const topic = findGuideTopicById(initialTopicId);
    if (topic) setOpenTopic(topic);
    onConsumedInitialTopic?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopicId]);

  // اعلام کوتاه وقتی یک Level تازه کامل می‌شود.
  useEffect(() => {
    ([1, 2, 3] as GuideLevel[]).forEach((level) => {
      const wasComplete = prevCompleteRef.current[level];
      const isComplete = isLevelComplete(level, progress);
      if (!wasComplete && isComplete) {
        setJustCompletedLevel(level);
        window.setTimeout(() => setJustCompletedLevel((current) => (current === level ? null : current)), 4200);
      }
      prevCompleteRef.current[level] = isComplete;
    });
  }, [progress]);

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] pt-3 px-4 max-w-lg mx-auto space-y-4">
      {/* معرفی */}
      <div className="rounded-[1.7rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 space-y-2 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-black text-[#263b56] dark:text-white">
          <BookOpen className="w-5 h-5 text-rose-500" />
          راهنمای استفاده از رزا
        </span>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
          هدف این‌جا متخصص شدنت نیست؛ فقط اینکه هر وقت رزا درباره یک ماده هشدار داد، بدانی دقیقاً یعنی چه.
        </p>
      </div>

      {/* بج و پیشرفت کلی */}
      <div className="rounded-[1.7rem] bg-gradient-to-br from-[#263b56] to-[#3a5478] p-4 text-white space-y-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shrink-0">{tier.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/70">سطح فعلی تو</p>
            <h2 className="text-base font-black truncate">{tier.labelFa}</h2>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-white/80">
            <span>{toPersianDigits(summary.readCount)} از {toPersianDigits(summary.total)} موضوع را یاد گرفتی</span>
            <span>{toPersianDigits(summary.percent)}٪ مسیر آشنایی با رزا</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${summary.percent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-white"
            />
          </div>
        </div>
      </div>

      {/* تایم‌لاین سه‌سطحی */}
      <div className="relative pr-6">
        <div className="absolute right-2.5 top-2 bottom-2 border-r-2 border-dashed border-rose-200 dark:border-rose-900" />
        <div className="space-y-5">
          {([1, 2, 3] as GuideLevel[]).map((level) => (
            <LevelSection
              key={level}
              level={level}
              unlocked={isLevelUnlocked(level, progress)}
              complete={isLevelComplete(level, progress)}
              justCompleted={justCompletedLevel === level}
              onOpenTopic={setOpenTopic}
            />
          ))}
        </div>
      </div>

      {openTopic && (
        <TopicModal topic={openTopic} onClose={() => setOpenTopic(null)} />
      )}
    </div>
  );
};

const LevelSection: React.FC<{
  level: GuideLevel;
  unlocked: boolean;
  complete: boolean;
  justCompleted: boolean;
  onOpenTopic: (topic: GuideTopic) => void;
}> = ({ level, unlocked, complete, justCompleted, onOpenTopic }) => {
  const topics = guideTopicsForLevel(level);
  const readCount = topics.filter((topic) => isTopicRead(topic.id)).length;

  return (
    <div className="relative">
      <span
        className={`absolute right-[-30px] top-1 z-10 w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center ring-4 ring-[#faf8f5] dark:ring-slate-950 ${
          complete ? 'bg-emerald-500 text-white' : unlocked ? 'bg-rose-500 text-white' : 'bg-slate-300 text-white dark:bg-slate-700'
        }`}
      >
        {complete ? <Check className="w-3.5 h-3.5" /> : toPersianDigits(level)}
      </span>

      <div className={`rounded-[1.6rem] border p-4 space-y-3 ${unlocked ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-rose-600">سطح {toPersianDigits(level)}</span>
            <h3 className={`text-sm font-black truncate ${unlocked ? 'text-[#263b56] dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              {LEVEL_TITLES[level]}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-400">{toPersianDigits(readCount)}/{toPersianDigits(topics.length)}</span>
            {!unlocked && <Lock className="w-4 h-4 text-slate-300" />}
          </div>
        </div>

        {!unlocked && (
          <p className="text-xs text-slate-400 leading-6">با تمام‌کردن سطح قبلی، این بخش باز می‌شود.</p>
        )}

        {unlocked && (
          <div className="grid grid-cols-1 gap-2">
            {topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} onOpen={() => onOpenTopic(topic)} />
            ))}
          </div>
        )}

        <AnimatePresence>
          {justCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-6">
                  {LEVEL_COMPLETION_MESSAGES[level]}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TopicRow: React.FC<{ topic: GuideTopic; onOpen: () => void }> = ({ topic, onOpen }) => {
  const read = isTopicRead(topic.id);
  return (
    <button
      onClick={onOpen}
      className={`w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-right border transition-colors ${
        read
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
          : 'bg-[#faf8f5] dark:bg-slate-800/60 border-transparent'
      }`}
    >
      <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-base shrink-0 border border-slate-100 dark:border-slate-800 overflow-hidden">
        {topic.imageUrl ? <img src={topic.imageUrl} alt="" className="w-full h-full object-cover" /> : topic.emoji}
      </span>
      <span className="flex-1 min-w-0 text-[13px] font-bold text-[#33465f] dark:text-slate-200 truncate">{topic.titleFa}</span>
      {read ? (
        <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check className="w-3.5 h-3.5" />
        </span>
      ) : (
        <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300 shrink-0" />
      )}
    </button>
  );
};

const TopicModal: React.FC<{ topic: GuideTopic; onClose: () => void }> = ({ topic, onClose }) => {
  const progress = useGuideProgress();
  const read = progress.readTopicIds.includes(topic.id);

  // با createPortal مستقیم به document.body — وگرنه داخل کانتینر fixed z-20 بخش گیر
  // می‌افتد و با وجود z-50 باز هم زیر هدر/نوبار پایین (بیرون از آن کانتینر) دیده می‌شود.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#20334d]/45 flex items-center justify-center p-4">
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[2rem] bg-[#fffdf9] dark:bg-slate-900 p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-xl shrink-0 overflow-hidden">{topic.imageUrl ? <img src={topic.imageUrl} alt="" className="w-full h-full object-cover" /> : topic.emoji}</span>
            <h2 className="text-lg font-black text-[#263b56] dark:text-white leading-7 truncate">{topic.titleFa}</h2>
          </div>
          <button onClick={onClose} aria-label="بستن" className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {topic.sectionsFa.map((section, index) => (
            <div key={index} className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3.5">
              <span className="block text-[11px] font-black text-rose-600 mb-1">{section.labelFa}</span>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{section.textFa}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            markGuideTopicRead(topic.id);
            onClose();
          }}
          className={`mt-5 w-full rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 ${
            read ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50' : 'bg-[#263b56] text-white'
          }`}
        >
          <Check className="w-4 h-4" />
          {read ? 'خوانده‌شده' : 'خواندم'}
        </button>
      </motion.article>
    </div>,
    document.body,
  );
};

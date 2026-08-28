import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../storage/persistence';
import { GuideLevel, GUIDE_TOTAL_TOPICS, guideTopicsForLevel } from '../content/guideContent';
import { toPersianDigits } from '../jalali';

/**
 * وضعیت پیشرفت کاربر در راهنما.
 *
 * فقط شناسه موضوع‌های خوانده‌شده ذخیره می‌شود؛ همه چیز دیگر (Level باز است
 * یا نه، درصد پیشرفت، عنوان Badge) از همین یک آرایه محاسبه می‌شود تا دو
 * منبع داده هرگز از هم جدا نیفتند.
 */
export interface GuideProgressState {
  readTopicIds: string[];
}

const STORAGE_KEY = 'roza_guide_progress_v1';
const EMPTY_STATE: GuideProgressState = { readTopicIds: [] };

type Listener = () => void;
const listeners = new Set<Listener>();
function emitChange(): void {
  listeners.forEach((listener) => listener());
}

export function getGuideProgress(): GuideProgressState {
  return readJson<GuideProgressState>(STORAGE_KEY, EMPTY_STATE);
}

export function isTopicRead(topicId: string): boolean {
  return getGuideProgress().readTopicIds.includes(topicId);
}

export function markGuideTopicRead(topicId: string): void {
  const current = getGuideProgress();
  if (current.readTopicIds.includes(topicId)) return;
  const next: GuideProgressState = { readTopicIds: [...current.readTopicIds, topicId] };
  writeJson(STORAGE_KEY, next);
  emitChange();
}

export function unmarkGuideTopicRead(topicId: string): void {
  const current = getGuideProgress();
  if (!current.readTopicIds.includes(topicId)) return;
  const next: GuideProgressState = { readTopicIds: current.readTopicIds.filter((id) => id !== topicId) };
  writeJson(STORAGE_KEY, next);
  emitChange();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** هوک واکنش‌گرا — هر جا استفاده شود، با تغییر پیشرفت (حتی از یک کامپوننت دیگر) دوباره رندر می‌شود. */
export function useGuideProgress(): GuideProgressState {
  return useSyncExternalStore(subscribe, getGuideProgress, getGuideProgress);
}

/** آیا همه موضوع‌های یک Level خوانده شده‌اند؟ */
export function isLevelComplete(level: GuideLevel, progress: GuideProgressState): boolean {
  const topics = guideTopicsForLevel(level);
  return topics.length > 0 && topics.every((topic) => progress.readTopicIds.includes(topic.id));
}

/** Level باز است یعنی: خودش سطح ۱ است، یا سطح قبلش کامل شده. */
export function isLevelUnlocked(level: GuideLevel, progress: GuideProgressState): boolean {
  if (level === 1) return true;
  if (level === 2) return isLevelComplete(1, progress);
  return isLevelComplete(1, progress) && isLevelComplete(2, progress);
}

export function countCompletedLevels(progress: GuideProgressState): 0 | 1 | 2 | 3 {
  if (!isLevelComplete(1, progress)) return 0;
  if (!isLevelComplete(2, progress)) return 1;
  if (!isLevelComplete(3, progress)) return 2;
  return 3;
}

export interface GuideTier {
  levelNumber: GuideLevel;
  emoji: string;
  labelFa: string;
}

const TIERS: Record<GuideLevel, GuideTier> = {
  1: { levelNumber: 1, emoji: '🌱', labelFa: `سطح ${toPersianDigits(1)}` },
  2: { levelNumber: 2, emoji: '✨', labelFa: `سطح ${toPersianDigits(2)}` },
  3: { levelNumber: 3, emoji: '🎓', labelFa: `سطح ${toPersianDigits(3)}` },
};

/** عنوان/بج فعلی کاربر — بر اساس بالاترین Level ای که وارد شده (تکمیل Level قبلش). */
export function getGuideTier(progress: GuideProgressState): GuideTier {
  const completed = countCompletedLevels(progress);
  const levelNumber = (completed >= 2 ? 3 : completed + 1) as GuideLevel;
  return TIERS[levelNumber];
}

export function guideProgressSummary(progress: GuideProgressState): { readCount: number; total: number; percent: number } {
  const readCount = progress.readTopicIds.length;
  const percent = GUIDE_TOTAL_TOPICS > 0 ? Math.round((readCount / GUIDE_TOTAL_TOPICS) * 100) : 0;
  return { readCount, total: GUIDE_TOTAL_TOPICS, percent };
}

export const LEVEL_COMPLETION_MESSAGES: Record<GuideLevel, string> = {
  1: 'عالی! حالا دیگر رتینول و نیاسینامید برایت اسم‌های ناشناخته‌ای نیستند.',
  2: 'خیلی خوب بود! حالا می‌دانی چرا رزا بعضی وقت‌ها هشدار می‌دهد.',
  3: 'تبریک! حالا منطق رزا را می‌شناسی و همراه حرفه‌ای رزا شدی.',
};

/**
 * صف رویدادهای ارجاع.
 *
 * مدل درآمدزایی رزا بر این است که کاربر را به آرایشگاه و پزشک طرف
 * قرارداد برساند. برای تسویه حساب با طرف قرارداد، لازم است بتوانیم
 * اثبات کنیم «این نوبت از طریق رزا بوده». الان سروری نداریم، پس
 * رویدادها محلی صف می‌شوند و وقتی سرور آمد فلاش می‌شوند.
 *
 * دو قاعده غیرقابل مذاکره:
 *  ۱) فقط رویدادهایی که partnerId یا catalogId دارند صف می‌شوند. رفتار
 *     کاربر با رکوردهای خودش ردگیری نمی‌شود.
 *  ۲) هیچ داده سلامتی، چرخه، عکس یا یادداشتی در رویداد قرار نمی‌گیرد.
 */

import { TelemetryEvent, TelemetryEventType } from '../types';
import { API_BASE_URL, isFeatureEnabled } from '../config/appConfig';
import { LocalDB, createId } from './db';

export function trackReferralEvent(
  type: TelemetryEventType,
  payload: { partnerId?: string; catalogId?: string; referralId?: string },
): void {
  if (!payload.partnerId && !payload.catalogId) return;

  const event: TelemetryEvent = {
    id: createId('ev'),
    type,
    atIso: new Date().toISOString(),
    partnerId: payload.partnerId,
    catalogId: payload.catalogId,
    referralId: payload.referralId,
    synced: false,
  };

  const queue = LocalDB.getTelemetryQueue();
  queue.push(event);
  LocalDB.saveTelemetryQueue(queue);
}

/** شناسه ارجاع برای یک نوبت یا خرید. لاگ دو طرف را به هم وصل می‌کند. */
export function createReferralId(): string {
  return createId('ref');
}

/** تعداد رویدادهای معلق. برای نمایش در تنطیمات توسعه‌دهنده. */
export function pendingEventCount(): number {
  return LocalDB.getTelemetryQueue().filter((event) => !event.synced).length;
}

/**
 * فلاش صف به سرور. تا وقتی API_BASE_URL خالی باشد، هیچ کاری نمی‌کند.
 * برای فاز دایرکتوری کافی است همین تابع را در بوت صدا بزنید.
 */
export async function flushTelemetry(): Promise<void> {
  if (!isFeatureEnabled('cloudSync')) return;

  const queue = LocalDB.getTelemetryQueue();
  const pending = queue.filter((event) => !event.synced);
  if (pending.length === 0) return;

  try {
    const response = await fetch(`${API_BASE_URL}/v1/referrals/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: pending }),
    });
    if (!response.ok) return;
    LocalDB.saveTelemetryQueue(queue.map((event) => ({ ...event, synced: true })));
  } catch {
    // آفلاین؛ دفعه بعد تلاش می‌کنیم
  }
}

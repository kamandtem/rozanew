import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Trash2, ImageIcon, BarChart3, AlertTriangle } from 'lucide-react';
import { PhotoProgress } from '../../types';
import { LocalDB } from '../../services/db';
import { deletePhoto, getPhotoUrl, savePhoto } from '../../services/photoService';
import { buildHabitStats, buildRecentDays, loggedDaysCount } from '../../services/statsService';
import { estimateStorage } from '../../services/storage/persistence';
import {
  PERSIAN_WEEK_HEADERS,
  buildJalaliMonthGrid,
  formatJalaliDate,
  getJalaliToday,
  getTodayIsoDate,
  getTodayPersianHeader,
  PERSIAN_MONTH_NAMES,
  toPersianDigits,
} from '../../services/jalali';
import { EmptyState } from '../common/EmptyState';
import { JalaliDatePicker } from '../common/JalaliDatePicker';

interface ProgressTrackerProps {
  initialTab?: 'photos' | 'stats';
}

/** عکس را از IndexedDB می‌خواند (دیگر base64 در localStorage نیست). */
const PhotoImage: React.FC<{ photo: PhotoProgress; className?: string }> = ({ photo, className }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getPhotoUrl(photo.blobId).then((value) => {
      if (alive) setUrl(value);
    });
    return () => {
      alive = false;
    };
  }, [photo.blobId]);

  if (!url) {
    return <div className={`bg-slate-100 dark:bg-slate-800 animate-pulse ${className || ''}`} />;
  }
  return <img src={url} alt={`پوست ${formatJalaliDate(photo.date)}`} className={className} />;
};

/**
 * پیشرفت.
 *
 * سه مشکل نسخه ۱:
 *  ۱) درصدهای ۸۵، ۷۸ و ۹۲ هاردکد بودند و نوار «ضدآفتاب» دقایق ورزش را می‌شمرد.
 *  ۲) تقویم با toISOString() ساخته می‌شد (UTC) و در ایران بعد از طهر یک روز جلو می‌افتاد.
 *  ۳) بعد از آپلود عکس، کل صفحه reload می‌شد.
 */
export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ initialTab = 'photos' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((value) => value + 1);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoDate, setPhotoDate] = useState(getTodayIsoDate());
  const [storage, setStorage] = useState<{ usedMb: number; quotaMb: number } | null>(null);

  const photos = useMemo(() => LocalDB.getPhotos(), [refresh]);
  const days = useMemo(() => buildRecentDays(30), [refresh]);
  const habits = useMemo(() => buildHabitStats(30), [refresh]);
  const logged = loggedDaysCount(30);

  const [compareBefore, setCompareBefore] = useState<string | null>(null);
  const [compareAfter, setCompareAfter] = useState<string | null>(null);

  useEffect(() => {
    void estimateStorage().then(setStorage);
  }, [refresh]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await savePhoto(file, { dateIso: photoDate });
    if (!result.ok) {
      setUploadError(result.errorFa || 'ذخیره عکس ممکن نشد.');
      return;
    }
    bump();
  };

  const jalaliToday = getJalaliToday();
  const todayIso = getTodayIsoDate();
  const monthCells = buildJalaliMonthGrid(jalaliToday.jy, jalaliToday.jm);
  const dayMap = new Map(days.map((day) => [day.dateIso, day]));

  const beforePhoto = photos.find((photo) => photo.id === compareBefore);
  const afterPhoto = photos.find((photo) => photo.id === compareAfter);

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] px-4 max-w-lg mx-auto space-y-4">
      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
        {(
          [
            { key: 'photos' as const, labelFa: 'عکس‌ها', icon: Camera },
            { key: 'stats' as const, labelFa: 'آمار', icon: BarChart3 },
          ]
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-900 text-[#8e5241] dark:text-rose-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.labelFa}
            </button>
          );
        })}
      </div>

      {/* --------------------------- عکس‌ها --------------------------- */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-sm text-slate-800 dark:text-white">عکس‌های من</h3>
            <div className="flex items-center gap-2">
              <div className="w-36">
                <JalaliDatePicker value={photoDate} onChange={setPhotoDate} allowFuture={false} />
              </div>
              <label className="shrink-0 cursor-pointer px-4 py-3 rounded-2xl bg-[#8e5241] text-white text-xs font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                عکس جدید
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* خطای ذخیره الان دیده می‌شود. نسخه ۱ بی‌صدا شکست می‌خورد. */}
          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-900 dark:text-rose-200 leading-relaxed">{uploadError}</p>
            </div>
          )}

          {storage && storage.quotaMb > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              فضای مصرف‌شده: {toPersianDigits(storage.usedMb)} مگابایت
            </p>
          )}

          {/* مقایسه قبل و بعد */}
          {photos.length >= 2 && (
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-white">مقایسه قبل و بعد</h4>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { labelFa: 'قبل', value: compareBefore, set: setCompareBefore, photo: beforePhoto },
                    { labelFa: 'بعد', value: compareAfter, set: setCompareAfter, photo: afterPhoto },
                  ]
                ).map((slot) => (
                  <div key={slot.labelFa} className="space-y-1.5">
                    <select
                      value={slot.value || ''}
                      onChange={(event) => slot.set(event.target.value || null)}
                      className="w-full py-2.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    >
                      <option value="">{slot.labelFa}</option>
                      {photos.map((photo) => (
                        <option key={photo.id} value={photo.id}>
                          {formatJalaliDate(photo.date)}
                        </option>
                      ))}
                    </select>

                    <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                      {slot.photo ? (
                        <PhotoImage photo={slot.photo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">انتخاب کن</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              titleFa="هنوز عکسی ثبت نکرده‌ای"
              descriptionFa="هر دو هفته یک عکس در همان نور و همان زاویه بگیر. عکس‌ها فقط روی همین گوشی می‌مانند و به هیچ سروری نمی‌روند."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-1.5"
                >
                  <div className="h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <PhotoImage photo={photo} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {formatJalaliDate(photo.date)}
                    </span>
                    <button
                      onClick={async () => {
                        await deletePhoto(photo);
                        bump();
                      }}
                      aria-label="حذف عکس"
                      className="icon-only p-1.5 rounded-lg text-slate-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------- آمار --------------------------- */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {habits.every((habit) => habit.percent === null) ? (
            <EmptyState
              icon={BarChart3}
              titleFa="آمار عادت‌ها"
              descriptionFa="بعد از چند روز ثبت، درصد واقعی پایبندی را نشان می‌دهیم. عدد حدسی نمی‌سازیم."
              progress={{ current: logged, required: 5, unitFa: 'روز ثبت' }}
            />
          ) : (
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3">
              <h3 className="font-black text-sm text-slate-800 dark:text-white">پایبندی ۳۰ روز اخیر</h3>

              {habits.map((habit) => (
                <div key={habit.key} className="space-y-1">
                  <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                    <span>{habit.labelFa}</span>
                    <span className="text-rose-600">
                      {habit.percent === null ? 'داده کافی نیست' : `${toPersianDigits(habit.percent)}٪`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-rose-400 to-amber-400"
                      style={{ width: `${habit.percent || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    محاسبه‌شده از {toPersianDigits(habit.loggedDays)} روز ثبت‌شده
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

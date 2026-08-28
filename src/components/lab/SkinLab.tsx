import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ChevronDown, FlaskConical, Search, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, X, Layers } from 'lucide-react';
import { Ingredient, Product, UserState } from '../../types';
import { INGREDIENTS_DATABASE } from '../../services/content/ingredients';
import { SafetyLevel, checkPairConflict, evaluateIngredientSafety } from '../../services/safety';
import { describeSeverity, severityFromSafetyLevel } from '../../services/advice/severity';
import { resolveShelfActives } from '../../services/advice/userContext';
import { LocalDB } from '../../services/db';
import { toPersianDigits } from '../../services/jalali';
import { CATEGORY_LABELS } from '../products/ProductShelf';

interface SkinLabProps {
  initialTab?: 'ingredients' | 'conflicts';
  userState: UserState;
  products: Product[];
  /** دیپ‌لینک: وقتی از جستجوی هوشمند یا جای دیگری به یک ماده خاص هدایت می‌شویم. */
  initialIngredientId?: string | null;
  onConsumedInitialIngredient?: () => void;
  /** دیپ‌لینک: وقتی جستجوی هوشمند یک سؤال «تداخل X با Y» تشخیص داده، مستقیم تداخل‌سنج را با همین دو ماده باز کن. */
  initialConflictPair?: { firstId: string; secondId: string } | null;
  onConsumedInitialConflictPair?: () => void;
}

/**
 * برچسب و رنگ ایمنی — از همان واژگان پنج‌سطحی اپ.
 *
 * قبلاً این فایل جدول برچسب و رنگ خودش را داشت و با واژگان قدیمی
 * blocked/caution/safe حرف می‌زد، در حالی که خانه و روتین با
 * INFO..PROFESSIONAL_INSTRUCTION حرف می‌زدند؛ نتیجه این بود که یک ماده در دو
 * صفحه دو برچسب متفاوت می‌گرفت. تنها مسیر ترجمه severityFromSafetyLevel است.
 */
function describeVerdict(level: SafetyLevel) {
  return describeSeverity(severityFromSafetyLevel(level));
}

/**
 * ترکیبات و تداخل‌سنج.
 *
 * دو تغییر مهم:
 *  ۱) تداخل بر اساس شناسه محاسبه می‌شود نه includes() روی متن نام.
 *  ۲) وضعیت ایمنی هر ترکیب برای این کاربر خاص (بارداری، شیردهی، دارو،
 *     حساسیت) نمایش داده می‌شود. نسخه ۱ فیلدهای ایمنی را داشت ولی هرگز استفاده نمی‌کرد.
 */
export const SkinLab: React.FC<SkinLabProps> = ({
  initialTab = 'ingredients',
  userState,
  products,
  initialIngredientId,
  onConsumedInitialIngredient,
  initialConflictPair,
  onConsumedInitialConflictPair,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [firstId, setFirstId] = useState('ing_retinol');
  const [secondId, setSecondId] = useState('ing_salicylic_acid');
  const [pickerSlot, setPickerSlot] = useState<'first' | 'second' | null>(null);

  const medications = useMemo(() => LocalDB.getMedications(), []);
  // قفسهٔ واقعی کاربر (شامل ترکیبات دستی‌نوشته) تا کارت ماده بتواند بگوید
  // این ماده در کدام محصول خودِ کاربر هست، نه فقط حرف عمومی بزند.
  const shelfActives = useMemo(() => resolveShelfActives(products), [products]);

  // دیپ‌لینک از جستجوی هوشمند: مستقیم کارت همان ماده را باز کن.
  React.useEffect(() => {
    if (!initialIngredientId) return;
    const ingredient = INGREDIENTS_DATABASE.find((item) => item.id === initialIngredientId);
    if (ingredient) {
      setActiveTab('ingredients');
      setSelected(ingredient);
    }
    onConsumedInitialIngredient?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIngredientId]);

  // دیپ‌لینک از جستجوی هوشمند: سؤال «تداخل X با Y» بوده، مستقیم تب تداخل‌سنج را با همین دو ماده باز کن.
  React.useEffect(() => {
    if (!initialConflictPair) return;
    setActiveTab('conflicts');
    setFirstId(initialConflictPair.firstId);
    setSecondId(initialConflictPair.secondId);
    onConsumedInitialConflictPair?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConflictPair]);

  const filtered = INGREDIENTS_DATABASE.filter((ingredient) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return ingredient.name.toLowerCase().includes(needle) || ingredient.nameFa.includes(search.trim());
  });

  const first = INGREDIENTS_DATABASE.find((item) => item.id === firstId);
  const second = INGREDIENTS_DATABASE.find((item) => item.id === secondId);
  const pairResult = first && second ? checkPairConflict(first, second) : null;

  return (
    <div className="pb-[calc(var(--safe-bottom)+7rem)] px-4 max-w-lg mx-auto space-y-4">
      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
        {(
          [
            { key: 'ingredients' as const, labelFa: `ترکیبات (${toPersianDigits(INGREDIENTS_DATABASE.length)})` },
            { key: 'conflicts' as const, labelFa: 'تداخل‌سنج' },
          ]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-900 text-[#8e5241] dark:text-rose-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tab.labelFa}
          </button>
        ))}
      </div>

      {/* ------------------------- ترکیبات ------------------------- */}
      {activeTab === 'ingredients' && (
        <div className="space-y-3">
          <div className="relative">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجوی ترکیب"
              className="w-full py-3 pr-11 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 text-sm font-bold"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>

          {filtered.map((ingredient) => {
            const verdict = evaluateIngredientSafety(ingredient, userState.profile, medications);
            return (
              <button
                key={ingredient.id}
                onClick={() => setSelected(ingredient)}
                className="w-full p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 text-right space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  {ingredient.imageUrl && <img src={ingredient.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" loading="lazy" />}
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-slate-800 dark:text-white">{ingredient.nameFa}</h4>
                    <p className="text-xs text-slate-400">{ingredient.name}</p>
                  </div>

                  {/* برچسب ایمنی مخصوص این کاربر */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                      describeVerdict(verdict.level).style
                    }`}
                  >
                    {describeVerdict(verdict.level).labelFa}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{ingredient.descriptionFa}</p><p className="text-xs text-slate-500 dark:text-slate-500 leading-6"><strong>یعنی:</strong> {ingredient.id === 'ing_retinol' ? 'کمک به نوسازی پوست، مثل یک برنامه تمرینی آرام برای سلول‌های پوست.' : ingredient.id === 'ing_hyaluronic_acid' ? 'آب‌رسانی، مثل یک اسفنج کوچک که رطوبت را نگه می‌دارد.' : ingredient.id === 'ing_niacinamide' ? 'کمک به آرام‌تر شدن چربی و ظاهر منافذ پوست.' : 'یک ماده مراقبتی که برای هدف مشخصی در محصول استفاده شده است.'}</p>

                {verdict.reasonsFa.length > 0 && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{verdict.reasonsFa[0]}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------- تداخل‌سنج ------------------------- */}
      {activeTab === 'conflicts' && (
        <div className="space-y-3">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-rose-500" />
              می‌توانم این دو را با هم بزنم؟
            </h3>

            {/*
              قبلاً اینجا یک select خام مرورگر بود که فقط اسم ترکیب را
              متنی نشان می‌داد. حالا مثل انتخاب‌گر «ترکیبات فعال» در فرم
              قفسه محصولات، دکمه عکس‌دار باز می‌شود و یک شیت پایین صفحه
              با چیدمان همان دکمه‌های رنگی (توپر رزی + تیک وقتی انتخاب
              شده) باز می‌شود.
            */}
            {[
              { slot: 'first' as const, value: firstId, labelFa: 'ترکیب اول' },
              { slot: 'second' as const, value: secondId, labelFa: 'ترکیب دوم' },
            ].map((item) => {
              const ingredient = INGREDIENTS_DATABASE.find((entry) => entry.id === item.value);
              return (
                <div key={item.slot}>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    {item.labelFa}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPickerSlot(item.slot)}
                    className="w-full min-h-[58px] px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-right"
                  >
                    {ingredient?.imageUrl ? (
                      <img src={ingredient.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-5 h-5 text-rose-500" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm font-black text-slate-800 dark:text-white truncate">
                        {ingredient?.nameFa || 'انتخاب ترکیب'}
                      </strong>
                    </span>
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>
                </div>
              );
            })}
          </div>

          {pairResult && (
            <div
              className={`p-4 rounded-3xl border space-y-2 ${
                pairResult.conflict
                  ? describeSeverity('IMPORTANT').style
                  : describeSeverity(null).style
              }`}
            >
              <h4 className="font-black text-sm flex items-center gap-1.5">
                {pairResult.conflict ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    تداخل دارند
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    مشکلی ندارند
                  </>
                )}
              </h4>
              <p className="text-sm leading-relaxed">{pairResult.reasonFa}</p>
            </div>
          )}
        </div>
      )}

      {/*
        جزئیات ترکیب — با createPortal مستقیم به document.body رندر می‌شود.
        باگ قبلی: این مودال قبلاً داخل همان div بخش (fixed inset-0 z-20)
        رندر می‌شد. z-index یک عنصر فقط داخل «کانتکست استکینگ» والدش معنا
        دارد؛ چون آن div خودش fixed + z-20 است و یک کانتکست جدید می‌سازد،
        z-50 روی مودال فقط بین المان‌های همان div مقایسه می‌شد، نه با کل
        صفحه — پس کل مودال (با وجود z-50) زیر هدر اصلی که z-30 و در یک
        کانتکست دیگر است می‌افتاد. با پورتال به body، مودال از آن کانتکست
        خارج می‌شود و z-50اش واقعاً بالای هدر قرار می‌گیرد.
      */}
      {pickerSlot && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[calc(var(--safe-bottom)+1rem)]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-3 max-h-[82vh] overflow-y-auto pb-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-800 dark:text-white">
                {pickerSlot === 'first' ? 'ترکیب اول' : 'ترکیب دوم'}
              </h3>
              <button
                onClick={() => setPickerSlot(null)}
                aria-label="بستن"
                className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {INGREDIENTS_DATABASE.map((ingredient) => {
                const isOn = (pickerSlot === 'first' ? firstId : secondId) === ingredient.id;
                return (
                  <button
                    type="button"
                    key={ingredient.id}
                    onClick={() => {
                      if (pickerSlot === 'first') setFirstId(ingredient.id);
                      else setSecondId(ingredient.id);
                      setPickerSlot(null);
                    }}
                    className={`w-full min-h-[52px] px-3 rounded-xl text-sm font-bold border flex items-center gap-3 text-right ${
                      isOn
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ingredient.imageUrl && (
                      <img src={ingredient.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    )}
                    {ingredient.nameFa}
                    <span className="mr-auto">{isOn ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/*
        جزئیات ترکیب — مثل کارت ماسک‌ها: هدر با آیکون و دکمه بستن، عکس/باکس
        بزرگ بالای کارت، بخش‌های رنگی با ایموجی، چیپ‌های فواید و یک دکمه
        پایین. با createPortal مستقیم به document.body رندر می‌شود (دلیل
        فنی‌اش در توضیح مودال «تداخل‌سنج» بالا آمده).
      */}
      {/* بدون AnimatePresence دور createPortal: این ترکیب باعث می‌شد مودال اصلاً
          نمایش داده نشود (AnimatePresence نمی‌تواند پورتال را به‌عنوان فرزند
          انیمیشنی ردیابی کند). با همان الگویی که در راهنما/مقالات درست کار
          می‌کند جایگزین شد: portal مستقیم + motion.div با initial/animate. */}
      {selected && createPortal(
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 pt-[calc(var(--safe-top)+1rem)] pb-[calc(var(--safe-bottom)+1rem)]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg max-h-[72vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-slate-900 text-right space-y-4 shadow-2xl border border-rose-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2 border-b border-rose-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FlaskConical className="w-5 h-5 text-rose-500 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white truncate">{selected.nameFa}</h3>
                    <p className="text-xs text-slate-400 truncate">{selected.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="بستن"
                  className="icon-only p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selected.commonCategoryIds && selected.commonCategoryIds.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    معمولاً در چه محصولاتی هست:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.commonCategoryIds.map((categoryId) => (
                      <span
                        key={categoryId}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-900"
                      >
                        {CATEGORY_LABELS[categoryId]}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    این فهرست بر اساس فرمولاسیون رایج این ماده است، نه تضمین برای یک محصول خاص؛ برندهای مختلف می‌توانند فرمول متفاوتی داشته باشند.
                  </p>
                </div>
              )}

              {selected.imageUrl ? (
                <img
                  src={selected.imageUrl}
                  alt={selected.nameFa}
                  className="w-full h-44 rounded-2xl object-cover shadow-xs border border-rose-100 dark:border-slate-800"
                />
              ) : (
                <div className="w-full h-32 rounded-2xl bg-gradient-to-l from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/20 border border-rose-100 dark:border-slate-800 flex items-center justify-center">
                  <FlaskConical className="w-10 h-10 text-rose-300 dark:text-rose-800" />
                </div>
              )}

              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-rose-50/50 dark:bg-slate-800/60 p-3 rounded-2xl border border-rose-100 dark:border-slate-700">
                {selected.descriptionFa}
              </p>

              {(() => {
                const verdict = evaluateIngredientSafety(selected, userState.profile, medications);
                if (verdict.reasonsFa.length === 0) return null;
                return (
                  <div className={`p-3.5 rounded-2xl border space-y-1.5 ${describeVerdict(verdict.level).style}`}>
                    <span className="text-xs font-black flex items-center gap-1.5">
                      {verdict.level === 'safe' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {describeVerdict(verdict.level).labelFa}
                    </span>
                    <p className="text-[11px] leading-relaxed opacity-80">{describeVerdict(verdict.level).hintFa}</p>
                    {shelfActives.has(selected.id) && (
                      <p className="text-[11px] font-bold leading-relaxed">
                        این ماده در محصول خودت هست: {shelfActives.get(selected.id)?.productNamesFa.join(' و ')}
                      </p>
                    )}
                    {verdict.reasonsFa.map((reason, index) => (
                      <p key={index} className="text-xs leading-relaxed">{reason}</p>
                    ))}
                  </div>
                );
              })()}

              {/* فواید */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ✨ فواید:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.benefitsFa.map((benefit, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900"
                    >
                      ✓ {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {selected.avoidCombiningIds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    ⚠️ با این‌ها همزمان نزن:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.avoidCombiningIds.map((id) => (
                      <span
                        key={id}
                        className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900"
                      >
                        {INGREDIENTS_DATABASE.find((item) => item.id === id)?.nameFa || id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.sideEffectsFa && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 text-xs font-medium">
                  <strong>نکته احتیاط: </strong>
                  {selected.sideEffectsFa}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                زمان مصرف: {selected.usageTime === 'morning' ? 'صبح' : selected.usageTime === 'night' ? 'شب' : 'صبح و شب'}
              </div>

              <button
                onClick={() => setSelected(null)}
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md"
              >
                متوجه شدم
              </button>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

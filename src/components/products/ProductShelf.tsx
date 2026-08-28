import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Trash2, X, AlertTriangle, ShoppingBag, CalendarClock, Check } from 'lucide-react';
import { Product, ProductCategory, UserState } from '../../types';
import { INGREDIENTS_DATABASE } from '../../services/content/ingredients';
import { findShelfConflicts } from '../../services/safety';
import { createId } from '../../services/db';
import { isFeatureEnabled } from '../../config/appConfig';
import { openPurchase } from '../../services/shop/catalogService';
import { addDays, formatJalaliDayMonth, getDaysDifference, getTodayIsoDate, toPersianDigits } from '../../services/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { EmptyState } from '../common/EmptyState';
import { PrettySelect } from '../common/PrettySelect';

interface ProductShelfProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  userState: UserState;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cleanser: 'شوینده و پاک‌کننده',
  moisturizer: 'مرطوب‌کننده',
  serum: 'سرم',
  sunscreen: 'ضدآفتاب',
  treatment: 'درمان موضعی',
  mask: 'ماسک',
  eyecare: 'دور چشم',
  toner: 'تونر',
  exfoliant: 'لایه‌بردار',
  haircare: 'مراقبت از مو',
};

/**
 * قفسه محصولات.
 *
 * دو تغییر مهم:
 *  ۱) ترکیبات به دیتابیس لینک می‌شوند، پس می‌توانیم بگوییم «سرم تو با
 *     کرم شبت تداخل دارد». در نسخه ۱ ترکیبات متن آزاد بودند و بلااستفاده.
 *  ۲) تاریخ باز کردن و انقضا — در نسخه ۱ در مدل بود ولی در فرم نبود، در
 *     حالی که منو ادعای «مدیریت تاریخ انقضا» می‌کرد.
 */
export const ProductShelf: React.FC<ProductShelfProps> = ({ products, onUpdateProducts, userState }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('serum');
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [openedDate, setOpenedDate] = useState('');
  const [expirationMonths, setExpirationMonths] = useState('12');
  const [notes, setNotes] = useState('');
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

  const conflicts = useMemo(() => findShelfConflicts(products), [products]);
  const todayIso = getTodayIsoDate();

  const expiring = products.filter((product) => {
    if (!product.openedDate || !product.expirationMonths) return false;
    const expiryIso = addDays(product.openedDate, product.expirationMonths * 30);
    return getDaysDifference(todayIso, expiryIso) <= 30;
  });

  const addProduct = () => {
    if (!name.trim()) return;
    const product: Product = {
      id: createId('prod'),
      name: name.trim(),
      brand: brand.trim() || 'نامشخص',
      category,
      ingredientIds,
      customIngredients: [],
      owned: true,
      notes: notes.trim() || undefined,
      openedDate: openedDate || undefined,
      expirationMonths: parseInt(expirationMonths, 10) || undefined,
      source: 'user',
      updatedAt: new Date().toISOString(),
    };
    onUpdateProducts([product, ...products]);
    setName('');
    setBrand('');
    setIngredientIds([]);
    setOpenedDate('');
    setNotes('');
    setShowForm(false);
  };

  return (
    <div className="pb-[calc(var(--safe-bottom)+220px)] px-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-800 dark:text-white">قفسه محصولات من</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {toPersianDigits(products.length)} محصول ثبت شده
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-2xl bg-[#8e5241] text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          افزودن
        </button>
      </div>

      {/* تداخل درون قفسه — قابلیتی که نسخه ۱ از دست داده بود */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
          <h3 className="text-sm font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            در قفسه خودت تداخل داری
          </h3>
          {conflicts.slice(0, 4).map((conflict, index) => (
            <div key={index} className="p-3 rounded-2xl bg-white dark:bg-slate-900 space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-white block">
                {conflict.sameProduct
                  ? `داخل خودِ ${conflict.productNamesFa[0]}`
                  : conflict.productNamesFa.join(' و ')}
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{conflict.reasonFa}</p>
            </div>
          ))}
        </div>
      )}

      {/* یادآوری انقضا */}
      {expiring.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
          <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" />
            موعد تمام شدن نزدیک است
          </h3>
          {expiring.map((product) => (
            <p key={product.id} className="text-sm text-amber-900 dark:text-amber-200">
              {product.brand} {product.name} · تا{' '}
              {formatJalaliDayMonth(addDays(product.openedDate as string, (product.expirationMonths || 12) * 30))}
            </p>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          titleFa="قفسه‌ات خالی است"
          descriptionFa="محصولاتی که داری را اضافه کن تا روتین با همین محصولات ساخته شود و رزا بتواند تداخل‌ها را پیدا کند."
          actionLabelFa="افزودن محصول"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-black text-sm text-slate-800 dark:text-white">{product.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {product.brand} · {CATEGORY_LABELS[product.category]}
                  </p>
                </div>
                <button
                  onClick={() => onUpdateProducts(products.filter((item) => item.id !== product.id))}
                  aria-label="حذف"
                  className="icon-only p-2 rounded-xl text-slate-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {product.ingredientIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.ingredientIds.map((id) => (
                    <span
                      key={id}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                    >
                      {INGREDIENTS_DATABASE.find((item) => item.id === id)?.nameFa || id}
                    </span>
                  ))}
                </div>
              )}

              {product.notes && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{product.notes}</p>
              )}

              {/* دکمه خرید — فاز فروشگاه. تا وقتی فلگ خاموش است، نمایش داده نمی‌شود. */}
              {isFeatureEnabled('shop') && product.catalogId && (
                <button
                  onClick={() => openPurchase(product.catalogId as string, userState.deviceId)}
                  className="w-full py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  خرید دوباره
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* فرم افزودن */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[calc(var(--safe-bottom)+1rem)]">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-3 max-h-[82vh] overflow-y-auto pb-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-800 dark:text-white">محصول جدید</h3>
              <button
                onClick={() => setShowForm(false)}
                aria-label="بستن"
                className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="نام محصول"
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            />
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="برند (مانند لافارر، سینره، سی‌گل)"
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            />

            <PrettySelect label="نوع محصول" value={category} onChange={(value) => setCategory(value as ProductCategory)} options={Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ value: key, label }))} />

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setIngredientsOpen((value) => !value)} className="w-full min-h-[58px] px-4 py-3 flex items-center justify-between gap-3 text-right bg-slate-50 dark:bg-slate-800">
                <span><strong className="block text-sm font-black text-slate-800 dark:text-white">ترکیبات فعال</strong><small className="block text-xs text-slate-500 mt-1">{ingredientIds.length ? `${ingredientIds.length} ترکیب انتخاب شده` : 'برای بررسی تداخل، از روی بسته انتخاب کن'}</small></span>
                <span className={`text-slate-400 transition-transform ${ingredientsOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {ingredientsOpen && <div className="p-3 grid grid-cols-1 gap-2 bg-white dark:bg-slate-900">
                {INGREDIENTS_DATABASE.map((ingredient) => {
                  const isOn = ingredientIds.includes(ingredient.id);
                  return <button type="button" key={ingredient.id} onClick={() => setIngredientIds(isOn ? ingredientIds.filter((id) => id !== ingredient.id) : [...ingredientIds, ingredient.id])} className={`w-full min-h-[52px] px-3 rounded-xl text-sm font-bold border flex items-center gap-3 text-right ${isOn ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                    {ingredient.imageUrl && <img src={ingredient.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}{ingredient.nameFa}<span className="mr-auto">{isOn ? '✓' : '+'}</span>
                  </button>;
                })}
              </div>}
            </div>

            <JalaliDatePicker
              labelFa="تاریخ باز کردن (اختیاری)"
              value={openedDate}
              onChange={setOpenedDate}
              allowFuture={false}
            />

            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-slate-400" />
                چند ماه بعد از باز شدن تمام می‌شود؟
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 6, 12, 24].map((months) => {
                  const isOn = expirationMonths === String(months);
                  return (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setExpirationMonths(String(months))}
                      className={`relative p-3 rounded-2xl border text-center transition-colors ${
                        isOn
                          ? 'bg-[#8e5241] text-white border-[#8e5241] shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isOn && (
                        <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        </span>
                      )}
                      <span className="block text-lg font-black leading-none">{toPersianDigits(months)}</span>
                      <span className={`block mt-1 text-[11px] font-bold ${isOn ? 'text-white/80' : 'text-slate-400'}`}>ماه</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="یادداشت (اختیاری)"
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed"
            />

            <button
              onClick={addProduct}
              disabled={!name.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#8e5241] disabled:opacity-40 text-white font-bold text-sm"
            >
              ذخیره
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

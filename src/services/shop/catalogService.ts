/**
 * کاتالوگ فروشگاه (فاز آینده).
 *
 * الان خاموش است. وقتی سایت فروشگاه راه افتاد، فقط SHOP_BASE_URL را
 * در appConfig پر کن و همه دکمه‌های خرید خودبه‌خود فعال می‌شوند.
 *
 * مهم: لینک خرید همیشه در زمان اجرا ساخته می‌شود و داخل رکورد
 * محصول ذخیره نمی‌شود؛ وگرنه لینک‌های قدیمی در داده کاربر حبس می‌شوند.
 */

import { Product, ProductCategory } from '../../types';
import { REFERRAL_SOURCE, SHOP_BASE_URL, isFeatureEnabled } from '../../config/appConfig';
import { LocalDB, createId } from '../db';
import { trackReferralEvent } from '../telemetry';

export interface CatalogQuery {
  category?: ProductCategory;
  /** پیشنهاد محصول بر اساس ترکیباتی که روتین امروز لازم دارد. */
  ingredientIds?: string[];
  /** ترکیباتی که برای این کاربر ممنوعند. فروشگاه نباید آن‌ها را پیشنهاد کند. */
  excludeIngredientIds?: string[];
  maxPriceToman?: number;
  limit?: number;
}

export interface CatalogItem {
  catalogId: string;
  sku?: string;
  name: string;
  brand: string;
  category: ProductCategory;
  ingredientIds: string[];
  priceToman?: number;
  inStock: boolean;
  imageUrl?: string;
}

export interface ProductCatalog {
  readonly isAvailable: boolean;
  search(query: CatalogQuery): Promise<CatalogItem[]>;
}

const offlineCatalog: ProductCatalog = {
  isAvailable: false,
  async search() {
    return [];
  },
};

const remoteCatalog: ProductCatalog = {
  isAvailable: true,
  async search(query: CatalogQuery): Promise<CatalogItem[]> {
    try {
      const params = new URLSearchParams();
      if (query.category) params.set('category', query.category);
      if (query.ingredientIds?.length) params.set('ingredients', query.ingredientIds.join(','));
      if (query.excludeIngredientIds?.length) params.set('exclude', query.excludeIngredientIds.join(','));
      if (query.maxPriceToman) params.set('maxPrice', String(query.maxPriceToman));
      params.set('limit', String(query.limit || 12));

      const response = await fetch(`${SHOP_BASE_URL}/api/catalog/search?${params}`);
      if (!response.ok) return [];
      const json = (await response.json()) as { items?: CatalogItem[] };
      return json.items || [];
    } catch {
      return [];
    }
  },
};

export function getCatalog(): ProductCatalog {
  return isFeatureEnabled('shop') ? remoteCatalog : offlineCatalog;
}

/** لینک خرید با پارامترهای ارجاع. ملاک اتصال خرید به اپ. */
export function buildPurchaseUrl(catalogId: string, deviceId: string): string | null {
  if (!isFeatureEnabled('shop')) return null;
  const params = new URLSearchParams({
    utm_source: REFERRAL_SOURCE,
    utm_medium: 'app',
    ref: deviceId,
  });
  return `${SHOP_BASE_URL}/p/${encodeURIComponent(catalogId)}?${params}`;
}

/** کلیک روی دکمه خرید. رویداد ارجاع را صف می‌کند. */
export function openPurchase(catalogId: string, deviceId: string): void {
  const url = buildPurchaseUrl(catalogId, deviceId);
  if (!url) return;
  trackReferralEvent('product_purchase_clicked', { catalogId });
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** تبدیل یک قلم کاتالوگ به محصول قفسه کاربر. */
export function addCatalogItemToShelf(item: CatalogItem): Product {
  const product: Product = {
    id: createId('prod'),
    name: item.name,
    brand: item.brand,
    category: item.category,
    ingredientIds: item.ingredientIds,
    customIngredients: [],
    owned: true,
    source: 'directory',
    catalogId: item.catalogId,
    sku: item.sku,
    priceToman: item.priceToman,
    updatedAt: new Date().toISOString(),
  };
  LocalDB.saveProduct(product);
  return product;
}

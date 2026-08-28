/**
 * دایرکتوری آرایشگاه و پزشک.
 *
 * فاز فعلی: فقط داده خود کاربر (دفترچه شخصی).
 * فاز بعد: همین اینترفیس را remoteDirectory پر می‌کند و کامپوننت‌ها
 * اصلاً عوض نمی‌شوند. فقط API_BASE_URL را پر کن.
 */

import { Provider, ProviderKind, ProviderService, ServiceCategory } from '../../types';
import { API_BASE_URL, isFeatureEnabled } from '../../config/appConfig';

export interface DirectoryQuery {
  kind: ProviderKind;
  city?: string;
  serviceCategory?: ServiceCategory;
  limit?: number;
}

export interface DirectoryResult {
  providers: Provider[];
  services: ProviderService[];
}

export interface ProviderDirectory {
  readonly isAvailable: boolean;
  search(query: DirectoryQuery): Promise<DirectoryResult>;
}

const offlineDirectory: ProviderDirectory = {
  isAvailable: false,
  async search() {
    return { providers: [], services: [] };
  },
};

const remoteDirectory: ProviderDirectory = {
  isAvailable: true,
  async search(query: DirectoryQuery): Promise<DirectoryResult> {
    try {
      const params = new URLSearchParams({ kind: query.kind });
      if (query.city) params.set('city', query.city);
      if (query.serviceCategory) params.set('service', query.serviceCategory);
      params.set('limit', String(query.limit || 20));

      const response = await fetch(`${API_BASE_URL}/v1/directory/providers?${params}`);
      if (!response.ok) return { providers: [], services: [] };
      const json = (await response.json()) as Partial<DirectoryResult>;

      // هر چیزی که از سرور می‌آید، اجباراً source=directory می‌شود.
      // این جلوی قاطی شدن دفترچه شخصی کاربر با تبلیغات ما را می‌گیرد.
      const providers = (json.providers || []).map((provider) => ({
        ...provider,
        source: 'directory' as const,
      }));

      return { providers, services: json.services || [] };
    } catch {
      return { providers: [], services: [] };
    }
  },
};

export function getProviderDirectory(): ProviderDirectory {
  return isFeatureEnabled('providerDirectory') ? remoteDirectory : offlineDirectory;
}

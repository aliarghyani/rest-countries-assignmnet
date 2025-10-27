import { useGlobal } from '@/store';

import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse
} from 'axios';

import type { Country } from '@/interfaces/country';

import { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';

interface CountryByCodeResponse {
  name: string;
  alpha2Code: string;
  alpha3Code: string;
}

interface BorderCountriesAxiosResponse extends AxiosResponse<Country[]> {
  missingCodes: string[];
  fromCache: boolean;
}

const apiClient = axios.create({
  baseURL: 'https://restcountries.com/v3.1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('Error response:', error.response || error.message);
    return Promise.reject(error);
  }
);

export const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
export const COUNTRIES_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
export const BORDER_COUNTRIES_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const BORDER_COUNTRIES_MAX_RETRIES = 2;
const BORDER_COUNTRIES_RETRY_DELAY_MS = 300;

interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
  context?: string;
}

const buildCachedAxiosResponse = <T>(data: T): AxiosResponse<T> => {
  const config: AxiosRequestConfig = { url: '', method: 'get', headers: {} };
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: undefined
  } as AxiosResponse<T>;
};

const normalizeNameParameter = (name: string | string[]): string => {
  if (Array.isArray(name)) {
    return name.join(',');
  }
  return name;
};

const normalizeCountryCode = (code: string): string => code.trim().toLowerCase();

const uniqueNormalizedCodes = (codes: string[]): string[] => {
  const seen: Set<string> = new Set();
  const unique: string[] = [];

  codes.forEach(code => {
    const normalized = normalizeCountryCode(code);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  });

  return unique;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetryRequest = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (!status) {
    return true;
  }

  if (status === 429) {
    return true;
  }

  return status >= 500 && status < 600;
};

const performRequestWithRetry = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  options: RetryOptions = {}
): Promise<AxiosResponse<T>> => {
  const { retries = 2, retryDelayMs = 250, context } = options;
  const store = getGlobalStore();

  let attempt = 0;
  while (true) {
    if (store.isOffline()) {
      const offlineError = new Error('Offline mode: Unable to complete network request.');
      offlineError.name = 'OfflineError';
      store.reportError(offlineError, context, 'warning');
      throw offlineError;
    }

    try {
      return await requestFn();
    } catch (error) {
      attempt += 1;
      const shouldRetry = attempt <= retries && shouldRetryRequest(error);
      if (!shouldRetry) {
        store.reportError(error, context);
        throw error;
      }

      store.reportError(error, context, 'warning');
      await sleep(retryDelayMs * attempt);
    }
  }
};

const fetchBorderCountriesBatch = async (codes: string[]): Promise<Country[]> => {
  const params = new URLSearchParams({
    codes: codes.join(','),
    fields: 'name,cca2,cca3,capital,region,subregion,population,flags,tld,languages,currencies,borders'
  });

  const response = await performRequestWithRetry(
    () => apiClient.get<Country[]>(`/alpha?${params.toString()}`),
    {
      retries: BORDER_COUNTRIES_MAX_RETRIES,
      retryDelayMs: BORDER_COUNTRIES_RETRY_DELAY_MS,
      context: 'getBorderCountries'
    }
  );

  return Array.isArray(response.data) ? response.data : [];
};

const getGlobalStore = () => useGlobal();

async function scheduleCountriesBackgroundSync(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    // Try Background Sync first
    const anyReg: any = reg as any;
    if (anyReg?.sync?.register) {
      await anyReg.sync.register('sync-countries');
      return;
    }
    // Fallback to message-based sync
    reg.active?.postMessage?.({ type: 'SYNC_COUNTRIES' });
  } catch {
    // ignore
  }
}

export default {
  async getCountries(): Promise<AxiosResponse<Country[]>> {
    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all');
    const cached = store.getCachedResponse<Country[]>(cacheKey);
    if (cached) {
      // Trigger a background refresh if possible
      void scheduleCountriesBackgroundSync();
      return buildCachedAxiosResponse(cached);
    }

    if (store.isOffline()) {
      const offlineError = new Error('Offline mode: Unable to fetch the country list.');
      offlineError.name = 'OfflineError';
      store.reportError(offlineError, 'getCountries', 'warning');
      throw offlineError;
    }

    const response = await performRequestWithRetry(
      () =>
        apiClient.get<Country[]>(
          '/all?fields=name,population,region,capital,flags,borders,tld,languages,currencies'
        ),
      { context: 'getCountries', retries: 2, retryDelayMs: 300 }
    );

    if (!Array.isArray(response.data)) {
      const invalidDataError = new Error('Unexpected response format when fetching countries.');
      store.reportError(invalidDataError, 'getCountries');
      throw invalidDataError;
    }

    store.setCachedResponse(cacheKey, response.data, COUNTRIES_CACHE_TTL_MS);
    // Schedule maintenance refresh in background
    void scheduleCountriesBackgroundSync();
    return response;
  },

  async getCountryByName(name: string | string[]): Promise<AxiosResponse<Country[]>> {
    const normalizedName = normalizeNameParameter(name);
    const normalizedKey = normalizedName.toLowerCase();
    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_NAME, normalizedKey);
    const cached = store.getCachedResponse<Country[]>(cacheKey);
    if (cached) {
      return buildCachedAxiosResponse(cached);
    }

    if (store.isOffline()) {
      const offlineError = new Error(`Offline mode: Unable to fetch data for ${normalizedName}.`);
      offlineError.name = 'OfflineError';
      store.reportError(offlineError, 'getCountryByName', 'warning');
      throw offlineError;
    }

    const response = await performRequestWithRetry(
      () => apiClient.get<Country[]>(`/name/${normalizedName}`),
      { context: 'getCountryByName', retries: 2, retryDelayMs: 300 }
    );

    if (!Array.isArray(response.data)) {
      const invalidDataError = new Error(`Unexpected response format for country: ${normalizedName}.`);
      store.reportError(invalidDataError, 'getCountryByName');
      throw invalidDataError;
    }

    store.setCachedResponse(cacheKey, response.data, DEFAULT_CACHE_TTL_MS);
    return response;
  },

  async getCountryByCode(code: string): Promise<AxiosResponse<CountryByCodeResponse>> {
    const normalizedCode = normalizeCountryCode(code);
    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_CODE, normalizedCode);
    const cached = store.getCachedResponse<CountryByCodeResponse>(cacheKey);
    if (cached) {
      return buildCachedAxiosResponse(cached);
    }

    if (store.isOffline()) {
      const offlineError = new Error(`Offline mode: Unable to fetch data for code ${code}.`);
      offlineError.name = 'OfflineError';
      store.reportError(offlineError, 'getCountryByCode', 'warning');
      throw offlineError;
    }

    const response = await performRequestWithRetry(
      () => apiClient.get<CountryByCodeResponse>(`/alpha/${code}`),
      { context: 'getCountryByCode', retries: 2, retryDelayMs: 300 }
    );

    store.setCachedResponse(cacheKey, response.data, DEFAULT_CACHE_TTL_MS);
    return response;
  },

  async searchCountries(query: string): Promise<AxiosResponse<Country[]>> {
    const normalizedQuery = normalizeNameParameter(query).trim().toLowerCase();
    if (!normalizedQuery) {
      return buildCachedAxiosResponse([]);
    }

    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.SEARCH, normalizedQuery);
    const cached = store.getCachedResponse<Country[]>(cacheKey, undefined, DEFAULT_CACHE_TTL_MS);
    if (cached) {
      return buildCachedAxiosResponse(cached);
    }

    if (store.isOffline()) {
      const offlineError = new Error('Offline mode: Unable to execute search.');
      offlineError.name = 'OfflineError';
      store.reportError(offlineError, 'searchCountries', 'warning');
      throw offlineError;
    }

    const response = await performRequestWithRetry(
      () => apiClient.get<Country[]>(`/name/${encodeURIComponent(normalizedQuery)}`),
      { context: 'searchCountries', retries: 1, retryDelayMs: 250 }
    );

    const sanitized = Array.isArray(response.data) ? response.data : [];
    store.setCachedResponse(cacheKey, sanitized, DEFAULT_CACHE_TTL_MS);
    return buildCachedAxiosResponse(sanitized);
  },

  async getBorderCountriesByCodes(codes: string[]): Promise<BorderCountriesAxiosResponse> {
    const store = getGlobalStore();
    const normalizedCodes = uniqueNormalizedCodes(codes);

    if (!normalizedCodes.length) {
      const emptyResponse = buildCachedAxiosResponse<Country[]>([]) as BorderCountriesAxiosResponse;
      emptyResponse.missingCodes = [];
      emptyResponse.fromCache = true;
      return emptyResponse;
    }

    const aggregateKey = createCacheKey(CACHE_NAMESPACE.BORDER_COUNTRIES, normalizedCodes.join(','));
    const cachedAggregate = store.getCachedResponse<Record<string, Country>>(aggregateKey);
    const resultsMap: Map<string, Country> = new Map();

    if (cachedAggregate) {
      normalizedCodes.forEach(code => {
        const cachedCountry = cachedAggregate[code];
        if (cachedCountry) {
          resultsMap.set(code, cachedCountry);
        }
      });

      if (resultsMap.size === normalizedCodes.length) {
        const orderedFromCache = normalizedCodes.map(code => resultsMap.get(code)!);
        const cachedResponse = buildCachedAxiosResponse(orderedFromCache) as BorderCountriesAxiosResponse;
        cachedResponse.missingCodes = [];
        cachedResponse.fromCache = true;
        return cachedResponse;
      }
    }

    const perCodeCached = normalizedCodes.filter(code => !resultsMap.has(code));
    perCodeCached.forEach(code => {
      const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_CODE, code);
      const cachedCountry = store.getCachedResponse<Country>(cacheKey);
      if (cachedCountry) {
        resultsMap.set(code, cachedCountry);
      }
    });

    const remainingCodes = normalizedCodes.filter(code => !resultsMap.has(code));
    let usedNetwork = false;

    if (remainingCodes.length) {
      const fetchedCountries = await fetchBorderCountriesBatch(remainingCodes);
      usedNetwork = remainingCodes.length > 0;

      fetchedCountries.forEach(country => {
        const alpha3 = country.cca3 ?? country.cca2;
        if (!alpha3) {
          return;
        }
        const normalizedCode = normalizeCountryCode(alpha3);
        resultsMap.set(normalizedCode, country);
        const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_CODE, normalizedCode);
        store.setCachedResponse(cacheKey, country, DEFAULT_CACHE_TTL_MS);
      });
    }

    const finalMissingCodes = normalizedCodes.filter(code => !resultsMap.has(code));
    const orderedResults = normalizedCodes
      .map(code => resultsMap.get(code))
      .filter((country): country is Country => Boolean(country));

    if (resultsMap.size) {
      const aggregatedRecord = Array.from(resultsMap.entries()).reduce<Record<string, Country>>((acc, [code, country]) => {
        acc[code] = country;
        return acc;
      }, {});
      store.setCachedResponse(aggregateKey, aggregatedRecord, BORDER_COUNTRIES_CACHE_TTL_MS);
    }

    const response = buildCachedAxiosResponse(orderedResults) as BorderCountriesAxiosResponse;
    response.missingCodes = finalMissingCodes.map(code => code.toUpperCase());
    response.fromCache = !usedNetwork && finalMissingCodes.length === 0;
    return response;
  }
};

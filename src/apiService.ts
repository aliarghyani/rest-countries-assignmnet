import { useGlobal } from '@/store';

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

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

const fetchBorderCountriesBatch = async (codes: string[], attempt = 0): Promise<Country[]> => {
  const params = new URLSearchParams({
    codes: codes.join(','),
    fields: 'name,cca2,cca3,capital,region,subregion,population,flags,tld,languages,currencies,borders'
  });

  try {
    const response = await apiClient.get<Country[]>(`/alpha?${params.toString()}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (attempt < BORDER_COUNTRIES_MAX_RETRIES) {
      await sleep(BORDER_COUNTRIES_RETRY_DELAY_MS * (attempt + 1));
      return await fetchBorderCountriesBatch(codes, attempt + 1);
    }
    throw error;
  }
};

const getGlobalStore = () => useGlobal();

export default {
  async getCountries(): Promise<AxiosResponse<Country[]>> {
    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all');
    const cached = store.getCachedResponse<Country[]>(cacheKey);
    if (cached) {
      return buildCachedAxiosResponse(cached);
    }

    const response = await apiClient.get<Country[]>('/all?fields=name,population,region,capital,flags,borders,tld,languages,currencies');
    store.setCachedResponse(cacheKey, response.data, COUNTRIES_CACHE_TTL_MS);
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

    const response = await apiClient.get<Country[]>(`/name/${normalizedName}`);
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

    const response = await apiClient.get<CountryByCodeResponse>(`/alpha/${code}`);
    store.setCachedResponse(cacheKey, response.data, DEFAULT_CACHE_TTL_MS);
    return response;
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
      usedNetwork = true;

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

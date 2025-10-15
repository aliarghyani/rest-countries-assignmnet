import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import { useGlobal } from '@/store';
import type { Country } from '@/interfaces/country';

interface CountryByCodeResponse {
  name: string;
  alpha2Code: string;
  alpha3Code: string;
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

const CACHE_NAMESPACE = {
  COUNTRIES: 'countries',
  COUNTRY_BY_NAME: 'country-by-name',
  COUNTRY_BY_CODE: 'country-by-code'
} as const;

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const COUNTRIES_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const createCacheKey = (...segments: Array<string | number>): string =>
  segments
    .map(segment => segment.toString().trim().toLowerCase())
    .filter(Boolean)
    .join('::');

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

const getGlobalStore = () => useGlobal();

export default {
  async getCountries(): Promise<AxiosResponse<Country[]>> {
    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all');
    const cached = store.getCachedResponse<Country[]>(cacheKey);
    if (cached) {
      return buildCachedAxiosResponse(cached);
    }

    const response = await apiClient.get<Country[]>('/all?fields=name,population,region,capital,flags');
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
    const normalizedCode = code.trim().toLowerCase();
    const store = getGlobalStore();
    const cacheKey = createCacheKey(CACHE_NAMESPACE.COUNTRY_BY_CODE, normalizedCode);
    const cached = store.getCachedResponse<CountryByCodeResponse>(cacheKey);
    if (cached) {
      return buildCachedAxiosResponse(cached);
    }

    const response = await apiClient.get<CountryByCodeResponse>(`/alpha/${code}`);
    store.setCachedResponse(cacheKey, response.data, DEFAULT_CACHE_TTL_MS);
    return response;
  }
};

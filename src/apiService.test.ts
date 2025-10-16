/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useGlobal } from '@/store';
import { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';

const { mockGet, axiosInstance } = vi.hoisted(() => {
  const get = vi.fn();
  return {
    mockGet: get,
    axiosInstance: {
      get,
      interceptors: { response: { use: vi.fn() } }
    }
  };
});

vi.mock('axios', () => ({
  __esModule: true,
  default: {
    create: vi.fn(() => axiosInstance),
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
  },
  create: vi.fn(() => axiosInstance),
  isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
  AxiosError: class extends Error {
    public isAxiosError = true;
    constructor(message?: string, public response?: { status?: number }) {
      super(message);
    }
  }
}));

import apiService from '@/apiService';

const sampleCountries = [
  {
    name: { common: 'Poland' },
    flags: { png: 'poland.png' },
    population: 100,
    region: 'Europe'
  }
];

describe('apiService caching and offline behaviour', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useGlobal();
    store.invalidateCache();
    store.setOffline(false);
    mockGet.mockReset();
  });

  it('caches country list responses after first call', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleCountries });
    const store = useGlobal();

    const first = await apiService.getCountries();
    expect(first.data).toEqual(sampleCountries);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(store.getCachedResponse(createCacheKey(CACHE_NAMESPACE.COUNTRIES, 'all'))).toEqual(
      sampleCountries
    );

    const second = await apiService.getCountries();
    expect(second.data).toEqual(sampleCountries);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('throws when offline without cached data', async () => {
    const store = useGlobal();
    store.setOffline(true);

    await expect(apiService.getCountries()).rejects.toThrow('Offline mode');
  });

  it('caches search queries', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleCountries });
    const store = useGlobal();
    store.setOffline(false);

    const first = await apiService.searchCountries('Poland');
    expect(first.data).toEqual(sampleCountries);
    expect(mockGet).toHaveBeenCalledTimes(1);

    const second = await apiService.searchCountries('Poland');
    expect(second.data).toEqual(sampleCountries);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

describe('useGlobal store helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('tracks suggestions, analytics, and errors', () => {
    const store = useGlobal();
    store.setSearchSuggestions(['Poland', 'Portugal', 'Poland']);
    expect(store.searchSuggestions.length).toBeGreaterThan(0);

    store.recordSearchEvent('poland', 1);
    expect(store.searchAnalytics.length).toBe(1);

    const errorEntry = store.reportError(new Error('failure'), 'test');
    expect(store.lastError).toEqual(errorEntry);
    store.clearLastError();
    expect(store.lastError).toBeNull();
  });
});



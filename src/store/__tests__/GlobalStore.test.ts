/// <reference types="vitest" />
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import useGlobal, { CACHE_NAMESPACE, createCacheKey } from '@/store/GlobalStore';

describe('GlobalStore cache and state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sets and retrieves cached responses with TTL', () => {
    const store = useGlobal();
    const key = createCacheKey(CACHE_NAMESPACE.SEARCH, 'foo');
    store.setCachedResponse(key, { data: 1 }, 100);

    const value = store.getCachedResponse<any>(key);
    expect(value).toEqual({ data: 1 });

    // Age is tracked
    const age = store.getCacheAge(key);
    expect(typeof age).toBe('number');
    // Manually clear expired (no-op if not expired yet)
    store.clearExpiredCache();
  });

  it('invalidates cache entries and enforces capacity', () => {
    const store = useGlobal();
    for (let i = 0; i < 60; i++) {
      const key = createCacheKey(CACHE_NAMESPACE.SEARCH, `k${i}`);
      store.setCachedResponse(key, i, 1000);
    }
    // cacheSize is bounded (see GlobalStore)
    expect(store.cacheSize()).toBeLessThanOrEqual(50);

    // Invalidate by regexp
    store.invalidateCache(/search::k[0-9]+/);
    expect(store.cacheSize()).toBe(0);
  });

  it('tracks search suggestions and analytics', () => {
    const store = useGlobal();
    store.setSearchSuggestions(['Poland', 'Portugal']);
    expect(store.searchSuggestions).toEqual(['Poland', 'Portugal']);
    store.clearSearchSuggestions();
    expect(store.searchSuggestions).toEqual([]);

    store.recordSearchEvent('pol', 2);
    expect(store.searchAnalytics.length).toBe(1);
    expect(store.searchAnalytics[0].query).toBe('pol');
  });

  it('handles offline flag and error reporting', () => {
    const store = useGlobal();
    store.setOffline(true);
    expect(store.isOffline()).toBe(true);
    store.setOffline(false);
    expect(store.isOffline()).toBe(false);

    store.reportError(new Error('boom'), 'ctx', 'warning');
    expect(store.errorLog.length).toBeGreaterThan(0);
    expect(store.lastError?.message).toContain('boom');
    store.clearLastError();
    store.clearErrorLog();
    expect(store.errorLog.length).toBe(0);
    expect(store.lastError).toBeNull();
  });
});

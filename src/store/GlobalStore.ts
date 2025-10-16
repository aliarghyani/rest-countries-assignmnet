import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

interface CacheEntry<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt: number;
}

const CACHE_DEFAULT_TTL_MS = 1000 * 60 * 5; // 5 minutes
const CACHE_MAX_ENTRIES = 50;
export const CACHE_NAMESPACE = {
  COUNTRIES: 'countries',
  COUNTRY_BY_NAME: 'country-by-name',
  COUNTRY_BY_CODE: 'country-by-code',
  BORDER_COUNTRIES: 'border-countries'
} as const;

const now = (): number => Date.now();

/** Global Store */
export default defineStore(
  'global',
  () => {
    // State

    /** Loading overlay */
    const loading: Ref<boolean> = ref(true);
    /** ProgressBar Percentage */
    const progress: Ref<number | null> = ref(null);
    /** SnackBar Text */
    const message: Ref<string> = ref('');

    const cacheEntries: Ref<Record<string, CacheEntry>> = ref({});
    const cacheOrder: Ref<string[]> = ref([]);

    const removeCacheKey = (key: string): void => {
      if (cacheEntries.value[key]) {
        delete cacheEntries.value[key];
      }

      const orderIndex = cacheOrder.value.indexOf(key);
      if (orderIndex !== -1) {
        cacheOrder.value.splice(orderIndex, 1);
      }
    };

    const pruneExpiredEntries = (timestamp = now()): void => {
      cacheOrder.value.slice().forEach(key => {
        const entry = cacheEntries.value[key];
        if (!entry) {
          removeCacheKey(key);
          return;
        }

        if (entry.expiresAt <= timestamp) {
          removeCacheKey(key);
        }
      });
    };

    const enforceCapacityLimit = (): void => {
      while (cacheOrder.value.length > CACHE_MAX_ENTRIES) {
        const oldestKey = cacheOrder.value[0];
        removeCacheKey(oldestKey);
      }
    };

    /**
     * Show loading Overlay
     *
     * @param display - visibility
     */
    function setLoading(display: boolean): void {
      loading.value = display;
      if (!display) {
        // Reset Progress value
        progress.value = null;
      }
    }

    /**
     * Update progress value
     *
     * @param v - progress value
     */
    function setProgress(v: number | null = null): void {
      // update progress value
      progress.value = v;
      // display loading overlay
      loading.value = true;
    }

    /**
     * Show snackbar message
     *
     * @param msg - snackbar message
     */
    function setMessage(msg = ''): void {
      // put snackbar text
      message.value = msg;
    }

    function getCachedResponse<T>(key: string, timestamp = now()): T | null {
      pruneExpiredEntries(timestamp);
      const entry = cacheEntries.value[key];
      if (!entry) {
        return null;
      }
      return entry.value as T;
    }

    function setCachedResponse<T>(key: string, value: T, ttlMs = CACHE_DEFAULT_TTL_MS): void {
      const timestamp = now();
      pruneExpiredEntries(timestamp);

      const expiresAt = timestamp + ttlMs;
      cacheEntries.value[key] = {
        value,
        createdAt: timestamp,
        expiresAt
      };

      const existingIndex = cacheOrder.value.indexOf(key);
      if (existingIndex !== -1) {
        cacheOrder.value.splice(existingIndex, 1);
      }
      cacheOrder.value.push(key);
      enforceCapacityLimit();
    }

    function invalidateCache(keys?: string | string[] | RegExp): void {
      if (!keys) {
        cacheEntries.value = {};
        cacheOrder.value = [];
        return;
      }

      const predicate =
        typeof keys === 'string'
          ? (key: string) => key === keys
          : Array.isArray(keys)
            ? (key: string) => keys.includes(key)
            : (key: string) => keys.test(key);

      cacheOrder.value.slice().forEach(key => {
        if (predicate(key)) {
          removeCacheKey(key);
        }
      });
    }

    function getCacheEntryMeta(key: string): CacheEntry | undefined {
      return cacheEntries.value[key];
    }

    function clearExpiredCache(): void {
      pruneExpiredEntries();
    }

    function cacheSize(): number {
      return cacheOrder.value.length;
    }

    // Ensure persisted cache does not keep stale entries on initialization
    pruneExpiredEntries();

    return {
      loading,
      progress,
      message,
      cacheEntries,
      cacheOrder,
      setLoading,
      setProgress,
      setMessage,
      getCachedResponse,
      setCachedResponse,
      invalidateCache,
      getCacheEntryMeta,
      clearExpiredCache,
      cacheSize
    };
  },
  {
    persist: {
      pick: ['cacheEntries', 'cacheOrder']
    }
  }
);

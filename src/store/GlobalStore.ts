import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

interface CacheEntry<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt: number;
}

interface ReportedError {
  message: string;
  context?: string;
  stack?: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: number;
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
export const createCacheKey = (...segments: (string | number)[]): string =>
  segments
    .map(segment => segment.toString().trim().toLowerCase())
    .filter(Boolean)
    .join('::');

let networkStatusListenersAttached = false;
let errorListenersAttached = false;

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
    const offline: Ref<boolean> = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const errorLog: Ref<ReportedError[]> = ref([]);
    const lastError: Ref<ReportedError | null> = ref(null);

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

    function setOffline(value: boolean): void {
      offline.value = value;
    }

    function isOffline(): boolean {
      return offline.value;
    }

    function normalizeError(
      error: unknown,
      context?: string,
      severity: ReportedError['severity'] = 'error'
    ): ReportedError {
      let message = 'An unexpected error occurred.';
      let stack: string | undefined;

      if (error instanceof Error) {
        message = error.message || message;
        stack = error.stack;
      } else if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null) {
        const maybeMessage = (error as { message?: string }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
          message = maybeMessage;
        }
      }

      return {
        message,
        context,
        stack,
        severity,
        timestamp: now()
      };
    }

    function trimErrorLog(): void {
      const MAX_ENTRIES = 50;
      if (errorLog.value.length > MAX_ENTRIES) {
        errorLog.value = errorLog.value.slice(-MAX_ENTRIES);
      }
    }

    function reportError(
      error: unknown,
      context?: string,
      severity: ReportedError['severity'] = 'error'
    ): ReportedError {
      const entry = normalizeError(error, context, severity);
      lastError.value = entry;
      errorLog.value = [...errorLog.value, entry];
      trimErrorLog();

      if (severity === 'error' && !message.value) {
        setMessage(entry.message);
      }

      if (typeof console !== 'undefined') {
        const label = `[${entry.severity.toUpperCase()}]${context ? ` [${context}]` : ''}`;
        console.error(label, error);
      }

      return entry;
    }

    function clearLastError(): void {
      lastError.value = null;
    }

    function clearErrorLog(): void {
      errorLog.value = [];
    }

    if (!networkStatusListenersAttached && typeof window !== 'undefined') {
      window.addEventListener('online', () => setOffline(false));
      window.addEventListener('offline', () => setOffline(true));
      networkStatusListenersAttached = true;
    }
    if (!errorListenersAttached && typeof window !== 'undefined') {
      window.addEventListener('error', event => {
        reportError(event.error ?? event.message, 'global-error');
      });
      window.addEventListener('unhandledrejection', event => {
        reportError(event.reason, 'unhandled-rejection');
      });
      errorListenersAttached = true;
    }

    function getCacheEntryMeta(key: string): CacheEntry | undefined {
      return cacheEntries.value[key];
    }

    function isCacheFresh(key: string, freshnessMs = CACHE_DEFAULT_TTL_MS, timestamp = now()): boolean {
      pruneExpiredEntries(timestamp);
      const entry = cacheEntries.value[key];
      if (!entry) {
        return false;
      }
      return entry.createdAt + freshnessMs >= timestamp;
    }

    function getCacheAge(key: string, timestamp = now()): number | null {
      const entry = cacheEntries.value[key];
      if (!entry) {
        return null;
      }
      return timestamp - entry.createdAt;
    }

    function getCachedResponse<T>(key: string, timestamp = now(), freshnessMs?: number): T | null {
      pruneExpiredEntries(timestamp);
      const entry = cacheEntries.value[key];
      if (!entry) {
        return null;
      }
      if (typeof freshnessMs === 'number' && entry.createdAt + freshnessMs < timestamp) {
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
      offline,
      errorLog,
      lastError,
      setLoading,
      setProgress,
      setMessage,
      setOffline,
      isOffline,
      reportError,
      clearLastError,
      clearErrorLog,
      getCachedResponse,
      setCachedResponse,
      invalidateCache,
      getCacheEntryMeta,
      isCacheFresh,
      getCacheAge,
      clearExpiredCache,
      cacheSize
    };
  },
  {
    persist: {
      pick: ['cacheEntries', 'cacheOrder', 'offline', 'errorLog', 'lastError']
    }
  }
);

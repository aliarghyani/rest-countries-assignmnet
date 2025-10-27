/* Development-only debug helpers. Attach utilities to window for quick inspection. */
import { useGlobal } from '@/store';
import type { App } from 'vue';

import router from '@/router';

declare global {
  interface Window {
    __debug?: Record<string, unknown>;
  }
}

export function installDebugTools(app?: App): void {
  if (typeof window === 'undefined') return;
  const global = useGlobal();

  const api = {
    app,
    router,
    global,
    // Cache helpers
    cache: {
      size: () => global.cacheSize(),
      clearAll: () => global.invalidateCache(),
      invalidateNamespace: (ns: string) => global.invalidateNamespace(ns),
      invalidateOlderThan: (ms: number) => global.invalidateOlderThan(ms),
      get: (key: string) => global.getCacheEntryMeta(key)
    },
    // Network helpers
    offline: {
      enable: () => global.setOffline(true),
      disable: () => global.setOffline(false),
      toggle: () => global.setOffline(!global.isOffline()),
      status: () => global.isOffline()
    },
    // Messaging
    alert: (msg: string) => global.setMessage(msg)
  };

  window.__debug = api;

  console.info(
    '[devtools] window.__debug available: { app, router, global, cache, offline, alert }'
  );
}

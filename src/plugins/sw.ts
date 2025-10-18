/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Take control asap
self.skipWaiting();
clientsClaim();

// Precache assets injected at build time
// @ts-ignore - injected by workbox
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const API_ORIGIN = 'https://restcountries.com';
const ALL_URL = `${API_ORIGIN}/v3.1/all?fields=name,population,region,capital,flags,borders,tld,languages,currencies`;

// Background sync for GET requests (retries when offline)
const bgSync = new BackgroundSyncPlugin('countries-queue', { maxRetentionTime: 24 * 60 });

// API caching: prefer network with fallback and update cache on success
registerRoute(
  ({ url, request }) => url.origin === API_ORIGIN && url.pathname.startsWith('/v3.1/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-restcountries',
    networkTimeoutSeconds: 3,
    plugins: [bgSync]
  })
);

// Images: cache-first with expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })]
  })
);

async function syncCountries() {
  try {
    const cache = await caches.open('api-restcountries');
    const req = new Request(ALL_URL, { mode: 'cors' });
    const res = await fetch(req);
    if (res && res.ok) {
      await cache.put(req, res.clone());
    }
  } catch {
    // ignore
  }
}

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-countries') {
    event.waitUntil(syncCountries());
  }
});

self.addEventListener('message', (event: any) => {
  if (event?.data?.type === 'SYNC_COUNTRIES') {
    event.waitUntil(syncCountries());
  }
});


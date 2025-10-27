# Architecture

This project is a Vue 3 + TypeScript single‑page application built on Vite and Vuetify with an offline‑first caching layer and comprehensive testing and documentation.

## High‑Level Overview

- UI: Vue 3 Composition API with Vuetify 3 components
- Routing: `src/router.ts` with query sanitization and breadcrumb/title resolvers
- State: Pinia stores in `src/store` with persisted state
- API: Axios wrapper in `src/apiService.ts` with retry + cache integration
- Caching: In‑memory LRU with TTL in `src/store/GlobalStore.ts`
- PWA: Service worker via `vite-plugin-pwa` using injectManifest (`src/plugins/sw.ts`)
- Testing: Vitest unit tests, Storybook interactions + a11y, Playwright E2E

## Code Organization

- `src/components` – Reusable UI (e.g., `CountryGrid.vue`, `SingleCountry.vue`)
- `src/views` – Route views (`HomeView.vue`, `CountryDetails.vue`)
- `src/store` – Pinia stores; `GlobalStore.ts` implements cache, offline, analytics
- `src/apiService.ts` – All REST Countries API interactions
- `src/plugins` – Vuetify, PWA service worker (`sw.ts`)
- `src/perf` – Lightweight performance metrics (`metrics.ts`)
- `src/devtools` – Dev‑only debug and performance overlay utilities

## Routing & Navigation

- Routes in `src/router.ts`:
  - Home (`/`): validates query (`search`, `region`, `sort`)
  - Details (`/:name`): validates country param, sets dynamic title and breadcrumb
- Guards ensure canonical query/param formats and update document title.

## State & Caching

- Global store: `useGlobal()` (Pinia)
  - UI state: loading, progress, message, offline flag
  - Cache: `{ value, createdAt, expiresAt }` entries with LRU order
  - Search analytics/suggestions
  - Helpers: `getCachedResponse`, `setCachedResponse`, `isCacheFresh`, `invalidateCache`, `invalidateNamespace`, `invalidateOlderThan`, size and age helpers
- Namespaces (keys like `namespace::id`):
  - `countries`, `country-by-name`, `country-by-code`, `border-countries`, `search`

## API Layer

- Axios client in `src/apiService.ts` with a generic `performRequestWithRetry`
- Read flows (examples):
  - `getCountries()` – prefer cache, schedule background sync, fetch & refresh
  - `getCountryByName()` / `getCountryByCode()` – per‑item caches
  - `getBorderCountriesByCodes()` – batch fetch + per‑code hydration into caches
- Offline behavior: throws explicit OfflineError; store records diagnostic messages

## PWA & Offline‑First

- `vite-plugin-pwa` in injectManifest mode points to `src/plugins/sw.ts`
- SW features:
  - Precache app shell
  - NetworkFirst for REST Countries API with Background Sync
  - CacheFirst for images with expiration
  - Message and sync events to refresh country list cache

## UI & Accessibility

- Keyboard and SR support in `SingleCountry.vue` (link role, focus ring, describedby)
- Grid semantics in `CountryGrid.vue` (role=list/listitem, status messages)
- Details view announces page change (focus H1, breadcrumb nav)

## Dev & Tooling

- `window.__debug` with cache/offline helpers (`src/devtools/debug.ts`)
- Optional dev performance overlay (`src/devtools/performance.ts`)

---

## Data Flow Diagram (Simplified)

1. User lands on Home → `CountryGrid` mounts → store checks cache → calls `apiService.getCountries()`
2. If cached → render immediately; SW/Background Sync refreshes in the background
3. If online + stale → network → response cached → grid updates
4. Details view uses by‑name cache; borders hydrate from aggregate/per‑code caches


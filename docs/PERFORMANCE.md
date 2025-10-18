# Performance Guide

This document explains performance features and how to verify them.

## Runtime Optimizations

- Metrics overlay (dev): set `VITE_DEV_PERF_OVERLAY=true` to see FPS + vitals.
- Lightweight metrics: `src/perf/metrics.ts` captures TTFB, FCP, LCP, CLS, FID and can `sendBeacon` to a custom endpoint.
- Virtual scroll (design): grid was kept as a standard responsive layout for UX consistency. A row‑based virtualization can be added later without breaking layout.

## Build Optimizations

- Code splitting in `vite.config.ts`:
  - `vue`, `vuetify`, `materialdesignicons`, `vendor_utils` split for better caching.
  - `esbuild` minification; drops `console` and `debugger` in production.
  - Dependency pre‑opt in dev for faster HMR (`optimizeDeps.include`).
  - Visualizer on `--mode analyze` produces `dist/stats.html`.

## PWA & Caching

- Injected service worker (`src/plugins/sw.ts`):
  - NetworkFirst for REST Countries API with Background Sync plugin.
  - CacheFirst for images with expiration.
  - Precache app shell, take control on first load.
  - Supports manual refresh via `postMessage({ type: 'SYNC_COUNTRIES' })`.

## Background Sync

- API service schedules a background sync from `getCountries()` so cached views refresh automatically when online.

## Budgets & Audits

- `lighthouserc.json` defines category minimums (performance ≥ 0.95) and important budgets (LCP, CLS, JS weight).
- CI runs LHCI on built assets (see `.github/workflows/ci.yml`).

## Troubleshooting

- Large icon CSS chunk: ensure `@mdi/font` is split (configured under `materialdesignicons`).
- Service worker not updating: clear storage and unregister SW in Application panel; ensure production build + served over HTTP(S).
- CLS issues from images: keep width/height or explicit container sizes (`v-img` uses fixed height in cards).


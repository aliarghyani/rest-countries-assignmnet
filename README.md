# Country Explorer

Explore country data with ease in this interactive project built with Vue 3 + TypeScript and Vuetify. Data comes from the REST Countries API and is presented with fast search, region filters, and sort options. The UI supports light/dark themes and aims for strong accessibility and performance out of the box.

Live Demo: https://rest-countries-assignmnet-final.vercel.app/

## Features

- Homepage lists all countries with key facts (flag, population, region, capital).
- Search with typo tolerance and suggestions; filter by region; sort by name or population.
- Country details route with neighbor navigation and friendly breadcrumbs.
- Light/dark theme via Vuetify; responsive layout across breakpoints.
- Robust error handling, offline-aware cache, and graceful fallbacks.
- Storybook with docs, interactions, and a11y checks for core components.

## Tech Stack

- Vue 3 (Composition API, TypeScript), Vite, Vue Router
- Pinia with persisted state for caching and offline support
- Vuetify 3 UI library
- Vitest + Vue Test Utils for unit tests
- Storybook (Vue3 + Vite) with Addons: Essentials, Interactions, A11y

## Getting Started

Prerequisites: Node 20+, pnpm 9+

Install dependencies:

```
pnpm install
```

Run in development:

```
pnpm dev
```

Build for production:

```
pnpm build
```

Preview built output:

```
pnpm preview:dist
```

## Scripts

- `dev` – start Vite dev server
- `build` – type-check then build for production
- `build:clean` – remove `dist`
- `build:analyze` – build with visualizer report
- `preview` / `preview:dist` – preview production build
- `test`, `test:coverage`, `test:unit` – run unit tests
- `lint`, `lint:style`, `format` – code quality and formatting
- `check` – run type-check, lint, and tests in parallel
- `storybook`, `storybook:build`, `storybook:test` – Storybook dev/build/tests

## Configuration (.env)

Create a `.env` or `.env.production` as needed:

- `VITE_APP_TITLE` – Application title for the document
- `VITE_APP_WEBSTORAGE_NAMESPACE` – Storage key namespace for Pinia persistence
- `VITE_ENABLE_PERF_METRICS` – Set to `true` to enable runtime performance metrics

## Architecture Overview

- `src/components` – UI components (e.g., `SingleCountry`, `CountryGrid`)
- `src/views` – Route views (`HomeView`, `CountryDetails`)
- `src/store` – Pinia stores (`GlobalStore` handles cache, status, suggestions)
- `src/apiService.ts` – API fetch + cache TTL controls
- `src/router.ts` – Routes, query sanitization, and title/breadcrumb resolvers
- `src/plugins` – Vuetify and webfont loader
- `src/perf/metrics.ts` – Lightweight performance metrics (LCP, CLS, FID, TTFB)

## Performance

- Code splitting: vendor (`vue`, `vuetify`) and icons split into dedicated chunks.
- Production build optimizations in `vite.config.ts`:
  - `esbuild` minification and console stripping.
  - Compressed size calculation disabled for faster CI builds.
  - Chunk warning limit tuned for Vuetify.
- Runtime metrics: opt-in web-vitals-style monitoring (LCP, CLS, FID, TTFB). Enable with `VITE_ENABLE_PERF_METRICS=true`.
- Lazy-loaded images and list virtualization via Vuetify (`v-lazy`).

## Accessibility

- Global skip link to main content; `v-app` and `v-main` semantics.
- All inputs use explicit labels; select menus use descriptive labels.
- Country cards keyboard accessible (role=link, tabindex, Enter/Space to activate).
- Flags include textual `alt` fallback.
- Storybook includes a11y addon and tests for proactive auditing.

## Testing

- Unit tests via Vitest and Vue Test Utils (`pnpm test`).
- Storybook interaction tests and accessibility checks (`pnpm storybook:test`).
- E2E tests via Playwright (`pnpm e2e`), cross-browser (Chromium/Firefox/WebKit). Run `pnpm e2e:install` once to install browsers. Open UI with `pnpm e2e:ui` and report with `pnpm e2e:report`.

## Developer Tools

- Dev perf overlay: set `VITE_DEV_PERF_OVERLAY=true` (dev only). An overlay shows FPS and core metrics (TTFB, FCP, LCP, CLS, FID). Code: `src/devtools/performance.ts`.
- Debug helpers: `window.__debug` exposes `{ app, router, global, cache, offline, alert }` for quick inspection. Code: `src/devtools/debug.ts`.
- VS Code settings: see `.vscode/settings.json` for ESLint/Stylelint/Prettier on save and Volar takeover.

## Production Monitoring

- Error tracking: set `VITE_ERROR_ENDPOINT` to a POST endpoint to receive JSON error payloads (window error/unhandledrejection with message/stack/url/ua/release). Implemented in `src/monitoring.ts` using sendBeacon when available.
- Analytics: set `VITE_GA_ID` to a Google Analytics 4 Measurement ID. A lightweight `gtag` injector is used and page views are tracked on router navigation.
- Performance metrics: set `VITE_ENABLE_PERF_METRICS=true` to log core web vitals (see `src/perf/metrics.ts`). You can also set a `reporterUrl` via custom initialization if you integrate the overlay.

## Deployment Automation

- Vercel: Project configured via `vercel.json` (build `pnpm build`, output `dist`, SPA rewrites). Recommended for production.
- GitHub Pages (App): workflow exists but is now manual-only; Vercel handles prod deploys.
- GitHub Pages (Storybook): workflow is manual-only to avoid duplicate hosting.

## Important Env Vars

- `VITE_ENABLE_PERF_METRICS` (true/false) – enable runtime metrics logging
- `VITE_ERROR_ENDPOINT` – error tracking collector endpoint (optional)
- `VITE_GA_ID` – Google Analytics 4 measurement ID (optional)

## Storybook

- Start: `pnpm storybook`
- Build static: `pnpm storybook:build`
- Docs: autodocs enabled via story tags; see `src/stories/*`.
- Vuetify is registered globally for stories via `.storybook/preview.ts`.

## Deployment

- Run `pnpm build`; deploy the contents of `dist/` to your host (Vercel, Netlify, etc.).
- SPA history fallback handled by custom Vite middleware in dev/preview. Ensure your host rewrites to `index.html`.

## Notes

- The app is offline-aware and uses a simple cache with TTL to deliver fast repeat visits.
- API failures are surfaced to users via a snackbar and routed to a safe state.

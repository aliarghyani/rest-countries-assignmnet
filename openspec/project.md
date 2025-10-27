# Project Context

## Purpose
Country Explorer is a Vue 3 SPA that surfaces REST Countries data with fast search, filtering, and country detail views. The goal is to deliver an accessible, performant browsing experience with resilient offline caching and progressive enhancement.

## Tech Stack
- Vue 3 (Composition API, TypeScript) powered by Vite and Vue Router
- Vuetify 3 for theming, responsive layout, and UI components
- Pinia + pinia-plugin-persistedstate for client-side cache and offline resilience
- Axios for REST Countries API calls and Fuse.js for fuzzy search suggestions
- Quality tooling: Vitest, Playwright, Storybook, Lighthouse CI, ESLint, Stylelint, Prettier

## Project Conventions

### Code Style
- Prettier enforced (printWidth 100, 2-space indent, semicolons, single quotes, LF endings); `pnpm format` and lint-staged ensure consistency.
- Flat ESLint config merges TypeScript, Vue 3, accessibility, and import-order rules; aliases resolve `@/*` paths and group imports per `import/order`.
- Stylelint (recommended SCSS + Vue configs) governs style blocks and global styles; prefer Vuetify tokens and scoped styles where practical.
- Husky + lint-staged run ESLint, Stylelint, and Prettier on staged files before commits.

### Architecture Patterns
- SPA structure with route-level `views` and reusable `components`, wired through `src/router.ts`.
- Data access centralized in `src/apiService.ts`, providing TTL-based caching, offline fallbacks, and typed helpers from `src/interfaces`.
- Global state lives in Pinia stores under `src/store`, persisting user selections, cache metadata, and UI flags; notifications handled via `@kyvg/vue3-notification`.
- Performance tooling: lazy route chunks, chunk-splitting configuration in `vite.config.ts`, optional metrics overlays in `src/perf` and `src/devtools`.

### Testing Strategy
- Unit and component tests via Vitest (`pnpm test`, `pnpm test:coverage`) using Vue Test Utils and shared setup in `src/test-setup.ts`.
- Storybook interaction/a11y tests (`pnpm storybook:test`) plus Loki visual regression workflow for approving UI changes.
- Playwright e2e suite (`pnpm e2e`) exercises key flows across Chromium, Firefox, and WebKit; reports stored under `playwright-report`.
- CI (`.github/workflows/ci.yml`) enforces type-check, lint, stylelint, coverage, Vite build, and Lighthouse budgets on pushes to `main`.

### Git Workflow
- `main` is the protected integration branch; Vercel auto-deploys from `main`.
- Develop features on topic branches, open PRs, and wait for CI (pnpm install -> type-check -> lint/stylelint -> tests -> build -> Lighthouse) before merge.
- Husky pre-commit hook runs lint-staged for ESLint, Stylelint, and Prettier; fix issues locally before pushing.
- Manual GitHub Pages workflows (`deploy-app.yml`, `storybook.yml`) available for ad-hoc static deployments when needed.

## Domain Context
- Consumes REST Countries v3 API for country metadata (population, region, capital, currencies, borders, flags).
- Core journeys: search with typo tolerance and suggestions, region filtering, sort by name/population, detailed country pages with neighbor navigation and breadcrumbs.
- Accessibility and resilience are first-class: Vuetify theming (light/dark), keyboardable components, alt text for flags, offline-aware cache, and graceful error handling/snackbars.

## Important Constraints
- Maintain Lighthouse scores >= 0.95 for performance, accessibility, and best practices; thresholds codified in `lighthouserc.json`.
- Support Node >= 20 and pnpm 9; CI/workflows assume deterministic pnpm lockfile.
- API usage must stay cache-friendly to limit REST Countries calls and preserve offline experience; avoid redundant fetch patterns.
- Watch bundle size: existing Vite config splits vendors/icons and strips console; justify additional heavy dependencies before adding.

## External Dependencies
- REST Countries API (`https://restcountries.com/v3.1`) supplies live data; persisted cache provides offline fallback.
- Vercel hosts production per `vercel.json`; optional manual GitHub Pages deploy workflows for app and Storybook.
- Optional telemetry: `VITE_ERROR_ENDPOINT` for error reporting, `VITE_GA_ID` for GA4 analytics, `VITE_ENABLE_PERF_METRICS` for web-vitals logging.
- Webfont loading via `webfontloader` (Google Fonts) and Material Design Icons (`@mdi/font`).

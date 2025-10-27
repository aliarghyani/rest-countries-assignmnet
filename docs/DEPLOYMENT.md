# Deployment Guide

This document describes how to deploy the app and Storybook, plus CI considerations and troubleshooting.

## Build

- Production build: `pnpm build`
- Preview locally: `pnpm preview:dist` (serves `dist/` on port 4173)

## Hosting Options

- Vercel / Netlify
  - Output directory: `dist`
  - Single‑Page App rewrite: all routes → `/index.html`
  - Environment vars (optional):
    - `VITE_ENABLE_PERF_METRICS=true` to enable runtime metrics beaconing

- GitHub Pages (Storybook)
  - Workflow: `.github/workflows/storybook.yml` builds and deploys to Pages on `main`
  - Output directory: `storybook-static`

## CI Workflows

- CI: `.github/workflows/ci.yml`
  - Type check, lint, unit tests with coverage, build
  - Lighthouse CI runs against built `dist` and uploads a temporary report
- E2E: `.github/workflows/e2e.yml`
  - Installs Playwright browsers, runs cross‑browser tests
  - Uploads HTML report and results

## PWA / Service Worker

- Service worker is generated via `vite-plugin-pwa` with **injectManifest** configuration:
  - Source: `src/plugins/sw.ts`
  - Registers automatically in production
  - To test locally, use `pnpm build` + `pnpm preview:dist` (SWs require a production‑like server)

## Troubleshooting

- 404s on deep links
  - Ensure SPA rewrites to `/index.html` on your host
- SW not updating
  - In the browser devtools: Application → Service Workers → Unregister → Hard reload
- Playwright flakes in CI
  - Use `pnpm e2e:install` locally to match CI browsers; re‑run failed tests with `--debug`
- Lighthouse budget failures
  - Check `dist/stats.html` when building with `--mode analyze`
  - Review `lighthouserc.json` thresholds and consider code splitting or removing unused code


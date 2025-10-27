## Why
- The current country details view is a utilitarian list with minimal hierarchy, so key facts and navigation cues are easy to miss.
- The design does not clearly separate loading, errored, and offline states, which hurts perceived quality and accessibility.
- We want the page to feel consistent with the rest of the app's material-inspired visual language while remaining performant.

## What Changes
- Introduce a hero layout that pairs the country flag with a surfaced summary card (name, native name, population, region) and keeps the back/breadcrumb controls visible.
- Add a quick-facts grid using Vuetify cards & icon chips for currencies, languages, top-level domain, timezones, and capital, optimized for responsive breakpoints.
- Refresh the border navigation section with a titled container, chip styling that signals interactivity, and clear empty/offline/error messaging.
- Update skeleton loaders and lazy states so the enhanced layout has graceful loading transitions and screen-reader cues.
- Provide Storybook documentation and unit coverage for the detailed view to validate layout states (default, loading, no borders, offline cache).

## Impact
- Touches `src/views/CountryDetails.vue` plus any extracted components, associated store helpers, and test/story files.
- Requires Vue/Vuetify styling updates; ensure new components reuse existing tokens to avoid bundle growth.
- Add/adjust unit tests, Storybook stories, and Playwright assertions where layout or labels change.
- No API contract changes; relies on existing REST Countries fields and cached data.


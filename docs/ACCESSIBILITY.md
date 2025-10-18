# Accessibility Guide (WCAG 2.1 AA)

This project implements accessible patterns across views and components.

## Global Patterns

- Skip link in `src/App.vue` to jump to `#main-content`.
- Snackbar uses `role="status"` and `aria-live="polite"`.
- Color contrast managed by Vuetify themes; focus styles enhanced where needed.

## Country Grid

- `src/components/CountryGrid.vue`
  - Search area uses `role="search"` with clear labels on fields.
  - List container uses `role="list"` and each card has `role="listitem"`.
  - Empty results message announced via `role="status"` + `aria-live`.

## Single Country Card

- `src/components/SingleCountry.vue`
  - Card is keyboard focusable (`tabindex=0`) and acts as a link (`role="link"`).
  - Enhanced focus styles (including forced‑colors mode).
  - `aria-describedby` references population/region/capital details for SR context.
  - Images include meaningful `alt` text or a fallback.

## Country Details

- `src/views/CountryDetails.vue`
  - Breadcrumb wrapped in `<nav aria-label="Breadcrumb">`.
  - Main content is labeled via `aria-labelledby` and focuses the `<h1>` on load.
  - Back button has `aria-label`.

## Testing

- Unit: axe checks are used for components (e.g., `SingleCountry` test).
- E2E: `@axe-core/playwright` runs WCAG 2A/2AA rules on key pages.

## Tips & Troubleshooting

- Prefer semantic elements and ARIA as a progressive enhancement (not replacement).
- Keyboard: ensure Enter/Space triggers click handlers for custom interactive elements.
- Live regions: use sparingly to avoid verbosity; prefer `role=status` for unobtrusive announcements.


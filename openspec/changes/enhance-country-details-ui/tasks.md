## 1. Implementation
- [ ] Compact the hero grid, reducing vertical whitespace and ensuring flag + summary align tightly across breakpoints.
- [ ] Keep resilient flag handling (PNG → SVG → coat of arms → placeholder) and ensure the placeholder inherits the new compact sizing.
- [ ] Move the border-country list inside the summary card, beneath the primary stats, with responsive columns and chip alignment.
- [ ] Redesign quick-facts into at most four compact cards with uniform height, tighter typography, and balanced icon spacing.
- [ ] Adjust global spacing tokens (padding/margins) in the details view so the entire page feels denser without sacrificing readability.

## 2. Validation
- [ ] Extend tests to cover border chips within the summary card and compact quick-facts rendering.
- [ ] Update Storybook stories to demonstrate the new compact layout (including hero, quick-facts, embedded borders, fallback states).
- [ ] Re-run regression commands (`pnpm type-check`, `pnpm lint`, `pnpm lint:style`, `pnpm test:coverage`, `pnpm build`) and note any outstanding repo-wide failures.


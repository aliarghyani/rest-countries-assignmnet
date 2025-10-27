## ADDED Requirements
### Requirement: Country Details Hero Layout
The country details view MUST render a hero section that combines navigation controls, the country flag, and a summary card.

#### Scenario: Hero renders loaded state
- **GIVEN** a visitor opens a country details route
- **AND** the REST Countries data resolves successfully
- **THEN** the page shows the breadcrumb trail and a back button above the hero
- **AND** the hero presents the country flag alongside a summary card containing name, native name, population, and region
- **AND** the country name is rendered as the primary `h1` that receives focus after load.

#### Scenario: Hero renders loading state
- **GIVEN** the country details request is still pending
- **THEN** skeleton placeholders appear for the flag media and summary card footprint
- **AND** the hero container is marked `aria-busy="true"` so assistive tech announces the loading state.

#### Scenario: Flag fallback ensures visibility
- **GIVEN** the primary flag asset fails to load or is missing
- **THEN** the hero swaps to an alternate source (SVG or coat of arms) when available
- **AND** when no imagery can be rendered, a styled placeholder communicates the missing flag without collapsing the layout.

#### Scenario: Border list embedded in summary card
- **GIVEN** border countries are available
- **THEN** the summary card displays a compact chip list of neighbors beneath the primary stats
- **AND** the list preserves keyboard/focus navigation while keeping the card height balanced with the flag media.

### Requirement: Country Quick Facts Grid
The view MUST surface a quick-facts grid that highlights key metadata with icon affordances and responsive behavior.

#### Scenario: Quick facts show metrics
- **GIVEN** country data includes values for capital, top-level domain, currencies, languages, and timezones
- **THEN** the page renders each metric in a labeled card or chip with a descriptive icon
- **AND** values fall back to `N/A` when missing so the grid never renders empty slots.

#### Scenario: Quick facts remain legible on mobile
- **GIVEN** the viewport width is below the `md` breakpoint
- **THEN** the quick-facts cards stack into single-column rows with consistent spacing
- **AND** labels stay left-aligned with readable typography and minimum 44px tap targets.

#### Scenario: Quick facts stay within four cards
- **GIVEN** a country exposes more than four quick-fact values
- **THEN** the view prioritizes four cards (capital, domain, currencies, languages) and moves extra data into the summary card or supporting content
- **AND** card spacing remains compact with equal heights across the row.

### Requirement: Border Navigation Panel
The view MUST offer an upgraded border navigation section that clarifies state and supports navigation between neighbors.

#### Scenario: Border countries render as interactive chips
- **GIVEN** the country has border codes and their names resolve
- **THEN** the panel displays a titled container followed by Vuetify chips representing each neighbor
- **AND** selecting a chip routes to that country's details without leaving the page.

#### Scenario: Border panel communicates loading and empty states
- **GIVEN** the borders request is pending
- **THEN** the panel shows a progress indicator in place of the chips
- **AND** when no borders are returned, a helper message communicates `No border countries` while preserving layout.

#### Scenario: Offline cache fallback
- **GIVEN** the app detects the user is offline
- **AND** cached border mappings exist for the current country
- **THEN** the panel renders the cached neighbor chips
- **AND** a subtle helper text clarifies the data is sourced from cache.

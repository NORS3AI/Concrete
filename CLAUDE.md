# CLAUDE.md - Concrete Development Guide

## Project Overview

Concrete is a client-side financial consolidation dashboard. It is a single-page web application with no build step, no server-side code, and no package manager. All data is stored in browser localStorage.

## Architecture

- **No framework**: Vanilla JavaScript with module pattern (IIFE singletons)
- **No build step**: Script tags in index.html, no bundler
- **CDN dependencies**: Chart.js 4.x, Papa Parse 5.x
- **Storage**: localStorage under key `concrete`

### Module Dependency Order

Scripts must load in this order (as specified in index.html):
1. `store.js` - No dependencies
2. `kpi-engine.js` - Depends on Store
3. `import-wizard.js` - Depends on Store, KPIEngine
4. `entity-manager.js` - Depends on Store, KPIEngine, Charts
5. `charts.js` - Depends on KPIEngine, Chart.js (CDN)
6. `export.js` - Depends on Store, KPIEngine
7. `dashboard.js` - Depends on all above
8. `app.js` - Depends on Store, Dashboard

### Global Objects

Each module exposes a single global object:
- `Store` - Data CRUD, config, entity resolution
- `KPIEngine` - KPI computation, formatting utilities
- `ImportWizard` - CSV import wizard rendering and processing
- `EntityManager` - Entity tab, hierarchy, drill-down
- `Charts` - Chart.js rendering wrapper
- `ExportModule` - Export to CSV/JSON/TSV
- `Dashboard` - Tab navigation and rendering

## Key Conventions

### Data Model

Entities have `id`, `name`, `type`, `parentId` for hierarchy. Transactions have `entityId`, `date` (ISO string), `type` (revenue/expense/asset/liability/transfer), `category`, `amount` (negative for expenses/liabilities), `description`.

### Currency Formatting

Use `KPIEngine.fmt(value)` for currency display. It auto-abbreviates (K/M/B) and prepends the configured currency symbol. Use `KPIEngine.fmtPct(value)` for percentages, `KPIEngine.fmtDays(value)` for day counts.

### Adding a New Tab

1. Add a `<button>` in `#nav-tabs` in index.html with `data-tab="your-tab"`
2. Add a case in `Dashboard.renderCurrentTab()` in dashboard.js
3. Create the render function following the existing pattern

### Adding a New KPI

1. Add the calculation to the relevant function in kpi-engine.js (e.g., `getExecutiveKPIs`)
2. Add the display card in the corresponding render function in dashboard.js
3. Use existing CSS classes: `kpi-card`, `kpi-label`, `kpi-value`, and value classes like `positive`, `negative`, `warning`, `neutral`

### Adding a New Import Data Type

1. Add field definitions to `STANDARD_FIELDS` in import-wizard.js
2. Add a processing function `processXxxRow()` in import-wizard.js
3. Add the case in `processImport()` switch statement
4. Add corresponding Store CRUD methods in store.js

### CSS Custom Properties

All colors, spacing, and typography are defined as CSS custom properties in `:root` in dashboard.css. To change the theme, modify these variables.

## Testing

No automated tests currently. To manually verify:

1. Open index.html in browser
2. Complete setup wizard
3. Go to Settings > Generate Sample Data
4. Verify all tabs render correctly with data
5. Test CSV import with a sample file
6. Test export and re-import

## Common Tasks

### Reset the app state
Open browser console: `localStorage.removeItem('concrete')` then reload.

### Access data programmatically
Open browser console:
```js
Store.getEntities()           // List all entities
Store.getTransactions()       // List all transactions
Store.getStats()              // Data counts
Store.exportAll()             // Full data dump
KPIEngine.getExecutiveKPIs('__all__', 'ytd')  // Consolidated KPIs
```

### Deploy to GitHub Pages
Push to main branch, enable Pages in repository Settings pointing to root.

## File Size Reference

The entire application is approximately 3,500 lines across all files:
- index.html: ~180 lines
- dashboard.css: ~500 lines
- store.js: ~350 lines
- kpi-engine.js: ~450 lines
- import-wizard.js: ~500 lines
- entity-manager.js: ~350 lines
- charts.js: ~280 lines
- export.js: ~200 lines
- dashboard.js: ~650 lines
- app.js: ~120 lines

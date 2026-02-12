# Concrete - Financial Consolidation Dashboard

A comprehensive, client-side financial consolidation dashboard for managing multi-entity organizations with 500+ subsidiaries. Built as a static web app deployable on GitHub Pages.

## Quick Start

1. Open `index.html` in a browser, or deploy to GitHub Pages
2. Complete the setup wizard (choose Single Entity, Multi-Entity, or Full Suite)
3. Import your CSV data or generate sample data from Settings
4. Navigate tabs to view consolidated KPIs

**Live:** Deploy to GitHub Pages by enabling Pages in your repository settings and pointing to the root directory.

## Architecture

```
index.html              Main SPA entry point
css/
  dashboard.css         Complete dark-theme stylesheet
js/
  store.js              localStorage data layer (CRUD, hierarchy, fuzzy matching)
  kpi-engine.js         Real-time KPI calculations & consolidation
  import-wizard.js      CSV import with column mapping & templates
  entity-manager.js     Entity CRUD, hierarchy tree, drill-down
  charts.js             Chart.js wrapper (line, bar, doughnut, waterfall, combo)
  export.js             CSV/TSV/JSON export with entity filtering
  dashboard.js          Tab rendering (Executive, Cash Flow, P&L, Balance Sheet, Working Capital, Settings)
  app.js                Boot sequence & setup wizard
```

## Data Model

All data lives in browser `localStorage` under key `finConsol`. Structured as:

| Collection     | Description                                    |
|---------------|------------------------------------------------|
| entities       | Subsidiaries, divisions, departments with hierarchy |
| transactions   | Revenue, expenses, assets, liabilities, transfers |
| customers      | Customer master with AR aging                   |
| employees      | Employee roster by entity and cost center       |
| debts          | Loans, payables, receivables with maturity      |
| budgets        | Planned vs actual by period and category        |
| importBatches  | Audit trail of all CSV imports                  |
| mappingTemplates | Saved column-mapping configurations           |

## Dashboard Tabs

| Tab | What It Shows |
|-----|---------------|
| **Executive Summary** | Consolidated KPIs, revenue vs expenses chart, top/bottom entities |
| **Cash Flow** | Operating/investing/financing breakdown, running balance, entity cash positions |
| **P&L** | Revenue and expense breakdown, EBITDA, waterfall chart, category doughnuts |
| **Balance Sheet** | Assets vs liabilities, current/quick ratios, debt-to-equity, structure bars |
| **Working Capital** | AR/AP/inventory, DSO/DPO/DIO, cash conversion cycle, AR aging analysis |
| **Entities** | Comparison matrix with health scoring, search/filter/sort, hierarchy tree, drill-down |
| **Import** | CSV drop zone, column mapping wizard, template management, import history |
| **Settings** | Org config, feature toggles, data management, backup/restore, sample data |

## CSV Import

The import wizard handles heterogeneous data sources:

- **Auto-detection**: Column names are auto-mapped to standard fields
- **Date parsing**: ISO, US (MM/DD/YYYY), European (DD/MM/YYYY), natural language
- **Amount parsing**: Currency symbols, parenthetical negatives, European decimals
- **Incremental updates**: Duplicate detection by entity + date + amount + description
- **Entity resolution**: Fuzzy matching on entity names with alias support
- **Auto-categorization**: Transaction descriptions matched to categories via patterns
- **Template saving**: Reuse column mappings across recurring imports

## Supported Data Types for Import

- Transactions (revenue, expenses, assets, liabilities)
- Entities (with hierarchy via parent column)
- Customers
- Employees
- Debts
- Budgets

## Setup Modes

| Mode | Description |
|------|-------------|
| **Option A: Single Entity** | Small business basics. One entity, simplified views. |
| **Option B: Multi-Entity** | Holding company with subsidiaries. Consolidation and intercompany elimination. |
| **Option C: Full Suite** | Everything enabled. For Financial Controllers, CFOs, Accountants, Bookkeepers. Anomaly detection, full alerts. |

## Dependencies

Loaded from CDN (no build step required):

- [Chart.js 4.x](https://www.chartjs.org/) - Charts and visualizations
- [Papa Parse 5.x](https://www.papaparse.com/) - CSV parsing

## Browser Support

Any modern browser with localStorage support. Tested on Chrome, Firefox, Safari, Edge.

## Data Backup

- **Export**: Settings > Export Full Backup (JSON) includes all data
- **Import**: Settings > Import Backup restores from JSON
- **CSV Export**: Export modal supports filtered CSV/TSV/JSON for individual collections

## Deployment

### GitHub Pages

1. Push to a GitHub repository
2. Go to Settings > Pages
3. Set source to root of main branch
4. Site available at `https://<user>.github.io/<repo>/`

### Any Static Host

Copy the entire directory to any static file server. No build step, no server-side code.

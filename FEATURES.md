# FinConsol Features

## Core Dashboard

### Executive Summary
- Consolidated KPIs: revenue, expenses, net income, margin, cash flow, working capital
- Total assets, liabilities, equity overview
- Monthly burn rate and runway calculation
- Revenue vs expenses combo chart (bar + line)
- Net cash flow bar chart with positive/negative coloring
- Top entities by revenue widget
- Entities needing attention widget (lowest health scores)

### Cash Flow Analysis
- Total cash in/out and net cash flow
- Monthly burn rate and runway
- Stacked bar chart: operating, investing, financing cash flows
- Running cash balance line chart
- Cash position by entity horizontal bar chart

### Profit & Loss
- Total revenue, COGS, gross profit, gross margin
- Operating expenses, EBITDA
- Net income and net margin
- Monthly revenue vs expenses combo chart
- P&L waterfall chart (revenue through expense categories to net income)
- Revenue breakdown doughnut chart
- Expense breakdown doughnut chart

### Balance Sheet
- Total assets, liabilities, equity
- Current ratio, quick ratio, debt-to-equity ratio
- Asset breakdown table with percentage of total
- Liability breakdown table
- Asset doughnut chart
- Liability doughnut chart
- Visual structure bars (current vs non-current split)

### Working Capital
- Accounts receivable, accounts payable, inventory
- Net working capital
- DSO (Days Sales Outstanding)
- DPO (Days Payable Outstanding)
- DIO (Days Inventory Outstanding)
- Cash Conversion Cycle (CCC) = DSO + DIO - DPO
- Working capital trend line chart
- AR aging analysis bar chart (current, 30, 60, 90, 90+ days)
- Visual CCC formula display

## Entity Management

### Entity Comparison Matrix
- All entities listed with key metrics side-by-side
- Health scoring (0-100) based on margin, cash flow, asset coverage
- Color-coded health indicators (green/yellow/red)
- Search by name
- Filter by health status
- Sort by name, revenue, net income, cash flow, health score
- Click-to-drill-down on any entity

### Entity Hierarchy
- Parent-child relationships (holding company > subsidiary > department)
- Tree view with expand/collapse
- Click-through to entity drill-down

### Entity Drill-Down Modal
- Entity-specific KPIs (revenue, expenses, net income, cash flow, margin)
- Revenue & expenses trend chart
- Cash flow trend chart
- Customer list with AR details
- Employee roster
- Debt obligations table
- Budget vs actual comparison
- Sub-entity listing
- Entity-specific alerts

### Entity CRUD
- Add entities with full metadata
- Edit name, type, parent, industry, risk rating, currency, tags
- Delete entities
- Set entity aliases for fuzzy matching

## Data Import System

### CSV Import Wizard
- Drag-and-drop file upload
- Multi-file support
- Data type selection (transactions, entities, customers, employees, debts, budgets)
- 3-step wizard: upload > map columns > results

### Column Mapping
- Auto-detection of column mappings based on header names
- Manual override via dropdown selectors
- Preview of first 3 rows
- Required field indicators
- Optional target entity override

### Smart Data Handling
- **Date parsing**: ISO 8601, US format, European format, natural language
- **Amount parsing**: Currency symbol stripping, parenthetical negatives, European decimal conventions
- **Fuzzy entity matching**: Strips punctuation, handles abbreviations (Corp/Corporation)
- **Auto-categorization**: Pattern matching on transaction descriptions to standard categories
- **Duplicate detection**: Matching on entity + date + amount + description
- **Incremental updates**: Existing records updated, new records appended
- **Entity auto-creation**: Unknown entities in CSV automatically created

### Mapping Templates
- Save column mapping configurations with a name
- Reuse templates for recurring import formats
- Delete unused templates
- Template shows data type and field count

### Import History
- Full audit trail of all imports
- Timestamp, file name, data type, record count
- View in Import tab

## Export System

### Export Modal
- Format selection: CSV, TSV, JSON
- Collection selection (transactions, entities, customers, employees, debts, budgets)
- Entity filter (all or specific entity)
- Multi-collection export downloads separate files

### Specialized Exports
- KPI summary CSV
- Entity comparison CSV
- Full backup JSON (all data + config)
- Backup import/restore

## Alerts & Exceptions

### Alert Types
- **Critical**: Negative cash flow, past-due debts, expense spikes (3x+ average)
- **Warning**: Operating at loss, debts maturing within 30 days, late customer payments, budget variances >20%
- **Info**: Notable budget variances

### Alert Features
- Alerts panel slide-out from right side
- Badge count on alerts button
- Sorted by severity (critical > warning > info)
- Entity attribution on each alert
- Configurable via feature toggles

## Configuration

### Setup Wizard
- 3-step onboarding flow
- Mode selection: Single Entity, Multi-Entity, Full Suite
- Organization name, base currency, fiscal year start
- Initial entity creation from text input
- Configuration summary before launch

### Settings Tab
- Organization settings (name, currency, fiscal year, mode)
- Feature toggles:
  - Intercompany elimination
  - Budget tracking
  - Alerts & anomaly detection
  - Fuzzy entity matching
  - Anomaly detection
- Data summary statistics
- Full backup export/import
- Sample data generator
- Complete data reset

### Dashboard Filters
- Entity filter: consolidated or single entity view
- Period filter: MTD, QTD, YTD, Last 12 Months, All Time
- Both filters affect all tabs simultaneously

## Technical Features

### Data Storage
- Browser localStorage with JSON serialization
- In-memory cache for performance
- Unique ID generation (timestamp + random)
- Automatic schema initialization

### Calculations
- Real-time KPI computation on every view
- Intercompany elimination (filters transactions with counterpartyEntityId)
- Recursive entity hierarchy traversal
- Monthly grouping and aggregation
- Health scoring algorithm

### Visualization
- 7 chart types: line, bar, doughnut, horizontal bar, waterfall, combo, stacked bar
- Consistent dark theme styling
- Responsive sizing
- Automatic cleanup on tab switch
- Formatted tooltips with currency notation

### UI/UX
- Dark theme with CSS custom properties
- Responsive grid layout
- Print stylesheet
- Keyboard-accessible
- Modal system for drill-downs and wizards
- Table sorting (click headers)
- Health dot indicators
- Progress bars and breakdown bars

## Supported Currencies
USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BRL

## Target Users
- **CFO**: Executive summary, entity comparison, consolidated view
- **Financial Controller**: Full suite, intercompany elimination, anomaly detection
- **Accountant**: P&L, balance sheet, working capital, transaction imports
- **Bookkeeper**: Data import, transaction management, export to CSV

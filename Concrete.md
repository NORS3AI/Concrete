# Concrete — Construction Financial & Operations Platform

> Replacing Foundation. Built for construction companies scaling from 1 to 1,000,000 employees.
> Vite + TypeScript + Tailwind CSS frontend. PHP API backend. Browser-first architecture.
> Static deploy (GitHub Pages) → Cloudflare Pages + Workers + D1 live backend.

---

## Why Concrete Replaces Foundation

Foundation Software is the unified back-office financial platform for contractors: job cost accounting, payroll (union + prevailing wage + certified), AIA/unit-price billing, AP/AR, GL, and operational modules (scheduling, dispatch, equipment, document control). Its built-in modules (Job Costing, Payroll, GL, PO/Subcontracts, AP, AR, CPA Audit, Executive Dashboard) plus add-ons (Service Dispatch, Inventory, Unit Price Billing, Consolidated GL, Project Management, Mobile Time, eAccess, Document Management, Fixed Assets, Equipment, T&M Billing) form a comprehensive but aging system.

### Foundation's Strengths We Must Match (Day 1 Parity)

- Single financial system tying all modules together (no double-entry between modules)
- Job costing engine: budget vs actual, cost code structure, import from estimating, cash flow reports, overrun alerts
- Construction payroll complexity: multi-rate, multi-state, multi-trade, union fringes, prevailing wage, certified payroll
- AIA billing: schedule of values import, application updates, redline rollback, form printing
- AP vendor workflows: invoice-level reporting by vendor/job, pre-check registers, progress payment automation
- Executive dashboard: high-altitude → drill-down (job cost → change orders → WIP → cash flows → invoice level)
- Scheduling: Gantt, critical path, non-working days, resource loading, auto-build from cost codes
- Service dispatch: drag-drop board, work orders (recurring), payroll sync, field mobile with GPS/signatures/offline
- Equipment: utilization, preventive maintenance, fuel/insurance/depreciation, job cost rate posting
- Unit price billing: DOT/quantity-driven, bid import, quantity entry, completion estimates
- Data migration: import legacy accounting data with implementation support

### Foundation's Weaknesses We Exploit (Concrete Advantages)

| Foundation Problem | Concrete Answer | Phase |
|---|---|---|
| **Outdated UI/UX** — feels old, steep learning curve, too many clicks | Modern dark-theme SPA, instant navigation, zero page reloads, keyboard-first workflows | 1+ |
| **Reporting/analytics gaps** — no modern BI, users want PowerBI-level | Drag-and-drop report builder, construction KPI library, interactive drill-downs, embedded analytics | 11, 30 |
| **Bolt-on sprawl** — too many separate add-on products instead of unified platform | Everything is one codebase, one data model, one UI — no add-on purchases | All |
| **Integration limitations** — poor sync with HR/payroll/benefits ecosystems | Open REST API, webhook events, Procore/Bluebeam/HCSS connectors, Zapier/Make, bank feeds via Plaid | 31 |
| **Dated training/docs** — massive PDFs, long videos, no searchable KB | Contextual inline help, searchable KB, AI assistant ("ask Concrete"), quick-start guides | 37, 38 |
| **Tedious union setup** — creating fringes per trade is painful and repetitive | Union rate table templates, bulk import, clone from existing, rate table versioning with effective dates | 7 |
| **Broken mobile** — iOS 1.7 stars, lost hours, unreliable field apps | PWA with true offline (IndexedDB + Service Worker), background sync, works on any device, no app store dependency | 26, 27 |
| **No offline-first** — field crews on job sites have spotty connectivity | CRDT-based sync, delta updates, bandwidth-aware, works fully offline then merges | 27 |
| **No modern AI** — manual categorization, no predictive insights | AI transaction categorization, anomaly detection, OCR invoice ingestion, natural language queries | 37 |

---

## Technology Stack

### Frontend (Browser — the entire application lives here)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Build** | Vite 6.x | Instant HMR, native ESM, tree-shaking, code-splitting per module |
| **Language** | TypeScript 5.x (strict mode) | Type safety across 40+ modules, refactor confidence, IDE intelligence |
| **Styling** | Tailwind CSS 4.x | Utility-first, design tokens, dark/light theming, purged production CSS |
| **Charts** | Chart.js 4.x | Line, bar, doughnut, waterfall, combo, Gantt (via plugin) |
| **CSV** | Papa Parse 5.x | Streaming CSV parse for million-row imports |
| **PDF** | jsPDF + html2canvas | Client-side AIA forms, certified payroll, financial statements |
| **Dates** | date-fns | Tree-shakeable, immutable, locale-aware date math |
| **State** | Custom reactive store (Phase Zed) | Observable collections, computed views, undo/redo, persistence abstraction |
| **Offline** | IndexedDB (via idb) + Service Worker | Full offline operation, background sync, CRDT merge |
| **Testing** | Vitest + Playwright | Unit/integration in Vitest, E2E in Playwright, CI in GitHub Actions |

### Backend (PHP — API layer when graduating from static)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | PHP 8.3+ | Mature ecosystem, hosting everywhere, Cloudflare via php-wasm or proxy |
| **Framework** | Laravel 11 (or Slim for lightweight) | Routing, ORM, queues, auth, validation, migrations |
| **API** | REST + JSON:API spec | Standardized pagination, filtering, includes, sparse fieldsets |
| **Auth** | Laravel Sanctum / Passport | Token-based SPA auth, API keys for integrations, OAuth2 provider |
| **Database** | SQLite (local/D1) → MySQL/PostgreSQL (scale) | Start with zero infrastructure, migrate up without schema changes |
| **Queue** | Laravel Queues (Redis/DB) | Payroll runs, report generation, bulk imports, email |
| **Storage** | Local disk → Cloudflare R2 / S3 | Documents, photos, backups, exports |

### Infrastructure Progression

| Stage | Stack | Data |
|-------|-------|------|
| **Phase Zed–15** | Vite dev server or static build, no backend | localStorage → IndexedDB, JSON export/import |
| **Phase 16–25** | Cloudflare Pages (frontend) + PHP Workers or VPS (API) | D1/SQLite → MySQL, R2 for files |
| **Phase 26–35** | Cloudflare Pages + Workers + PHP API + Durable Objects | D1 sharding, KV cache, R2 storage, WebSocket sync |
| **Phase 36–40** | Multi-region, federated, API marketplace | Sharded DB, read replicas, cold archive in R2 |

### Data Tiers

| Tier | Storage | Scale Target |
|------|---------|-------------|
| Local | localStorage / IndexedDB | 1–500 employees, single company |
| Edge | Cloudflare D1 + KV + R2 | 500–50,000 employees, multi-entity |
| Federated | D1 sharding + Durable Objects | 50,000–1,000,000 employees, enterprise |

### Import/Export/Merge Strategy

- **Export**: JSON full backup, CSV per collection, PDF reports, API JSON
- **Import**: CSV with column mapping wizard, JSON restore, QuickBooks IIF, AIA G702/G703, Foundation export
- **Merge Import**: Deduplicate by composite keys, conflict resolution UI, audit trail, dry-run preview, batch undo
- **Sync**: Eventual consistency via CRDTs (Phase 26+)

---

## Phase Zed — The Skeleton

> **This is the foundation under every phase that follows. Nothing ships before Zed is solid.**
> Every module, DLC, expansion, add-on, and future feature plugs into this skeleton.
> If Zed breaks, everything above it crumbles. Design it for 40 phases and 1,000,000 employees.

### Zed.1 — Project Scaffold & Build Pipeline

- [ ] Initialize Vite 6.x project with TypeScript strict mode
- [ ] Configure path aliases: `@core`, `@modules`, `@ui`, `@stores`, `@types`, `@utils`, `@plugins`
- [ ] Tailwind CSS 4.x with custom design tokens (colors, spacing, typography, radii, shadows)
- [ ] Dark theme as default, light theme ready, theme switching via CSS custom properties + Tailwind
- [ ] PostCSS pipeline: Tailwind → autoprefixer → cssnano (production)
- [ ] Vite code-splitting: each module is a lazy-loaded chunk (Phase 1 = chunk, Phase 3 = chunk, etc.)
- [ ] Environment configuration: `.env.local`, `.env.staging`, `.env.production`
- [ ] Build targets: `static` (no backend, GitHub Pages), `cloudflare` (Pages + Workers), `php` (Laravel API)
- [ ] GitHub Actions CI: lint → typecheck → test → build → deploy preview
- [ ] ESLint + Prettier configured with strict TypeScript rules
- [ ] Husky + lint-staged for pre-commit quality gates
- [ ] Bundle analyzer for monitoring chunk sizes
- [ ] Source maps in dev, stripped in production
- [ ] Asset pipeline: images, fonts, icons (Heroicons or Lucide via tree-shaking)

### Zed.2 — Type System & Schema Registry

> Every data type that will ever exist in Concrete gets defined here. This is the single source of truth.

- [ ] Base entity interface: `{ id: string; createdAt: string; updatedAt: string; deletedAt?: string; version: number; tenantId?: string; }`
- [ ] Schema registry: central map of all collection names → TypeScript interfaces → validation rules
- [ ] Schema versioning: every schema has a version number, migrations run on load
- [ ] Schema migration engine: `migrations/001_initial.ts`, `migrations/002_add_jobs.ts`, etc.
- [ ] Forward-compatible schema: unknown fields preserved (never strip data you don't recognize)
- [ ] Relationships defined in schema: `{ foreignKey: 'entityId', collection: 'entities', cascade: 'nullify' }`
- [ ] Computed/virtual fields defined in schema (e.g., `netIncome` computed from revenue - expenses)
- [ ] Validation rules per field: required, type, min, max, pattern, enum, custom validator function
- [ ] Custom field extension system: tenants/modules can register new fields on any collection
- [ ] Custom collection extension system: modules can register entirely new collections
- [ ] Type generation: schemas produce TypeScript interfaces, runtime validators, and form field configs
- [ ] Collection manifest: declares which module owns which collection, prevents namespace collisions

**Initial schema definitions (stubs — populated in their respective phases):**

```
core/company          core/user             core/role
core/permission       core/auditLog         core/config
core/notification     core/attachment       core/comment
core/tag              core/customField      core/savedFilter

gl/account            gl/journalEntry       gl/journalLine
gl/fiscalPeriod       gl/recurringEntry     gl/closingEntry

job/job               job/costCode          job/budget
job/budgetLine        job/wip               job/estimate
job/estimateLine      job/bid

entity/entity         entity/hierarchy      entity/alias

ap/vendor             ap/invoice            ap/invoiceLine
ap/payment            ap/paymentLine        ap/lienWaiver
ap/complianceCert     ap/retention

ar/customer           ar/invoice            ar/invoiceLine
ar/payment            ar/aiaApplication     ar/retainage
ar/billingSchedule    ar/billingMilestone

payroll/employee      payroll/timeEntry     payroll/payRun
payroll/payCheck      payroll/earning       payroll/deduction
payroll/benefit       payroll/taxTable      payroll/taxFiling
payroll/w2            payroll/workerComp

union/union           union/rateTable       union/rateTableLine
union/fringeBenefit   union/prevailingWage  union/certifiedPayroll
union/apprentice      union/remittance

equip/equipment       equip/rateTable       equip/usage
equip/maintenance     equip/workOrder       equip/fuelLog
equip/depreciation

sub/subcontract       sub/changeOrder       sub/payApp
sub/backcharge        sub/prequalification  sub/compliance

po/purchaseOrder      po/poLine             po/receipt
po/receiptLine        po/amendment

doc/document          doc/revision          doc/template
doc/transmittal       doc/photo

proj/project          proj/phase            proj/task
proj/milestone        proj/rfi              proj/submittal
proj/dailyLog         proj/meetingMinutes   proj/punchList

svc/serviceAgreement  svc/workOrder         svc/dispatch
svc/call              svc/invoice

inv/item              inv/location          inv/receipt
inv/issue             inv/transfer          inv/count

hr/position           hr/certification      hr/training
hr/benefit            hr/leave              hr/applicant

safety/incident       safety/inspection     safety/oshaLog
safety/toolboxTalk    safety/corrective     safety/drugTest

bond/surety           bond/bondPolicy       bond/claim
bond/insurance        bond/coi

bank/account          bank/statement        bank/statementLine
bank/reconciliation   bank/matchRule

contract/contract     contract/sov          contract/amendment
contract/milestone    contract/closeout     contract/warranty

fleet/asset           fleet/inspection      fleet/fuelCard
fleet/assignment      fleet/depreciation

analytics/dashboard   analytics/widget      analytics/savedReport
analytics/kpiDef      analytics/benchmark

workflow/template     workflow/instance      workflow/step
workflow/approval     workflow/escalation

integration/endpoint  integration/webhook   integration/apiKey
integration/syncLog   integration/mapping

plugin/manifest       plugin/config         plugin/customObject
plugin/customField    plugin/script
```

### Zed.3 — Data Layer Abstraction (The Store)

> The store must work identically whether data lives in localStorage, IndexedDB, D1, MySQL, or a PHP API.
> Every phase reads/writes through this layer. It never touches storage directly.

- [ ] `DataAdapter` interface: `get`, `getAll`, `query`, `insert`, `update`, `upsert`, `remove`, `bulkInsert`, `bulkUpdate`, `bulkRemove`, `count`, `aggregate`
- [ ] `LocalStorageAdapter` — for tiny datasets and config (< 5MB)
- [ ] `IndexedDBAdapter` — for full offline operation (unlimited via browser quota)
- [ ] `ApiAdapter` — for PHP/Cloudflare backend (REST calls with same interface)
- [ ] `CompositeAdapter` — reads from IndexedDB (fast), writes to both IndexedDB + API (sync)
- [ ] Adapter auto-selection based on build target and data size
- [ ] `Collection<T>` class: typed CRUD over any adapter, enforces schema validation
- [ ] `Query<T>` builder: `.where('amount', '>', 1000).orderBy('date', 'desc').limit(50).offset(100)`
- [ ] Query operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `in`, `notIn`, `contains`, `startsWith`, `between`, `isNull`, `isNotNull`
- [ ] Aggregate functions: `sum`, `avg`, `min`, `max`, `count`, `groupBy`
- [ ] Relationship resolution: `collection.query().include('vendor').include('job.costCodes')`
- [ ] Transaction support: `store.transaction(async (tx) => { ... })` — atomic multi-collection writes
- [ ] Optimistic locking via `version` field (prevent lost updates in concurrent edits)
- [ ] Soft delete: `deletedAt` timestamp, filtered out by default, restorable
- [ ] Audit trail: every mutation logged with `{ userId, timestamp, collection, recordId, operation, before, after }`
- [ ] Change feed: subscribe to mutations `collection.onChange((event) => { ... })`
- [ ] Computed views: define derived datasets that auto-update when source data changes
- [ ] Batch operations with progress callbacks: `collection.bulkInsert(rows, { onProgress: (pct) => ... })`
- [ ] Import/export per collection: `collection.exportJSON()`, `collection.importJSON(data, { merge: true })`
- [ ] Data seeding: `store.seed('sample-data')` loads realistic construction demo data
- [ ] Full backup/restore: `store.exportAll()` → JSON, `store.importAll(json)` with version migration

### Zed.4 — Module System & Plugin Architecture

> Every phase is a module. Modules can be loaded, unloaded, enabled, disabled. Third-party plugins use the same system.

- [ ] `ModuleManifest` interface:
  ```ts
  {
    id: string;                    // 'concrete.gl', 'concrete.payroll', 'plugin.my-custom'
    name: string;                  // 'General Ledger'
    version: string;               // '1.0.0' semver
    phase: number;                 // Which phase introduced this module
    dependencies: string[];        // ['concrete.core', 'concrete.entity']
    collections: string[];         // Which schema collections this module owns
    routes: RouteConfig[];         // URL routes this module handles
    navItems: NavItemConfig[];     // Tabs/menu items to add to navigation
    dashboardWidgets: WidgetConfig[]; // KPI cards, charts available to dashboards
    settings: SettingsConfig[];    // Settings panels this module contributes
    permissions: PermissionDef[];  // Permissions this module defines
    workflows: WorkflowDef[];     // Workflow templates this module provides
    importTypes: ImportTypeDef[]; // Data types available in import wizard
    exportTypes: ExportTypeDef[]; // Data types available in export
    hooks: HookRegistration[];    // Lifecycle hooks this module listens to
    activate: () => Promise<void>; // Called when module is enabled
    deactivate: () => Promise<void>; // Called when module is disabled
  }
  ```
- [ ] Module registry: `ModuleManager.register(manifest)`, `ModuleManager.enable(id)`, `ModuleManager.disable(id)`
- [ ] Dependency resolution: modules load in topological order, fail fast on missing deps
- [ ] Lazy loading: module code loaded only when first navigated to (Vite dynamic import)
- [ ] Module isolation: each module's state is namespaced, no cross-module direct state access
- [ ] Inter-module communication via typed event bus (not direct function calls)
- [ ] Module feature flags: `ModuleManager.isEnabled('concrete.payroll')` checked everywhere
- [ ] Module configuration: per-module settings stored in `core/config` collection
- [ ] Module health check: `module.healthCheck()` returns status for diagnostics
- [ ] Core modules (cannot be disabled): `concrete.core`, `concrete.ui`, `concrete.store`, `concrete.router`
- [ ] Optional modules (can be toggled): everything in Phases 1–40
- [ ] Plugin sandbox: third-party plugins run in restricted scope, no direct DOM/store access outside their namespace
- [ ] Plugin marketplace hooks: `install`, `uninstall`, `upgrade`, `configure`
- [ ] Hot module replacement in dev: change a module, it reloads without losing app state

### Zed.5 — Event Bus & Hook System

> Modules talk to each other through events, never through direct imports. This is what makes the architecture extensible.

- [ ] Typed event bus: `EventBus.emit<PayrollRunCompleted>('payroll.run.completed', payload)`
- [ ] Typed listeners: `EventBus.on<PayrollRunCompleted>('payroll.run.completed', handler)`
- [ ] Wildcard listeners: `EventBus.on('payroll.*', handler)` for module-level monitoring
- [ ] Event priority: listeners execute in priority order (default 0, higher = first)
- [ ] Async event handling: listeners can be async, bus waits for all to complete
- [ ] Event cancellation: listener can `event.preventDefault()` to cancel downstream processing
- [ ] Pre/post hooks on every store mutation:
  - `before.insert.{collection}` — validate, transform, block
  - `after.insert.{collection}` — side effects, notifications, cascading updates
  - `before.update.{collection}`, `after.update.{collection}`
  - `before.delete.{collection}`, `after.delete.{collection}`
- [ ] Lifecycle hooks:
  - `app.boot` — before anything renders
  - `app.ready` — after all modules loaded
  - `module.activated` / `module.deactivated`
  - `user.login` / `user.logout`
  - `data.imported` / `data.exported`
  - `navigation.before` / `navigation.after`
  - `period.changed` / `entity.changed` (global filter changes)
- [ ] Cross-module examples that must work:
  - AP invoice approved → job cost committed cost updates → WIP recalculates
  - Payroll run completes → job cost labor posts → GL entries created → cash flow updates
  - Equipment hours logged → equipment cost posts to job → depreciation updates
  - Change order approved → job budget adjusts → billing SOV updates → backlog recalculates
  - Subcontractor payment → retention tracks → lien waiver required → compliance matrix updates
- [ ] Event replay: store event history, replay for debugging or audit
- [ ] Event throttle/debounce for high-frequency emitters

### Zed.6 — Router & Navigation

> Single-page app routing that supports 40+ modules, deep linking, breadcrumbs, and bookmarkable URLs.

- [ ] Hash-based router (works on static file:// and GitHub Pages): `#/gl/accounts`, `#/jobs/2024-015/cost`
- [ ] Route registration from modules: each module declares its routes in its manifest
- [ ] Route parameters: `#/jobs/:jobId/cost-codes/:costCodeId`
- [ ] Query parameters: `#/jobs?status=active&sort=margin&entity=abc123`
- [ ] Nested routes: `#/jobs/:jobId` → layout with sub-nav → `/cost`, `/billing`, `/changes`, `/documents`
- [ ] Route guards: `beforeEnter` hook for permission checks, unsaved changes warnings
- [ ] Breadcrumb generation: auto-built from route hierarchy, clickable at each level
- [ ] Navigation state persistence: current tab, filters, scroll position survive refresh
- [ ] Deep linking: any view can be bookmarked and shared
- [ ] Back/forward browser buttons work correctly
- [ ] Global filters in URL: `?entity=abc123&period=ytd` applied across all routes
- [ ] Route transitions: fade/slide animations between views
- [ ] 404 handler: unknown routes show helpful "module not found" or "not enabled" message
- [ ] Command palette (Ctrl+K / Cmd+K): search and jump to any route, record, or action

### Zed.7 — UI Component Library

> Every UI element used across 40 phases. Built once in Tailwind, used everywhere.

**Layout:**
- [ ] `AppShell` — top nav + content area + alerts panel + modals layer
- [ ] `TopNav` — logo, module tabs (dynamically built from enabled modules), global filters, alerts, user menu
- [ ] `TabBar` — horizontal scrollable tabs with active indicator, overflow menu on mobile
- [ ] `Sidebar` — collapsible left panel for sub-navigation within a module
- [ ] `ContentArea` — padded main content with max-width and responsive breakpoints
- [ ] `SplitPane` — resizable two-panel layout (master-detail, list-form)
- [ ] `Grid` — responsive CSS grid: `grid-2`, `grid-3`, `grid-4`, auto-fit with min-width
- [ ] `Stack` — vertical flex layout with configurable gap

**Data Display:**
- [ ] `DataTable` — sortable, filterable, paginated, virtual-scroll for 100K+ rows, column resize, pin columns, row selection, inline edit, CSV export button
- [ ] `KPICard` — label, value, trend indicator (up/down/flat), drill-down click, conditional color
- [ ] `KPIRow` — responsive grid of KPI cards
- [ ] `Chart` — wrapper around Chart.js with Concrete theming, responsive, destroy/rebuild on data change
- [ ] `TreeView` — expandable hierarchy (entities, org chart, COA, cost codes)
- [ ] `Timeline` — vertical event timeline (audit log, project history, payment history)
- [ ] `Badge` / `Tag` — colored labels (status, type, health, priority)
- [ ] `HealthDot` — green/yellow/red indicator
- [ ] `ProgressBar` — with label, percentage, color thresholds
- [ ] `BreakdownBar` — stacked horizontal bar showing composition (e.g., cost type breakdown)
- [ ] `EmptyState` — icon + message + action button for empty collections
- [ ] `Stat` — large number with label (used in summary cards)
- [ ] `Avatar` — user/entity initials with color based on name hash
- [ ] `Tooltip` — contextual help on hover/focus

**Forms:**
- [ ] `Form` — auto-generated from schema field definitions, handles validation and submission
- [ ] `TextField` — text input with label, placeholder, error state, help text
- [ ] `NumberField` — formatted number input (currency, percentage, integer)
- [ ] `CurrencyField` — amount input with currency symbol, negative handling, auto-format
- [ ] `DateField` — date picker with calendar popup, relative dates, fiscal period awareness
- [ ] `DateRangeField` — start/end date with presets (MTD, QTD, YTD, Last 12, Custom)
- [ ] `SelectField` — dropdown with search, multi-select, create-new option
- [ ] `EntitySelect` — entity picker with hierarchy, search, recently used
- [ ] `JobSelect` — job picker with status filter, search, recently used
- [ ] `AccountSelect` — COA picker with hierarchy, search, type filter
- [ ] `CostCodeSelect` — cost code picker scoped to selected job
- [ ] `CheckboxField` / `ToggleField` — boolean inputs
- [ ] `TextAreaField` — multi-line with character count
- [ ] `FileUpload` — drag-drop zone, multi-file, progress indicator, file type validation
- [ ] `FormSection` — collapsible group of fields with header
- [ ] `FormActions` — save/cancel/delete button bar with loading states
- [ ] `InlineEdit` — click-to-edit on table cells or display values

**Overlays:**
- [ ] `Modal` — centered overlay with title, body, close, sizes (sm, md, lg, xl, full)
- [ ] `SlidePanel` — right-side panel for detail views (drill-downs, alerts, edit forms)
- [ ] `Drawer` — bottom sheet on mobile
- [ ] `ConfirmDialog` — "Are you sure?" with customizable actions
- [ ] `Toast` — notification popups (success, error, warning, info) with auto-dismiss
- [ ] `CommandPalette` — Ctrl+K searchable action/navigation overlay

**Navigation:**
- [ ] `Breadcrumb` — auto-generated from route, clickable segments
- [ ] `FilterBar` — horizontal bar with search input, dropdowns, active filter tags
- [ ] `Pagination` — page numbers + per-page selector + total count
- [ ] `TabNav` — horizontal tabs for sub-views within a page

**Specialized (construction-specific):**
- [ ] `ScheduleOfValues` — editable table for AIA billing line items
- [ ] `GanttChart` — horizontal bar chart with dependencies, milestones, critical path
- [ ] `DispatchBoard` — drag-drop grid (rows = technicians, cols = time slots)
- [ ] `CostCodeTree` — hierarchical cost code browser with budget/actual columns
- [ ] `AgingChart` — bar chart with current/30/60/90/120+ buckets
- [ ] `WaterfallChart` — revenue → deductions → net income flow
- [ ] `HierarchyOrgChart` — visual org chart with entity/employee nodes

### Zed.8 — Permission & Access Control Framework

> Designed for 1,000,000 employees. Must support field-level, row-level, and module-level security from day 1.

- [ ] Permission definition: `{ resource: 'ap.invoice', action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' }`
- [ ] Granularity levels:
  - **Module**: can access AP module at all?
  - **Collection**: can read vendors? can write invoices?
  - **Record**: can see invoices for this entity/job only?
  - **Field**: can see SSN? can edit pay rate?
  - **Action**: can approve POs > $50K?
- [ ] Role templates: Admin, Controller, Project Manager, AP Clerk, AR Clerk, Payroll Admin, Payroll Clerk, Estimator, Field Foreman, Technician, Read-Only, Custom
- [ ] Role composition: user can have multiple roles, permissions are union (most permissive wins)
- [ ] Row-level security filters: `{ entityId: ['ent-1', 'ent-2'] }` limits data to specific entities
- [ ] Segregation of duties rules: `{ cannot: ['create', 'approve'], on: 'ap.invoice', sameRecord: true }`
- [ ] Permission checking API: `can('create', 'ap.invoice')`, `canAccessEntity('ent-1')`, `canSeeField('payroll.employee', 'ssn')`
- [ ] UI integration: buttons/tabs/fields auto-hide when user lacks permission
- [ ] Route guard integration: routes blocked if user lacks module access
- [ ] Query filter integration: store automatically filters queries by user's entity access
- [ ] Offline permission cache: permissions stored locally, validated against server on sync
- [ ] Permission audit: log every access check failure for security review
- [ ] Default deny: everything is blocked unless explicitly granted

### Zed.9 — Notification & Alert System

> Real-time alerts, system notifications, and user-configurable thresholds.

- [ ] Notification types: `critical`, `warning`, `info`, `success`, `action-required`
- [ ] Notification channels: in-app toast, in-app bell/panel, email (Phase 16+), push (Phase 26+), webhook
- [ ] Notification sources:
  - Store hooks: threshold breaches (e.g., job margin < 5%)
  - Workflow engine: approval required, approval granted/denied
  - Compliance: expiring insurance, overdue certified payroll, license expiration
  - Schedule: upcoming milestones, overdue tasks
  - Import: batch complete, errors found
  - System: backup complete, sync conflict, module update
- [ ] Notification preferences: per-user, per-notification-type channel selection
- [ ] Alert rules engine: configurable rules `{ field, operator, value, action }` on any collection
- [ ] Alert aggregation: batch similar alerts (e.g., "15 insurance certs expiring this week")
- [ ] Alert acknowledgment: mark as read, snooze, dismiss
- [ ] Alert history: full log of all notifications with status
- [ ] Alerts panel UI: right-side slide panel, badge count on nav, grouped by severity

### Zed.10 — Import/Export Framework

> The universal pipeline that every phase's import/export flows through. Must handle Foundation migration day 1.

- [ ] `ImportPipeline` class:
  1. **Parse**: file → rows (CSV, TSV, JSON, IIF, fixed-width, Excel via SheetJS)
  2. **Map**: column headers → schema fields (auto-detect + manual override + saved templates)
  3. **Transform**: parse dates, amounts, entity resolution, type inference, categorization
  4. **Validate**: required fields, data types, referential integrity, custom rules
  5. **Dedup**: composite key matching against existing data
  6. **Preview**: dry-run showing adds/updates/skips/errors before commit
  7. **Execute**: batch insert/update with progress callback
  8. **Audit**: record import batch in audit log with full manifest
  9. **Undo**: revert entire batch by import batch ID
- [ ] `ExportPipeline` class:
  1. **Query**: collection + filters + entity scope + date range
  2. **Transform**: format dates, amounts, flatten relationships
  3. **Format**: CSV, TSV, JSON, PDF, Excel
  4. **Deliver**: browser download, clipboard, or API response
- [ ] Merge strategies per field: `skip` (keep existing), `overwrite` (take imported), `append` (for arrays), `sum` (for amounts), `manual` (prompt user)
- [ ] Column mapping template system: save/load/share mapping configurations
- [ ] Entity resolution during import: fuzzy name matching with aliases, create-or-link UI
- [ ] Import wizard UI: 5-step flow (upload → type → map → preview → results)
- [ ] Streaming import for large files: process in chunks, don't block the UI thread (Web Worker)
- [ ] Import file format auto-detection: sniff delimiter, encoding, date format from first 100 rows
- [ ] Import history: list all past imports with stats, undo button, re-run button

### Zed.11 — Reporting & PDF Engine

> Every phase generates reports. This is the renderer they all use.

- [ ] `ReportDefinition` interface: title, subtitle, columns, grouping, sorting, filters, totals, chart
- [ ] Report viewer: paginated table with headers, subtotals, grand totals, print-optimized CSS
- [ ] Report export: PDF (via jsPDF), CSV, Excel (via SheetJS), JSON
- [ ] PDF template engine: company letterhead, page numbers, headers/footers, multi-page tables
- [ ] Pre-built report types: Tabular, Summary, Matrix (cross-tab), Detail with subtotals
- [ ] Custom report builder (Phase 11): drag columns, set filters, choose grouping, save as template
- [ ] Report library: saved report definitions, shared across users
- [ ] Report scheduling placeholder: hooks for Phase 16+ automated delivery
- [ ] Construction-specific report formats:
  - AIA G702 / G703 forms
  - Certified Payroll WH-347
  - OSHA 300 / 300A / 301 logs
  - 1099 forms
  - WIP schedule (standard format)
  - Job cost detail / summary (standard format)

### Zed.12 — Undo/Redo & History

- [ ] Command pattern: every user action creates a reversible command
- [ ] Undo stack: per-session, survives tab navigation (not page reload)
- [ ] Redo stack: re-apply undone commands
- [ ] Multi-record undo: "undo import batch" reverses hundreds of inserts in one action
- [ ] History panel: view recent actions with undo buttons
- [ ] Audit log (persistent): every mutation recorded permanently for compliance
- [ ] Version history per record: view all changes to a record over time, diff view
- [ ] Restore to version: revert a specific record to any prior state

### Zed.13 — Search & Command Palette

- [ ] Global search: type anywhere, search across all collections (by name, number, description)
- [ ] Search index: client-side inverted index built on data load, updated on mutations
- [ ] Scoped search: within current module/collection only
- [ ] Search result types: entity, job, vendor, employee, transaction, document, report
- [ ] Result ranking: exact match > starts with > contains > fuzzy, weighted by collection priority
- [ ] Recent searches: stored per user
- [ ] Command palette (Ctrl+K): combines search + navigation + actions
  - "Go to AP" → navigates to AP module
  - "New invoice" → opens invoice creation form
  - "Job 2024-015" → navigates to job detail
  - "Export transactions" → opens export dialog
  - "Run payroll" → opens payroll run wizard
- [ ] Keyboard navigation: arrow keys, enter to select, escape to close

### Zed.14 — Keyboard Shortcuts & Accessibility

- [ ] Global shortcuts:
  - `Ctrl+K` / `Cmd+K` — command palette
  - `Ctrl+Z` / `Cmd+Z` — undo
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z` — redo
  - `Ctrl+S` / `Cmd+S` — save current form
  - `Ctrl+N` / `Cmd+N` — new record in current module
  - `Escape` — close modal/panel
  - `?` — show keyboard shortcut help
- [ ] Table navigation: arrow keys, enter to edit, tab between cells
- [ ] Form navigation: tab between fields, enter to submit
- [ ] Screen reader support: ARIA labels, roles, live regions
- [ ] Focus management: trap focus in modals, restore focus on close
- [ ] Color contrast: WCAG AA minimum on all text/background combinations
- [ ] Reduced motion: respect `prefers-reduced-motion` media query
- [ ] Keyboard shortcut customization: users can rebind shortcuts

### Zed.15 — Internationalization & Localization Hooks

> Concrete starts in English/USD, but the skeleton must support any language/currency/locale from day 1.

- [ ] i18n string system: all UI text via `t('ap.invoice.title')` function, never hardcoded
- [ ] Locale files: `en-US.json` shipped, structure ready for any language
- [ ] Number formatting: locale-aware (1,234.56 vs 1.234,56)
- [ ] Currency formatting: symbol, position, decimal places per currency
- [ ] Date formatting: locale-aware (MM/DD/YYYY vs DD/MM/YYYY vs YYYY-MM-DD)
- [ ] RTL layout support: CSS logical properties, Tailwind RTL plugin
- [ ] Timezone handling: all dates stored UTC, displayed in user's timezone
- [ ] Pluralization rules per language
- [ ] Module-level translation namespacing: `payroll.employee.title` vs `hr.employee.title`

### Zed.16 — Error Handling, Logging & Diagnostics

- [ ] Global error boundary: catch unhandled errors, show recovery UI, log to diagnostics
- [ ] Structured logging: `Logger.error('ap.invoice', 'Save failed', { invoiceId, error })`
- [ ] Log levels: debug, info, warn, error, fatal
- [ ] Log destinations: browser console (dev), in-memory ring buffer, remote endpoint (Phase 16+)
- [ ] Error reporting: stack traces, user context, module context, last 50 actions
- [ ] Performance monitoring: module load times, query times, render times
- [ ] Diagnostics panel (Settings > Diagnostics): system info, storage usage, module status, log viewer
- [ ] Health dashboard: data integrity checks, orphaned records, schema version mismatches
- [ ] Graceful degradation: if a module fails to load, other modules continue working

### Zed.17 — Testing Infrastructure

- [ ] Vitest config: unit + integration tests, TypeScript, coverage thresholds
- [ ] Test utilities: `createTestStore()`, `createTestModule()`, `mockAdapter()`, `seedTestData()`
- [ ] Schema tests: every collection has tests for validation rules, relationships, migrations
- [ ] Store tests: CRUD, queries, transactions, optimistic locking, soft delete, audit trail
- [ ] Module tests: each module has tests for its activation, routes, permissions, event handlers
- [ ] Component tests: every UI component has visual regression tests
- [ ] E2E tests (Playwright): setup wizard, data import, navigation, forms, export
- [ ] Performance tests: measure query times with 10K, 100K, 1M records
- [ ] CI pipeline: all tests run on every PR, block merge on failure
- [ ] Test data generators: `generateJob()`, `generateInvoice()`, `generatePayroll()` with realistic construction data

### Zed.18 — Service Worker & Offline Shell

- [ ] Service worker registration on first load
- [ ] App shell caching: HTML, CSS, JS cached for instant offline load
- [ ] Data caching strategy: IndexedDB as primary, sync to remote when online
- [ ] Background sync: queued mutations replayed when connectivity returns
- [ ] Offline indicator: visible status bar when offline, sync progress when reconnecting
- [ ] Cache versioning: new deploy invalidates old cache, seamless update
- [ ] Precache manifest: Vite generates list of assets to precache
- [ ] Network-first for API calls (when backend exists), cache-first for static assets

### Zed.19 — Configuration & Feature Flags

- [ ] App config stored in `core/config` collection
- [ ] Feature flags: `config.features.payroll.unionPayroll = true/false`
- [ ] Module enable/disable: persisted in config, checked by router and UI
- [ ] Tenant config: org name, base currency, fiscal year start, date format, number format
- [ ] User preferences: theme, language, timezone, default entity, default period, sidebar collapsed
- [ ] Setup wizard: first-run flow that collects org name, mode (single/multi/full), currency, entities
- [ ] Config export/import: share configuration between environments or tenants
- [ ] Environment detection: `isDev()`, `isStaging()`, `isProd()`, `isStatic()`, `hasBackend()`

### Zed.20 — Demo Data & Seed System

> Every phase needs realistic demo data for testing, sales demos, and development.

- [ ] `SeedManager` with named seed profiles: `starter`, `mid-market`, `enterprise`, `demo`
- [ ] Seed data generators per collection: realistic names, amounts, dates, distributions
- [ ] Construction-specific seed data:
  - 5 entities (GC, 2 subs, equipment division, service division)
  - 20 jobs across entity types (commercial, residential, highway, utility)
  - 500+ cost codes (CSI MasterFormat standard)
  - 200 vendors with realistic trade categories
  - 50 employees with union affiliations, multi-state
  - 100 equipment items with utilization history
  - 12 months of transactions, invoices, pay runs
  - Realistic WIP positions (some over-billed, some under-billed)
  - Aging buckets in AP and AR
  - Active subcontracts with retention
  - Change orders in various statuses
- [ ] Seed data scales: `small` (1 entity, 5 jobs), `medium` (5 entities, 50 jobs), `large` (20 entities, 500 jobs)
- [ ] One-click reset: clear all data and re-seed
- [ ] Incremental seed: add more data to existing dataset

---

## Phase 1 — Core Financial Ledger

> Foundation replacement: General Ledger

- [ ] Chart of Accounts (COA) with construction-standard account structure
- [ ] Account types: Asset, Liability, Equity, Revenue, Expense, Cost of Revenue
- [ ] Sub-account hierarchy (unlimited depth)
- [ ] Account numbering system (configurable segments: company-division-department-account)
- [ ] Journal entry creation with double-entry enforcement
- [ ] Recurring journal entries with schedule
- [ ] Closing entries (monthly/quarterly/annual)
- [ ] Trial balance report
- [ ] General ledger detail report
- [ ] Export COA and journal entries to CSV/JSON
- [ ] Import COA from CSV (merge import: match by account number)

---

## Phase 2 — Multi-Entity & Company Structure

> Foundation replacement: Multi-Company

- [ ] Unlimited company/entity creation
- [ ] Entity types: Holding Company, Operating Company, Subsidiary, Division, Branch, Joint Venture, SPE
- [ ] Parent-child hierarchy with org chart visualization
- [ ] Per-entity COA with shared/override capability
- [ ] Per-entity fiscal year and currency settings
- [ ] Intercompany transaction tracking with auto-elimination entries
- [ ] Consolidated financial statements across entities
- [ ] Entity-level permissions model (Phase 16+)
- [ ] Entity cloning for rapid setup
- [ ] Import entities from CSV with parent resolution

---

## Phase 3 — Job Costing Foundation

> Foundation replacement: Job Cost module — the core of construction accounting

- [ ] Job/Project master record (number, name, owner, address, status, type)
- [ ] Job types: Lump Sum, Time & Material, Cost Plus, Unit Price, Design-Build, GMP
- [ ] Cost code structure (CSI MasterFormat / custom)
- [ ] Cost types: Labor, Material, Subcontract, Equipment, Other, Overhead
- [ ] Budget entry by cost code and cost type
- [ ] Actual cost posting from AP, Payroll, Equipment, JE
- [ ] Committed costs (purchase orders, subcontracts)
- [ ] Cost-to-complete and estimate-at-completion
- [ ] Job cost detail report
- [ ] Job profitability summary
- [ ] Work-in-progress (WIP) schedule
- [ ] Over/under billing analysis
- [ ] Export job cost data to CSV
- [ ] Import budgets from CSV (merge by job + cost code)

---

## Phase 4 — Accounts Payable

> Foundation replacement: Accounts Payable

- [ ] Vendor master file (name, address, tax ID, payment terms, 1099 flag, insurance tracking)
- [ ] Invoice entry with job/cost code distribution
- [ ] Invoice approval workflow (single/multi-level)
- [ ] Duplicate invoice detection
- [ ] Payment processing: check, ACH, wire
- [ ] Partial payments and payment application
- [ ] Retention tracking on subcontractor invoices
- [ ] Vendor aging report (current, 30, 60, 90, 120+)
- [ ] 1099 reporting and generation
- [ ] Lien waiver tracking (conditional/unconditional, partial/final)
- [ ] Compliance certificate tracking (insurance, license, bond)
- [ ] Vendor payment history
- [ ] Import invoices from CSV (merge by vendor + invoice number)
- [ ] Export AP aging, 1099 data to CSV

---

## Phase 5 — Accounts Receivable & Billing

> Foundation replacement: Accounts Receivable + Billing

- [ ] Customer/Owner master file
- [ ] AIA G702/G703 progress billing (application and certificate for payment)
- [ ] T&M billing with markup
- [ ] Unit price billing
- [ ] Cost-plus billing with fee calculation
- [ ] Retention receivable tracking (per contract terms)
- [ ] Billing schedule and milestone tracking
- [ ] Invoice generation with customizable templates
- [ ] Customer aging report (current, 30, 60, 90, 120+)
- [ ] Unapplied cash and payment application
- [ ] Retainage aging report
- [ ] Overbilling/underbilling analysis by job
- [ ] Certified payroll tie-in for prevailing wage jobs
- [ ] Import receivables from CSV
- [ ] Export AIA billing to PDF/CSV

---

## Phase 6 — Payroll Core

> Foundation replacement: Payroll — construction payroll is uniquely complex

- [x] Employee master: personal info, hire date, status, department, class, union affiliation
- [x] Pay types: Regular, Overtime, Double Time, Premium, Per Diem, Piece Rate, Commission
- [x] Earnings/deductions/benefits configuration
- [x] Pay frequency: Weekly, Bi-weekly, Semi-monthly, Monthly
- [x] Time entry by employee, job, cost code, work classification
- [x] Gross-to-net calculation engine
- [x] Federal tax tables and withholding
- [x] State tax tables (all 50 states + DC)
- [x] Local/city tax support
- [x] FICA, FUTA, SUTA calculations
- [x] Workers' compensation class code assignment and premium tracking
- [x] Pay stub generation
- [x] Payroll register
- [x] Quarterly tax summary (941, 940, state equivalents)
- [x] Import time entries from CSV (merge by employee + date + job)
- [x] Export payroll data to CSV/JSON

---

## Phase 7 — Union & Prevailing Wage Payroll

> Foundation replacement: Union Payroll + Prevailing Wage — critical for public works

- [x] Union master file (local number, trade, jurisdiction)
- [x] Union pay scale tables (base rate, fringe, vacation, training, pension, annuity)
- [x] Multi-union support per employee
- [x] Prevailing wage rate tables by jurisdiction and classification
- [x] Davis-Bacon compliance tracking
- [x] Certified payroll report generation (WH-347)
- [x] Fringe benefit allocation (cash vs. plan)
- [x] Union remittance report generation
- [x] Apprentice ratio tracking and compliance
- [x] Multi-state, multi-classification support per pay period
- [x] Split job costing (different rates per job within same check)
- [x] Import union rate tables from CSV
- [x] Import prevailing wage schedules from CSV

---

## Phase 8 — Equipment Management

> Foundation replacement: Equipment Cost

- [x] Equipment master: ID, description, year, make, model, serial, VIN, license
- [x] Equipment categories: Owned, Leased, Rented, Idle
- [x] Depreciation tracking (straight-line, MACRS, declining balance)
- [x] Equipment rate tables (hourly, daily, weekly, monthly)
- [x] Equipment cost posting to jobs by hours/days used
- [x] Fuel consumption tracking
- [x] Maintenance schedule and work order tracking
- [x] Equipment utilization rate analysis
- [x] Owning vs operating cost breakdown
- [x] Equipment P&L by unit
- [x] FHWA rate comparison
- [x] GPS/telematics data placeholder (Phase 26+)
- [x] Import equipment list from CSV
- [x] Export equipment utilization to CSV

---

## Phase 9 — Subcontractor Management

> Foundation replacement: Subcontract module

- [x] Subcontractor master (links to vendor)
- [x] Subcontract creation: scope, amount, terms, retention %, schedule of values
- [x] Change order tracking (additions, deductions, time extensions)
- [x] Payment application processing (AIA G702 from sub)
- [x] Retention schedule and release tracking
- [x] Backcharge tracking and deductions
- [x] Insurance certificate tracking with expiration alerts
- [x] Prequalification questionnaire tracking
- [x] Performance scoring and history
- [x] Subcontractor compliance matrix (insurance, license, bond, OSHA, E-Verify)
- [x] Lien waiver collection workflow
- [x] Bonding capacity tracking
- [x] Import subcontracts from CSV
- [x] Export sub payment history to CSV

---

## Phase 10 — Purchase Orders & Procurement

> Foundation replacement: Purchase Order module

- [x] Purchase order creation with job/cost code distribution
- [x] PO approval workflow
- [x] PO types: Standard, Blanket, Service
- [x] Committed cost integration with job cost
- [x] Three-way matching: PO → Receipt → Invoice
- [x] Material receipt tracking
- [x] PO change orders and amendments
- [x] Vendor price comparison
- [x] Buyout tracking (budget vs. committed vs. actual)
- [x] Open PO report
- [x] PO history by vendor and job
- [x] Import PO data from CSV
- [x] Export open POs to CSV

---

## Phase 11 — Financial Reporting Suite

> Foundation replacement: Financial Reports + WIP

- [x] Balance Sheet (standard, comparative, consolidated)
- [x] Income Statement (standard, by job, by entity, comparative)
- [x] Cash Flow Statement (direct and indirect method)
- [x] WIP Schedule (cost method, units method, efforts method)
- [x] Job cost detail and summary reports
- [x] Aged AP and AR reports
- [x] Payroll summary and detail reports
- [x] Equipment utilization and cost reports
- [x] Custom report builder (drag-and-drop columns, filters, grouping)
- [x] Report scheduling (Phase 16+)
- [x] Report templates library
- [x] Export all reports to PDF/CSV/Excel
- [x] Comparative period analysis (month, quarter, year, YTD)
- [x] Consolidated vs. entity-level toggle
- [x] Bonding capacity analysis report (for surety)

---

## Phase 12 — Dashboard & KPI Engine

> Extends current Concrete dashboard with construction-specific metrics

- [ ] Executive dashboard: revenue, backlog, GP%, WIP, cash position
- [ ] Job performance dashboard: top/bottom jobs, margin trends, fade analysis
- [ ] Cash flow forecasting: project-based cash flow projections
- [ ] Backlog analysis: awarded vs. completed vs. remaining
- [ ] Equipment utilization dashboard
- [ ] Payroll burden analysis
- [ ] Subcontractor exposure dashboard
- [ ] Safety metrics (TRIR, DART, EMR) — placeholder data entry
- [ ] Bonding capacity utilization
- [ ] Revenue recognition trend (over/under billing)
- [ ] Configurable KPI cards with thresholds and alerts
- [ ] Drill-down from any KPI to underlying transactions
- [ ] Period comparison (MTD, QTD, YTD, Last 12, Custom)
- [ ] Entity filter on all dashboards

---

## Phase 13 — Estimating & Bid Management

> Foundation replacement: Estimating module

- [ ] Estimate creation linked to job
- [ ] Assembly/item-based estimating
- [ ] Labor, material, equipment, sub cost buildup
- [ ] Markup and margin configuration (per item, per category, overall)
- [ ] Alternates and allowances
- [ ] Bid day tracking (bid date, pre-bid, addenda)
- [ ] Subcontractor bid solicitation and tabulation
- [ ] Estimate-to-budget transfer (creates job budget from winning estimate)
- [ ] Historical cost database from actual job costs
- [ ] Win/loss tracking and analysis
- [ ] Estimate revision history
- [ ] Import estimate items from CSV
- [ ] Export estimate to CSV/PDF

---

## Phase 14 — Document Management

> Foundation replacement: Document Management

- [ ] Document categories: Contract, Change Order, RFI, Submittal, Drawing, Photo, Report, Correspondence
- [ ] Document tagging by job, entity, vendor, employee
- [ ] Version control with revision history
- [ ] File storage: local (download/upload cycle) in static mode, R2 in cloud mode
- [ ] Document templates (contract, lien waiver, AIA forms, change order)
- [ ] Full-text search across document metadata
- [ ] Document expiration alerts (insurance certs, licenses, bonds)
- [ ] Photo log with date/location/job stamping
- [ ] Drawing log with revision tracking
- [ ] Transmittal creation and tracking
- [ ] Export document index to CSV
- [ ] Import document metadata from CSV

---

## Phase 15 — Import/Export/Merge Engine V2

> Hardened import system for enterprise-scale data migration

- [ ] Universal import wizard: auto-detect data type from headers
- [ ] Foundation Software data import (IIF, CSV exports from Foundation)
- [ ] QuickBooks Desktop/Online import
- [ ] Sage 100/300 import format
- [ ] Viewpoint Vista import format
- [ ] ComputerEase import format
- [ ] Custom delimiter support (pipe, semicolon, tab, fixed-width)
- [ ] Merge import with conflict resolution UI (side-by-side diff)
- [ ] Merge strategies: skip, overwrite, append, manual
- [ ] Composite key configuration per data type
- [ ] Dry-run preview: show what will be added/updated/skipped before commit
- [ ] Import validation rules (required fields, data types, referential integrity)
- [ ] Batch import with progress indicator
- [ ] Import undo (revert entire batch)
- [ ] Full export to JSON (complete backup)
- [ ] Selective export by entity, date range, job, data type
- [ ] CSV export with column selection
- [ ] PDF report export with letterhead
- [ ] API export format (JSON with pagination metadata)
- [ ] Scheduled exports (Phase 16+)

---

## Phase 16 — Cloudflare Deployment & Auth

> Transition from static to live hosted application

- [ ] Cloudflare Pages deployment pipeline
- [ ] Cloudflare Workers API layer
- [ ] Cloudflare D1 database (SQLite at edge)
- [ ] Cloudflare KV for session/cache
- [ ] Cloudflare R2 for document/file storage
- [ ] Authentication: Cloudflare Access (SSO, SAML, OIDC)
- [ ] User registration and onboarding flow
- [ ] Role-based access control (RBAC): Admin, Controller, PM, AP Clerk, Payroll, Field, Read-Only
- [ ] Multi-factor authentication
- [ ] Session management and timeout
- [ ] API key generation for integrations
- [ ] Audit log (who changed what, when)
- [ ] Data encryption at rest (D1) and in transit (TLS)
- [ ] CORS and rate limiting configuration
- [ ] Graceful fallback to static mode if Workers unavailable

---

## Phase 17 — Multi-Tenant Architecture

> Support multiple construction companies on shared infrastructure

- [ ] Tenant isolation at database level (D1 per tenant or row-level)
- [ ] Tenant provisioning: self-service signup → isolated environment
- [ ] Custom subdomain per tenant (company.concrete.app)
- [ ] Tenant-level configuration (COA templates, tax tables, pay scales)
- [ ] Tenant admin panel (user management, subscription, usage)
- [ ] Data residency options (US, EU, APAC edge locations)
- [ ] Tenant data export (full portability)
- [ ] Tenant data deletion (GDPR/CCPA compliance)
- [ ] Cross-tenant analytics (anonymized, opt-in, Phase 30+)
- [ ] White-label support (custom branding per tenant)

---

## Phase 18 — Project Management

> Beyond job costing: active project tracking

- [ ] Project phases and milestones
- [ ] Gantt chart visualization
- [ ] Critical path method (CPM) scheduling
- [ ] Task creation, assignment, dependencies
- [ ] Percent complete tracking (by cost, units, or manual)
- [ ] Look-ahead scheduling (2-week, 4-week, 6-week)
- [ ] Delay tracking and impact analysis
- [ ] Resource loading (labor, equipment) by task
- [ ] Earned value management (EVM): CPI, SPI, EAC, ETC, VAC
- [ ] Baseline vs. actual schedule comparison
- [ ] Weather delay logging
- [ ] Daily log / daily report
- [ ] Photo documentation per task
- [ ] RFI creation, tracking, response
- [ ] Submittal log and tracking
- [ ] Meeting minutes template and tracking

---

## Phase 19 — Change Order Management

> Track all changes across the project lifecycle

- [ ] Change order types: Owner CO, Subcontractor CO, Internal CO
- [ ] Change order request (COR) / potential change order (PCO) workflow
- [ ] Cost impact analysis (labor, material, sub, equipment, markup)
- [ ] Schedule impact analysis (time extension)
- [ ] Approval workflow (multi-level)
- [ ] Change order log with status tracking
- [ ] Integration with job cost (auto-adjust budget on approval)
- [ ] Integration with billing (add to schedule of values)
- [ ] Integration with subcontracts (flow-down changes)
- [ ] Trend report: change order volume and cost by job
- [ ] Export change order log to CSV/PDF

---

## Phase 20 — Service Management & Work Orders

> Foundation replacement: Service Management for service/maintenance contractors

- [ ] Service agreement master (customer, scope, terms, recurring schedule)
- [ ] Work order creation: scheduled, on-demand, emergency
- [ ] Work order dispatch and assignment
- [ ] Technician time and material tracking
- [ ] Flat-rate pricing / T&M pricing
- [ ] Parts/inventory tracking per work order
- [ ] Customer equipment/asset registry
- [ ] Preventive maintenance scheduling
- [ ] Service call routing and priority
- [ ] Work order billing and invoicing
- [ ] Service profitability analysis
- [ ] Customer service history
- [ ] Import work orders from CSV
- [ ] Export service reports to PDF/CSV

---

## Phase 21 — Inventory & Material Management

> Track materials across warehouses, yards, and job sites

- [ ] Item master: description, unit, category, preferred vendor, reorder point
- [ ] Warehouse/location management
- [ ] Inventory receipts and issues
- [ ] Job-site material tracking
- [ ] Inventory valuation (FIFO, LIFO, average cost)
- [ ] Physical inventory count and adjustment
- [ ] Material requisition workflow
- [ ] Transfer between locations
- [ ] Low stock alerts
- [ ] Material cost integration with job cost
- [ ] Waste tracking
- [ ] Import inventory from CSV
- [ ] Export inventory valuation to CSV

---

## Phase 22 — HR & Workforce Management

> Scale from 10 to 1,000,000 employees

- [ ] Employee lifecycle: recruit → hire → onboard → active → terminate → rehire
- [ ] Position management and org chart
- [ ] Skills and certification tracking (OSHA 10/30, CDL, crane, confined space, etc.)
- [ ] Certification expiration alerts
- [ ] Training record management
- [ ] Benefits administration: health, dental, vision, 401k, HSA
- [ ] Open enrollment workflow
- [ ] PTO/leave management (vacation, sick, FMLA, military, jury)
- [ ] Employee self-service portal (Phase 26+)
- [ ] Applicant tracking (basic)
- [ ] New hire reporting (state compliance)
- [ ] EEO-1 reporting
- [ ] I-9 / E-Verify tracking
- [ ] Employee document storage (per-employee folder)
- [ ] Import employees from CSV (merge by SSN or employee ID)
- [ ] Export employee roster to CSV

---

## Phase 23 — Safety & Compliance

> OSHA compliance and safety program management

- [ ] Safety incident recording (injury, near-miss, property damage)
- [ ] OSHA 300/300A/301 log generation
- [ ] TRIR (Total Recordable Incident Rate) calculation
- [ ] DART rate calculation
- [ ] EMR (Experience Modification Rate) tracking
- [ ] Safety inspection/audit checklist templates
- [ ] Toolbox talk/safety meeting log
- [ ] PPE tracking by employee
- [ ] Drug testing schedule and results tracking
- [ ] Job site safety plan templates
- [ ] Safety training matrix (required vs. completed)
- [ ] Corrective action tracking
- [ ] Safety dashboard with trend analysis
- [ ] DOT compliance tracking (CDL, physicals, hours of service)
- [ ] Import incident records from CSV
- [ ] Export OSHA logs to PDF/CSV

---

## Phase 24 — Bonding & Insurance

> Critical for construction: surety and insurance management

- [ ] Surety company and agent master
- [ ] Bonding capacity tracking (single job limit, aggregate)
- [ ] Bond issuance log (bid bond, performance bond, payment bond)
- [ ] WIP-adjusted bonding analysis
- [ ] Insurance policy master (GL, auto, umbrella, workers comp, builder's risk, professional)
- [ ] Policy expiration alerts
- [ ] Certificate of insurance (COI) issuance tracking
- [ ] Subcontractor insurance compliance tracking
- [ ] OCIP/CCIP (wrap-up) program tracking
- [ ] Loss run tracking
- [ ] Claims log
- [ ] Insurance cost allocation to jobs
- [ ] Export bonding analysis for surety submissions

---

## Phase 25 — Bank Reconciliation & Cash Management

> Foundation replacement: Bank Reconciliation

- [ ] Bank account master
- [ ] Bank statement import (CSV, OFX, QFX, BAI2)
- [ ] Auto-matching: statement lines to GL transactions
- [ ] Manual matching and adjustment
- [ ] Reconciliation report with outstanding items
- [ ] Cash position dashboard across all accounts
- [ ] Cash flow projection: committed in/out by date
- [ ] Positive pay file generation
- [ ] ACH file generation (NACHA format)
- [ ] Void and reissue check workflow
- [ ] Credit card transaction import and coding
- [ ] Petty cash tracking
- [ ] Trust account management (for owners who require)

---

## Phase 26 — Mobile & Field Operations

> Get data from the field in real time

- [ ] Progressive Web App (PWA) with offline capability
- [ ] Mobile time entry by employee (GPS stamp optional)
- [ ] Mobile daily log with photo capture
- [ ] Mobile safety inspection checklists
- [ ] Mobile material receipt
- [ ] Mobile equipment hours logging
- [ ] Foreman time entry (crew-based)
- [ ] Field work order completion
- [ ] Offline queue with sync on reconnect
- [ ] Push notifications for approvals, alerts, assignments
- [ ] QR code scanning for equipment and materials
- [ ] Digital signature capture (T&M tickets, delivery receipts)
- [ ] Bandwidth-optimized sync (delta updates only)

---

## Phase 27 — Real-Time Sync & Offline-First

> Handle 1,000,000 employees across spotty job-site connectivity

- [ ] CRDT-based conflict resolution for concurrent edits
- [ ] Cloudflare Durable Objects for real-time collaboration
- [ ] WebSocket connections for live updates
- [ ] IndexedDB local database with full query capability
- [ ] Background sync via Service Worker
- [ ] Conflict resolution UI (manual merge for complex conflicts)
- [ ] Sync priority: payroll > billing > job cost > documents
- [ ] Bandwidth throttling awareness (2G/3G/LTE detection)
- [ ] Selective sync (only relevant jobs/entities for field users)
- [ ] Sync status indicators throughout UI
- [ ] Data integrity verification (checksums)
- [ ] Automatic retry with exponential backoff

---

## Phase 28 — Workflow & Approvals Engine

> Configurable approval chains for enterprise scale

- [ ] Workflow template builder (visual flow editor)
- [ ] Approval types: Sequential, Parallel, Conditional
- [ ] Threshold-based routing (e.g., PO > $50K requires VP approval)
- [ ] Role-based and user-based approvals
- [ ] Delegation and out-of-office routing
- [ ] Email/push notification on pending approvals
- [ ] Approval history and audit trail
- [ ] Escalation rules (auto-escalate after N days)
- [ ] Workflow templates: AP invoice, PO, change order, time entry, expense report
- [ ] Custom workflow creation for any record type
- [ ] Bulk approval for high-volume processors
- [ ] Mobile approval interface

---

## Phase 29 — Intercompany & Consolidated Accounting

> Multi-entity financial management at scale

- [ ] Intercompany transaction types: billing, loan, allocation, transfer
- [ ] Automatic elimination entries on consolidation
- [ ] Transfer pricing rules
- [ ] Shared services allocation (by headcount, revenue, square footage, custom)
- [ ] Management fee calculation and posting
- [ ] Consolidated trial balance
- [ ] Consolidated financial statements with minority interest
- [ ] Currency translation (for international operations)
- [ ] Intercompany reconciliation report
- [ ] Segment reporting
- [ ] Elimination journal review and approval
- [ ] Entity-level vs. consolidated reporting toggle

---

## Phase 30 — Advanced Analytics & Business Intelligence

> Beyond reports: insights and predictions

- [ ] Drag-and-drop analytics builder
- [ ] Pre-built construction KPI library (50+ metrics)
- [ ] Job fade analysis (margin erosion over project life)
- [ ] Predictive cash flow modeling
- [ ] Revenue forecasting by job/entity/division
- [ ] Labor productivity analysis (cost per unit, hours per unit)
- [ ] Equipment ROI analysis
- [ ] Vendor performance scoring
- [ ] Employee retention and turnover analysis
- [ ] What-if scenario modeling
- [ ] Benchmark comparison (anonymized cross-tenant, opt-in)
- [ ] Custom dashboard creation per user/role
- [ ] Scheduled report delivery (email/Slack/webhook)
- [ ] Data warehouse export for third-party BI tools

---

## Phase 31 — Integration Hub

> Connect to the construction technology ecosystem

- [ ] REST API with OpenAPI 3.0 specification
- [ ] Webhook support (outbound event notifications)
- [ ] Procore integration (projects, RFIs, submittals, daily logs)
- [ ] PlanGrid / Autodesk Build integration
- [ ] Bluebeam integration (document markup)
- [ ] HCSS HeavyBid / HeavyJob integration
- [ ] Raken daily reporting integration
- [ ] Buildertrend integration
- [ ] QuickBooks Online bidirectional sync
- [ ] ADP / Paychex payroll export
- [ ] Bank feed integrations (Plaid)
- [ ] Zapier / Make connector for custom integrations
- [ ] Email integration (forward invoices for AP processing)
- [ ] Calendar integration (project milestones → Google/Outlook)
- [ ] Flat file integration via SFTP drop folder

---

## Phase 32 — Tax & Regulatory Compliance

> Multi-jurisdiction compliance at scale

- [ ] Federal payroll tax filing: 941, 940, W-2, W-3
- [ ] State payroll tax filing (all states)
- [ ] Multi-state tax withholding (mobile workforce)
- [ ] Reciprocity agreement handling
- [ ] 1099 generation and e-filing
- [ ] Sales and use tax tracking by jurisdiction
- [ ] State contractor license tracking
- [ ] OCIP/CCIP enrollment and reporting
- [ ] EEO/AA compliance reporting
- [ ] Prevailing wage compliance reporting by jurisdiction
- [ ] State-specific certified payroll formats (beyond federal WH-347)
- [ ] Audit trail for all tax-relevant transactions
- [ ] Tax rate auto-update (via integration or import)
- [ ] Year-end processing wizard

---

## Phase 33 — Contract Management

> Full lifecycle contract administration

- [ ] Contract types: Prime, Subcontract, Purchase Agreement, Service Agreement, Lease
- [ ] Contract creation from estimate/bid
- [ ] Contract terms: payment terms, retention, liquidated damages, warranty
- [ ] Schedule of values management
- [ ] Contract milestone tracking
- [ ] Contract amendment / change order integration
- [ ] Key date tracking (NTP, substantial completion, final completion, warranty expiration)
- [ ] Contract clause library
- [ ] Insurance and bonding requirements per contract
- [ ] Closeout checklist
- [ ] Warranty tracking and claims
- [ ] Contract financial summary (original, changes, current, billed, paid, retention, remaining)
- [ ] Export contract data to CSV/PDF

---

## Phase 34 — Fleet & Asset Tracking

> Comprehensive physical asset management

- [ ] Asset register: all company assets (equipment, vehicles, tools, IT, furniture)
- [ ] Asset categorization and tagging
- [ ] Barcode/QR code generation for assets
- [ ] Asset assignment tracking (to employee, job, location)
- [ ] Depreciation schedules (book and tax)
- [ ] Disposal and retirement processing
- [ ] Fleet management: vehicle inspections, registration, fuel cards
- [ ] DOT compliance: DVIR, hours of service, driver qualification files
- [ ] Telematics integration placeholder (GPS, engine hours, mileage)
- [ ] Tool tracking and crib management
- [ ] Asset utilization reporting
- [ ] Insurance assignment per asset
- [ ] Capital budget vs. actual tracking
- [ ] Import asset register from CSV
- [ ] Export asset depreciation schedule to CSV

---

## Phase 35 — Lean Construction & Field Productivity

> Modern construction management methodologies

- [ ] Last Planner System: phase planning, look-ahead, weekly work plan
- [ ] PPC (Percent Plan Complete) tracking
- [ ] Constraint log and management
- [ ] Labor productivity tracking: earned hours vs. actual hours
- [ ] Quantity tracking by cost code (installed quantities)
- [ ] Production rate analysis (units per hour, per day)
- [ ] Crew composition optimization
- [ ] Quality inspection checklists
- [ ] Punch list management
- [ ] Three-week look-ahead generation
- [ ] Variance analysis: plan vs. actual productivity
- [ ] Lessons learned database
- [ ] Import production data from CSV
- [ ] Export productivity reports to PDF/CSV

---

## Phase 36 — Enterprise Security & Compliance

> SOC 2, data governance, and enterprise-grade security

- [ ] SOC 2 Type II compliance framework
- [ ] Data classification (public, internal, confidential, restricted)
- [ ] Field-level encryption for sensitive data (SSN, bank accounts)
- [ ] Key management and rotation
- [ ] IP allowlisting per tenant
- [ ] Advanced audit logging (query, view, export events)
- [ ] Data retention policies (configurable per data type)
- [ ] Right to erasure (GDPR Article 17)
- [ ] Data processing agreements
- [ ] Penetration testing schedule
- [ ] Vulnerability scanning integration
- [ ] Incident response plan and runbook
- [ ] Business continuity and disaster recovery plan
- [ ] Geo-redundant backup strategy
- [ ] Annual security review and certification

---

## Phase 37 — AI & Machine Learning

> Intelligence layer built on construction data

- [ ] AI-assisted transaction categorization (learn from user corrections)
- [ ] Anomaly detection: unusual costs, timing, amounts
- [ ] Smart cost code suggestion on data entry
- [ ] Predictive project completion date
- [ ] Cash flow prediction using ML regression
- [ ] Invoice data extraction (OCR + NLP) from uploaded PDFs
- [ ] Smart matching: bank transactions to GL entries
- [ ] Change order risk scoring
- [ ] Subcontractor risk prediction
- [ ] Natural language query: "What's the margin on job 2024-015?"
- [ ] AI-generated job cost narratives for project managers
- [ ] Demand forecasting for materials and labor
- [ ] Model training on tenant data (isolated, opt-in)
- [ ] Cloudflare Workers AI integration

---

## Phase 38 — Enterprise Administration & Governance

> Manage 1,000,000 employees across hundreds of entities

- [ ] Delegated administration (division admins, regional admins)
- [ ] Permission sets: fine-grained (per field/action) and coarse (per module)
- [ ] Custom role builder
- [ ] Data access policies (row-level security by entity, job, region)
- [ ] Segregation of duties enforcement (e.g., can't approve own PO)
- [ ] Mass user provisioning via CSV/SCIM
- [ ] LDAP/Active Directory sync
- [ ] SSO federation (SAML 2.0, OIDC)
- [ ] License management and seat tracking
- [ ] Usage analytics per user/module
- [ ] System configuration change log
- [ ] Sandbox/staging environments per tenant
- [ ] Data migration tools (between tenants, environments)
- [ ] Configuration export/import (for multi-entity rollout)

---

## Phase 39 — API Marketplace & Extensibility

> Let the ecosystem build on Concrete

- [ ] Public API documentation portal
- [ ] OAuth 2.0 / API key authentication for third parties
- [ ] Rate limiting and usage metering
- [ ] Webhook subscription management
- [ ] Custom field definitions (user-defined fields on any record type)
- [ ] Custom object definitions (user-defined tables)
- [ ] Scripting engine: user-defined business rules (sandboxed JS)
- [ ] Plugin architecture: install/uninstall add-ons
- [ ] Marketplace: list and discover integrations
- [ ] Partner developer program
- [ ] Custom report creation via API
- [ ] Embedded analytics (iframe embed for external portals)
- [ ] Custom workflow actions (call external API as workflow step)
- [ ] Event bus: subscribe to any system event

---

## Phase 40 — Scale & Performance at 1,000,000 Employees

> The architecture for enterprise-grade construction management

- [ ] D1 database sharding: per-entity, per-region
- [ ] Durable Objects for high-frequency writes (time entry, GPS pings)
- [ ] Read replicas at edge (Cloudflare global network)
- [ ] Query optimization: materialized views for dashboards
- [ ] Background job processing (payroll runs, report generation, imports)
- [ ] Bulk operation optimization (mass payroll, mass billing, mass PO creation)
- [ ] Auto-scaling: Workers handle spikes (Monday morning time entry, payroll day)
- [ ] Data archival: move old jobs to cold storage (R2), query on demand
- [ ] Performance monitoring and alerting
- [ ] SLA management: 99.9% uptime target
- [ ] Capacity planning dashboard
- [ ] Load testing framework
- [ ] Gradual rollout / feature flags for safe deployment
- [ ] Zero-downtime migrations
- [ ] Multi-region failover
- [ ] Compliance with data sovereignty requirements per region

---

## Appendix A — Data Model Overview

### Core Entities

| Collection | Key Fields | Scale Target |
|-----------|-----------|-------------|
| companies | id, name, type, parentId, config | 1,000+ |
| jobs | id, number, name, companyId, status, type, contractAmount | 100,000+ |
| costCodes | id, code, description, jobId, costType | 5,000,000+ |
| accounts | id, number, name, type, parentId, companyId | 50,000+ |
| vendors | id, name, taxId, companyId, type | 500,000+ |
| customers | id, name, companyId | 200,000+ |
| employees | id, name, ssn, companyId, status, unionId | 1,000,000 |
| transactions | id, date, accountId, jobId, costCodeId, amount, type | 500,000,000+ |
| invoicesAP | id, vendorId, number, date, amount, status | 50,000,000+ |
| invoicesAR | id, customerId, jobId, date, amount, status | 10,000,000+ |
| purchaseOrders | id, vendorId, jobId, amount, status | 5,000,000+ |
| subcontracts | id, vendorId, jobId, amount, status | 2,000,000+ |
| equipment | id, description, category, companyId | 500,000+ |
| timeEntries | id, employeeId, jobId, costCodeId, date, hours | 1,000,000,000+ |
| documents | id, type, jobId, vendorId, fileKey | 100,000,000+ |
| changeOrders | id, jobId, type, amount, status | 5,000,000+ |

### Composite Keys for Merge Import

| Data Type | Merge Key |
|----------|-----------|
| employees | companyId + employeeNumber OR ssn |
| vendors | companyId + taxId OR name |
| transactions | companyId + date + accountId + amount + reference |
| invoicesAP | vendorId + invoiceNumber |
| timeEntries | employeeId + date + jobId + costCodeId |
| equipment | companyId + equipmentNumber OR serialNumber |
| jobs | companyId + jobNumber |
| costCodes | jobId + code + costType |

---

## Appendix B — Migration Path from Foundation

| Foundation Module | Concrete Phase | Import Format |
|------------------|---------------|--------------|
| General Ledger | Phase 1 | CSV (COA + JE export) |
| Multi-Company | Phase 2 | CSV (company list) |
| Job Cost | Phase 3 | CSV (job master + cost detail) |
| Accounts Payable | Phase 4 | CSV (vendor master + AP detail) |
| Accounts Receivable | Phase 5 | CSV (customer + AR detail) |
| Payroll | Phase 6–7 | CSV (employee master + pay history) |
| Equipment Cost | Phase 8 | CSV (equipment master + cost) |
| Subcontract | Phase 9 | CSV (sub master + payment history) |
| Purchase Orders | Phase 10 | CSV (PO master + line items) |
| Financial Reports | Phase 11 | N/A (rebuilt natively) |
| Service Management | Phase 20 | CSV (work orders + service agreements) |

---

## Appendix C — Deployment Targets

| Stage | Platform | URL Pattern |
|-------|----------|-------------|
| Development | Local file:// | index.html |
| Preview | GitHub Pages | nors3ai.github.io/Concrete |
| Staging | Cloudflare Pages (preview) | staging.concrete.app |
| Production | Cloudflare Pages + Workers | app.concrete.app |
| Enterprise | Cloudflare + custom domain | {company}.concrete.app |

# Concrete — Construction Financial & Operations Platform

> Replacing Foundation. Built for construction companies scaling from 1 to 1,000,000 employees.
> Browser-first, static deployment (GitHub Pages / Cloudflare Pages), localStorage + IndexedDB,
> with future Cloudflare Workers + D1 live backend.

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

## Architecture Principles

- **Phase 1–15**: Fully static. All data in browser (localStorage → IndexedDB). Export/import JSON/CSV.
- **Phase 16–25**: Cloudflare Pages + Workers. D1 database. Auth via Cloudflare Access.
- **Phase 26–35**: Multi-tenant SaaS. Real-time sync. Offline-first with conflict resolution.
- **Phase 36–40**: Enterprise federation. API marketplace. AI/ML. Regulatory automation.

### Data Tiers

| Tier | Storage | Scale Target |
|------|---------|-------------|
| Local | localStorage / IndexedDB | 1–500 employees, single company |
| Edge | Cloudflare D1 + KV + R2 | 500–50,000 employees, multi-entity |
| Federated | D1 sharding + Durable Objects | 50,000–1,000,000 employees, enterprise |

### Import/Export/Merge Strategy

- **Export**: JSON full backup, CSV per collection, PDF reports
- **Import**: CSV with column mapping wizard, JSON restore, QuickBooks IIF, AIA G702/G703
- **Merge Import**: Deduplicate by composite keys, conflict resolution UI, audit trail of all merges
- **Sync**: Eventual consistency via CRDTs (Phase 26+)

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

- [ ] Employee master: personal info, hire date, status, department, class, union affiliation
- [ ] Pay types: Regular, Overtime, Double Time, Premium, Per Diem, Piece Rate, Commission
- [ ] Earnings/deductions/benefits configuration
- [ ] Pay frequency: Weekly, Bi-weekly, Semi-monthly, Monthly
- [ ] Time entry by employee, job, cost code, work classification
- [ ] Gross-to-net calculation engine
- [ ] Federal tax tables and withholding
- [ ] State tax tables (all 50 states + DC)
- [ ] Local/city tax support
- [ ] FICA, FUTA, SUTA calculations
- [ ] Workers' compensation class code assignment and premium tracking
- [ ] Pay stub generation
- [ ] Payroll register
- [ ] Quarterly tax summary (941, 940, state equivalents)
- [ ] Import time entries from CSV (merge by employee + date + job)
- [ ] Export payroll data to CSV/JSON

---

## Phase 7 — Union & Prevailing Wage Payroll

> Foundation replacement: Union Payroll + Prevailing Wage — critical for public works

- [ ] Union master file (local number, trade, jurisdiction)
- [ ] Union pay scale tables (base rate, fringe, vacation, training, pension, annuity)
- [ ] Multi-union support per employee
- [ ] Prevailing wage rate tables by jurisdiction and classification
- [ ] Davis-Bacon compliance tracking
- [ ] Certified payroll report generation (WH-347)
- [ ] Fringe benefit allocation (cash vs. plan)
- [ ] Union remittance report generation
- [ ] Apprentice ratio tracking and compliance
- [ ] Multi-state, multi-classification support per pay period
- [ ] Split job costing (different rates per job within same check)
- [ ] Import union rate tables from CSV
- [ ] Import prevailing wage schedules from CSV

---

## Phase 8 — Equipment Management

> Foundation replacement: Equipment Cost

- [ ] Equipment master: ID, description, year, make, model, serial, VIN, license
- [ ] Equipment categories: Owned, Leased, Rented, Idle
- [ ] Depreciation tracking (straight-line, MACRS, declining balance)
- [ ] Equipment rate tables (hourly, daily, weekly, monthly)
- [ ] Equipment cost posting to jobs by hours/days used
- [ ] Fuel consumption tracking
- [ ] Maintenance schedule and work order tracking
- [ ] Equipment utilization rate analysis
- [ ] Owning vs operating cost breakdown
- [ ] Equipment P&L by unit
- [ ] FHWA rate comparison
- [ ] GPS/telematics data placeholder (Phase 26+)
- [ ] Import equipment list from CSV
- [ ] Export equipment utilization to CSV

---

## Phase 9 — Subcontractor Management

> Foundation replacement: Subcontract module

- [ ] Subcontractor master (links to vendor)
- [ ] Subcontract creation: scope, amount, terms, retention %, schedule of values
- [ ] Change order tracking (additions, deductions, time extensions)
- [ ] Payment application processing (AIA G702 from sub)
- [ ] Retention schedule and release tracking
- [ ] Backcharge tracking and deductions
- [ ] Insurance certificate tracking with expiration alerts
- [ ] Prequalification questionnaire tracking
- [ ] Performance scoring and history
- [ ] Subcontractor compliance matrix (insurance, license, bond, OSHA, E-Verify)
- [ ] Lien waiver collection workflow
- [ ] Bonding capacity tracking
- [ ] Import subcontracts from CSV
- [ ] Export sub payment history to CSV

---

## Phase 10 — Purchase Orders & Procurement

> Foundation replacement: Purchase Order module

- [ ] Purchase order creation with job/cost code distribution
- [ ] PO approval workflow
- [ ] PO types: Standard, Blanket, Service
- [ ] Committed cost integration with job cost
- [ ] Three-way matching: PO → Receipt → Invoice
- [ ] Material receipt tracking
- [ ] PO change orders and amendments
- [ ] Vendor price comparison
- [ ] Buyout tracking (budget vs. committed vs. actual)
- [ ] Open PO report
- [ ] PO history by vendor and job
- [ ] Import PO data from CSV
- [ ] Export open POs to CSV

---

## Phase 11 — Financial Reporting Suite

> Foundation replacement: Financial Reports + WIP

- [ ] Balance Sheet (standard, comparative, consolidated)
- [ ] Income Statement (standard, by job, by entity, comparative)
- [ ] Cash Flow Statement (direct and indirect method)
- [ ] WIP Schedule (cost method, units method, efforts method)
- [ ] Job cost detail and summary reports
- [ ] Aged AP and AR reports
- [ ] Payroll summary and detail reports
- [ ] Equipment utilization and cost reports
- [ ] Custom report builder (drag-and-drop columns, filters, grouping)
- [ ] Report scheduling (Phase 16+)
- [ ] Report templates library
- [ ] Export all reports to PDF/CSV/Excel
- [ ] Comparative period analysis (month, quarter, year, YTD)
- [ ] Consolidated vs. entity-level toggle
- [ ] Bonding capacity analysis report (for surety)

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

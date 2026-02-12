/**
 * Concrete -- Dashboard & KPI Engine Service (Phase 12)
 *
 * Core service layer for the Dashboard module. Provides a KPI calculation
 * engine with built-in KPIs for construction financial metrics, dashboard
 * CRUD, widget CRUD, KPI definition management, and period helpers.
 *
 * Built-in KPIs:
 *   - revenue_ytd, gross_profit_pct, backlog, wip_total, cash_position
 *   - ar_aging_total, ap_aging_total, equipment_utilization
 *   - payroll_burden_rate, safety_emr, bonding_utilized_pct
 *   - overbilling_total, underbilling_total
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type DashboardLayout = 'grid' | 'list' | 'free';
export type WidgetType = 'kpi_card' | 'chart' | 'table' | 'gauge' | 'trend';
export type KPICategory = 'financial' | 'operational' | 'safety' | 'hr';
export type KPIFormat = 'currency' | 'percent' | 'number' | 'days';
export type KPIStatus = 'good' | 'warning' | 'critical' | 'neutral';
export type TrendDirection = 'up' | 'down' | 'flat';
export type PeriodPreset = 'mtd' | 'qtd' | 'ytd' | 'last12' | 'custom';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Dashboard {
  [key: string]: unknown;
  name: string;
  description?: string;
  layout: DashboardLayout;
  entityId?: string;
  isDefault: boolean;
  widgets: WidgetPlacement[];
}

export interface WidgetPlacement {
  [key: string]: unknown;
  widgetId: string;
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface Widget {
  [key: string]: unknown;
  dashboardId: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition;
}

export interface WidgetConfig {
  [key: string]: unknown;
  dataSource?: string;
  kpiCode?: string;
  filters?: Record<string, unknown>;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  format?: KPIFormat;
  chartType?: string;
  dateRange?: string;
}

export interface WidgetPosition {
  [key: string]: unknown;
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface SavedReport {
  [key: string]: unknown;
  name: string;
  reportType: string;
  config: Record<string, unknown>;
  createdBy?: string;
  isShared: boolean;
}

export interface KPIDef {
  [key: string]: unknown;
  code: string;
  name: string;
  description?: string;
  category: KPICategory;
  formula: string;
  format: KPIFormat;
  thresholdWarning?: number;
  thresholdCritical?: number;
  higherIsBetter: boolean;
}

export interface Benchmark {
  [key: string]: unknown;
  kpiCode: string;
  entityId?: string;
  period: string;
  value: number;
  target?: number;
  industry?: string;
}

// ---------------------------------------------------------------------------
// KPI Computation Result
// ---------------------------------------------------------------------------

export interface KPIResult {
  [key: string]: unknown;
  code: string;
  name: string;
  value: number;
  target?: number;
  status: KPIStatus;
  trend: TrendDirection;
  format: KPIFormat;
  category: KPICategory;
  periodLabel: string;
  previousValue?: number;
  changePercent?: number;
}

// ---------------------------------------------------------------------------
// Period Range
// ---------------------------------------------------------------------------

export interface DateRange {
  [key: string]: unknown;
  start: string;
  end: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Determine KPI status from thresholds. */
function evaluateStatus(
  value: number,
  thresholdWarning: number | undefined,
  thresholdCritical: number | undefined,
  higherIsBetter: boolean,
): KPIStatus {
  if (thresholdCritical !== undefined && thresholdWarning !== undefined) {
    if (higherIsBetter) {
      if (value <= thresholdCritical) return 'critical';
      if (value <= thresholdWarning) return 'warning';
      return 'good';
    } else {
      if (value >= thresholdCritical) return 'critical';
      if (value >= thresholdWarning) return 'warning';
      return 'good';
    }
  }
  return 'neutral';
}

/** Determine trend direction from current vs. previous value. */
function evaluateTrend(current: number, previous: number | undefined): TrendDirection {
  if (previous === undefined || previous === 0) return 'flat';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'flat';
}

/** Get the first day of the current month as an ISO date string. */
function getFirstOfMonth(refDate?: Date): string {
  const d = refDate ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Get the first day of the current quarter as an ISO date string. */
function getFirstOfQuarter(refDate?: Date): string {
  const d = refDate ?? new Date();
  const quarter = Math.floor(d.getMonth() / 3);
  const firstMonth = quarter * 3;
  return `${d.getFullYear()}-${String(firstMonth + 1).padStart(2, '0')}-01`;
}

// ---------------------------------------------------------------------------
// Built-in KPI Definitions
// ---------------------------------------------------------------------------

const BUILTIN_KPIS: KPIDef[] = [
  {
    code: 'revenue_ytd',
    name: 'Revenue YTD',
    description: 'Total recognized revenue year-to-date',
    category: 'financial',
    formula: 'SUM(gl_entries.amount WHERE account_type=revenue AND period=ytd)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: true,
  },
  {
    code: 'gross_profit_pct',
    name: 'Gross Profit %',
    description: 'Gross profit as a percentage of revenue',
    category: 'financial',
    formula: '(revenue - direct_costs) / revenue * 100',
    format: 'percent',
    thresholdWarning: 15,
    thresholdCritical: 10,
    higherIsBetter: true,
  },
  {
    code: 'backlog',
    name: 'Backlog',
    description: 'Total remaining contract value (awarded minus completed)',
    category: 'financial',
    formula: 'SUM(jobs.contractAmount - jobs.billedToDate WHERE status=active)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: true,
  },
  {
    code: 'wip_total',
    name: 'WIP Total',
    description: 'Total work-in-progress value across all active jobs',
    category: 'financial',
    formula: 'SUM(jobs.costToDate - jobs.billedToDate WHERE status=active)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: false,
  },
  {
    code: 'cash_position',
    name: 'Cash Position',
    description: 'Current cash and cash equivalents balance',
    category: 'financial',
    formula: 'SUM(gl_entries.balance WHERE account_type=cash)',
    format: 'currency',
    thresholdWarning: 100000,
    thresholdCritical: 50000,
    higherIsBetter: true,
  },
  {
    code: 'ar_aging_total',
    name: 'AR Aging Total',
    description: 'Total outstanding accounts receivable',
    category: 'financial',
    formula: 'SUM(ar_invoices.balanceDue WHERE status!=paid AND status!=voided)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: false,
  },
  {
    code: 'ap_aging_total',
    name: 'AP Aging Total',
    description: 'Total outstanding accounts payable',
    category: 'financial',
    formula: 'SUM(ap_invoices.balanceDue WHERE status!=paid AND status!=voided)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: false,
  },
  {
    code: 'equipment_utilization',
    name: 'Equipment Utilization',
    description: 'Percentage of equipment currently assigned to active jobs',
    category: 'operational',
    formula: 'COUNT(equipment WHERE status=assigned) / COUNT(equipment WHERE status!=retired) * 100',
    format: 'percent',
    thresholdWarning: 60,
    thresholdCritical: 40,
    higherIsBetter: true,
  },
  {
    code: 'payroll_burden_rate',
    name: 'Payroll Burden Rate',
    description: 'Total payroll burden as a percentage of base wages',
    category: 'hr',
    formula: '(total_burden / total_base_wages) * 100',
    format: 'percent',
    thresholdWarning: 45,
    thresholdCritical: 55,
    higherIsBetter: false,
  },
  {
    code: 'safety_emr',
    name: 'Safety EMR',
    description: 'Experience Modification Rate for workers compensation',
    category: 'safety',
    formula: 'manual_entry',
    format: 'number',
    thresholdWarning: 1.0,
    thresholdCritical: 1.2,
    higherIsBetter: false,
  },
  {
    code: 'bonding_utilized_pct',
    name: 'Bonding Utilized %',
    description: 'Percentage of bonding capacity currently utilized',
    category: 'financial',
    formula: '(active_bonded_amount / bonding_capacity) * 100',
    format: 'percent',
    thresholdWarning: 75,
    thresholdCritical: 90,
    higherIsBetter: false,
  },
  {
    code: 'overbilling_total',
    name: 'Overbilling Total',
    description: 'Total amount billed in excess of earned revenue (liability)',
    category: 'financial',
    formula: 'SUM(jobs.billedToDate - jobs.earnedRevenue WHERE billedToDate > earnedRevenue)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: false,
  },
  {
    code: 'underbilling_total',
    name: 'Underbilling Total',
    description: 'Total earned revenue not yet billed (asset)',
    category: 'financial',
    formula: 'SUM(jobs.earnedRevenue - jobs.billedToDate WHERE earnedRevenue > billedToDate)',
    format: 'currency',
    thresholdWarning: undefined,
    thresholdCritical: undefined,
    higherIsBetter: false,
  },
];

// ---------------------------------------------------------------------------
// DashboardService
// ---------------------------------------------------------------------------

export class DashboardService {
  constructor(
    private dashboards: Collection<Dashboard>,
    private widgets: Collection<Widget>,
    private savedReports: Collection<SavedReport>,
    private kpiDefs: Collection<KPIDef>,
    private benchmarks: Collection<Benchmark>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // PERIOD HELPERS
  // ========================================================================

  /**
   * Get the MTD (month-to-date) range for a given reference date.
   */
  getMTDRange(refDate?: Date): DateRange {
    const d = refDate ?? new Date();
    const start = getFirstOfMonth(d);
    const end = d.toISOString().split('T')[0];
    return {
      start,
      end,
      label: `MTD (${start} - ${end})`,
    };
  }

  /**
   * Get the QTD (quarter-to-date) range for a given reference date.
   */
  getQTDRange(refDate?: Date): DateRange {
    const d = refDate ?? new Date();
    const start = getFirstOfQuarter(d);
    const end = d.toISOString().split('T')[0];
    return {
      start,
      end,
      label: `QTD (${start} - ${end})`,
    };
  }

  /**
   * Get the YTD (year-to-date) range for a given reference date.
   */
  getYTDRange(refDate?: Date): DateRange {
    const d = refDate ?? new Date();
    const start = `${d.getFullYear()}-01-01`;
    const end = d.toISOString().split('T')[0];
    return {
      start,
      end,
      label: `YTD (${start} - ${end})`,
    };
  }

  /**
   * Get the last 12 months range for a given reference date.
   */
  getLast12Range(refDate?: Date): DateRange {
    const d = refDate ?? new Date();
    const end = d.toISOString().split('T')[0];
    const startDate = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate() + 1);
    const start = startDate.toISOString().split('T')[0];
    return {
      start,
      end,
      label: `Last 12 Months (${start} - ${end})`,
    };
  }

  /**
   * Get a date range for the given period preset.
   */
  getPeriodRange(period: PeriodPreset, refDate?: Date, customStart?: string, customEnd?: string): DateRange {
    switch (period) {
      case 'mtd':
        return this.getMTDRange(refDate);
      case 'qtd':
        return this.getQTDRange(refDate);
      case 'ytd':
        return this.getYTDRange(refDate);
      case 'last12':
        return this.getLast12Range(refDate);
      case 'custom':
        return {
          start: customStart ?? '2020-01-01',
          end: customEnd ?? new Date().toISOString().split('T')[0],
          label: `Custom (${customStart ?? '2020-01-01'} - ${customEnd ?? 'today'})`,
        };
      default:
        return this.getYTDRange(refDate);
    }
  }

  // ========================================================================
  // KPI COMPUTATION ENGINE
  // ========================================================================

  /**
   * Compute a KPI value by code.
   *
   * This is the main entry point for the KPI engine. It looks up the KPI
   * definition (built-in or custom), computes the value, evaluates status
   * against thresholds, and determines trend direction from historical data.
   *
   * @param kpiCode - The KPI code (e.g. 'revenue_ytd', 'gross_profit_pct')
   * @param entityId - Optional entity filter
   * @param period - Period preset for date range
   * @param refDate - Reference date (defaults to today)
   * @returns KPIResult with value, target, status, trend
   */
  async computeKPI(
    kpiCode: string,
    entityId?: string,
    period: PeriodPreset = 'ytd',
    refDate?: Date,
  ): Promise<KPIResult> {
    // Look up the KPI definition (built-in first, then custom)
    const kpiDef = await this.resolveKPIDef(kpiCode);
    if (!kpiDef) {
      throw new Error(`KPI definition not found: ${kpiCode}`);
    }

    const dateRange = this.getPeriodRange(period, refDate);

    // Compute the actual value based on the KPI code
    const value = await this.computeKPIValue(kpiCode, entityId, dateRange);

    // Get the target from benchmarks if available
    const target = await this.getKPITarget(kpiCode, entityId, dateRange.label);

    // Get previous period value for trend
    const previousValue = await this.getPreviousPeriodValue(kpiCode, entityId, period, refDate);

    // Evaluate status against thresholds
    const status = evaluateStatus(
      value,
      kpiDef.thresholdWarning,
      kpiDef.thresholdCritical,
      kpiDef.higherIsBetter,
    );

    // Determine trend direction
    const trend = evaluateTrend(value, previousValue);

    // Calculate change percent
    let changePercent: number | undefined;
    if (previousValue !== undefined && previousValue !== 0) {
      changePercent = round2(((value - previousValue) / Math.abs(previousValue)) * 100);
    }

    const result: KPIResult = {
      code: kpiCode,
      name: kpiDef.name,
      value: round2(value),
      target,
      status,
      trend,
      format: kpiDef.format,
      category: kpiDef.category,
      periodLabel: dateRange.label,
      previousValue,
      changePercent,
    };

    this.events.emit('dashboard.kpi.computed', { kpi: result });
    return result;
  }

  /**
   * Compute the raw value for a KPI.
   * Uses benchmark data if available, otherwise returns 0 as a placeholder.
   * In a full implementation, this would query the actual GL, AR, AP, Job,
   * Equipment, and Payroll collections directly.
   */
  private async computeKPIValue(
    kpiCode: string,
    entityId: string | undefined,
    dateRange: DateRange,
  ): Promise<number> {
    // Query benchmarks for the KPI value in the given period
    const q = this.benchmarks.query();
    q.where('kpiCode', '=', kpiCode);

    if (entityId) {
      q.where('entityId', '=', entityId);
    }

    q.where('period', '=', dateRange.label);
    const benchmarkRecords = await q.execute();

    if (benchmarkRecords.length > 0) {
      // Sum all matching benchmark values
      return round2(benchmarkRecords.reduce((sum, b) => sum + (b.value || 0), 0));
    }

    // Try without period match - get the most recent benchmark
    const q2 = this.benchmarks.query();
    q2.where('kpiCode', '=', kpiCode);
    if (entityId) {
      q2.where('entityId', '=', entityId);
    }
    const allBenchmarks = await q2.execute();
    if (allBenchmarks.length > 0) {
      // Return the last entered benchmark value
      return round2(allBenchmarks[allBenchmarks.length - 1].value || 0);
    }

    // Default: return 0 (placeholder until real data aggregation is wired)
    return 0;
  }

  /**
   * Get the target value for a KPI from benchmark records.
   */
  private async getKPITarget(
    kpiCode: string,
    entityId: string | undefined,
    periodLabel: string,
  ): Promise<number | undefined> {
    const q = this.benchmarks.query();
    q.where('kpiCode', '=', kpiCode);

    if (entityId) {
      q.where('entityId', '=', entityId);
    }

    q.where('period', '=', periodLabel);
    const records = await q.execute();

    if (records.length > 0 && records[0].target !== undefined) {
      return round2(records[0].target as number);
    }

    return undefined;
  }

  /**
   * Get the previous period value for trend comparison.
   */
  private async getPreviousPeriodValue(
    kpiCode: string,
    entityId: string | undefined,
    period: PeriodPreset,
    refDate?: Date,
  ): Promise<number | undefined> {
    const d = refDate ?? new Date();
    let previousRefDate: Date;

    switch (period) {
      case 'mtd':
        previousRefDate = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate());
        break;
      case 'qtd':
        previousRefDate = new Date(d.getFullYear(), d.getMonth() - 3, d.getDate());
        break;
      case 'ytd':
        previousRefDate = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
        break;
      case 'last12':
        previousRefDate = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
        break;
      default:
        return undefined;
    }

    const previousRange = this.getPeriodRange(period, previousRefDate);

    const q = this.benchmarks.query();
    q.where('kpiCode', '=', kpiCode);
    if (entityId) {
      q.where('entityId', '=', entityId);
    }
    q.where('period', '=', previousRange.label);
    const records = await q.execute();

    if (records.length > 0) {
      return round2(records.reduce((sum, b) => sum + (b.value || 0), 0));
    }

    return undefined;
  }

  /**
   * Resolve a KPI definition by code. Checks built-in definitions first,
   * then falls back to custom definitions in the kpiDefs collection.
   */
  async resolveKPIDef(kpiCode: string): Promise<KPIDef | null> {
    // Check built-in KPIs first
    const builtin = BUILTIN_KPIS.find((k) => k.code === kpiCode);
    if (builtin) return builtin;

    // Check custom KPI definitions
    const custom = await this.kpiDefs
      .query()
      .where('code', '=', kpiCode)
      .limit(1)
      .first();

    return custom ?? null;
  }

  /**
   * Get all available KPI definitions (built-in + custom).
   */
  async getAllKPIDefs(): Promise<KPIDef[]> {
    const customDefs = await this.kpiDefs.getAll();
    const customCodes = new Set(customDefs.map((d) => d.code));

    // Built-in KPIs that are not overridden by custom ones
    const builtinFiltered = BUILTIN_KPIS.filter((k) => !customCodes.has(k.code));

    return [...builtinFiltered, ...customDefs];
  }

  /**
   * Get built-in KPI definitions only.
   */
  getBuiltinKPIDefs(): KPIDef[] {
    return [...BUILTIN_KPIS];
  }

  // ========================================================================
  // DASHBOARD CRUD
  // ========================================================================

  /**
   * Create a new dashboard.
   * Validates name uniqueness. Defaults: layout='grid', isDefault=false,
   * widgets=[].
   */
  async createDashboard(data: {
    name: string;
    description?: string;
    layout?: DashboardLayout;
    entityId?: string;
    isDefault?: boolean;
    widgets?: WidgetPlacement[];
  }): Promise<Dashboard & CollectionMeta> {
    // Validate name uniqueness
    const existing = await this.getDashboardByName(data.name);
    if (existing) {
      throw new Error(`Dashboard name "${data.name}" already exists.`);
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.clearDefaultDashboards();
    }

    const record = await this.dashboards.insert({
      name: data.name,
      description: data.description,
      layout: data.layout ?? 'grid',
      entityId: data.entityId,
      isDefault: data.isDefault ?? false,
      widgets: data.widgets ?? [],
    } as Dashboard);

    this.events.emit('dashboard.created', { dashboard: record });
    return record;
  }

  /**
   * Update an existing dashboard.
   */
  async updateDashboard(
    id: string,
    changes: Partial<Dashboard>,
  ): Promise<Dashboard & CollectionMeta> {
    const existing = await this.dashboards.get(id);
    if (!existing) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    // If name is changing, validate uniqueness
    if (changes.name && changes.name !== existing.name) {
      const duplicate = await this.getDashboardByName(changes.name);
      if (duplicate) {
        throw new Error(`Dashboard name "${changes.name}" already exists.`);
      }
    }

    // If setting as default, unset other defaults
    if (changes.isDefault && !existing.isDefault) {
      await this.clearDefaultDashboards();
    }

    const updated = await this.dashboards.update(id, changes as Partial<Dashboard>);
    this.events.emit('dashboard.updated', { dashboard: updated });
    return updated;
  }

  /**
   * Delete a dashboard and all its widgets.
   */
  async deleteDashboard(id: string): Promise<void> {
    const existing = await this.dashboards.get(id);
    if (!existing) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    // Remove all widgets for this dashboard
    const dashboardWidgets = await this.widgets
      .query()
      .where('dashboardId', '=', id)
      .execute();

    for (const widget of dashboardWidgets) {
      await this.widgets.remove(widget.id);
    }

    await this.dashboards.remove(id);
    this.events.emit('dashboard.deleted', { dashboardId: id });
  }

  /**
   * Get a single dashboard by ID.
   */
  async getDashboard(id: string): Promise<(Dashboard & CollectionMeta) | null> {
    return this.dashboards.get(id);
  }

  /**
   * Get all dashboards, optionally filtered by entityId.
   */
  async getDashboards(filters?: {
    entityId?: string;
    isDefault?: boolean;
  }): Promise<(Dashboard & CollectionMeta)[]> {
    const q = this.dashboards.query();

    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }
    if (filters?.isDefault !== undefined) {
      q.where('isDefault', '=', filters.isDefault);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Get the default dashboard.
   */
  async getDefaultDashboard(): Promise<(Dashboard & CollectionMeta) | null> {
    return this.dashboards
      .query()
      .where('isDefault', '=', true)
      .limit(1)
      .first();
  }

  /**
   * Lookup a dashboard by name.
   */
  async getDashboardByName(name: string): Promise<(Dashboard & CollectionMeta) | null> {
    return this.dashboards
      .query()
      .where('name', '=', name)
      .limit(1)
      .first();
  }

  /**
   * Clear all default dashboard flags.
   */
  private async clearDefaultDashboards(): Promise<void> {
    const defaults = await this.dashboards
      .query()
      .where('isDefault', '=', true)
      .execute();

    for (const d of defaults) {
      await this.dashboards.update(d.id, { isDefault: false } as Partial<Dashboard>);
    }
  }

  // ========================================================================
  // WIDGET CRUD
  // ========================================================================

  /**
   * Add a widget to a dashboard.
   */
  async addWidget(data: {
    dashboardId: string;
    type: WidgetType;
    title: string;
    config?: WidgetConfig;
    position?: WidgetPosition;
  }): Promise<Widget & CollectionMeta> {
    // Validate dashboard exists
    const dashboard = await this.dashboards.get(data.dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${data.dashboardId}`);
    }

    const record = await this.widgets.insert({
      dashboardId: data.dashboardId,
      type: data.type,
      title: data.title,
      config: data.config ?? {},
      position: data.position ?? { row: 0, col: 0, width: 4, height: 3 },
    } as Widget);

    this.events.emit('dashboard.widget.added', { widget: record, dashboardId: data.dashboardId });
    return record;
  }

  /**
   * Update an existing widget.
   */
  async updateWidget(
    id: string,
    changes: Partial<Widget>,
  ): Promise<Widget & CollectionMeta> {
    const existing = await this.widgets.get(id);
    if (!existing) {
      throw new Error(`Widget not found: ${id}`);
    }

    const updated = await this.widgets.update(id, changes as Partial<Widget>);
    this.events.emit('dashboard.widget.updated', { widget: updated });
    return updated;
  }

  /**
   * Remove a widget from a dashboard.
   */
  async removeWidget(id: string): Promise<void> {
    const existing = await this.widgets.get(id);
    if (!existing) {
      throw new Error(`Widget not found: ${id}`);
    }

    await this.widgets.remove(id);
    this.events.emit('dashboard.widget.removed', { widgetId: id, dashboardId: existing.dashboardId });
  }

  /**
   * Get all widgets for a dashboard.
   */
  async getWidgets(dashboardId: string): Promise<(Widget & CollectionMeta)[]> {
    return this.widgets
      .query()
      .where('dashboardId', '=', dashboardId)
      .execute();
  }

  /**
   * Get a single widget by ID.
   */
  async getWidget(id: string): Promise<(Widget & CollectionMeta) | null> {
    return this.widgets.get(id);
  }

  // ========================================================================
  // KPI DEFINITION CRUD
  // ========================================================================

  /**
   * Create a custom KPI definition.
   * Validates code uniqueness (including against built-in codes).
   */
  async createKPIDef(data: {
    code: string;
    name: string;
    description?: string;
    category: KPICategory;
    formula: string;
    format: KPIFormat;
    thresholdWarning?: number;
    thresholdCritical?: number;
    higherIsBetter?: boolean;
  }): Promise<KPIDef & CollectionMeta> {
    // Check uniqueness against built-in KPIs
    const builtinConflict = BUILTIN_KPIS.find((k) => k.code === data.code);
    if (builtinConflict) {
      throw new Error(`KPI code "${data.code}" conflicts with a built-in KPI.`);
    }

    // Check uniqueness against custom KPIs
    const existingCustom = await this.kpiDefs
      .query()
      .where('code', '=', data.code)
      .limit(1)
      .first();

    if (existingCustom) {
      throw new Error(`KPI code "${data.code}" already exists.`);
    }

    const record = await this.kpiDefs.insert({
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      formula: data.formula,
      format: data.format,
      thresholdWarning: data.thresholdWarning,
      thresholdCritical: data.thresholdCritical,
      higherIsBetter: data.higherIsBetter ?? true,
    } as KPIDef);

    this.events.emit('dashboard.kpiDef.created', { kpiDef: record });
    return record;
  }

  /**
   * Update a custom KPI definition.
   */
  async updateKPIDef(
    id: string,
    changes: Partial<KPIDef>,
  ): Promise<KPIDef & CollectionMeta> {
    const existing = await this.kpiDefs.get(id);
    if (!existing) {
      throw new Error(`KPI definition not found: ${id}`);
    }

    // If code is changing, validate uniqueness
    if (changes.code && changes.code !== existing.code) {
      const builtinConflict = BUILTIN_KPIS.find((k) => k.code === changes.code);
      if (builtinConflict) {
        throw new Error(`KPI code "${changes.code}" conflicts with a built-in KPI.`);
      }

      const existingCustom = await this.kpiDefs
        .query()
        .where('code', '=', changes.code)
        .limit(1)
        .first();

      if (existingCustom) {
        throw new Error(`KPI code "${changes.code}" already exists.`);
      }
    }

    const updated = await this.kpiDefs.update(id, changes as Partial<KPIDef>);
    this.events.emit('dashboard.kpiDef.updated', { kpiDef: updated });
    return updated;
  }

  /**
   * Delete a custom KPI definition.
   */
  async deleteKPIDef(id: string): Promise<void> {
    const existing = await this.kpiDefs.get(id);
    if (!existing) {
      throw new Error(`KPI definition not found: ${id}`);
    }

    await this.kpiDefs.remove(id);
    this.events.emit('dashboard.kpiDef.deleted', { kpiDefId: id });
  }

  /**
   * Get a custom KPI definition by ID.
   */
  async getKPIDef(id: string): Promise<(KPIDef & CollectionMeta) | null> {
    return this.kpiDefs.get(id);
  }

  /**
   * Get custom KPI definitions with optional filters.
   */
  async getKPIDefs(filters?: {
    category?: KPICategory;
  }): Promise<(KPIDef & CollectionMeta)[]> {
    const q = this.kpiDefs.query();

    if (filters?.category) {
      q.where('category', '=', filters.category);
    }

    q.orderBy('code', 'asc');
    return q.execute();
  }

  // ========================================================================
  // SAVED REPORT CRUD
  // ========================================================================

  /**
   * Create a saved report.
   */
  async createSavedReport(data: {
    name: string;
    reportType: string;
    config: Record<string, unknown>;
    createdBy?: string;
    isShared?: boolean;
  }): Promise<SavedReport & CollectionMeta> {
    const record = await this.savedReports.insert({
      name: data.name,
      reportType: data.reportType,
      config: data.config,
      createdBy: data.createdBy,
      isShared: data.isShared ?? false,
    } as SavedReport);

    return record;
  }

  /**
   * Get saved reports with optional filters.
   */
  async getSavedReports(filters?: {
    reportType?: string;
    createdBy?: string;
    isShared?: boolean;
  }): Promise<(SavedReport & CollectionMeta)[]> {
    const q = this.savedReports.query();

    if (filters?.reportType) {
      q.where('reportType', '=', filters.reportType);
    }
    if (filters?.createdBy) {
      q.where('createdBy', '=', filters.createdBy);
    }
    if (filters?.isShared !== undefined) {
      q.where('isShared', '=', filters.isShared);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  // ========================================================================
  // BENCHMARK CRUD
  // ========================================================================

  /**
   * Record a benchmark value for a KPI.
   */
  async recordBenchmark(data: {
    kpiCode: string;
    entityId?: string;
    period: string;
    value: number;
    target?: number;
    industry?: string;
  }): Promise<Benchmark & CollectionMeta> {
    const record = await this.benchmarks.insert({
      kpiCode: data.kpiCode,
      entityId: data.entityId,
      period: data.period,
      value: round2(data.value),
      target: data.target !== undefined ? round2(data.target) : undefined,
      industry: data.industry,
    } as Benchmark);

    return record;
  }

  /**
   * Get benchmarks for a KPI with optional filters.
   */
  async getBenchmarks(filters?: {
    kpiCode?: string;
    entityId?: string;
    period?: string;
  }): Promise<(Benchmark & CollectionMeta)[]> {
    const q = this.benchmarks.query();

    if (filters?.kpiCode) {
      q.where('kpiCode', '=', filters.kpiCode);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }
    if (filters?.period) {
      q.where('period', '=', filters.period);
    }

    return q.execute();
  }

  // ========================================================================
  // EXECUTIVE DASHBOARD HELPERS
  // ========================================================================

  /**
   * Compute all executive KPIs for a dashboard display.
   * Returns an array of KPIResult objects for the core financial metrics.
   */
  async computeExecutiveKPIs(
    entityId?: string,
    period: PeriodPreset = 'ytd',
    refDate?: Date,
  ): Promise<KPIResult[]> {
    const executiveCodes = [
      'revenue_ytd',
      'gross_profit_pct',
      'backlog',
      'wip_total',
      'cash_position',
      'ar_aging_total',
      'ap_aging_total',
    ];

    const results: KPIResult[] = [];
    for (const code of executiveCodes) {
      try {
        const result = await this.computeKPI(code, entityId, period, refDate);
        results.push(result);
      } catch {
        // Skip KPIs that fail to compute
      }
    }

    return results;
  }

  /**
   * Compute all operational KPIs.
   */
  async computeOperationalKPIs(
    entityId?: string,
    period: PeriodPreset = 'ytd',
    refDate?: Date,
  ): Promise<KPIResult[]> {
    const operationalCodes = [
      'equipment_utilization',
      'payroll_burden_rate',
      'safety_emr',
      'bonding_utilized_pct',
      'overbilling_total',
      'underbilling_total',
    ];

    const results: KPIResult[] = [];
    for (const code of operationalCodes) {
      try {
        const result = await this.computeKPI(code, entityId, period, refDate);
        results.push(result);
      } catch {
        // Skip KPIs that fail to compute
      }
    }

    return results;
  }
}

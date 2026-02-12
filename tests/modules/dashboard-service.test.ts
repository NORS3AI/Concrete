/**
 * Dashboard & KPI Engine Service Tests
 * Tests for the Dashboard module business logic layer (Phase 12).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardService } from '../../src/modules/dashboard/dashboard-service';
import type {
  Dashboard, Widget, SavedReport, KPIDef, Benchmark,
} from '../../src/modules/dashboard/dashboard-service';
import { Collection } from '../../src/core/store/collection';
import { EventBus } from '../../src/core/events/bus';
import { SchemaRegistry } from '../../src/core/schema/registry';
import { LocalStorageAdapter } from '../../src/core/store/local-storage';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createTestService() {
  const adapter = new LocalStorageAdapter();
  const events = new EventBus();
  const schemas = new SchemaRegistry();

  const dashboards = new Collection<Dashboard>('analytics/dashboard', adapter, schemas, events);
  const widgets = new Collection<Widget>('analytics/widget', adapter, schemas, events);
  const savedReports = new Collection<SavedReport>('analytics/savedReport', adapter, schemas, events);
  const kpiDefs = new Collection<KPIDef>('analytics/kpiDef', adapter, schemas, events);
  const benchmarks = new Collection<Benchmark>('analytics/benchmark', adapter, schemas, events);

  const service = new DashboardService(
    dashboards, widgets, savedReports, kpiDefs, benchmarks, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardService', () => {
  let service: DashboardService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Dashboard CRUD
  // ==========================================================================

  describe('Dashboard CRUD', () => {
    it('creates a dashboard with defaults', async () => {
      const dashboard = await service.createDashboard({
        name: 'Executive Overview',
      });

      expect(dashboard.name).toBe('Executive Overview');
      expect(dashboard.layout).toBe('grid');
      expect(dashboard.isDefault).toBe(false);
      expect(dashboard.widgets).toEqual([]);
      expect(dashboard.id).toBeDefined();
    });

    it('rejects duplicate dashboard names', async () => {
      await service.createDashboard({ name: 'Executive Overview' });
      await expect(
        service.createDashboard({ name: 'Executive Overview' }),
      ).rejects.toThrow('already exists');
    });

    it('updates a dashboard', async () => {
      const dashboard = await service.createDashboard({ name: 'Dashboard 1' });
      const updated = await service.updateDashboard(dashboard.id, {
        description: 'Updated description',
        layout: 'list',
      });
      expect(updated.description).toBe('Updated description');
      expect(updated.layout).toBe('list');
    });

    it('deletes a dashboard and its widgets', async () => {
      const dashboard = await service.createDashboard({ name: 'To Delete' });
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'kpi_card',
        title: 'Revenue',
      });

      await service.deleteDashboard(dashboard.id);

      const result = await service.getDashboard(dashboard.id);
      expect(result).toBeNull();

      const widgets = await service.getWidgets(dashboard.id);
      expect(widgets).toHaveLength(0);
    });

    it('sets and clears default dashboards', async () => {
      const d1 = await service.createDashboard({ name: 'Dashboard 1', isDefault: true });
      expect(d1.isDefault).toBe(true);

      const d2 = await service.createDashboard({ name: 'Dashboard 2', isDefault: true });
      expect(d2.isDefault).toBe(true);

      // d1 should no longer be default
      const d1Refreshed = await service.getDashboard(d1.id);
      expect(d1Refreshed!.isDefault).toBe(false);
    });

    it('gets default dashboard', async () => {
      await service.createDashboard({ name: 'Non-default' });
      await service.createDashboard({ name: 'Default', isDefault: true });

      const defaultDash = await service.getDefaultDashboard();
      expect(defaultDash).not.toBeNull();
      expect(defaultDash!.name).toBe('Default');
    });
  });

  // ==========================================================================
  // Widget CRUD
  // ==========================================================================

  describe('Widget CRUD', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const dashboard = await service.createDashboard({ name: 'Test Dashboard' });
      dashboardId = dashboard.id;
    });

    it('adds a widget to a dashboard', async () => {
      const widget = await service.addWidget({
        dashboardId,
        type: 'kpi_card',
        title: 'Revenue YTD',
        config: { kpiCode: 'revenue_ytd', format: 'currency' },
      });

      expect(widget.dashboardId).toBe(dashboardId);
      expect(widget.type).toBe('kpi_card');
      expect(widget.title).toBe('Revenue YTD');
      expect(widget.config.kpiCode).toBe('revenue_ytd');
      expect(widget.position.row).toBe(0);
      expect(widget.position.col).toBe(0);
      expect(widget.position.width).toBe(4);
      expect(widget.position.height).toBe(3);
    });

    it('rejects widget for non-existent dashboard', async () => {
      await expect(
        service.addWidget({
          dashboardId: 'non-existent',
          type: 'chart',
          title: 'Test',
        }),
      ).rejects.toThrow('Dashboard not found');
    });

    it('updates a widget', async () => {
      const widget = await service.addWidget({
        dashboardId,
        type: 'kpi_card',
        title: 'Revenue',
      });

      const updated = await service.updateWidget(widget.id, {
        title: 'Revenue Updated',
        position: { row: 1, col: 2, width: 6, height: 4 },
      });

      expect(updated.title).toBe('Revenue Updated');
      expect(updated.position.row).toBe(1);
      expect(updated.position.col).toBe(2);
    });

    it('removes a widget', async () => {
      const widget = await service.addWidget({
        dashboardId,
        type: 'gauge',
        title: 'GP%',
      });

      await service.removeWidget(widget.id);
      const result = await service.getWidget(widget.id);
      expect(result).toBeNull();
    });

    it('gets all widgets for a dashboard', async () => {
      await service.addWidget({ dashboardId, type: 'kpi_card', title: 'Widget 1' });
      await service.addWidget({ dashboardId, type: 'chart', title: 'Widget 2' });
      await service.addWidget({ dashboardId, type: 'table', title: 'Widget 3' });

      const widgets = await service.getWidgets(dashboardId);
      expect(widgets).toHaveLength(3);
    });
  });

  // ==========================================================================
  // KPI Definition CRUD
  // ==========================================================================

  describe('KPI Definition CRUD', () => {
    it('creates a custom KPI definition', async () => {
      const kpi = await service.createKPIDef({
        code: 'custom_roi',
        name: 'Custom ROI',
        category: 'financial',
        formula: '(net_income / total_investment) * 100',
        format: 'percent',
        higherIsBetter: true,
      });

      expect(kpi.code).toBe('custom_roi');
      expect(kpi.name).toBe('Custom ROI');
      expect(kpi.category).toBe('financial');
      expect(kpi.higherIsBetter).toBe(true);
    });

    it('rejects KPI code conflicting with built-in', async () => {
      await expect(
        service.createKPIDef({
          code: 'revenue_ytd',
          name: 'Duplicate Revenue',
          category: 'financial',
          formula: 'test',
          format: 'currency',
        }),
      ).rejects.toThrow('conflicts with a built-in KPI');
    });

    it('rejects duplicate custom KPI codes', async () => {
      await service.createKPIDef({
        code: 'custom_kpi_1',
        name: 'Custom 1',
        category: 'operational',
        formula: 'test',
        format: 'number',
      });

      await expect(
        service.createKPIDef({
          code: 'custom_kpi_1',
          name: 'Custom 1 Duplicate',
          category: 'operational',
          formula: 'test',
          format: 'number',
        }),
      ).rejects.toThrow('already exists');
    });

    it('resolves built-in KPI definitions', async () => {
      const kpi = await service.resolveKPIDef('revenue_ytd');
      expect(kpi).not.toBeNull();
      expect(kpi!.code).toBe('revenue_ytd');
      expect(kpi!.name).toBe('Revenue YTD');
      expect(kpi!.category).toBe('financial');
      expect(kpi!.format).toBe('currency');
    });

    it('gets all KPI definitions (built-in + custom)', async () => {
      await service.createKPIDef({
        code: 'custom_abc',
        name: 'Custom ABC',
        category: 'financial',
        formula: 'test',
        format: 'number',
      });

      const allDefs = await service.getAllKPIDefs();
      // Should include 13 built-in + 1 custom = 14
      expect(allDefs.length).toBeGreaterThanOrEqual(14);

      const customDef = allDefs.find((d) => d.code === 'custom_abc');
      expect(customDef).toBeDefined();
    });

    it('returns all built-in KPI definitions', () => {
      const builtins = service.getBuiltinKPIDefs();
      expect(builtins.length).toBe(13);
      expect(builtins.map((k) => k.code)).toContain('revenue_ytd');
      expect(builtins.map((k) => k.code)).toContain('gross_profit_pct');
      expect(builtins.map((k) => k.code)).toContain('backlog');
      expect(builtins.map((k) => k.code)).toContain('safety_emr');
    });
  });

  // ==========================================================================
  // Period Helpers
  // ==========================================================================

  describe('Period Helpers', () => {
    it('computes MTD range', () => {
      const refDate = new Date(2026, 1, 12); // Feb 12, 2026
      const range = service.getMTDRange(refDate);
      expect(range.start).toBe('2026-02-01');
      expect(range.end).toBe('2026-02-12');
      expect(range.label).toContain('MTD');
    });

    it('computes QTD range', () => {
      const refDate = new Date(2026, 1, 12); // Feb 12, 2026 (Q1)
      const range = service.getQTDRange(refDate);
      expect(range.start).toBe('2026-01-01');
      expect(range.end).toBe('2026-02-12');
      expect(range.label).toContain('QTD');
    });

    it('computes YTD range', () => {
      const refDate = new Date(2026, 1, 12); // Feb 12, 2026
      const range = service.getYTDRange(refDate);
      expect(range.start).toBe('2026-01-01');
      expect(range.end).toBe('2026-02-12');
      expect(range.label).toContain('YTD');
    });

    it('computes Last 12 months range', () => {
      const refDate = new Date(2026, 1, 12); // Feb 12, 2026
      const range = service.getLast12Range(refDate);
      expect(range.start).toBe('2025-02-13');
      expect(range.end).toBe('2026-02-12');
      expect(range.label).toContain('Last 12');
    });

    it('gets period range by preset', () => {
      const refDate = new Date(2026, 5, 15); // Jun 15, 2026
      const ytdRange = service.getPeriodRange('ytd', refDate);
      expect(ytdRange.start).toBe('2026-01-01');

      const customRange = service.getPeriodRange('custom', refDate, '2025-06-01', '2026-06-15');
      expect(customRange.start).toBe('2025-06-01');
      expect(customRange.end).toBe('2026-06-15');
    });
  });

  // ==========================================================================
  // KPI Computation
  // ==========================================================================

  describe('KPI Computation', () => {
    it('computes a KPI with benchmark data', async () => {
      const refDate = new Date(2026, 1, 12);
      const range = service.getYTDRange(refDate);

      // Record a benchmark value
      await service.recordBenchmark({
        kpiCode: 'revenue_ytd',
        period: range.label,
        value: 5000000,
        target: 6000000,
      });

      const result = await service.computeKPI('revenue_ytd', undefined, 'ytd', refDate);
      expect(result.code).toBe('revenue_ytd');
      expect(result.value).toBe(5000000);
      expect(result.target).toBe(6000000);
      expect(result.format).toBe('currency');
      expect(result.category).toBe('financial');
    });

    it('computes KPI with threshold-based status', async () => {
      const refDate = new Date(2026, 1, 12);
      const range = service.getYTDRange(refDate);

      // Record a GP% benchmark below warning threshold (15)
      await service.recordBenchmark({
        kpiCode: 'gross_profit_pct',
        period: range.label,
        value: 12,
      });

      const result = await service.computeKPI('gross_profit_pct', undefined, 'ytd', refDate);
      expect(result.value).toBe(12);
      expect(result.status).toBe('warning');
    });

    it('computes KPI with critical status', async () => {
      const refDate = new Date(2026, 1, 12);
      const range = service.getYTDRange(refDate);

      // Record a GP% benchmark below critical threshold (10)
      await service.recordBenchmark({
        kpiCode: 'gross_profit_pct',
        period: range.label,
        value: 8,
      });

      const result = await service.computeKPI('gross_profit_pct', undefined, 'ytd', refDate);
      expect(result.value).toBe(8);
      expect(result.status).toBe('critical');
    });

    it('throws for unknown KPI code', async () => {
      await expect(
        service.computeKPI('nonexistent_kpi'),
      ).rejects.toThrow('KPI definition not found');
    });

    it('computes KPI with trend from previous period', async () => {
      const refDate = new Date(2026, 1, 12);
      const currentRange = service.getYTDRange(refDate);

      // Previous year range
      const prevDate = new Date(2025, 1, 12);
      const prevRange = service.getYTDRange(prevDate);

      // Record current and previous benchmark
      await service.recordBenchmark({
        kpiCode: 'revenue_ytd',
        period: prevRange.label,
        value: 4000000,
      });
      await service.recordBenchmark({
        kpiCode: 'revenue_ytd',
        period: currentRange.label,
        value: 5000000,
      });

      const result = await service.computeKPI('revenue_ytd', undefined, 'ytd', refDate);
      expect(result.value).toBe(5000000);
      expect(result.previousValue).toBe(4000000);
      expect(result.trend).toBe('up');
      expect(result.changePercent).toBe(25);
    });

    it('computes executive KPIs', async () => {
      const results = await service.computeExecutiveKPIs(undefined, 'ytd');
      // Should return results for all executive KPI codes even with no data
      expect(results.length).toBe(7);
      const codes = results.map((r) => r.code);
      expect(codes).toContain('revenue_ytd');
      expect(codes).toContain('gross_profit_pct');
      expect(codes).toContain('backlog');
      expect(codes).toContain('cash_position');
    });

    it('computes operational KPIs', async () => {
      const results = await service.computeOperationalKPIs(undefined, 'ytd');
      expect(results.length).toBe(6);
      const codes = results.map((r) => r.code);
      expect(codes).toContain('equipment_utilization');
      expect(codes).toContain('payroll_burden_rate');
      expect(codes).toContain('safety_emr');
    });
  });

  // ==========================================================================
  // Benchmarks
  // ==========================================================================

  describe('Benchmarks', () => {
    it('records a benchmark value', async () => {
      const benchmark = await service.recordBenchmark({
        kpiCode: 'revenue_ytd',
        period: 'YTD 2026',
        value: 5000000,
        target: 6000000,
        industry: 'Commercial Construction',
      });

      expect(benchmark.kpiCode).toBe('revenue_ytd');
      expect(benchmark.value).toBe(5000000);
      expect(benchmark.target).toBe(6000000);
      expect(benchmark.industry).toBe('Commercial Construction');
    });

    it('gets benchmarks with filters', async () => {
      await service.recordBenchmark({
        kpiCode: 'revenue_ytd',
        period: 'YTD 2026',
        value: 5000000,
      });
      await service.recordBenchmark({
        kpiCode: 'gross_profit_pct',
        period: 'YTD 2026',
        value: 18.5,
      });
      await service.recordBenchmark({
        kpiCode: 'revenue_ytd',
        period: 'YTD 2025',
        value: 4500000,
      });

      const revenueOnly = await service.getBenchmarks({ kpiCode: 'revenue_ytd' });
      expect(revenueOnly).toHaveLength(2);

      const period2026 = await service.getBenchmarks({ period: 'YTD 2026' });
      expect(period2026).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Saved Reports
  // ==========================================================================

  describe('Saved Reports', () => {
    it('creates a saved report', async () => {
      const report = await service.createSavedReport({
        name: 'Monthly Executive Summary',
        reportType: 'executive',
        config: { period: 'mtd', entityId: null },
        createdBy: 'admin',
        isShared: true,
      });

      expect(report.name).toBe('Monthly Executive Summary');
      expect(report.reportType).toBe('executive');
      expect(report.isShared).toBe(true);
    });

    it('filters saved reports', async () => {
      await service.createSavedReport({
        name: 'Report A',
        reportType: 'executive',
        config: {},
        isShared: true,
      });
      await service.createSavedReport({
        name: 'Report B',
        reportType: 'job',
        config: {},
        isShared: false,
      });

      const execReports = await service.getSavedReports({ reportType: 'executive' });
      expect(execReports).toHaveLength(1);
      expect(execReports[0].name).toBe('Report A');

      const sharedReports = await service.getSavedReports({ isShared: true });
      expect(sharedReports).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('Events', () => {
    it('emits dashboard.created', async () => {
      let emitted = false;
      events.on('dashboard.created', () => { emitted = true; });
      await service.createDashboard({ name: 'Test Dashboard' });
      expect(emitted).toBe(true);
    });

    it('emits dashboard.widget.added', async () => {
      const dashboard = await service.createDashboard({ name: 'Test Dashboard' });
      let emitted = false;
      events.on('dashboard.widget.added', () => { emitted = true; });
      await service.addWidget({
        dashboardId: dashboard.id,
        type: 'kpi_card',
        title: 'Test Widget',
      });
      expect(emitted).toBe(true);
    });

    it('emits dashboard.kpi.computed', async () => {
      let emitted = false;
      events.on('dashboard.kpi.computed', () => { emitted = true; });
      await service.computeKPI('revenue_ytd');
      expect(emitted).toBe(true);
    });

    it('emits dashboard.deleted', async () => {
      const dashboard = await service.createDashboard({ name: 'To Delete' });
      let emitted = false;
      events.on('dashboard.deleted', () => { emitted = true; });
      await service.deleteDashboard(dashboard.id);
      expect(emitted).toBe(true);
    });
  });
});

/**
 * Concrete -- Advanced Analytics & Business Intelligence Service (Phase 30)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'gauge' | 'table' | 'heatmap';
export type MetricCategory = 'financial' | 'job_cost' | 'labor' | 'equipment' | 'safety' | 'vendor' | 'hr' | 'custom';
export type ForecastMethod = 'linear' | 'moving_average' | 'exponential' | 'seasonal';
export type ScenarioStatus = 'draft' | 'active' | 'archived';

export interface AnalyticsWidget { [key: string]: unknown; widgetId: string; dashboardId: string; title: string; chartType: ChartType; dataSource: string; metrics: string; filters?: string; xAxis?: string; yAxis?: string; sortBy?: string; width: number; height: number; posX: number; posY: number; refreshInterval?: number; }
export interface KPIDefinition { [key: string]: unknown; kpiId: string; name: string; category: MetricCategory; formula: string; description?: string; unit: string; targetValue?: number; warningThreshold?: number; criticalThreshold?: number; higherIsBetter: boolean; active: boolean; }
export interface JobFadeAnalysis { [key: string]: unknown; jobId: string; jobName?: string; originalMargin: number; currentMargin: number; fadeAmount: number; fadePct: number; period: string; costOverruns: string; revenueShortfalls: string; rootCauses?: string; }
export interface CashFlowModel { [key: string]: unknown; modelId: string; name: string; method: ForecastMethod; startDate: string; endDate: string; periodicity: 'weekly' | 'monthly' | 'quarterly'; projectedInflows: string; projectedOutflows: string; netCashFlow: number; confidenceLevel: number; assumptions?: string; }
export interface RevenueForecast { [key: string]: unknown; entityId?: string; entityName?: string; jobId?: string; jobName?: string; period: string; forecastAmount: number; actualAmount?: number; variance?: number; method: ForecastMethod; confidenceLevel: number; notes?: string; }
export interface LaborProductivity { [key: string]: unknown; period: string; jobId?: string; jobName?: string; costCode?: string; totalHours: number; totalUnits: number; costPerUnit: number; hoursPerUnit: number; efficiencyPct: number; benchmark?: number; variance?: number; }
export interface EquipmentROI { [key: string]: unknown; equipmentId: string; equipmentName?: string; purchaseCost: number; totalRevenue: number; totalExpenses: number; netIncome: number; roiPct: number; utilizationPct: number; costPerHour: number; revenuePerHour: number; ownershipMonths: number; }
export interface VendorScore { [key: string]: unknown; vendorId: string; vendorName?: string; qualityScore: number; deliveryScore: number; priceScore: number; communicationScore: number; overallScore: number; totalOrders: number; onTimeDeliveryPct: number; defectRate: number; lastUpdated: string; }
export interface RetentionAnalysis { [key: string]: unknown; period: string; department?: string; headcountStart: number; headcountEnd: number; hires: number; terminations: number; turnoverRate: number; retentionRate: number; avgTenureDays: number; voluntaryTerms: number; involuntaryTerms: number; }
export interface ScenarioModel { [key: string]: unknown; scenarioId: string; name: string; description?: string; status: ScenarioStatus; baselineData: string; adjustments: string; projectedRevenue: number; projectedExpenses: number; projectedProfit: number; createdBy: string; createdDate: string; }
export interface BenchmarkComparison { [key: string]: unknown; metricName: string; category: MetricCategory; companyValue: number; industryAvg: number; industryMedian: number; percentileRank: number; period: string; sampleSize: number; source?: string; }
export interface CustomDashboard { [key: string]: unknown; dashboardId: string; name: string; ownerId: string; ownerName?: string; roleAccess?: string; isDefault: boolean; layout: string; widgetIds: string; createdDate: string; updatedDate?: string; }
export interface ScheduledReport { [key: string]: unknown; reportId: string; name: string; reportType: string; schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly'; recipients: string; deliveryMethod: 'email' | 'slack' | 'webhook'; filters?: string; lastRunAt?: string; nextRunAt: string; active: boolean; createdBy: string; }
export interface DataExportConfig { [key: string]: unknown; exportId: string; name: string; targetSystem: string; format: 'csv' | 'json' | 'parquet' | 'sql'; collections: string; schedule?: string; lastExportAt?: string; recordCount?: number; fileSizeBytes?: number; active: boolean; }

const round2 = (n: number): number => Math.round(n * 100) / 100;
function currentDate(): string { return new Date().toISOString().split('T')[0]; }

export class AnalyticsService {
  constructor(
    private widgets: Collection<AnalyticsWidget>, private kpis: Collection<KPIDefinition>,
    private jobFade: Collection<JobFadeAnalysis>, private cashFlowModels: Collection<CashFlowModel>,
    private revenueForecasts: Collection<RevenueForecast>, private laborProductivity: Collection<LaborProductivity>,
    private equipmentROI: Collection<EquipmentROI>, private vendorScores: Collection<VendorScore>,
    private retention: Collection<RetentionAnalysis>, private scenarios: Collection<ScenarioModel>,
    private benchmarks: Collection<BenchmarkComparison>, private dashboards: Collection<CustomDashboard>,
    private scheduledReports: Collection<ScheduledReport>, private dataExports: Collection<DataExportConfig>,
    private events: EventBus,
  ) {}

  // Widgets
  async addWidget(data: { widgetId: string; dashboardId: string; title: string; chartType: ChartType; dataSource: string; metrics: string; filters?: string; xAxis?: string; yAxis?: string; width?: number; height?: number; posX?: number; posY?: number }): Promise<AnalyticsWidget & CollectionMeta> {
    return this.widgets.insert({ ...data, filters: data.filters ?? '', xAxis: data.xAxis ?? '', yAxis: data.yAxis ?? '', sortBy: '', width: data.width ?? 4, height: data.height ?? 3, posX: data.posX ?? 0, posY: data.posY ?? 0 });
  }
  async updateWidgetPosition(id: string, posX: number, posY: number, width: number, height: number): Promise<AnalyticsWidget & CollectionMeta> { return this.widgets.update(id, { posX, posY, width, height }); }
  async listWidgets(dashboardId: string): Promise<(AnalyticsWidget & CollectionMeta)[]> { const q = this.widgets.query(); q.where('dashboardId', '=', dashboardId); return q.execute(); }
  async removeWidget(id: string): Promise<void> { await this.widgets.remove(id); }

  // KPI Library
  async defineKPI(data: { kpiId: string; name: string; category: MetricCategory; formula: string; description?: string; unit: string; targetValue?: number; warningThreshold?: number; criticalThreshold?: number; higherIsBetter?: boolean }): Promise<KPIDefinition & CollectionMeta> {
    return this.kpis.insert({ ...data, description: data.description ?? '', targetValue: data.targetValue ?? 0, warningThreshold: data.warningThreshold ?? 0, criticalThreshold: data.criticalThreshold ?? 0, higherIsBetter: data.higherIsBetter ?? true, active: true });
  }
  async listKPIs(filters?: { category?: MetricCategory; active?: boolean; search?: string }): Promise<(KPIDefinition & CollectionMeta)[]> { const q = this.kpis.query(); if (filters?.category) q.where('category', '=', filters.category); if (filters?.active !== undefined) q.where('active', '=', filters.active); q.orderBy('name', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s) || (x.description ?? '').toLowerCase().includes(s)); } return r; }

  // Job Fade
  async recordJobFade(data: { jobId: string; jobName?: string; originalMargin: number; currentMargin: number; period: string; costOverruns: string; revenueShortfalls: string; rootCauses?: string }): Promise<JobFadeAnalysis & CollectionMeta> {
    const fade = round2(data.originalMargin - data.currentMargin);
    const fadePct = data.originalMargin !== 0 ? round2((fade / data.originalMargin) * 100) : 0;
    return this.jobFade.insert({ ...data, jobName: data.jobName ?? '', originalMargin: round2(data.originalMargin), currentMargin: round2(data.currentMargin), fadeAmount: fade, fadePct, rootCauses: data.rootCauses ?? '' });
  }
  async listJobFade(period?: string): Promise<(JobFadeAnalysis & CollectionMeta)[]> { const q = this.jobFade.query(); if (period) q.where('period', '=', period); q.orderBy('fadePct', 'desc'); return q.execute(); }

  // Cash Flow Models
  async createCashFlowModel(data: { modelId: string; name: string; method: ForecastMethod; startDate: string; endDate: string; periodicity: CashFlowModel['periodicity']; projectedInflows: string; projectedOutflows: string; netCashFlow: number; confidenceLevel: number; assumptions?: string }): Promise<CashFlowModel & CollectionMeta> {
    return this.cashFlowModels.insert({ ...data, netCashFlow: round2(data.netCashFlow), confidenceLevel: round2(data.confidenceLevel), assumptions: data.assumptions ?? '' });
  }
  async listCashFlowModels(): Promise<(CashFlowModel & CollectionMeta)[]> { return this.cashFlowModels.query().orderBy('name', 'asc').execute(); }

  // Revenue Forecasts
  async addRevenueForecast(data: { entityId?: string; entityName?: string; jobId?: string; jobName?: string; period: string; forecastAmount: number; actualAmount?: number; method: ForecastMethod; confidenceLevel: number; notes?: string }): Promise<RevenueForecast & CollectionMeta> {
    const variance = data.actualAmount !== undefined ? round2(data.actualAmount - data.forecastAmount) : undefined;
    return this.revenueForecasts.insert({ ...data, entityId: data.entityId ?? '', entityName: data.entityName ?? '', jobId: data.jobId ?? '', jobName: data.jobName ?? '', forecastAmount: round2(data.forecastAmount), actualAmount: data.actualAmount !== undefined ? round2(data.actualAmount) : 0, variance: variance ?? 0, confidenceLevel: round2(data.confidenceLevel), notes: data.notes ?? '' });
  }
  async listRevenueForecasts(filters?: { period?: string; entityId?: string }): Promise<(RevenueForecast & CollectionMeta)[]> { const q = this.revenueForecasts.query(); if (filters?.period) q.where('period', '=', filters.period); if (filters?.entityId) q.where('entityId', '=', filters.entityId); q.orderBy('period', 'desc'); return q.execute(); }

  // Labor Productivity
  async addLaborProductivity(data: { period: string; jobId?: string; jobName?: string; costCode?: string; totalHours: number; totalUnits: number; costPerUnit: number; benchmark?: number }): Promise<LaborProductivity & CollectionMeta> {
    const hpu = data.totalUnits > 0 ? round2(data.totalHours / data.totalUnits) : 0;
    const eff = data.benchmark && data.benchmark > 0 ? round2((data.benchmark / hpu) * 100) : 100;
    const variance = data.benchmark ? round2(hpu - data.benchmark) : 0;
    return this.laborProductivity.insert({ ...data, jobId: data.jobId ?? '', jobName: data.jobName ?? '', costCode: data.costCode ?? '', totalHours: round2(data.totalHours), totalUnits: round2(data.totalUnits), costPerUnit: round2(data.costPerUnit), hoursPerUnit: hpu, efficiencyPct: eff, benchmark: data.benchmark ?? 0, variance });
  }
  async listLaborProductivity(filters?: { period?: string; jobId?: string }): Promise<(LaborProductivity & CollectionMeta)[]> { const q = this.laborProductivity.query(); if (filters?.period) q.where('period', '=', filters.period); if (filters?.jobId) q.where('jobId', '=', filters.jobId); q.orderBy('period', 'desc'); return q.execute(); }

  // Equipment ROI
  async addEquipmentROI(data: { equipmentId: string; equipmentName?: string; purchaseCost: number; totalRevenue: number; totalExpenses: number; utilizationPct: number; costPerHour: number; revenuePerHour: number; ownershipMonths: number }): Promise<EquipmentROI & CollectionMeta> {
    const net = round2(data.totalRevenue - data.totalExpenses);
    const roi = data.purchaseCost > 0 ? round2((net / data.purchaseCost) * 100) : 0;
    return this.equipmentROI.insert({ ...data, equipmentName: data.equipmentName ?? '', purchaseCost: round2(data.purchaseCost), totalRevenue: round2(data.totalRevenue), totalExpenses: round2(data.totalExpenses), netIncome: net, roiPct: roi, utilizationPct: round2(data.utilizationPct), costPerHour: round2(data.costPerHour), revenuePerHour: round2(data.revenuePerHour) });
  }
  async listEquipmentROI(): Promise<(EquipmentROI & CollectionMeta)[]> { return this.equipmentROI.query().orderBy('roiPct', 'desc').execute(); }

  // Vendor Scoring
  async scoreVendor(data: { vendorId: string; vendorName?: string; qualityScore: number; deliveryScore: number; priceScore: number; communicationScore: number; totalOrders: number; onTimeDeliveryPct: number; defectRate: number }): Promise<VendorScore & CollectionMeta> {
    const overall = round2((data.qualityScore + data.deliveryScore + data.priceScore + data.communicationScore) / 4);
    return this.vendorScores.insert({ ...data, vendorName: data.vendorName ?? '', overallScore: overall, lastUpdated: currentDate() });
  }
  async listVendorScores(): Promise<(VendorScore & CollectionMeta)[]> { return this.vendorScores.query().orderBy('overallScore', 'desc').execute(); }

  // Retention
  async addRetentionAnalysis(data: { period: string; department?: string; headcountStart: number; headcountEnd: number; hires: number; terminations: number; voluntaryTerms: number; involuntaryTerms: number; avgTenureDays: number }): Promise<RetentionAnalysis & CollectionMeta> {
    const avg = (data.headcountStart + data.headcountEnd) / 2;
    const turnover = avg > 0 ? round2((data.terminations / avg) * 100) : 0;
    return this.retention.insert({ ...data, department: data.department ?? '', turnoverRate: turnover, retentionRate: round2(100 - turnover) });
  }
  async listRetention(period?: string): Promise<(RetentionAnalysis & CollectionMeta)[]> { const q = this.retention.query(); if (period) q.where('period', '=', period); q.orderBy('period', 'desc'); return q.execute(); }

  // Scenarios
  async createScenario(data: { scenarioId: string; name: string; description?: string; baselineData: string; adjustments: string; projectedRevenue: number; projectedExpenses: number; createdBy: string }): Promise<ScenarioModel & CollectionMeta> {
    return this.scenarios.insert({ ...data, description: data.description ?? '', status: 'draft' as ScenarioStatus, projectedRevenue: round2(data.projectedRevenue), projectedExpenses: round2(data.projectedExpenses), projectedProfit: round2(data.projectedRevenue - data.projectedExpenses), createdDate: currentDate() });
  }
  async activateScenario(id: string): Promise<ScenarioModel & CollectionMeta> { return this.scenarios.update(id, { status: 'active' as ScenarioStatus }); }
  async listScenarios(): Promise<(ScenarioModel & CollectionMeta)[]> { return this.scenarios.query().orderBy('createdDate', 'desc').execute(); }

  // Benchmarks
  async addBenchmark(data: { metricName: string; category: MetricCategory; companyValue: number; industryAvg: number; industryMedian: number; period: string; sampleSize: number; source?: string }): Promise<BenchmarkComparison & CollectionMeta> {
    const rank = data.industryAvg > 0 ? round2((data.companyValue / data.industryAvg) * 50) : 50;
    return this.benchmarks.insert({ ...data, companyValue: round2(data.companyValue), industryAvg: round2(data.industryAvg), industryMedian: round2(data.industryMedian), percentileRank: Math.min(99, Math.max(1, rank)), source: data.source ?? '' });
  }
  async listBenchmarks(category?: MetricCategory): Promise<(BenchmarkComparison & CollectionMeta)[]> { const q = this.benchmarks.query(); if (category) q.where('category', '=', category); q.orderBy('metricName', 'asc'); return q.execute(); }

  // Custom Dashboards
  async createDashboard(data: { dashboardId: string; name: string; ownerId: string; ownerName?: string; roleAccess?: string; isDefault?: boolean; layout?: string }): Promise<CustomDashboard & CollectionMeta> {
    return this.dashboards.insert({ ...data, ownerName: data.ownerName ?? '', roleAccess: data.roleAccess ?? '', isDefault: data.isDefault ?? false, layout: data.layout ?? 'grid', widgetIds: '', createdDate: currentDate() });
  }
  async updateDashboard(id: string, updates: Partial<CustomDashboard>): Promise<CustomDashboard & CollectionMeta> { return this.dashboards.update(id, { ...updates, updatedDate: currentDate() }); }
  async listDashboards(ownerId?: string): Promise<(CustomDashboard & CollectionMeta)[]> { const q = this.dashboards.query(); if (ownerId) q.where('ownerId', '=', ownerId); q.orderBy('name', 'asc'); return q.execute(); }

  // Scheduled Reports
  async createScheduledReport(data: { reportId: string; name: string; reportType: string; schedule: ScheduledReport['schedule']; recipients: string; deliveryMethod: ScheduledReport['deliveryMethod']; filters?: string; nextRunAt: string; createdBy: string }): Promise<ScheduledReport & CollectionMeta> {
    return this.scheduledReports.insert({ ...data, filters: data.filters ?? '', active: true });
  }
  async deactivateReport(id: string): Promise<ScheduledReport & CollectionMeta> { return this.scheduledReports.update(id, { active: false }); }
  async listScheduledReports(): Promise<(ScheduledReport & CollectionMeta)[]> { return this.scheduledReports.query().orderBy('name', 'asc').execute(); }

  // Data Export
  async createExportConfig(data: { exportId: string; name: string; targetSystem: string; format: DataExportConfig['format']; collections: string; schedule?: string; active?: boolean }): Promise<DataExportConfig & CollectionMeta> {
    return this.dataExports.insert({ ...data, schedule: data.schedule ?? '', active: data.active ?? true });
  }
  async runExport(id: string, recordCount: number, fileSizeBytes: number): Promise<DataExportConfig & CollectionMeta> { return this.dataExports.update(id, { lastExportAt: currentDate(), recordCount, fileSizeBytes }); }
  async listExportConfigs(): Promise<(DataExportConfig & CollectionMeta)[]> { return this.dataExports.query().orderBy('name', 'asc').execute(); }
}

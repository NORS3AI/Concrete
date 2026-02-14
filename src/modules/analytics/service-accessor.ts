import { AnalyticsService } from './analytics-service';
import type { AnalyticsWidget, KPIDefinition, JobFadeAnalysis, CashFlowModel, RevenueForecast, LaborProductivity, EquipmentROI, VendorScore, RetentionAnalysis, ScenarioModel, BenchmarkComparison, CustomDashboard, ScheduledReport, DataExportConfig } from './analytics-service';
let _service: AnalyticsService | null = null;
export function getAnalyticsService(): AnalyticsService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Analytics: app not initialized');
  const s = app.store; const e = app.events;
  _service = new AnalyticsService(s.collection<AnalyticsWidget>('analytics/widget'), s.collection<KPIDefinition>('analytics/kpi'), s.collection<JobFadeAnalysis>('analytics/jobFade'), s.collection<CashFlowModel>('analytics/cashFlowModel'), s.collection<RevenueForecast>('analytics/revenueForecast'), s.collection<LaborProductivity>('analytics/laborProductivity'), s.collection<EquipmentROI>('analytics/equipmentROI'), s.collection<VendorScore>('analytics/vendorScore'), s.collection<RetentionAnalysis>('analytics/retention'), s.collection<ScenarioModel>('analytics/scenario'), s.collection<BenchmarkComparison>('analytics/benchmark'), s.collection<CustomDashboard>('analytics/dashboard'), s.collection<ScheduledReport>('analytics/scheduledReport'), s.collection<DataExportConfig>('analytics/dataExport'), e);
  return _service;
}

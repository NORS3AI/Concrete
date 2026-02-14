/**
 * Lazy singleton accessor for DashboardService.
 * Pulls store collections and event bus from the global app instance.
 */

import { DashboardService } from './dashboard-service';
import type {
  Dashboard, Widget, SavedReport, KPIDef, Benchmark,
} from './dashboard-service';

let _service: DashboardService | null = null;

export function getDashboardService(): DashboardService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Dashboard: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new DashboardService(
    store.collection<Dashboard>('analytics/dashboard'),
    store.collection<Widget>('analytics/widget'),
    store.collection<SavedReport>('analytics/savedReport'),
    store.collection<KPIDef>('analytics/kpiDef'),
    store.collection<Benchmark>('analytics/benchmark'),
    events,
  );

  return _service;
}

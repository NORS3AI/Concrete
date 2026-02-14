/**
 * Lazy singleton accessor for SubService.
 * Pulls store collections and event bus from the global app instance.
 */

import { SubService } from './sub-service';
import type {
  Subcontract, ChangeOrder, PayApp,
  Backcharge, Prequalification, SubCompliance,
} from './sub-service';

let _service: SubService | null = null;

export function getSubService(): SubService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Subcontractor: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new SubService(
    store.collection<Subcontract>('sub/subcontract'),
    store.collection<ChangeOrder>('sub/changeOrder'),
    store.collection<PayApp>('sub/payApp'),
    store.collection<Backcharge>('sub/backcharge'),
    store.collection<Prequalification>('sub/prequalification'),
    store.collection<SubCompliance>('sub/compliance'),
    events,
  );

  return _service;
}

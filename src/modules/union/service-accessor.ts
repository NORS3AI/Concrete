/**
 * Lazy singleton accessor for UnionService.
 * Pulls store collections and event bus from the global app instance.
 */

import { UnionService } from './union-service';
import type {
  Union, RateTable, RateTableLine, FringeBenefit,
  PrevailingWage, CertifiedPayroll, Apprentice, Remittance,
} from './union-service';

let _service: UnionService | null = null;

export function getUnionService(): UnionService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Union: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new UnionService(
    store.collection<Union>('union/union'),
    store.collection<RateTable>('union/rateTable'),
    store.collection<RateTableLine>('union/rateTableLine'),
    store.collection<FringeBenefit>('union/fringeBenefit'),
    store.collection<PrevailingWage>('union/prevailingWage'),
    store.collection<CertifiedPayroll>('union/certifiedPayroll'),
    store.collection<Apprentice>('union/apprentice'),
    store.collection<Remittance>('union/remittance'),
    events,
  );

  return _service;
}

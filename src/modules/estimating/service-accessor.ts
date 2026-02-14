/**
 * Lazy singleton accessor for EstimatingService.
 */

import { EstimatingService } from './estimating-service';
import type { Estimate, EstimateLine, Bid } from './estimating-service';

let _service: EstimatingService | null = null;

export function getEstimatingService(): EstimatingService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Estimating: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new EstimatingService(
    store.collection<Estimate>('job/estimate'),
    store.collection<EstimateLine>('job/estimateLine'),
    store.collection<Bid>('job/bid'),
    events,
  );

  return _service;
}

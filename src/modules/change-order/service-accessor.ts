/**
 * Lazy singleton accessor for ChangeOrderService.
 */

import { ChangeOrderService } from './change-order-service';
import type {
  ChangeOrderRequest, ChangeOrder, ChangeOrderLine,
  ChangeOrderApproval, ChangeOrderLog,
} from './change-order-service';

let _service: ChangeOrderService | null = null;

export function getChangeOrderService(): ChangeOrderService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('ChangeOrder: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new ChangeOrderService(
    store.collection<ChangeOrderRequest>('co/changeOrderRequest'),
    store.collection<ChangeOrder>('co/changeOrder'),
    store.collection<ChangeOrderLine>('co/changeOrderLine'),
    store.collection<ChangeOrderApproval>('co/changeOrderApproval'),
    store.collection<ChangeOrderLog>('co/changeOrderLog'),
    events,
  );

  return _service;
}

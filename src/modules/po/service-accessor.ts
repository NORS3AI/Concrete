/**
 * Lazy singleton accessor for POService.
 * Pulls store collections and event bus from the global app instance.
 */

import { POService } from './po-service';
import type {
  PurchaseOrder, POLine, POReceipt, POReceiptLine, POAmendment,
} from './po-service';

let _service: POService | null = null;

export function getPOService(): POService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('PO: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new POService(
    store.collection<PurchaseOrder>('po/purchaseOrder'),
    store.collection<POLine>('po/poLine'),
    store.collection<POReceipt>('po/receipt'),
    store.collection<POReceiptLine>('po/receiptLine'),
    store.collection<POAmendment>('po/amendment'),
    events,
  );

  return _service;
}

import { InventoryService } from './inventory-service';
import type {
  InventoryItem,
  Warehouse,
  InventoryTransaction,
  MaterialRequisition,
  InventoryCount,
} from './inventory-service';

let _service: InventoryService | null = null;

export function getInventoryService(): InventoryService {
  if (_service) return _service;

  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Inventory: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new InventoryService(
    store.collection<InventoryItem>('inv/item'),
    store.collection<Warehouse>('inv/warehouse'),
    store.collection<InventoryTransaction>('inv/transaction'),
    store.collection<MaterialRequisition>('inv/requisition'),
    store.collection<InventoryCount>('inv/count'),
    events,
  );

  return _service;
}

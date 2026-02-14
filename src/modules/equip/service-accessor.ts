/**
 * Lazy singleton accessor for EquipService.
 * Pulls store collections and event bus from the global app instance.
 */

import { EquipService } from './equip-service';
import type {
  Equipment, RateTable, EquipUsage, Maintenance,
  WorkOrder, FuelLog, DepreciationRecord,
} from './equip-service';

let _service: EquipService | null = null;

export function getEquipService(): EquipService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Equipment: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new EquipService(
    store.collection<Equipment>('equip/equipment'),
    store.collection<RateTable>('equip/rateTable'),
    store.collection<EquipUsage>('equip/usage'),
    store.collection<Maintenance>('equip/maintenance'),
    store.collection<WorkOrder>('equip/workOrder'),
    store.collection<FuelLog>('equip/fuelLog'),
    store.collection<DepreciationRecord>('equip/depreciation'),
    events,
  );

  return _service;
}

/**
 * Lazy singleton accessor for ServiceMgmtService.
 */

import { ServiceMgmtService } from './service-mgmt-service';
import type {
  ServiceAgreement, WorkOrder, WorkOrderLine,
  ServiceCall, CustomerEquipment, PreventiveMaintenance,
  TechnicianTimeEntry,
} from './service-mgmt-service';

let _service: ServiceMgmtService | null = null;

export function getServiceMgmtService(): ServiceMgmtService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('ServiceMgmt: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new ServiceMgmtService(
    store.collection<ServiceAgreement>('service/serviceAgreement'),
    store.collection<WorkOrder>('service/workOrder'),
    store.collection<WorkOrderLine>('service/workOrderLine'),
    store.collection<ServiceCall>('service/serviceCall'),
    store.collection<CustomerEquipment>('service/customerEquipment'),
    store.collection<PreventiveMaintenance>('service/preventiveMaintenance'),
    store.collection<TechnicianTimeEntry>('service/technicianTimeEntry'),
    events,
  );

  return _service;
}

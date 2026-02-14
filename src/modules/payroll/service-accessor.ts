/**
 * Payroll Service Accessor
 *
 * Provides a lazily-created singleton PayrollService instance by pulling
 * typed collections from the global application Store and EventBus.
 */

import { PayrollService } from './payroll-service';
import type {
  Employee, TimeEntry, PayRun, PayCheck,
  Earning, Deduction, Benefit,
  TaxTable, TaxFiling, WorkerComp,
} from './payroll-service';

let _service: PayrollService | null = null;

/**
 * Return the shared PayrollService singleton.
 * Requires the global `window.concrete` app to have been initialized.
 */
export function getPayrollService(): PayrollService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Payroll: app not initialized — concrete.store / concrete.events missing');
  }

  const store = app.store;
  const events = app.events;

  _service = new PayrollService(
    store.collection<Employee>('payroll/employee'),
    store.collection<TimeEntry>('payroll/timeEntry'),
    store.collection<PayRun>('payroll/payRun'),
    store.collection<PayCheck>('payroll/payCheck'),
    store.collection<Earning>('payroll/earning'),
    store.collection<Deduction>('payroll/deduction'),
    store.collection<Benefit>('payroll/benefit'),
    store.collection<TaxTable>('payroll/taxTable'),
    store.collection<TaxFiling>('payroll/taxFiling'),
    store.collection<WorkerComp>('payroll/workerComp'),
    events,
  );

  return _service;
}

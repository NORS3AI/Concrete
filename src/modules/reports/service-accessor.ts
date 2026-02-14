/**
 * Lazy singleton accessor for ReportsService.
 * Pulls store collections and event bus from the global app instance.
 */

import { ReportsService } from './reports-service';
import type {
  GLAccountRef, GLJournalEntryRef, GLJournalLineRef, GLFiscalPeriodRef,
  APInvoiceRef, APVendorRef, ARInvoiceRef, ARCustomerRef,
  PayRunRef, PayCheckRef, EmployeeRef,
  JobRef, ActualCostRef, BudgetRef, BudgetLineRef,
  CommittedCostRef, ChangeOrderRef, CostCodeRef,
  ReportTemplate, EquipmentRef, EquipmentUsageRef,
} from './reports-service';

let _service: ReportsService | null = null;

export function getReportsService(): ReportsService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Reports: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new ReportsService(
    store.collection<GLAccountRef>('gl/account'),
    store.collection<GLJournalEntryRef>('gl/journalEntry'),
    store.collection<GLJournalLineRef>('gl/journalLine'),
    store.collection<GLFiscalPeriodRef>('gl/fiscalPeriod'),
    store.collection<APInvoiceRef>('ap/invoice'),
    store.collection<APVendorRef>('ap/vendor'),
    store.collection<ARInvoiceRef>('ar/invoice'),
    store.collection<ARCustomerRef>('ar/customer'),
    store.collection<PayRunRef>('payroll/payRun'),
    store.collection<PayCheckRef>('payroll/payCheck'),
    store.collection<EmployeeRef>('payroll/employee'),
    store.collection<JobRef>('job/job'),
    store.collection<ActualCostRef>('job/actualCost'),
    store.collection<BudgetRef>('job/budget'),
    store.collection<BudgetLineRef>('job/budgetLine'),
    store.collection<CommittedCostRef>('job/committedCost'),
    store.collection<ChangeOrderRef>('job/changeOrder'),
    store.collection<CostCodeRef>('job/costCode'),
    store.collection<ReportTemplate>('reports/template'),
    events,
    store.collection<EquipmentRef>('equip/equipment'),
    store.collection<EquipmentUsageRef>('equip/usage'),
  );

  return _service;
}

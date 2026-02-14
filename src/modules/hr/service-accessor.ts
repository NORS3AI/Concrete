import { HRService } from './hr-service';
import type {
  Employee,
  Position,
  Certification,
  TrainingRecord,
  BenefitPlan,
  BenefitEnrollment,
  LeaveRequest,
  LeaveBalance,
  Applicant,
  EmployeeDocument,
} from './hr-service';

let _service: HRService | null = null;

export function getHRService(): HRService {
  if (_service) return _service;

  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('HR: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new HRService(
    store.collection<Employee>('hr/employee'),
    store.collection<Position>('hr/position'),
    store.collection<Certification>('hr/certification'),
    store.collection<TrainingRecord>('hr/trainingRecord'),
    store.collection<BenefitPlan>('hr/benefitPlan'),
    store.collection<BenefitEnrollment>('hr/benefitEnrollment'),
    store.collection<LeaveRequest>('hr/leaveRequest'),
    store.collection<LeaveBalance>('hr/leaveBalance'),
    store.collection<Applicant>('hr/applicant'),
    store.collection<EmployeeDocument>('hr/employeeDocument'),
    events,
  );

  return _service;
}

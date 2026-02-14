/**
 * Concrete -- HR & Workforce Management Service
 *
 * Core service layer for the HR module (Phase 22). Provides employee
 * lifecycle management (recruit→hire→onboard→active→terminate→rehire),
 * position management, skills and certification tracking with expiration
 * alerts, training records, benefits administration, open enrollment,
 * PTO/leave management, applicant tracking, compliance reporting
 * (new hire, EEO-1, I-9/E-Verify), and employee document storage.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type EmployeeStatus =
  | 'applicant'
  | 'recruited'
  | 'hired'
  | 'onboarding'
  | 'active'
  | 'on_leave'
  | 'terminated'
  | 'rehired';

export type EmployeeType = 'full_time' | 'part_time' | 'contract' | 'seasonal' | 'temp';

export type PositionStatus = 'open' | 'filled' | 'frozen' | 'eliminated';

export type CertificationType =
  | 'osha_10'
  | 'osha_30'
  | 'cdl'
  | 'crane'
  | 'confined_space'
  | 'first_aid'
  | 'cpr'
  | 'hazmat'
  | 'scaffolding'
  | 'rigging'
  | 'welding'
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'other';

export type CertificationStatus = 'active' | 'expiring_soon' | 'expired' | 'revoked';

export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export type BenefitType = 'health' | 'dental' | 'vision' | '401k' | 'hsa' | 'life' | 'disability' | 'other';

export type BenefitPlanStatus = 'active' | 'inactive' | 'pending';

export type EnrollmentStatus = 'open' | 'enrolled' | 'waived' | 'pending' | 'closed';

export type LeaveType = 'vacation' | 'sick' | 'fmla' | 'military' | 'jury' | 'bereavement' | 'personal' | 'unpaid';

export type LeaveStatus = 'requested' | 'approved' | 'denied' | 'active' | 'completed' | 'cancelled';

export type ApplicantStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';

export type DocumentCategory = 'tax' | 'identification' | 'certification' | 'performance' | 'disciplinary' | 'contract' | 'benefits' | 'other';

export type EEORace = 'white' | 'black' | 'hispanic' | 'asian' | 'native_american' | 'pacific_islander' | 'two_or_more' | 'not_specified';
export type EEOGender = 'male' | 'female' | 'not_specified';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Employee {
  [key: string]: unknown;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  dateOfBirth?: string;
  ssn?: string;
  status: EmployeeStatus;
  type: EmployeeType;
  hireDate?: string;
  terminationDate?: string;
  rehireDate?: string;
  positionId?: string;
  departmentId?: string;
  supervisorId?: string;
  payRate?: number;
  payType?: 'hourly' | 'salary';
  eeoRace?: EEORace;
  eeoGender?: EEOGender;
  i9Completed?: boolean;
  i9CompletedDate?: string;
  eVerifyStatus?: 'pending' | 'verified' | 'failed';
  newHireReported?: boolean;
  newHireReportedDate?: string;
  newHireReportedState?: string;
}

export interface Position {
  [key: string]: unknown;
  title: string;
  departmentId?: string;
  jobCode?: string;
  payGradeMin?: number;
  payGradeMax?: number;
  status: PositionStatus;
  reportsTo?: string;
  headcount: number;
  filledCount: number;
  description?: string;
}

export interface Certification {
  [key: string]: unknown;
  employeeId: string;
  type: CertificationType;
  name: string;
  issuedBy?: string;
  issuedDate: string;
  expirationDate?: string;
  certificateNumber?: string;
  status: CertificationStatus;
  notes?: string;
}

export interface TrainingRecord {
  [key: string]: unknown;
  employeeId: string;
  courseName: string;
  provider?: string;
  scheduledDate?: string;
  completedDate?: string;
  expirationDate?: string;
  status: TrainingStatus;
  score?: number;
  hours?: number;
  certificationId?: string;
  notes?: string;
}

export interface BenefitPlan {
  [key: string]: unknown;
  name: string;
  type: BenefitType;
  carrier?: string;
  planCode?: string;
  status: BenefitPlanStatus;
  effectiveDate: string;
  endDate?: string;
  employerContribution?: number;
  employeeContribution?: number;
  description?: string;
}

export interface BenefitEnrollment {
  [key: string]: unknown;
  employeeId: string;
  planId: string;
  planName?: string;
  enrollmentDate: string;
  effectiveDate: string;
  endDate?: string;
  status: EnrollmentStatus;
  coverageLevel?: 'employee' | 'employee_spouse' | 'employee_children' | 'family';
  employeeContribution?: number;
  employerContribution?: number;
  enrollmentPeriod?: string;
}

export interface LeaveRequest {
  [key: string]: unknown;
  employeeId: string;
  employeeName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: LeaveStatus;
  reason?: string;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
}

export interface LeaveBalance {
  [key: string]: unknown;
  employeeId: string;
  type: LeaveType;
  year: number;
  accrued: number;
  used: number;
  available: number;
  carryOver: number;
}

export interface Applicant {
  [key: string]: unknown;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  positionId?: string;
  positionTitle?: string;
  status: ApplicantStatus;
  appliedDate: string;
  source?: string;
  resumeNotes?: string;
  interviewDate?: string;
  interviewNotes?: string;
  offerAmount?: number;
  offerDate?: string;
  hiredDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
}

export interface EmployeeDocument {
  [key: string]: unknown;
  employeeId: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  fileType?: string;
  fileSize?: number;
  description?: string;
  expirationDate?: string;
  content?: string;
}

// ---------------------------------------------------------------------------
// Report / Summary Types
// ---------------------------------------------------------------------------

export interface CertExpirationAlert {
  employeeId: string;
  employeeName: string;
  certificationId: string;
  certName: string;
  certType: CertificationType;
  expirationDate: string;
  daysUntilExpiry: number;
  status: CertificationStatus;
}

export interface NewHireReport {
  employeeId: string;
  firstName: string;
  lastName: string;
  ssn?: string;
  hireDate?: string;
  state?: string;
  reported: boolean;
  reportedDate?: string;
}

export interface EEO1Summary {
  totalEmployees: number;
  byRace: Record<EEORace, number>;
  byGender: Record<EEOGender, number>;
  byType: Record<EmployeeType, number>;
}

export interface HeadcountSummary {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
  applicants: number;
  openPositions: number;
  byDepartment: { departmentId: string; count: number }[];
  byType: Record<EmployeeType, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number): number => Math.round(n * 100) / 100;

function currentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class HRService {
  constructor(
    private employees: Collection<Employee>,
    private positions: Collection<Position>,
    private certifications: Collection<Certification>,
    private trainingRecords: Collection<TrainingRecord>,
    private benefitPlans: Collection<BenefitPlan>,
    private enrollments: Collection<BenefitEnrollment>,
    private leaveRequests: Collection<LeaveRequest>,
    private leaveBalances: Collection<LeaveBalance>,
    private applicants: Collection<Applicant>,
    private documents: Collection<EmployeeDocument>,
    private events: EventBus,
  ) {}

  // =========================================================================
  // Employee Lifecycle
  // =========================================================================

  async createEmployee(data: {
    employeeId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    dateOfBirth?: string;
    ssn?: string;
    type: EmployeeType;
    positionId?: string;
    departmentId?: string;
    supervisorId?: string;
    payRate?: number;
    payType?: 'hourly' | 'salary';
    eeoRace?: EEORace;
    eeoGender?: EEOGender;
  }): Promise<Employee & CollectionMeta> {
    const emp = await this.employees.insert({
      employeeId: data.employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
      zip: data.zip ?? '',
      dateOfBirth: data.dateOfBirth ?? '',
      ssn: data.ssn ?? '',
      status: 'hired' as EmployeeStatus,
      type: data.type,
      hireDate: currentDate(),
      positionId: data.positionId ?? '',
      departmentId: data.departmentId ?? '',
      supervisorId: data.supervisorId ?? '',
      payRate: round2(data.payRate ?? 0),
      payType: data.payType ?? 'hourly',
      eeoRace: data.eeoRace ?? 'not_specified',
      eeoGender: data.eeoGender ?? 'not_specified',
      i9Completed: false,
      eVerifyStatus: 'pending',
      newHireReported: false,
    });
    this.events.emit('hr.employee.created', { employee: emp });
    return emp;
  }

  async updateEmployee(
    id: string,
    changes: Partial<Employee>,
  ): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated = await this.employees.update(id, changes);
    this.events.emit('hr.employee.updated', { employee: updated });
    return updated;
  }

  async hireEmployee(id: string): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated = await this.employees.update(id, {
      status: 'hired' as EmployeeStatus,
      hireDate: existing.hireDate || currentDate(),
    });
    this.events.emit('hr.employee.hired', { employee: updated });
    return updated;
  }

  async onboardEmployee(id: string): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    if (existing.status !== 'hired' && existing.status !== 'rehired') {
      throw new Error('Only hired or rehired employees can be onboarded');
    }
    const updated = await this.employees.update(id, {
      status: 'onboarding' as EmployeeStatus,
    });
    this.events.emit('hr.employee.onboarding', { employee: updated });
    return updated;
  }

  async activateEmployee(id: string): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    if (existing.status !== 'onboarding' && existing.status !== 'on_leave') {
      throw new Error('Only onboarding or on-leave employees can be activated');
    }
    const updated = await this.employees.update(id, {
      status: 'active' as EmployeeStatus,
    });
    this.events.emit('hr.employee.activated', { employee: updated });
    return updated;
  }

  async terminateEmployee(
    id: string,
    terminationDate?: string,
  ): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    if (existing.status === 'terminated') throw new Error('Employee already terminated');
    const updated = await this.employees.update(id, {
      status: 'terminated' as EmployeeStatus,
      terminationDate: terminationDate ?? currentDate(),
    });
    this.events.emit('hr.employee.terminated', { employee: updated });
    return updated;
  }

  async rehireEmployee(id: string): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    if (existing.status !== 'terminated') throw new Error('Only terminated employees can be rehired');
    const updated = await this.employees.update(id, {
      status: 'rehired' as EmployeeStatus,
      rehireDate: currentDate(),
      terminationDate: '',
    });
    this.events.emit('hr.employee.rehired', { employee: updated });
    return updated;
  }

  async getEmployee(id: string): Promise<(Employee & CollectionMeta) | null> {
    return this.employees.get(id);
  }

  async listEmployees(filters?: {
    status?: EmployeeStatus;
    type?: EmployeeType;
    departmentId?: string;
    search?: string;
  }): Promise<(Employee & CollectionMeta)[]> {
    const q = this.employees.query();
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.departmentId) q.where('departmentId', '=', filters.departmentId);
    q.orderBy('lastName', 'asc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.firstName.toLowerCase().includes(s) ||
          e.lastName.toLowerCase().includes(s) ||
          e.employeeId.toLowerCase().includes(s) ||
          (e.email ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Position Management
  // =========================================================================

  async createPosition(data: {
    title: string;
    departmentId?: string;
    jobCode?: string;
    payGradeMin?: number;
    payGradeMax?: number;
    reportsTo?: string;
    headcount?: number;
    description?: string;
  }): Promise<Position & CollectionMeta> {
    const pos = await this.positions.insert({
      title: data.title,
      departmentId: data.departmentId ?? '',
      jobCode: data.jobCode ?? '',
      payGradeMin: round2(data.payGradeMin ?? 0),
      payGradeMax: round2(data.payGradeMax ?? 0),
      status: 'open' as PositionStatus,
      reportsTo: data.reportsTo ?? '',
      headcount: data.headcount ?? 1,
      filledCount: 0,
      description: data.description ?? '',
    });
    this.events.emit('hr.position.created', { position: pos });
    return pos;
  }

  async updatePosition(
    id: string,
    changes: Partial<Position>,
  ): Promise<Position & CollectionMeta> {
    const existing = await this.positions.get(id);
    if (!existing) throw new Error(`Position ${id} not found`);
    const updated = await this.positions.update(id, changes);
    this.events.emit('hr.position.updated', { position: updated });
    return updated;
  }

  async listPositions(filters?: {
    status?: PositionStatus;
    departmentId?: string;
    search?: string;
  }): Promise<(Position & CollectionMeta)[]> {
    const q = this.positions.query();
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.departmentId) q.where('departmentId', '=', filters.departmentId);
    q.orderBy('title', 'asc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          (p.jobCode ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  async getPosition(id: string): Promise<(Position & CollectionMeta) | null> {
    return this.positions.get(id);
  }

  async getOrgChart(): Promise<{ position: Position & CollectionMeta; employees: (Employee & CollectionMeta)[] }[]> {
    const allPositions = await this.positions.query().orderBy('title', 'asc').execute();
    const allEmployees = await this.employees.query().execute();
    return allPositions.map((pos) => ({
      position: pos,
      employees: allEmployees.filter((e) => e.positionId === (pos as any).id),
    }));
  }

  // =========================================================================
  // Skills & Certification Tracking
  // =========================================================================

  async addCertification(data: {
    employeeId: string;
    type: CertificationType;
    name: string;
    issuedBy?: string;
    issuedDate: string;
    expirationDate?: string;
    certificateNumber?: string;
    notes?: string;
  }): Promise<Certification & CollectionMeta> {
    let status: CertificationStatus = 'active';
    if (data.expirationDate) {
      const daysLeft = daysBetween(currentDate(), data.expirationDate);
      if (daysLeft < 0) status = 'expired';
      else if (daysLeft <= 90) status = 'expiring_soon';
    }
    const cert = await this.certifications.insert({
      employeeId: data.employeeId,
      type: data.type,
      name: data.name,
      issuedBy: data.issuedBy ?? '',
      issuedDate: data.issuedDate,
      expirationDate: data.expirationDate ?? '',
      certificateNumber: data.certificateNumber ?? '',
      status,
      notes: data.notes ?? '',
    });
    this.events.emit('hr.certification.added', { certification: cert });
    return cert;
  }

  async updateCertification(
    id: string,
    changes: Partial<Certification>,
  ): Promise<Certification & CollectionMeta> {
    const existing = await this.certifications.get(id);
    if (!existing) throw new Error(`Certification ${id} not found`);
    const updated = await this.certifications.update(id, changes);
    this.events.emit('hr.certification.updated', { certification: updated });
    return updated;
  }

  async revokeCertification(id: string): Promise<Certification & CollectionMeta> {
    const existing = await this.certifications.get(id);
    if (!existing) throw new Error(`Certification ${id} not found`);
    const updated = await this.certifications.update(id, { status: 'revoked' as CertificationStatus });
    this.events.emit('hr.certification.revoked', { certification: updated });
    return updated;
  }

  async getCertificationsByEmployee(
    employeeId: string,
  ): Promise<(Certification & CollectionMeta)[]> {
    const q = this.certifications.query();
    q.where('employeeId', '=', employeeId);
    q.orderBy('expirationDate', 'asc');
    return q.execute();
  }

  async getExpiringCertifications(
    daysAhead: number = 90,
  ): Promise<CertExpirationAlert[]> {
    const allCerts = await this.certifications.query().execute();
    const today = currentDate();
    const alerts: CertExpirationAlert[] = [];

    for (const cert of allCerts) {
      if (cert.status === 'revoked' || !cert.expirationDate) continue;
      const daysLeft = daysBetween(today, cert.expirationDate);
      if (daysLeft <= daysAhead) {
        const emp = await this.employees.get(cert.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : cert.employeeId;
        let alertStatus: CertificationStatus = cert.status;
        if (daysLeft < 0) alertStatus = 'expired';
        else if (daysLeft <= 90) alertStatus = 'expiring_soon';
        alerts.push({
          employeeId: cert.employeeId,
          employeeName: empName,
          certificationId: (cert as any).id,
          certName: cert.name,
          certType: cert.type,
          expirationDate: cert.expirationDate,
          daysUntilExpiry: daysLeft,
          status: alertStatus,
        });
      }
    }

    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  // =========================================================================
  // Training Records
  // =========================================================================

  async addTraining(data: {
    employeeId: string;
    courseName: string;
    provider?: string;
    scheduledDate?: string;
    hours?: number;
    certificationId?: string;
    notes?: string;
  }): Promise<TrainingRecord & CollectionMeta> {
    const tr = await this.trainingRecords.insert({
      employeeId: data.employeeId,
      courseName: data.courseName,
      provider: data.provider ?? '',
      scheduledDate: data.scheduledDate ?? '',
      status: 'scheduled' as TrainingStatus,
      hours: data.hours ?? 0,
      certificationId: data.certificationId ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('hr.training.added', { training: tr });
    return tr;
  }

  async completeTraining(
    id: string,
    score?: number,
  ): Promise<TrainingRecord & CollectionMeta> {
    const existing = await this.trainingRecords.get(id);
    if (!existing) throw new Error(`Training ${id} not found`);
    const updated = await this.trainingRecords.update(id, {
      status: 'completed' as TrainingStatus,
      completedDate: currentDate(),
      score: score ?? existing.score,
    });
    this.events.emit('hr.training.completed', { training: updated });
    return updated;
  }

  async cancelTraining(id: string): Promise<TrainingRecord & CollectionMeta> {
    const existing = await this.trainingRecords.get(id);
    if (!existing) throw new Error(`Training ${id} not found`);
    const updated = await this.trainingRecords.update(id, {
      status: 'cancelled' as TrainingStatus,
    });
    this.events.emit('hr.training.cancelled', { training: updated });
    return updated;
  }

  async getTrainingByEmployee(
    employeeId: string,
  ): Promise<(TrainingRecord & CollectionMeta)[]> {
    const q = this.trainingRecords.query();
    q.where('employeeId', '=', employeeId);
    q.orderBy('scheduledDate', 'desc');
    return q.execute();
  }

  async listTraining(filters?: {
    status?: TrainingStatus;
    search?: string;
  }): Promise<(TrainingRecord & CollectionMeta)[]> {
    const q = this.trainingRecords.query();
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('scheduledDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.courseName.toLowerCase().includes(s) ||
          (t.provider ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Benefits Administration
  // =========================================================================

  async createBenefitPlan(data: {
    name: string;
    type: BenefitType;
    carrier?: string;
    planCode?: string;
    effectiveDate: string;
    endDate?: string;
    employerContribution?: number;
    employeeContribution?: number;
    description?: string;
  }): Promise<BenefitPlan & CollectionMeta> {
    const plan = await this.benefitPlans.insert({
      name: data.name,
      type: data.type,
      carrier: data.carrier ?? '',
      planCode: data.planCode ?? '',
      status: 'active' as BenefitPlanStatus,
      effectiveDate: data.effectiveDate,
      endDate: data.endDate ?? '',
      employerContribution: round2(data.employerContribution ?? 0),
      employeeContribution: round2(data.employeeContribution ?? 0),
      description: data.description ?? '',
    });
    this.events.emit('hr.benefit.plan.created', { plan });
    return plan;
  }

  async updateBenefitPlan(
    id: string,
    changes: Partial<BenefitPlan>,
  ): Promise<BenefitPlan & CollectionMeta> {
    const existing = await this.benefitPlans.get(id);
    if (!existing) throw new Error(`Benefit plan ${id} not found`);
    const updated = await this.benefitPlans.update(id, changes);
    this.events.emit('hr.benefit.plan.updated', { plan: updated });
    return updated;
  }

  async listBenefitPlans(filters?: {
    type?: BenefitType;
    status?: BenefitPlanStatus;
  }): Promise<(BenefitPlan & CollectionMeta)[]> {
    const q = this.benefitPlans.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('name', 'asc');
    return q.execute();
  }

  // =========================================================================
  // Benefit Enrollment (Open Enrollment Workflow)
  // =========================================================================

  async enrollEmployee(data: {
    employeeId: string;
    planId: string;
    planName?: string;
    effectiveDate: string;
    coverageLevel?: 'employee' | 'employee_spouse' | 'employee_children' | 'family';
    employeeContribution?: number;
    employerContribution?: number;
    enrollmentPeriod?: string;
  }): Promise<BenefitEnrollment & CollectionMeta> {
    const enrollment = await this.enrollments.insert({
      employeeId: data.employeeId,
      planId: data.planId,
      planName: data.planName ?? '',
      enrollmentDate: currentDate(),
      effectiveDate: data.effectiveDate,
      status: 'enrolled' as EnrollmentStatus,
      coverageLevel: data.coverageLevel ?? 'employee',
      employeeContribution: round2(data.employeeContribution ?? 0),
      employerContribution: round2(data.employerContribution ?? 0),
      enrollmentPeriod: data.enrollmentPeriod ?? '',
    });
    this.events.emit('hr.enrollment.created', { enrollment });
    return enrollment;
  }

  async waiveEnrollment(
    id: string,
  ): Promise<BenefitEnrollment & CollectionMeta> {
    const existing = await this.enrollments.get(id);
    if (!existing) throw new Error(`Enrollment ${id} not found`);
    const updated = await this.enrollments.update(id, { status: 'waived' as EnrollmentStatus });
    this.events.emit('hr.enrollment.waived', { enrollment: updated });
    return updated;
  }

  async closeEnrollment(
    id: string,
  ): Promise<BenefitEnrollment & CollectionMeta> {
    const existing = await this.enrollments.get(id);
    if (!existing) throw new Error(`Enrollment ${id} not found`);
    const updated = await this.enrollments.update(id, {
      status: 'closed' as EnrollmentStatus,
      endDate: currentDate(),
    });
    this.events.emit('hr.enrollment.closed', { enrollment: updated });
    return updated;
  }

  async getEnrollmentsByEmployee(
    employeeId: string,
  ): Promise<(BenefitEnrollment & CollectionMeta)[]> {
    const q = this.enrollments.query();
    q.where('employeeId', '=', employeeId);
    q.orderBy('enrollmentDate', 'desc');
    return q.execute();
  }

  async listEnrollments(filters?: {
    status?: EnrollmentStatus;
    planId?: string;
    enrollmentPeriod?: string;
  }): Promise<(BenefitEnrollment & CollectionMeta)[]> {
    const q = this.enrollments.query();
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.planId) q.where('planId', '=', filters.planId);
    if (filters?.enrollmentPeriod) q.where('enrollmentPeriod', '=', filters.enrollmentPeriod);
    q.orderBy('enrollmentDate', 'desc');
    return q.execute();
  }

  // =========================================================================
  // PTO / Leave Management
  // =========================================================================

  async requestLeave(data: {
    employeeId: string;
    employeeName?: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
    notes?: string;
  }): Promise<LeaveRequest & CollectionMeta> {
    const totalDays = daysBetween(data.startDate, data.endDate) + 1;
    const req = await this.leaveRequests.insert({
      employeeId: data.employeeId,
      employeeName: data.employeeName ?? '',
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: totalDays > 0 ? totalDays : 1,
      status: 'requested' as LeaveStatus,
      reason: data.reason ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('hr.leave.requested', { leaveRequest: req });
    return req;
  }

  async approveLeave(
    id: string,
    approvedBy: string,
  ): Promise<LeaveRequest & CollectionMeta> {
    const existing = await this.leaveRequests.get(id);
    if (!existing) throw new Error(`Leave request ${id} not found`);
    if (existing.status !== 'requested') throw new Error('Only requested leaves can be approved');
    const updated = await this.leaveRequests.update(id, {
      status: 'approved' as LeaveStatus,
      approvedBy,
      approvedDate: currentDate(),
    });
    this.events.emit('hr.leave.approved', { leaveRequest: updated });
    return updated;
  }

  async denyLeave(id: string): Promise<LeaveRequest & CollectionMeta> {
    const existing = await this.leaveRequests.get(id);
    if (!existing) throw new Error(`Leave request ${id} not found`);
    if (existing.status !== 'requested') throw new Error('Only requested leaves can be denied');
    const updated = await this.leaveRequests.update(id, { status: 'denied' as LeaveStatus });
    this.events.emit('hr.leave.denied', { leaveRequest: updated });
    return updated;
  }

  async cancelLeave(id: string): Promise<LeaveRequest & CollectionMeta> {
    const existing = await this.leaveRequests.get(id);
    if (!existing) throw new Error(`Leave request ${id} not found`);
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new Error('Cannot cancel completed or already cancelled leave');
    }
    const updated = await this.leaveRequests.update(id, { status: 'cancelled' as LeaveStatus });
    this.events.emit('hr.leave.cancelled', { leaveRequest: updated });
    return updated;
  }

  async listLeaveRequests(filters?: {
    employeeId?: string;
    status?: LeaveStatus;
    type?: LeaveType;
  }): Promise<(LeaveRequest & CollectionMeta)[]> {
    const q = this.leaveRequests.query();
    if (filters?.employeeId) q.where('employeeId', '=', filters.employeeId);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.type) q.where('type', '=', filters.type);
    q.orderBy('startDate', 'desc');
    return q.execute();
  }

  async getLeaveBalances(
    employeeId: string,
  ): Promise<(LeaveBalance & CollectionMeta)[]> {
    const q = this.leaveBalances.query();
    q.where('employeeId', '=', employeeId);
    return q.execute();
  }

  async updateLeaveBalance(
    id: string,
    changes: Partial<LeaveBalance>,
  ): Promise<LeaveBalance & CollectionMeta> {
    const existing = await this.leaveBalances.get(id);
    if (!existing) throw new Error(`Leave balance ${id} not found`);
    const updated = await this.leaveBalances.update(id, changes);
    return updated;
  }

  async createLeaveBalance(data: {
    employeeId: string;
    type: LeaveType;
    year: number;
    accrued: number;
    carryOver?: number;
  }): Promise<LeaveBalance & CollectionMeta> {
    const bal = await this.leaveBalances.insert({
      employeeId: data.employeeId,
      type: data.type,
      year: data.year,
      accrued: round2(data.accrued),
      used: 0,
      available: round2(data.accrued + (data.carryOver ?? 0)),
      carryOver: round2(data.carryOver ?? 0),
    });
    return bal;
  }

  // =========================================================================
  // Applicant Tracking
  // =========================================================================

  async createApplicant(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    positionId?: string;
    positionTitle?: string;
    source?: string;
    resumeNotes?: string;
  }): Promise<Applicant & CollectionMeta> {
    const app = await this.applicants.insert({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? '',
      phone: data.phone ?? '',
      positionId: data.positionId ?? '',
      positionTitle: data.positionTitle ?? '',
      status: 'applied' as ApplicantStatus,
      appliedDate: currentDate(),
      source: data.source ?? '',
      resumeNotes: data.resumeNotes ?? '',
    });
    this.events.emit('hr.applicant.created', { applicant: app });
    return app;
  }

  async advanceApplicant(
    id: string,
    newStatus: ApplicantStatus,
    details?: Partial<Applicant>,
  ): Promise<Applicant & CollectionMeta> {
    const existing = await this.applicants.get(id);
    if (!existing) throw new Error(`Applicant ${id} not found`);
    const changes: Partial<Applicant> = { status: newStatus, ...details };
    if (newStatus === 'hired') changes.hiredDate = currentDate();
    if (newStatus === 'rejected') changes.rejectedDate = currentDate();
    const updated = await this.applicants.update(id, changes);
    this.events.emit('hr.applicant.advanced', { applicant: updated, newStatus });
    return updated;
  }

  async listApplicants(filters?: {
    status?: ApplicantStatus;
    positionId?: string;
    search?: string;
  }): Promise<(Applicant & CollectionMeta)[]> {
    const q = this.applicants.query();
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.positionId) q.where('positionId', '=', filters.positionId);
    q.orderBy('appliedDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.firstName.toLowerCase().includes(s) ||
          a.lastName.toLowerCase().includes(s) ||
          (a.email ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Employee Documents
  // =========================================================================

  async addDocument(data: {
    employeeId: string;
    name: string;
    category: DocumentCategory;
    fileType?: string;
    fileSize?: number;
    description?: string;
    expirationDate?: string;
    content?: string;
  }): Promise<EmployeeDocument & CollectionMeta> {
    const doc = await this.documents.insert({
      employeeId: data.employeeId,
      name: data.name,
      category: data.category,
      uploadDate: currentDate(),
      fileType: data.fileType ?? '',
      fileSize: data.fileSize ?? 0,
      description: data.description ?? '',
      expirationDate: data.expirationDate ?? '',
      content: data.content ?? '',
    });
    this.events.emit('hr.document.added', { document: doc });
    return doc;
  }

  async getDocumentsByEmployee(
    employeeId: string,
  ): Promise<(EmployeeDocument & CollectionMeta)[]> {
    const q = this.documents.query();
    q.where('employeeId', '=', employeeId);
    q.orderBy('uploadDate', 'desc');
    return q.execute();
  }

  async deleteDocument(id: string): Promise<void> {
    await this.documents.remove(id);
    this.events.emit('hr.document.deleted', { documentId: id });
  }

  // =========================================================================
  // Compliance Reporting
  // =========================================================================

  async markNewHireReported(
    id: string,
    state: string,
  ): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated = await this.employees.update(id, {
      newHireReported: true,
      newHireReportedDate: currentDate(),
      newHireReportedState: state,
    });
    this.events.emit('hr.newhire.reported', { employee: updated });
    return updated;
  }

  async getNewHireReport(): Promise<NewHireReport[]> {
    const emps = await this.employees.query().execute();
    return emps
      .filter((e) => e.status === 'hired' || e.status === 'onboarding' || e.status === 'active')
      .filter((e) => e.hireDate)
      .map((e) => ({
        employeeId: e.employeeId,
        firstName: e.firstName,
        lastName: e.lastName,
        ssn: e.ssn,
        hireDate: e.hireDate,
        state: e.state,
        reported: !!e.newHireReported,
        reportedDate: e.newHireReportedDate,
      }))
      .sort((a, b) => (b.hireDate ?? '').localeCompare(a.hireDate ?? ''));
  }

  async markI9Completed(id: string): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated = await this.employees.update(id, {
      i9Completed: true,
      i9CompletedDate: currentDate(),
    });
    this.events.emit('hr.i9.completed', { employee: updated });
    return updated;
  }

  async updateEVerifyStatus(
    id: string,
    status: 'pending' | 'verified' | 'failed',
  ): Promise<Employee & CollectionMeta> {
    const existing = await this.employees.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated = await this.employees.update(id, { eVerifyStatus: status });
    this.events.emit('hr.everify.updated', { employee: updated });
    return updated;
  }

  async getEEO1Summary(): Promise<EEO1Summary> {
    const emps = await this.employees.query().execute();
    const active = emps.filter((e) => e.status === 'active' || e.status === 'on_leave');

    const byRace: Record<EEORace, number> = {
      white: 0, black: 0, hispanic: 0, asian: 0,
      native_american: 0, pacific_islander: 0, two_or_more: 0, not_specified: 0,
    };
    const byGender: Record<EEOGender, number> = { male: 0, female: 0, not_specified: 0 };
    const byType: Record<EmployeeType, number> = {
      full_time: 0, part_time: 0, contract: 0, seasonal: 0, temp: 0,
    };

    for (const e of active) {
      byRace[e.eeoRace ?? 'not_specified']++;
      byGender[e.eeoGender ?? 'not_specified']++;
      byType[e.type]++;
    }

    return { totalEmployees: active.length, byRace, byGender, byType };
  }

  // =========================================================================
  // Headcount Summary
  // =========================================================================

  async getHeadcountSummary(): Promise<HeadcountSummary> {
    const [allEmps, allPositions, allApplicants] = await Promise.all([
      this.employees.query().execute(),
      this.positions.query().execute(),
      this.applicants.query().execute(),
    ]);

    const active = allEmps.filter((e) => e.status === 'active').length;
    const onLeave = allEmps.filter((e) => e.status === 'on_leave').length;
    const terminated = allEmps.filter((e) => e.status === 'terminated').length;
    const applicantCount = allApplicants.filter((a) => a.status !== 'hired' && a.status !== 'rejected' && a.status !== 'withdrawn').length;
    const openPositions = allPositions.filter((p) => p.status === 'open' && p.filledCount < p.headcount).length;

    const deptMap = new Map<string, number>();
    for (const e of allEmps.filter((e) => e.status === 'active' || e.status === 'on_leave')) {
      const dept = e.departmentId || 'unassigned';
      deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
    }

    const byType: Record<EmployeeType, number> = {
      full_time: 0, part_time: 0, contract: 0, seasonal: 0, temp: 0,
    };
    for (const e of allEmps.filter((e) => e.status === 'active' || e.status === 'on_leave')) {
      byType[e.type]++;
    }

    return {
      total: allEmps.length,
      active,
      onLeave,
      terminated,
      applicants: applicantCount,
      openPositions,
      byDepartment: Array.from(deptMap.entries()).map(([departmentId, count]) => ({ departmentId, count })),
      byType,
    };
  }
}

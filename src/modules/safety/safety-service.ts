/**
 * Concrete -- Safety & Compliance Service
 *
 * Core service layer for the Safety module (Phase 23). Provides safety
 * incident recording, OSHA 300/300A/301 log generation, TRIR and DART
 * rate calculation, EMR tracking, inspection/audit checklists, toolbox
 * talks, PPE tracking, drug testing, job site safety plans, safety
 * training matrix, corrective action tracking, safety dashboard with
 * trend analysis, and DOT compliance tracking.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type IncidentType = 'injury' | 'illness' | 'near_miss' | 'property_damage' | 'environmental' | 'vehicle';

export type IncidentSeverity = 'first_aid' | 'recordable' | 'lost_time' | 'fatality' | 'near_miss';

export type IncidentStatus = 'reported' | 'investigating' | 'corrective_action' | 'closed';

export type BodyPart =
  | 'head' | 'eyes' | 'face' | 'neck' | 'shoulder' | 'arm' | 'elbow'
  | 'wrist' | 'hand' | 'finger' | 'chest' | 'back' | 'abdomen'
  | 'hip' | 'leg' | 'knee' | 'ankle' | 'foot' | 'toe' | 'multiple' | 'other';

export type InspectionType = 'safety_audit' | 'site_inspection' | 'equipment_inspection' | 'vehicle_inspection' | 'regulatory';

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type CorrectiveActionStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'overdue';

export type CorrectiveActionPriority = 'critical' | 'high' | 'medium' | 'low';

export type PPEType = 'hard_hat' | 'safety_glasses' | 'gloves' | 'vest' | 'boots' | 'harness' | 'respirator' | 'ear_protection' | 'face_shield' | 'other';

export type PPECondition = 'new' | 'good' | 'fair' | 'replace' | 'retired';

export type DrugTestType = 'pre_employment' | 'random' | 'post_accident' | 'reasonable_suspicion' | 'return_to_duty' | 'follow_up';

export type DrugTestResult = 'negative' | 'positive' | 'pending' | 'inconclusive' | 'refused';

export type DOTStatus = 'compliant' | 'expiring_soon' | 'expired' | 'non_compliant';

export type MeetingType = 'toolbox_talk' | 'safety_meeting' | 'stand_down' | 'orientation' | 'drill';

export type SafetyTrainingStatus = 'required' | 'scheduled' | 'completed' | 'expired' | 'waived';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface SafetyIncident {
  [key: string]: unknown;
  incidentNumber: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  date: string;
  time?: string;
  jobId?: string;
  jobName?: string;
  location?: string;
  employeeId?: string;
  employeeName?: string;
  description: string;
  bodyPart?: BodyPart;
  treatmentProvided?: string;
  daysAway?: number;
  daysRestricted?: number;
  oshaRecordable: boolean;
  reportedBy?: string;
  reportedDate?: string;
  investigatedBy?: string;
  investigationDate?: string;
  rootCause?: string;
  witnesses?: string;
  correctiveActions?: string;
}

export interface Inspection {
  [key: string]: unknown;
  number: string;
  type: InspectionType;
  status: InspectionStatus;
  scheduledDate: string;
  completedDate?: string;
  jobId?: string;
  jobName?: string;
  location?: string;
  inspectorName: string;
  templateId?: string;
  findings?: string;
  score?: number;
  maxScore?: number;
  passFailItems?: number;
  failedItems?: number;
  notes?: string;
}

export interface ToolboxTalk {
  [key: string]: unknown;
  title: string;
  type: MeetingType;
  date: string;
  time?: string;
  jobId?: string;
  jobName?: string;
  conductedBy: string;
  topic: string;
  attendeeCount: number;
  attendeeIds?: string;
  duration?: number;
  notes?: string;
}

export interface PPERecord {
  [key: string]: unknown;
  employeeId: string;
  employeeName?: string;
  ppeType: PPEType;
  brand?: string;
  serialNumber?: string;
  issuedDate: string;
  expirationDate?: string;
  condition: PPECondition;
  lastInspectionDate?: string;
  notes?: string;
}

export interface DrugTest {
  [key: string]: unknown;
  employeeId: string;
  employeeName?: string;
  testType: DrugTestType;
  testDate: string;
  result: DrugTestResult;
  lab?: string;
  collectionSite?: string;
  mroName?: string;
  resultDate?: string;
  expirationDate?: string;
  notes?: string;
}

export interface SafetyPlan {
  [key: string]: unknown;
  name: string;
  jobId: string;
  jobName?: string;
  createdDate: string;
  updatedDate?: string;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: string;
  hazards?: string;
  controls?: string;
  emergencyProcedures?: string;
  ppeRequirements?: string;
  active: boolean;
}

export interface SafetyTraining {
  [key: string]: unknown;
  employeeId: string;
  employeeName?: string;
  courseName: string;
  status: SafetyTrainingStatus;
  requiredDate?: string;
  completedDate?: string;
  expirationDate?: string;
  certificationId?: string;
  provider?: string;
  notes?: string;
}

export interface CorrectiveAction {
  [key: string]: unknown;
  number: string;
  incidentId?: string;
  inspectionId?: string;
  description: string;
  priority: CorrectiveActionPriority;
  status: CorrectiveActionStatus;
  assignedTo: string;
  assignedDate: string;
  dueDate: string;
  completedDate?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  jobId?: string;
  notes?: string;
}

export interface DOTCompliance {
  [key: string]: unknown;
  employeeId: string;
  employeeName?: string;
  cdlNumber?: string;
  cdlState?: string;
  cdlExpiration?: string;
  cdlClass?: string;
  medicalCardExpiration?: string;
  lastPhysicalDate?: string;
  hoursOfServiceCompliant?: boolean;
  lastDrugTestDate?: string;
  lastAlcoholTestDate?: string;
  status: DOTStatus;
  notes?: string;
}

export interface EMRRecord {
  [key: string]: unknown;
  year: number;
  emrValue: number;
  carrier?: string;
  effectiveDate: string;
  expirationDate?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Report / Summary Types
// ---------------------------------------------------------------------------

export interface OSHALog300Entry {
  caseNumber: string;
  employeeName: string;
  jobTitle?: string;
  date: string;
  location?: string;
  description: string;
  deathFlag: boolean;
  daysAway: number;
  daysRestricted: number;
  otherRecordable: boolean;
  injuryType: IncidentType;
  bodyPart?: BodyPart;
}

export interface OSHA300ASummary {
  year: number;
  totalCases: number;
  deathCases: number;
  daysAwayCases: number;
  restrictedCases: number;
  otherRecordableCases: number;
  totalDaysAway: number;
  totalDaysRestricted: number;
  averageEmployees: number;
  totalHoursWorked: number;
}

export interface TRIRResult {
  totalRecordableIncidents: number;
  totalHoursWorked: number;
  trir: number;
  period: string;
}

export interface DARTResult {
  daysAwayRestrictedCases: number;
  totalHoursWorked: number;
  dart: number;
  period: string;
}

export interface SafetyDashboardSummary {
  totalIncidents: number;
  openIncidents: number;
  recordableIncidents: number;
  nearMisses: number;
  daysWithoutIncident: number;
  openCorrectiveActions: number;
  overdueCorrectiveActions: number;
  upcomingInspections: number;
  trir: number;
  dart: number;
  emr: number;
  incidentsByMonth: { month: string; count: number }[];
  incidentsByType: Record<IncidentType, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

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

export class SafetyService {
  constructor(
    private incidents: Collection<SafetyIncident>,
    private inspections: Collection<Inspection>,
    private toolboxTalks: Collection<ToolboxTalk>,
    private ppeRecords: Collection<PPERecord>,
    private drugTests: Collection<DrugTest>,
    private safetyPlans: Collection<SafetyPlan>,
    private safetyTraining: Collection<SafetyTraining>,
    private correctiveActions: Collection<CorrectiveAction>,
    private dotCompliance: Collection<DOTCompliance>,
    private emrRecords: Collection<EMRRecord>,
    private events: EventBus,
  ) {}

  // =========================================================================
  // Safety Incidents
  // =========================================================================

  async recordIncident(data: {
    incidentNumber: string;
    type: IncidentType;
    severity: IncidentSeverity;
    date: string;
    time?: string;
    jobId?: string;
    jobName?: string;
    location?: string;
    employeeId?: string;
    employeeName?: string;
    description: string;
    bodyPart?: BodyPart;
    treatmentProvided?: string;
    daysAway?: number;
    daysRestricted?: number;
    reportedBy?: string;
    witnesses?: string;
  }): Promise<SafetyIncident & CollectionMeta> {
    const oshaRecordable = data.severity === 'recordable' || data.severity === 'lost_time' || data.severity === 'fatality';
    const incident = await this.incidents.insert({
      incidentNumber: data.incidentNumber,
      type: data.type,
      severity: data.severity,
      status: 'reported' as IncidentStatus,
      date: data.date,
      time: data.time ?? '',
      jobId: data.jobId ?? '',
      jobName: data.jobName ?? '',
      location: data.location ?? '',
      employeeId: data.employeeId ?? '',
      employeeName: data.employeeName ?? '',
      description: data.description,
      bodyPart: data.bodyPart,
      treatmentProvided: data.treatmentProvided ?? '',
      daysAway: data.daysAway ?? 0,
      daysRestricted: data.daysRestricted ?? 0,
      oshaRecordable,
      reportedBy: data.reportedBy ?? '',
      reportedDate: currentDate(),
      witnesses: data.witnesses ?? '',
    });
    this.events.emit('safety.incident.recorded', { incident });
    return incident;
  }

  async updateIncident(
    id: string,
    changes: Partial<SafetyIncident>,
  ): Promise<SafetyIncident & CollectionMeta> {
    const existing = await this.incidents.get(id);
    if (!existing) throw new Error(`Incident ${id} not found`);
    const updated = await this.incidents.update(id, changes);
    this.events.emit('safety.incident.updated', { incident: updated });
    return updated;
  }

  async investigateIncident(
    id: string,
    investigatedBy: string,
    rootCause: string,
    correctiveActions?: string,
  ): Promise<SafetyIncident & CollectionMeta> {
    const existing = await this.incidents.get(id);
    if (!existing) throw new Error(`Incident ${id} not found`);
    const updated = await this.incidents.update(id, {
      status: 'investigating' as IncidentStatus,
      investigatedBy,
      investigationDate: currentDate(),
      rootCause,
      correctiveActions: correctiveActions ?? '',
    });
    this.events.emit('safety.incident.investigated', { incident: updated });
    return updated;
  }

  async closeIncident(id: string): Promise<SafetyIncident & CollectionMeta> {
    const existing = await this.incidents.get(id);
    if (!existing) throw new Error(`Incident ${id} not found`);
    const updated = await this.incidents.update(id, { status: 'closed' as IncidentStatus });
    this.events.emit('safety.incident.closed', { incident: updated });
    return updated;
  }

  async getIncident(id: string): Promise<(SafetyIncident & CollectionMeta) | null> {
    return this.incidents.get(id);
  }

  async listIncidents(filters?: {
    type?: IncidentType;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    jobId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<(SafetyIncident & CollectionMeta)[]> {
    const q = this.incidents.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.severity) q.where('severity', '=', filters.severity);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    q.orderBy('date', 'desc');
    let results = await q.execute();
    if (filters?.dateFrom) results = results.filter((i) => i.date >= filters.dateFrom!);
    if (filters?.dateTo) results = results.filter((i) => i.date <= filters.dateTo!);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (i) =>
          i.incidentNumber.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s) ||
          (i.employeeName ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // OSHA Logs
  // =========================================================================

  async generateOSHA300(year: number): Promise<OSHALog300Entry[]> {
    const all = await this.incidents.query().orderBy('date', 'asc').execute();
    const yearStr = String(year);
    return all
      .filter((i) => i.oshaRecordable && i.date.startsWith(yearStr))
      .map((i) => ({
        caseNumber: i.incidentNumber,
        employeeName: i.employeeName ?? '',
        date: i.date,
        location: i.location,
        description: i.description,
        deathFlag: i.severity === 'fatality',
        daysAway: i.daysAway ?? 0,
        daysRestricted: i.daysRestricted ?? 0,
        otherRecordable: i.severity === 'recordable',
        injuryType: i.type,
        bodyPart: i.bodyPart,
      }));
  }

  async generateOSHA300A(year: number, avgEmployees: number, totalHoursWorked: number): Promise<OSHA300ASummary> {
    const entries = await this.generateOSHA300(year);
    return {
      year,
      totalCases: entries.length,
      deathCases: entries.filter((e) => e.deathFlag).length,
      daysAwayCases: entries.filter((e) => e.daysAway > 0).length,
      restrictedCases: entries.filter((e) => e.daysRestricted > 0 && e.daysAway === 0).length,
      otherRecordableCases: entries.filter((e) => e.otherRecordable && e.daysAway === 0 && e.daysRestricted === 0).length,
      totalDaysAway: entries.reduce((s, e) => s + e.daysAway, 0),
      totalDaysRestricted: entries.reduce((s, e) => s + e.daysRestricted, 0),
      averageEmployees: avgEmployees,
      totalHoursWorked,
    };
  }

  // =========================================================================
  // TRIR & DART
  // =========================================================================

  async calculateTRIR(totalHoursWorked: number, year?: number): Promise<TRIRResult> {
    const all = await this.incidents.query().execute();
    const yearStr = year ? String(year) : '';
    const recordable = all.filter(
      (i) => i.oshaRecordable && (!yearStr || i.date.startsWith(yearStr)),
    );
    const trir = totalHoursWorked > 0 ? round4((recordable.length * 200000) / totalHoursWorked) : 0;
    return {
      totalRecordableIncidents: recordable.length,
      totalHoursWorked,
      trir,
      period: year ? String(year) : 'all-time',
    };
  }

  async calculateDART(totalHoursWorked: number, year?: number): Promise<DARTResult> {
    const all = await this.incidents.query().execute();
    const yearStr = year ? String(year) : '';
    const dartCases = all.filter(
      (i) =>
        i.oshaRecordable &&
        ((i.daysAway ?? 0) > 0 || (i.daysRestricted ?? 0) > 0) &&
        (!yearStr || i.date.startsWith(yearStr)),
    );
    const dart = totalHoursWorked > 0 ? round4((dartCases.length * 200000) / totalHoursWorked) : 0;
    return {
      daysAwayRestrictedCases: dartCases.length,
      totalHoursWorked,
      dart,
      period: year ? String(year) : 'all-time',
    };
  }

  // =========================================================================
  // EMR Tracking
  // =========================================================================

  async addEMR(data: {
    year: number;
    emrValue: number;
    carrier?: string;
    effectiveDate: string;
    expirationDate?: string;
    notes?: string;
  }): Promise<EMRRecord & CollectionMeta> {
    const emr = await this.emrRecords.insert({
      year: data.year,
      emrValue: round4(data.emrValue),
      carrier: data.carrier ?? '',
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('safety.emr.added', { emr });
    return emr;
  }

  async listEMR(): Promise<(EMRRecord & CollectionMeta)[]> {
    return this.emrRecords.query().orderBy('year', 'desc').execute();
  }

  async getCurrentEMR(): Promise<number> {
    const all = await this.listEMR();
    return all.length > 0 ? all[0].emrValue : 1.0;
  }

  // =========================================================================
  // Inspections / Audits
  // =========================================================================

  async createInspection(data: {
    number: string;
    type: InspectionType;
    scheduledDate: string;
    jobId?: string;
    jobName?: string;
    location?: string;
    inspectorName: string;
    templateId?: string;
    notes?: string;
  }): Promise<Inspection & CollectionMeta> {
    const insp = await this.inspections.insert({
      number: data.number,
      type: data.type,
      status: 'scheduled' as InspectionStatus,
      scheduledDate: data.scheduledDate,
      jobId: data.jobId ?? '',
      jobName: data.jobName ?? '',
      location: data.location ?? '',
      inspectorName: data.inspectorName,
      templateId: data.templateId ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('safety.inspection.created', { inspection: insp });
    return insp;
  }

  async completeInspection(
    id: string,
    findings: string,
    score?: number,
    maxScore?: number,
    failedItems?: number,
  ): Promise<Inspection & CollectionMeta> {
    const existing = await this.inspections.get(id);
    if (!existing) throw new Error(`Inspection ${id} not found`);
    const updated = await this.inspections.update(id, {
      status: 'completed' as InspectionStatus,
      completedDate: currentDate(),
      findings,
      score: score ?? 0,
      maxScore: maxScore ?? 0,
      failedItems: failedItems ?? 0,
    });
    this.events.emit('safety.inspection.completed', { inspection: updated });
    return updated;
  }

  async failInspection(
    id: string,
    findings: string,
  ): Promise<Inspection & CollectionMeta> {
    const existing = await this.inspections.get(id);
    if (!existing) throw new Error(`Inspection ${id} not found`);
    const updated = await this.inspections.update(id, {
      status: 'failed' as InspectionStatus,
      completedDate: currentDate(),
      findings,
    });
    this.events.emit('safety.inspection.failed', { inspection: updated });
    return updated;
  }

  async listInspections(filters?: {
    type?: InspectionType;
    status?: InspectionStatus;
    jobId?: string;
    search?: string;
  }): Promise<(Inspection & CollectionMeta)[]> {
    const q = this.inspections.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    q.orderBy('scheduledDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (i) =>
          i.number.toLowerCase().includes(s) ||
          i.inspectorName.toLowerCase().includes(s) ||
          (i.jobName ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Toolbox Talks / Safety Meetings
  // =========================================================================

  async logToolboxTalk(data: {
    title: string;
    type?: MeetingType;
    date: string;
    time?: string;
    jobId?: string;
    jobName?: string;
    conductedBy: string;
    topic: string;
    attendeeCount: number;
    attendeeIds?: string;
    duration?: number;
    notes?: string;
  }): Promise<ToolboxTalk & CollectionMeta> {
    const talk = await this.toolboxTalks.insert({
      title: data.title,
      type: data.type ?? 'toolbox_talk',
      date: data.date,
      time: data.time ?? '',
      jobId: data.jobId ?? '',
      jobName: data.jobName ?? '',
      conductedBy: data.conductedBy,
      topic: data.topic,
      attendeeCount: data.attendeeCount,
      attendeeIds: data.attendeeIds ?? '',
      duration: data.duration ?? 0,
      notes: data.notes ?? '',
    });
    this.events.emit('safety.toolboxTalk.logged', { talk });
    return talk;
  }

  async listToolboxTalks(filters?: {
    type?: MeetingType;
    jobId?: string;
    search?: string;
  }): Promise<(ToolboxTalk & CollectionMeta)[]> {
    const q = this.toolboxTalks.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    q.orderBy('date', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.topic.toLowerCase().includes(s) ||
          t.conductedBy.toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // PPE Tracking
  // =========================================================================

  async issuePPE(data: {
    employeeId: string;
    employeeName?: string;
    ppeType: PPEType;
    brand?: string;
    serialNumber?: string;
    issuedDate?: string;
    expirationDate?: string;
    notes?: string;
  }): Promise<PPERecord & CollectionMeta> {
    const ppe = await this.ppeRecords.insert({
      employeeId: data.employeeId,
      employeeName: data.employeeName ?? '',
      ppeType: data.ppeType,
      brand: data.brand ?? '',
      serialNumber: data.serialNumber ?? '',
      issuedDate: data.issuedDate ?? currentDate(),
      expirationDate: data.expirationDate ?? '',
      condition: 'new' as PPECondition,
      notes: data.notes ?? '',
    });
    this.events.emit('safety.ppe.issued', { ppe });
    return ppe;
  }

  async updatePPECondition(
    id: string,
    condition: PPECondition,
  ): Promise<PPERecord & CollectionMeta> {
    const existing = await this.ppeRecords.get(id);
    if (!existing) throw new Error(`PPE record ${id} not found`);
    const updated = await this.ppeRecords.update(id, {
      condition,
      lastInspectionDate: currentDate(),
    });
    this.events.emit('safety.ppe.updated', { ppe: updated });
    return updated;
  }

  async getPPEByEmployee(
    employeeId: string,
  ): Promise<(PPERecord & CollectionMeta)[]> {
    const q = this.ppeRecords.query();
    q.where('employeeId', '=', employeeId);
    q.orderBy('issuedDate', 'desc');
    return q.execute();
  }

  async listPPE(filters?: {
    ppeType?: PPEType;
    condition?: PPECondition;
    search?: string;
  }): Promise<(PPERecord & CollectionMeta)[]> {
    const q = this.ppeRecords.query();
    if (filters?.ppeType) q.where('ppeType', '=', filters.ppeType);
    if (filters?.condition) q.where('condition', '=', filters.condition);
    q.orderBy('issuedDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          (p.employeeName ?? '').toLowerCase().includes(s) ||
          p.employeeId.toLowerCase().includes(s) ||
          (p.serialNumber ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Drug Testing
  // =========================================================================

  async recordDrugTest(data: {
    employeeId: string;
    employeeName?: string;
    testType: DrugTestType;
    testDate: string;
    result?: DrugTestResult;
    lab?: string;
    collectionSite?: string;
    mroName?: string;
    notes?: string;
  }): Promise<DrugTest & CollectionMeta> {
    const test = await this.drugTests.insert({
      employeeId: data.employeeId,
      employeeName: data.employeeName ?? '',
      testType: data.testType,
      testDate: data.testDate,
      result: data.result ?? 'pending',
      lab: data.lab ?? '',
      collectionSite: data.collectionSite ?? '',
      mroName: data.mroName ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('safety.drugTest.recorded', { test });
    return test;
  }

  async updateDrugTestResult(
    id: string,
    result: DrugTestResult,
    resultDate?: string,
  ): Promise<DrugTest & CollectionMeta> {
    const existing = await this.drugTests.get(id);
    if (!existing) throw new Error(`Drug test ${id} not found`);
    const updated = await this.drugTests.update(id, {
      result,
      resultDate: resultDate ?? currentDate(),
    });
    this.events.emit('safety.drugTest.resultUpdated', { test: updated });
    return updated;
  }

  async listDrugTests(filters?: {
    employeeId?: string;
    testType?: DrugTestType;
    result?: DrugTestResult;
    search?: string;
  }): Promise<(DrugTest & CollectionMeta)[]> {
    const q = this.drugTests.query();
    if (filters?.employeeId) q.where('employeeId', '=', filters.employeeId);
    if (filters?.testType) q.where('testType', '=', filters.testType);
    if (filters?.result) q.where('result', '=', filters.result);
    q.orderBy('testDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          (t.employeeName ?? '').toLowerCase().includes(s) ||
          t.employeeId.toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Safety Plans
  // =========================================================================

  async createSafetyPlan(data: {
    name: string;
    jobId: string;
    jobName?: string;
    createdBy: string;
    hazards?: string;
    controls?: string;
    emergencyProcedures?: string;
    ppeRequirements?: string;
  }): Promise<SafetyPlan & CollectionMeta> {
    const plan = await this.safetyPlans.insert({
      name: data.name,
      jobId: data.jobId,
      jobName: data.jobName ?? '',
      createdDate: currentDate(),
      createdBy: data.createdBy,
      hazards: data.hazards ?? '',
      controls: data.controls ?? '',
      emergencyProcedures: data.emergencyProcedures ?? '',
      ppeRequirements: data.ppeRequirements ?? '',
      active: true,
    });
    this.events.emit('safety.plan.created', { plan });
    return plan;
  }

  async updateSafetyPlan(
    id: string,
    changes: Partial<SafetyPlan>,
  ): Promise<SafetyPlan & CollectionMeta> {
    const existing = await this.safetyPlans.get(id);
    if (!existing) throw new Error(`Safety plan ${id} not found`);
    const updated = await this.safetyPlans.update(id, {
      ...changes,
      updatedDate: currentDate(),
    });
    this.events.emit('safety.plan.updated', { plan: updated });
    return updated;
  }

  async approveSafetyPlan(
    id: string,
    approvedBy: string,
  ): Promise<SafetyPlan & CollectionMeta> {
    const existing = await this.safetyPlans.get(id);
    if (!existing) throw new Error(`Safety plan ${id} not found`);
    const updated = await this.safetyPlans.update(id, {
      approvedBy,
      approvedDate: currentDate(),
    });
    this.events.emit('safety.plan.approved', { plan: updated });
    return updated;
  }

  async listSafetyPlans(filters?: {
    jobId?: string;
    active?: boolean;
    search?: string;
  }): Promise<(SafetyPlan & CollectionMeta)[]> {
    const q = this.safetyPlans.query();
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    if (filters?.active !== undefined) q.where('active', '=', filters.active);
    q.orderBy('createdDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.jobName ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Safety Training Matrix
  // =========================================================================

  async addSafetyTraining(data: {
    employeeId: string;
    employeeName?: string;
    courseName: string;
    status?: SafetyTrainingStatus;
    requiredDate?: string;
    completedDate?: string;
    expirationDate?: string;
    provider?: string;
    notes?: string;
  }): Promise<SafetyTraining & CollectionMeta> {
    const tr = await this.safetyTraining.insert({
      employeeId: data.employeeId,
      employeeName: data.employeeName ?? '',
      courseName: data.courseName,
      status: data.status ?? 'required',
      requiredDate: data.requiredDate ?? '',
      completedDate: data.completedDate ?? '',
      expirationDate: data.expirationDate ?? '',
      provider: data.provider ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('safety.training.added', { training: tr });
    return tr;
  }

  async completeSafetyTraining(
    id: string,
    completedDate?: string,
    expirationDate?: string,
  ): Promise<SafetyTraining & CollectionMeta> {
    const existing = await this.safetyTraining.get(id);
    if (!existing) throw new Error(`Safety training ${id} not found`);
    const updated = await this.safetyTraining.update(id, {
      status: 'completed' as SafetyTrainingStatus,
      completedDate: completedDate ?? currentDate(),
      expirationDate: expirationDate ?? '',
    });
    this.events.emit('safety.training.completed', { training: updated });
    return updated;
  }

  async getTrainingMatrix(
    employeeId?: string,
  ): Promise<(SafetyTraining & CollectionMeta)[]> {
    const q = this.safetyTraining.query();
    if (employeeId) q.where('employeeId', '=', employeeId);
    q.orderBy('courseName', 'asc');
    return q.execute();
  }

  async listSafetyTraining(filters?: {
    status?: SafetyTrainingStatus;
    search?: string;
  }): Promise<(SafetyTraining & CollectionMeta)[]> {
    const q = this.safetyTraining.query();
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('courseName', 'asc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.courseName.toLowerCase().includes(s) ||
          (t.employeeName ?? '').toLowerCase().includes(s) ||
          t.employeeId.toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Corrective Actions
  // =========================================================================

  async createCorrectiveAction(data: {
    number: string;
    incidentId?: string;
    inspectionId?: string;
    description: string;
    priority: CorrectiveActionPriority;
    assignedTo: string;
    dueDate: string;
    jobId?: string;
    notes?: string;
  }): Promise<CorrectiveAction & CollectionMeta> {
    const ca = await this.correctiveActions.insert({
      number: data.number,
      incidentId: data.incidentId ?? '',
      inspectionId: data.inspectionId ?? '',
      description: data.description,
      priority: data.priority,
      status: 'open' as CorrectiveActionStatus,
      assignedTo: data.assignedTo,
      assignedDate: currentDate(),
      dueDate: data.dueDate,
      jobId: data.jobId ?? '',
      notes: data.notes ?? '',
    });
    this.events.emit('safety.correctiveAction.created', { action: ca });
    return ca;
  }

  async completeCorrectiveAction(id: string): Promise<CorrectiveAction & CollectionMeta> {
    const existing = await this.correctiveActions.get(id);
    if (!existing) throw new Error(`Corrective action ${id} not found`);
    const updated = await this.correctiveActions.update(id, {
      status: 'completed' as CorrectiveActionStatus,
      completedDate: currentDate(),
    });
    this.events.emit('safety.correctiveAction.completed', { action: updated });
    return updated;
  }

  async verifyCorrectiveAction(
    id: string,
    verifiedBy: string,
  ): Promise<CorrectiveAction & CollectionMeta> {
    const existing = await this.correctiveActions.get(id);
    if (!existing) throw new Error(`Corrective action ${id} not found`);
    if (existing.status !== 'completed') throw new Error('Only completed actions can be verified');
    const updated = await this.correctiveActions.update(id, {
      status: 'verified' as CorrectiveActionStatus,
      verifiedBy,
      verifiedDate: currentDate(),
    });
    this.events.emit('safety.correctiveAction.verified', { action: updated });
    return updated;
  }

  async listCorrectiveActions(filters?: {
    status?: CorrectiveActionStatus;
    priority?: CorrectiveActionPriority;
    assignedTo?: string;
    search?: string;
  }): Promise<(CorrectiveAction & CollectionMeta)[]> {
    const q = this.correctiveActions.query();
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.priority) q.where('priority', '=', filters.priority);
    if (filters?.assignedTo) q.where('assignedTo', '=', filters.assignedTo);
    q.orderBy('dueDate', 'asc');
    let results = await q.execute();

    // Mark overdue items
    const today = currentDate();
    for (const ca of results) {
      if ((ca.status === 'open' || ca.status === 'in_progress') && ca.dueDate < today) {
        await this.correctiveActions.update((ca as any).id, { status: 'overdue' as CorrectiveActionStatus });
        ca.status = 'overdue';
      }
    }

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.number.toLowerCase().includes(s) ||
          c.description.toLowerCase().includes(s) ||
          c.assignedTo.toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // DOT Compliance
  // =========================================================================

  async addDOTRecord(data: {
    employeeId: string;
    employeeName?: string;
    cdlNumber?: string;
    cdlState?: string;
    cdlExpiration?: string;
    cdlClass?: string;
    medicalCardExpiration?: string;
    lastPhysicalDate?: string;
    notes?: string;
  }): Promise<DOTCompliance & CollectionMeta> {
    let status: DOTStatus = 'compliant';
    const today = currentDate();
    if (data.cdlExpiration && data.cdlExpiration < today) status = 'expired';
    else if (data.medicalCardExpiration && data.medicalCardExpiration < today) status = 'expired';
    else if (data.cdlExpiration && daysBetween(today, data.cdlExpiration) <= 90) status = 'expiring_soon';
    else if (data.medicalCardExpiration && daysBetween(today, data.medicalCardExpiration) <= 90) status = 'expiring_soon';

    const rec = await this.dotCompliance.insert({
      employeeId: data.employeeId,
      employeeName: data.employeeName ?? '',
      cdlNumber: data.cdlNumber ?? '',
      cdlState: data.cdlState ?? '',
      cdlExpiration: data.cdlExpiration ?? '',
      cdlClass: data.cdlClass ?? '',
      medicalCardExpiration: data.medicalCardExpiration ?? '',
      lastPhysicalDate: data.lastPhysicalDate ?? '',
      hoursOfServiceCompliant: true,
      status,
      notes: data.notes ?? '',
    });
    this.events.emit('safety.dot.added', { record: rec });
    return rec;
  }

  async updateDOTRecord(
    id: string,
    changes: Partial<DOTCompliance>,
  ): Promise<DOTCompliance & CollectionMeta> {
    const existing = await this.dotCompliance.get(id);
    if (!existing) throw new Error(`DOT record ${id} not found`);
    const updated = await this.dotCompliance.update(id, changes);
    this.events.emit('safety.dot.updated', { record: updated });
    return updated;
  }

  async listDOTCompliance(filters?: {
    status?: DOTStatus;
    search?: string;
  }): Promise<(DOTCompliance & CollectionMeta)[]> {
    const q = this.dotCompliance.query();
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('employeeId', 'asc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (d) =>
          (d.employeeName ?? '').toLowerCase().includes(s) ||
          d.employeeId.toLowerCase().includes(s) ||
          (d.cdlNumber ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  // =========================================================================
  // Safety Dashboard
  // =========================================================================

  async getSafetyDashboard(year?: number): Promise<SafetyDashboardSummary> {
    const yearStr = year ? String(year) : '';
    const [allIncidents, allCA, allInspections, currentEMR] = await Promise.all([
      this.incidents.query().execute(),
      this.correctiveActions.query().execute(),
      this.inspections.query().execute(),
      this.getCurrentEMR(),
    ]);

    const filtered = yearStr
      ? allIncidents.filter((i) => i.date.startsWith(yearStr))
      : allIncidents;

    const recordable = filtered.filter((i) => i.oshaRecordable);
    const nearMisses = filtered.filter((i) => i.severity === 'near_miss');
    const openIncidents = filtered.filter((i) => i.status !== 'closed');

    // Days without incident
    const sorted = [...allIncidents].sort((a, b) => b.date.localeCompare(a.date));
    const lastIncidentDate = sorted.find((i) => i.oshaRecordable)?.date;
    const daysWithout = lastIncidentDate ? daysBetween(lastIncidentDate, currentDate()) : 999;

    const openCA = allCA.filter((c) => c.status === 'open' || c.status === 'in_progress');
    const overdueCA = allCA.filter((c) => c.status === 'overdue');
    const upcomingInsp = allInspections.filter(
      (i) => i.status === 'scheduled' && i.scheduledDate >= currentDate(),
    );

    // Incidents by month
    const monthMap = new Map<string, number>();
    for (const inc of filtered) {
      const month = inc.date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }
    const incidentsByMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Incidents by type
    const byType: Record<IncidentType, number> = {
      injury: 0, illness: 0, near_miss: 0, property_damage: 0, environmental: 0, vehicle: 0,
    };
    for (const inc of filtered) byType[inc.type]++;

    return {
      totalIncidents: filtered.length,
      openIncidents: openIncidents.length,
      recordableIncidents: recordable.length,
      nearMisses: nearMisses.length,
      daysWithoutIncident: daysWithout,
      openCorrectiveActions: openCA.length,
      overdueCorrectiveActions: overdueCA.length,
      upcomingInspections: upcomingInsp.length,
      trir: 0,
      dart: 0,
      emr: currentEMR,
      incidentsByMonth,
      incidentsByType: byType,
    };
  }
}

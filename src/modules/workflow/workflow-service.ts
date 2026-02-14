/**
 * Concrete -- Workflow & Approvals Engine Service (Phase 28)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type ApprovalType = 'sequential' | 'parallel' | 'conditional';
export type WorkflowStatus = 'active' | 'inactive' | 'draft';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'delegated' | 'skipped';
export type EscalationAction = 'notify' | 'auto_approve' | 'reassign';

export interface WorkflowTemplate { [key: string]: unknown; name: string; description?: string; recordType: string; approvalType: ApprovalType; status: WorkflowStatus; steps: string; thresholdField?: string; thresholdValue?: number; createdBy: string; createdDate: string; updatedDate?: string; }
export interface ApprovalStep { [key: string]: unknown; templateId: string; stepOrder: number; stepName: string; approverType: 'role' | 'user' | 'department'; approverId: string; approverName?: string; required: boolean; thresholdMin?: number; thresholdMax?: number; timeoutDays?: number; escalationAction?: EscalationAction; escalateTo?: string; }
export interface ApprovalRequest { [key: string]: unknown; templateId: string; templateName?: string; recordType: string; recordId: string; recordDescription?: string; requestedBy: string; requestedDate: string; currentStep: number; totalSteps: number; status: ApprovalStatus; amount?: number; notes?: string; }
export interface ApprovalAction { [key: string]: unknown; requestId: string; stepOrder: number; actionBy: string; actionByName?: string; action: 'approved' | 'rejected' | 'delegated' | 'escalated'; actionDate: string; comments?: string; delegatedTo?: string; }
export interface DelegationRule { [key: string]: unknown; userId: string; userName?: string; delegateTo: string; delegateToName?: string; startDate: string; endDate: string; reason?: string; active: boolean; }
export interface EscalationRecord { [key: string]: unknown; requestId: string; stepOrder: number; escalatedFrom: string; escalatedTo: string; escalatedAt: string; reason: string; autoEscalated: boolean; }
export interface ApprovalHistory { [key: string]: unknown; requestId: string; recordType: string; recordId: string; recordDescription?: string; requestedBy: string; finalAction: 'approved' | 'rejected'; completedDate: string; totalDuration: number; stepsCompleted: number; }
export interface BulkApprovalBatch { [key: string]: unknown; batchId: string; approvedBy: string; approvedDate: string; requestIds: string; count: number; notes?: string; }

function currentDate(): string { return new Date().toISOString().split('T')[0]; }
function currentTimestamp(): string { return new Date().toISOString(); }

export class WorkflowService {
  constructor(
    private templates: Collection<WorkflowTemplate>, private steps: Collection<ApprovalStep>,
    private requests: Collection<ApprovalRequest>, private actions: Collection<ApprovalAction>,
    private delegations: Collection<DelegationRule>, private escalations: Collection<EscalationRecord>,
    private history: Collection<ApprovalHistory>, private bulkBatches: Collection<BulkApprovalBatch>,
    private events: EventBus,
  ) {}

  // Templates
  async createTemplate(data: { name: string; description?: string; recordType: string; approvalType: ApprovalType; steps: string; thresholdField?: string; thresholdValue?: number; createdBy: string }): Promise<WorkflowTemplate & CollectionMeta> {
    const t = await this.templates.insert({ ...data, description: data.description ?? '', status: 'draft' as WorkflowStatus, steps: data.steps, thresholdField: data.thresholdField ?? '', thresholdValue: data.thresholdValue ?? 0, createdDate: currentDate() });
    this.events.emit('workflow.template.created', { template: t }); return t;
  }
  async activateTemplate(id: string): Promise<WorkflowTemplate & CollectionMeta> { return this.templates.update(id, { status: 'active' as WorkflowStatus, updatedDate: currentDate() }); }
  async deactivateTemplate(id: string): Promise<WorkflowTemplate & CollectionMeta> { return this.templates.update(id, { status: 'inactive' as WorkflowStatus, updatedDate: currentDate() }); }
  async listTemplates(filters?: { status?: WorkflowStatus; recordType?: string; search?: string }): Promise<(WorkflowTemplate & CollectionMeta)[]> { const q = this.templates.query(); if (filters?.status) q.where('status', '=', filters.status); if (filters?.recordType) q.where('recordType', '=', filters.recordType); q.orderBy('name', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s)); } return r; }

  // Steps
  async addStep(data: { templateId: string; stepOrder: number; stepName: string; approverType: 'role' | 'user' | 'department'; approverId: string; approverName?: string; required?: boolean; thresholdMin?: number; thresholdMax?: number; timeoutDays?: number; escalationAction?: EscalationAction; escalateTo?: string }): Promise<ApprovalStep & CollectionMeta> {
    return this.steps.insert({ ...data, approverName: data.approverName ?? '', required: data.required ?? true, thresholdMin: data.thresholdMin ?? 0, thresholdMax: data.thresholdMax ?? 0, timeoutDays: data.timeoutDays ?? 0, escalationAction: data.escalationAction, escalateTo: data.escalateTo ?? '' });
  }
  async getSteps(templateId: string): Promise<(ApprovalStep & CollectionMeta)[]> { const q = this.steps.query(); q.where('templateId', '=', templateId); q.orderBy('stepOrder', 'asc'); return q.execute(); }

  // Requests
  async submitRequest(data: { templateId: string; templateName?: string; recordType: string; recordId: string; recordDescription?: string; requestedBy: string; totalSteps: number; amount?: number; notes?: string }): Promise<ApprovalRequest & CollectionMeta> {
    const r = await this.requests.insert({ ...data, templateName: data.templateName ?? '', recordDescription: data.recordDescription ?? '', requestedDate: currentDate(), currentStep: 1, status: 'pending' as ApprovalStatus, amount: data.amount ?? 0, notes: data.notes ?? '' });
    this.events.emit('workflow.request.submitted', { request: r }); return r;
  }
  async approveRequest(id: string, approvedBy: string, comments?: string): Promise<ApprovalRequest & CollectionMeta> {
    const e = await this.requests.get(id); if (!e) throw new Error(`Request ${id} not found`);
    await this.actions.insert({ requestId: id, stepOrder: e.currentStep, actionBy: approvedBy, action: 'approved', actionDate: currentTimestamp(), comments: comments ?? '' });
    const newStep = e.currentStep + 1; const isComplete = newStep > e.totalSteps;
    const u = await this.requests.update(id, { currentStep: isComplete ? e.totalSteps : newStep, status: isComplete ? 'approved' as ApprovalStatus : 'pending' as ApprovalStatus });
    if (isComplete) { await this.history.insert({ requestId: id, recordType: e.recordType, recordId: e.recordId, recordDescription: e.recordDescription ?? '', requestedBy: e.requestedBy, finalAction: 'approved', completedDate: currentDate(), totalDuration: 0, stepsCompleted: e.totalSteps }); }
    this.events.emit('workflow.request.approved', { request: u }); return u;
  }
  async rejectRequest(id: string, rejectedBy: string, comments?: string): Promise<ApprovalRequest & CollectionMeta> {
    const e = await this.requests.get(id); if (!e) throw new Error(`Request ${id} not found`);
    await this.actions.insert({ requestId: id, stepOrder: e.currentStep, actionBy: rejectedBy, action: 'rejected', actionDate: currentTimestamp(), comments: comments ?? '' });
    const u = await this.requests.update(id, { status: 'rejected' as ApprovalStatus });
    await this.history.insert({ requestId: id, recordType: e.recordType, recordId: e.recordId, recordDescription: e.recordDescription ?? '', requestedBy: e.requestedBy, finalAction: 'rejected', completedDate: currentDate(), totalDuration: 0, stepsCompleted: e.currentStep });
    this.events.emit('workflow.request.rejected', { request: u }); return u;
  }
  async listRequests(filters?: { status?: ApprovalStatus; recordType?: string; requestedBy?: string; search?: string }): Promise<(ApprovalRequest & CollectionMeta)[]> { const q = this.requests.query(); if (filters?.status) q.where('status', '=', filters.status); if (filters?.recordType) q.where('recordType', '=', filters.recordType); if (filters?.requestedBy) q.where('requestedBy', '=', filters.requestedBy); q.orderBy('requestedDate', 'desc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => (x.recordDescription ?? '').toLowerCase().includes(s) || x.requestedBy.toLowerCase().includes(s)); } return r; }
  async getPendingForApprover(approverId: string): Promise<(ApprovalRequest & CollectionMeta)[]> { const pending = await this.requests.query().where('status', '=', 'pending').execute(); return pending; }
  async getActions(requestId: string): Promise<(ApprovalAction & CollectionMeta)[]> { const q = this.actions.query(); q.where('requestId', '=', requestId); q.orderBy('actionDate', 'asc'); return q.execute(); }

  // Delegation
  async createDelegation(data: { userId: string; userName?: string; delegateTo: string; delegateToName?: string; startDate: string; endDate: string; reason?: string }): Promise<DelegationRule & CollectionMeta> {
    return this.delegations.insert({ ...data, userName: data.userName ?? '', delegateToName: data.delegateToName ?? '', reason: data.reason ?? '', active: true });
  }
  async deactivateDelegation(id: string): Promise<DelegationRule & CollectionMeta> { return this.delegations.update(id, { active: false }); }
  async listDelegations(): Promise<(DelegationRule & CollectionMeta)[]> { return this.delegations.query().orderBy('startDate', 'desc').execute(); }

  // Escalation
  async escalateRequest(data: { requestId: string; stepOrder: number; escalatedFrom: string; escalatedTo: string; reason: string; autoEscalated?: boolean }): Promise<EscalationRecord & CollectionMeta> {
    const e = await this.escalations.insert({ ...data, escalatedAt: currentTimestamp(), autoEscalated: data.autoEscalated ?? false });
    const req = await this.requests.get(data.requestId); if (req) await this.requests.update(data.requestId, { status: 'escalated' as ApprovalStatus });
    this.events.emit('workflow.request.escalated', { escalation: e }); return e;
  }
  async listEscalations(): Promise<(EscalationRecord & CollectionMeta)[]> { return this.escalations.query().orderBy('escalatedAt', 'desc').execute(); }

  // History
  async listHistory(filters?: { recordType?: string; finalAction?: string }): Promise<(ApprovalHistory & CollectionMeta)[]> { const q = this.history.query(); if (filters?.recordType) q.where('recordType', '=', filters.recordType); if (filters?.finalAction) q.where('finalAction', '=', filters.finalAction); q.orderBy('completedDate', 'desc'); return q.execute(); }

  // Bulk Approval
  async bulkApprove(requestIds: string[], approvedBy: string, notes?: string): Promise<BulkApprovalBatch & CollectionMeta> {
    for (const id of requestIds) { await this.approveRequest(id, approvedBy, notes); }
    const batch = await this.bulkBatches.insert({ batchId: `BULK-${Date.now()}`, approvedBy, approvedDate: currentTimestamp(), requestIds: requestIds.join(','), count: requestIds.length, notes: notes ?? '' });
    this.events.emit('workflow.bulk.approved', { batch }); return batch;
  }
  async listBulkBatches(): Promise<(BulkApprovalBatch & CollectionMeta)[]> { return this.bulkBatches.query().orderBy('approvedDate', 'desc').execute(); }
}

import { WorkflowService } from './workflow-service';
import type { WorkflowTemplate, ApprovalStep, ApprovalRequest, ApprovalAction, DelegationRule, EscalationRecord, ApprovalHistory, BulkApprovalBatch } from './workflow-service';
let _service: WorkflowService | null = null;
export function getWorkflowService(): WorkflowService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Workflow: app not initialized');
  const s = app.store; const e = app.events;
  _service = new WorkflowService(s.collection<WorkflowTemplate>('wf/template'), s.collection<ApprovalStep>('wf/step'), s.collection<ApprovalRequest>('wf/request'), s.collection<ApprovalAction>('wf/action'), s.collection<DelegationRule>('wf/delegation'), s.collection<EscalationRecord>('wf/escalation'), s.collection<ApprovalHistory>('wf/history'), s.collection<BulkApprovalBatch>('wf/bulkBatch'), e);
  return _service;
}

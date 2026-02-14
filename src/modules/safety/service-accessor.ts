import { SafetyService } from './safety-service';
import type {
  SafetyIncident,
  Inspection,
  ToolboxTalk,
  PPERecord,
  DrugTest,
  SafetyPlan,
  SafetyTraining,
  CorrectiveAction,
  DOTCompliance,
  EMRRecord,
} from './safety-service';

let _service: SafetyService | null = null;

export function getSafetyService(): SafetyService {
  if (_service) return _service;

  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Safety: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new SafetyService(
    store.collection<SafetyIncident>('safety/incident'),
    store.collection<Inspection>('safety/inspection'),
    store.collection<ToolboxTalk>('safety/toolboxTalk'),
    store.collection<PPERecord>('safety/ppeRecord'),
    store.collection<DrugTest>('safety/drugTest'),
    store.collection<SafetyPlan>('safety/safetyPlan'),
    store.collection<SafetyTraining>('safety/safetyTraining'),
    store.collection<CorrectiveAction>('safety/correctiveAction'),
    store.collection<DOTCompliance>('safety/dotCompliance'),
    store.collection<EMRRecord>('safety/emrRecord'),
    events,
  );

  return _service;
}

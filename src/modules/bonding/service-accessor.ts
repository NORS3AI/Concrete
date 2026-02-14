import { BondingService } from './bonding-service';
import type { SuretyCompany, BondRecord, InsurancePolicy, COIRecord, SubInsurance, WrapUpProgram, LossRun, InsuranceClaim, JobInsuranceCost } from './bonding-service';
let _service: BondingService | null = null;
export function getBondingService(): BondingService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Bonding: app not initialized');
  const store = app.store; const events = app.events;
  _service = new BondingService(
    store.collection<SuretyCompany>('bond/surety'), store.collection<BondRecord>('bond/bond'),
    store.collection<InsurancePolicy>('bond/policy'), store.collection<COIRecord>('bond/coi'),
    store.collection<SubInsurance>('bond/subInsurance'), store.collection<WrapUpProgram>('bond/wrapUp'),
    store.collection<LossRun>('bond/lossRun'), store.collection<InsuranceClaim>('bond/claim'),
    store.collection<JobInsuranceCost>('bond/jobCost'), events,
  );
  return _service;
}

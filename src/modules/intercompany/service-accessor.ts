import { IntercompanyService } from './intercompany-service';
import type { ICTransaction, EliminationEntry, TransferPricingRule, SharedServiceAllocation, ManagementFee, ConsolidatedTrialBalance, ConsolidatedStatement, CurrencyTranslation, ICReconciliation, SegmentReport } from './intercompany-service';
let _service: IntercompanyService | null = null;
export function getIntercompanyService(): IntercompanyService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Intercompany: app not initialized');
  const s = app.store; const e = app.events;
  _service = new IntercompanyService(s.collection<ICTransaction>('ic/transaction'), s.collection<EliminationEntry>('ic/elimination'), s.collection<TransferPricingRule>('ic/transferPricing'), s.collection<SharedServiceAllocation>('ic/allocation'), s.collection<ManagementFee>('ic/managementFee'), s.collection<ConsolidatedTrialBalance>('ic/trialBalance'), s.collection<ConsolidatedStatement>('ic/statement'), s.collection<CurrencyTranslation>('ic/translation'), s.collection<ICReconciliation>('ic/reconciliation'), s.collection<SegmentReport>('ic/segment'), e);
  return _service;
}

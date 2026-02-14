import { BankingService } from './banking-service';
import type { BankAccount, StatementLine, Reconciliation, CashFlowProjection, PositivePayRecord, ACHBatch, CheckRecord, CreditCardTransaction, PettyCash, PettyCashTransaction, TrustAccount } from './banking-service';
let _service: BankingService | null = null;
export function getBankingService(): BankingService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Banking: app not initialized');
  const store = app.store; const events = app.events;
  _service = new BankingService(
    store.collection<BankAccount>('bank/account'), store.collection<StatementLine>('bank/statementLine'),
    store.collection<Reconciliation>('bank/reconciliation'), store.collection<CashFlowProjection>('bank/cashFlow'),
    store.collection<PositivePayRecord>('bank/positivePay'), store.collection<ACHBatch>('bank/achBatch'),
    store.collection<CheckRecord>('bank/check'), store.collection<CreditCardTransaction>('bank/ccTransaction'),
    store.collection<PettyCash>('bank/pettyCash'), store.collection<PettyCashTransaction>('bank/pettyCashTxn'),
    store.collection<TrustAccount>('bank/trustAccount'), events,
  );
  return _service;
}

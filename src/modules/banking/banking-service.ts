/**
 * Concrete -- Bank Reconciliation & Cash Management Service (Phase 25)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type AccountType = 'checking' | 'savings' | 'money_market' | 'credit_card' | 'line_of_credit' | 'trust' | 'petty_cash';
export type AccountStatus = 'active' | 'inactive' | 'closed';
export type StatementLineStatus = 'unmatched' | 'matched' | 'adjusted' | 'excluded';
export type ReconciliationStatus = 'in_progress' | 'completed' | 'approved';
export type CashFlowType = 'inflow' | 'outflow';
export type CheckStatus = 'issued' | 'cleared' | 'voided' | 'stale' | 'reissued';
export type CreditCardStatus = 'pending' | 'coded' | 'approved' | 'posted';

export interface BankAccount {
  [key: string]: unknown; name: string; accountNumber: string; routingNumber?: string; bankName: string; type: AccountType; status: AccountStatus; currentBalance: number; lastReconciledDate?: string; lastReconciledBalance?: number; glAccountId?: string; notes?: string;
}
export interface StatementLine {
  [key: string]: unknown; accountId: string; statementDate: string; postDate: string; description: string; reference?: string; amount: number; runningBalance?: number; status: StatementLineStatus; matchedTransactionId?: string; importBatch?: string; checkNumber?: string;
}
export interface Reconciliation {
  [key: string]: unknown; accountId: string; accountName?: string; statementDate: string; statementBalance: number; bookBalance: number; adjustedBalance: number; difference: number; status: ReconciliationStatus; reconciledBy?: string; reconciledDate?: string; outstandingDeposits: number; outstandingChecks: number; notes?: string;
}
export interface CashFlowProjection {
  [key: string]: unknown; accountId?: string; type: CashFlowType; description: string; amount: number; expectedDate: string; source?: string; sourceId?: string; probability?: number; notes?: string;
}
export interface PositivePayRecord {
  [key: string]: unknown; accountId: string; checkNumber: string; payee: string; amount: number; issueDate: string; voidFlag: boolean; exported: boolean; exportDate?: string;
}
export interface ACHBatch {
  [key: string]: unknown; batchNumber: string; accountId: string; description: string; totalAmount: number; entryCount: number; effectiveDate: string; status: 'pending' | 'submitted' | 'processed' | 'rejected'; createdDate: string; submittedDate?: string; notes?: string;
}
export interface CheckRecord {
  [key: string]: unknown; accountId: string; checkNumber: string; payee: string; amount: number; issueDate: string; clearedDate?: string; status: CheckStatus; voidDate?: string; reissueCheckNumber?: string; memo?: string;
}
export interface CreditCardTransaction {
  [key: string]: unknown; accountId: string; transactionDate: string; postDate?: string; description: string; amount: number; category?: string; glAccountId?: string; jobId?: string; costCode?: string; status: CreditCardStatus; codedBy?: string; approvedBy?: string; notes?: string;
}
export interface PettyCash {
  [key: string]: unknown; custodian: string; fundAmount: number; currentBalance: number; lastReplenishedDate?: string; location?: string; active: boolean;
}
export interface PettyCashTransaction {
  [key: string]: unknown; pettyCashId: string; date: string; description: string; amount: number; category?: string; receipt: boolean; approvedBy?: string; notes?: string;
}
export interface TrustAccount {
  [key: string]: unknown; accountId: string; ownerName: string; projectId?: string; projectName?: string; balance: number; requiredBalance: number; lastActivityDate?: string; compliant: boolean; notes?: string;
}

export interface CashPositionSummary { totalBalance: number; byAccount: { accountId: string; name: string; type: AccountType; balance: number }[]; }
export interface CashFlowForecast { date: string; inflows: number; outflows: number; netFlow: number; projectedBalance: number; }

const round2 = (n: number): number => Math.round(n * 100) / 100;
function currentDate(): string { return new Date().toISOString().split('T')[0]; }

export class BankingService {
  constructor(
    private accounts: Collection<BankAccount>, private statementLines: Collection<StatementLine>,
    private reconciliations: Collection<Reconciliation>, private cashFlows: Collection<CashFlowProjection>,
    private positivePay: Collection<PositivePayRecord>, private achBatches: Collection<ACHBatch>,
    private checks: Collection<CheckRecord>, private ccTransactions: Collection<CreditCardTransaction>,
    private pettyCashFunds: Collection<PettyCash>, private pettyCashTxns: Collection<PettyCashTransaction>,
    private trustAccounts: Collection<TrustAccount>, private events: EventBus,
  ) {}

  // Bank Accounts
  async createAccount(data: { name: string; accountNumber: string; routingNumber?: string; bankName: string; type: AccountType; currentBalance?: number; glAccountId?: string; notes?: string }): Promise<BankAccount & CollectionMeta> {
    const a = await this.accounts.insert({ ...data, routingNumber: data.routingNumber ?? '', status: 'active' as AccountStatus, currentBalance: round2(data.currentBalance ?? 0), glAccountId: data.glAccountId ?? '', notes: data.notes ?? '' });
    this.events.emit('banking.account.created', { account: a }); return a;
  }
  async updateAccount(id: string, changes: Partial<BankAccount>): Promise<BankAccount & CollectionMeta> { const e = await this.accounts.get(id); if (!e) throw new Error(`Account ${id} not found`); const u = await this.accounts.update(id, changes); return u; }
  async listAccounts(filters?: { type?: AccountType; status?: AccountStatus; search?: string }): Promise<(BankAccount & CollectionMeta)[]> { const q = this.accounts.query(); if (filters?.type) q.where('type', '=', filters.type); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('name', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s) || x.bankName.toLowerCase().includes(s)); } return r; }

  // Statement Import
  async importStatementLine(data: { accountId: string; statementDate: string; postDate: string; description: string; reference?: string; amount: number; checkNumber?: string; importBatch?: string }): Promise<StatementLine & CollectionMeta> {
    const l = await this.statementLines.insert({ ...data, reference: data.reference ?? '', status: 'unmatched' as StatementLineStatus, checkNumber: data.checkNumber ?? '', importBatch: data.importBatch ?? '' });
    this.events.emit('banking.statement.imported', { line: l }); return l;
  }
  async matchStatementLine(id: string, transactionId: string): Promise<StatementLine & CollectionMeta> { const e = await this.statementLines.get(id); if (!e) throw new Error(`Statement line ${id} not found`); const u = await this.statementLines.update(id, { status: 'matched' as StatementLineStatus, matchedTransactionId: transactionId }); return u; }
  async listStatementLines(accountId: string, filters?: { status?: StatementLineStatus }): Promise<(StatementLine & CollectionMeta)[]> { const q = this.statementLines.query(); q.where('accountId', '=', accountId); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('postDate', 'desc'); return q.execute(); }

  // Reconciliation
  async createReconciliation(data: { accountId: string; accountName?: string; statementDate: string; statementBalance: number; bookBalance: number }): Promise<Reconciliation & CollectionMeta> {
    const diff = round2(data.statementBalance - data.bookBalance);
    const r = await this.reconciliations.insert({ ...data, accountName: data.accountName ?? '', statementBalance: round2(data.statementBalance), bookBalance: round2(data.bookBalance), adjustedBalance: round2(data.bookBalance), difference: diff, status: 'in_progress' as ReconciliationStatus, outstandingDeposits: 0, outstandingChecks: 0 });
    this.events.emit('banking.reconciliation.created', { reconciliation: r }); return r;
  }
  async completeReconciliation(id: string, reconciledBy: string): Promise<Reconciliation & CollectionMeta> { const e = await this.reconciliations.get(id); if (!e) throw new Error(`Reconciliation ${id} not found`); const u = await this.reconciliations.update(id, { status: 'completed' as ReconciliationStatus, reconciledBy, reconciledDate: currentDate() }); this.events.emit('banking.reconciliation.completed', { reconciliation: u }); return u; }
  async listReconciliations(accountId?: string): Promise<(Reconciliation & CollectionMeta)[]> { const q = this.reconciliations.query(); if (accountId) q.where('accountId', '=', accountId); q.orderBy('statementDate', 'desc'); return q.execute(); }

  // Cash Position
  async getCashPosition(): Promise<CashPositionSummary> { const all = await this.accounts.query().execute(); const active = all.filter(a => a.status === 'active'); return { totalBalance: round2(active.reduce((s, a) => s + a.currentBalance, 0)), byAccount: active.map(a => ({ accountId: (a as any).id, name: a.name, type: a.type, balance: a.currentBalance })) }; }

  // Cash Flow Projection
  async addProjection(data: { accountId?: string; type: CashFlowType; description: string; amount: number; expectedDate: string; source?: string; probability?: number; notes?: string }): Promise<CashFlowProjection & CollectionMeta> {
    const p = await this.cashFlows.insert({ ...data, accountId: data.accountId ?? '', amount: round2(data.amount), source: data.source ?? '', probability: data.probability ?? 100, notes: data.notes ?? '' });
    return p;
  }
  async getCashFlowForecast(days: number = 90): Promise<CashFlowForecast[]> {
    const today = currentDate(); const all = await this.cashFlows.query().orderBy('expectedDate', 'asc').execute();
    const position = await this.getCashPosition(); let balance = position.totalBalance;
    const dateMap = new Map<string, { inflows: number; outflows: number }>();
    for (const p of all) { if (p.expectedDate < today) continue; const d = dateMap.get(p.expectedDate) ?? { inflows: 0, outflows: 0 }; if (p.type === 'inflow') d.inflows += p.amount; else d.outflows += p.amount; dateMap.set(p.expectedDate, d); }
    const forecast: CashFlowForecast[] = [];
    for (const [date, { inflows, outflows }] of [...dateMap.entries()].sort()) { const net = round2(inflows - outflows); balance = round2(balance + net); forecast.push({ date, inflows: round2(inflows), outflows: round2(outflows), netFlow: net, projectedBalance: balance }); }
    return forecast;
  }
  async listProjections(): Promise<(CashFlowProjection & CollectionMeta)[]> { return this.cashFlows.query().orderBy('expectedDate', 'asc').execute(); }

  // Positive Pay
  async addPositivePayRecord(data: { accountId: string; checkNumber: string; payee: string; amount: number; issueDate: string; voidFlag?: boolean }): Promise<PositivePayRecord & CollectionMeta> {
    const r = await this.positivePay.insert({ ...data, amount: round2(data.amount), voidFlag: data.voidFlag ?? false, exported: false });
    return r;
  }
  async exportPositivePay(accountId: string): Promise<(PositivePayRecord & CollectionMeta)[]> { const q = this.positivePay.query(); q.where('accountId', '=', accountId); q.where('exported', '=', false); const records = await q.execute(); for (const r of records) { await this.positivePay.update((r as any).id, { exported: true, exportDate: currentDate() }); } return records; }
  async listPositivePay(accountId: string): Promise<(PositivePayRecord & CollectionMeta)[]> { const q = this.positivePay.query(); q.where('accountId', '=', accountId); q.orderBy('issueDate', 'desc'); return q.execute(); }

  // ACH
  async createACHBatch(data: { batchNumber: string; accountId: string; description: string; totalAmount: number; entryCount: number; effectiveDate: string; notes?: string }): Promise<ACHBatch & CollectionMeta> {
    const b = await this.achBatches.insert({ ...data, totalAmount: round2(data.totalAmount), status: 'pending' as const, createdDate: currentDate(), notes: data.notes ?? '' });
    this.events.emit('banking.ach.created', { batch: b }); return b;
  }
  async submitACHBatch(id: string): Promise<ACHBatch & CollectionMeta> { const e = await this.achBatches.get(id); if (!e) throw new Error(`ACH batch ${id} not found`); const u = await this.achBatches.update(id, { status: 'submitted' as const, submittedDate: currentDate() }); return u; }
  async listACHBatches(): Promise<(ACHBatch & CollectionMeta)[]> { return this.achBatches.query().orderBy('createdDate', 'desc').execute(); }

  // Checks
  async issueCheck(data: { accountId: string; checkNumber: string; payee: string; amount: number; issueDate?: string; memo?: string }): Promise<CheckRecord & CollectionMeta> {
    const c = await this.checks.insert({ ...data, amount: round2(data.amount), issueDate: data.issueDate ?? currentDate(), status: 'issued' as CheckStatus, memo: data.memo ?? '' });
    this.events.emit('banking.check.issued', { check: c }); return c;
  }
  async voidCheck(id: string): Promise<CheckRecord & CollectionMeta> { const e = await this.checks.get(id); if (!e) throw new Error(`Check ${id} not found`); const u = await this.checks.update(id, { status: 'voided' as CheckStatus, voidDate: currentDate() }); this.events.emit('banking.check.voided', { check: u }); return u; }
  async reissueCheck(id: string, newCheckNumber: string): Promise<CheckRecord & CollectionMeta> { const e = await this.checks.get(id); if (!e) throw new Error(`Check ${id} not found`); await this.checks.update(id, { status: 'reissued' as CheckStatus, reissueCheckNumber: newCheckNumber }); const n = await this.issueCheck({ accountId: e.accountId, checkNumber: newCheckNumber, payee: e.payee, amount: e.amount, memo: e.memo }); return n; }
  async listChecks(accountId?: string, filters?: { status?: CheckStatus }): Promise<(CheckRecord & CollectionMeta)[]> { const q = this.checks.query(); if (accountId) q.where('accountId', '=', accountId); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('issueDate', 'desc'); return q.execute(); }

  // Credit Card
  async importCCTransaction(data: { accountId: string; transactionDate: string; postDate?: string; description: string; amount: number; notes?: string }): Promise<CreditCardTransaction & CollectionMeta> {
    const t = await this.ccTransactions.insert({ ...data, postDate: data.postDate ?? '', amount: round2(data.amount), status: 'pending' as CreditCardStatus, notes: data.notes ?? '' });
    return t;
  }
  async codeCCTransaction(id: string, glAccountId: string, jobId?: string, costCode?: string, codedBy?: string): Promise<CreditCardTransaction & CollectionMeta> { const e = await this.ccTransactions.get(id); if (!e) throw new Error(`CC txn ${id} not found`); const u = await this.ccTransactions.update(id, { glAccountId, jobId: jobId ?? '', costCode: costCode ?? '', codedBy: codedBy ?? '', status: 'coded' as CreditCardStatus }); return u; }
  async approveCCTransaction(id: string, approvedBy: string): Promise<CreditCardTransaction & CollectionMeta> { const e = await this.ccTransactions.get(id); if (!e) throw new Error(`CC txn ${id} not found`); const u = await this.ccTransactions.update(id, { approvedBy, status: 'approved' as CreditCardStatus }); return u; }
  async listCCTransactions(accountId: string, filters?: { status?: CreditCardStatus }): Promise<(CreditCardTransaction & CollectionMeta)[]> { const q = this.ccTransactions.query(); q.where('accountId', '=', accountId); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('transactionDate', 'desc'); return q.execute(); }

  // Petty Cash
  async createPettyCashFund(data: { custodian: string; fundAmount: number; location?: string }): Promise<PettyCash & CollectionMeta> {
    const p = await this.pettyCashFunds.insert({ custodian: data.custodian, fundAmount: round2(data.fundAmount), currentBalance: round2(data.fundAmount), location: data.location ?? '', active: true });
    return p;
  }
  async recordPettyCashExpense(data: { pettyCashId: string; description: string; amount: number; category?: string; receipt: boolean; approvedBy?: string; notes?: string }): Promise<PettyCashTransaction & CollectionMeta> {
    const t = await this.pettyCashTxns.insert({ ...data, date: currentDate(), amount: round2(data.amount), category: data.category ?? '', approvedBy: data.approvedBy ?? '', notes: data.notes ?? '' });
    const fund = await this.pettyCashFunds.get(data.pettyCashId); if (fund) { await this.pettyCashFunds.update(data.pettyCashId, { currentBalance: round2(fund.currentBalance - data.amount) }); }
    return t;
  }
  async listPettyCashFunds(): Promise<(PettyCash & CollectionMeta)[]> { return this.pettyCashFunds.query().orderBy('custodian', 'asc').execute(); }
  async listPettyCashTransactions(pettyCashId: string): Promise<(PettyCashTransaction & CollectionMeta)[]> { const q = this.pettyCashTxns.query(); q.where('pettyCashId', '=', pettyCashId); q.orderBy('date', 'desc'); return q.execute(); }

  // Trust Accounts
  async createTrustAccount(data: { accountId: string; ownerName: string; projectId?: string; projectName?: string; requiredBalance: number; notes?: string }): Promise<TrustAccount & CollectionMeta> {
    const t = await this.trustAccounts.insert({ ...data, projectId: data.projectId ?? '', projectName: data.projectName ?? '', balance: 0, requiredBalance: round2(data.requiredBalance), compliant: false, notes: data.notes ?? '' });
    return t;
  }
  async updateTrustBalance(id: string, balance: number): Promise<TrustAccount & CollectionMeta> { const e = await this.trustAccounts.get(id); if (!e) throw new Error(`Trust ${id} not found`); const u = await this.trustAccounts.update(id, { balance: round2(balance), compliant: balance >= e.requiredBalance, lastActivityDate: currentDate() }); return u; }
  async listTrustAccounts(): Promise<(TrustAccount & CollectionMeta)[]> { return this.trustAccounts.query().orderBy('ownerName', 'asc').execute(); }
}

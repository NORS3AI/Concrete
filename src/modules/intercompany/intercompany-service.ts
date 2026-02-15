/**
 * Concrete -- Intercompany & Consolidated Accounting Service (Phase 29)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type ICTransactionType = 'billing' | 'loan' | 'allocation' | 'transfer';
export type ICStatus = 'pending' | 'posted' | 'eliminated' | 'reversed';
export type AllocationMethod = 'headcount' | 'revenue' | 'square_footage' | 'custom';
export type EliminationStatus = 'draft' | 'pending_review' | 'approved' | 'posted';
export type CurrencyCode = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'MXN' | 'AUD' | 'JPY';

export interface ICTransaction { [key: string]: unknown; transactionNumber: string; type: ICTransactionType; status: ICStatus; fromEntityId: string; fromEntityName?: string; toEntityId: string; toEntityName?: string; amount: number; currency: CurrencyCode; exchangeRate: number; baseAmount: number; description: string; date: string; glAccountId?: string; reference?: string; eliminationId?: string; }
export interface EliminationEntry { [key: string]: unknown; eliminationId: string; period: string; description: string; status: EliminationStatus; entries: string; totalDebits: number; totalCredits: number; createdBy: string; createdDate: string; approvedBy?: string; approvedDate?: string; notes?: string; }
export interface TransferPricingRule { [key: string]: unknown; name: string; fromEntityId: string; toEntityId: string; serviceType: string; method: 'cost_plus' | 'market_rate' | 'fixed_rate'; markupPct?: number; fixedRate?: number; effectiveDate: string; endDate?: string; active: boolean; }
export interface SharedServiceAllocation { [key: string]: unknown; allocationId: string; period: string; serviceName: string; totalAmount: number; method: AllocationMethod; allocations: string; createdBy: string; createdDate: string; posted: boolean; notes?: string; }
export interface ManagementFee { [key: string]: unknown; fromEntityId: string; fromEntityName?: string; toEntityId: string; toEntityName?: string; period: string; feeType: string; basisAmount: number; feePct: number; feeAmount: number; posted: boolean; postDate?: string; }
export interface ConsolidatedTrialBalance { [key: string]: unknown; period: string; accountNumber: string; accountName: string; entityId: string; entityName?: string; debitBalance: number; creditBalance: number; eliminationDebit: number; eliminationCredit: number; consolidatedDebit: number; consolidatedCredit: number; }
export interface ConsolidatedStatement { [key: string]: unknown; statementType: 'income' | 'balance_sheet' | 'cash_flow'; period: string; lineItem: string; lineOrder: number; entityAmounts: string; eliminationAmount: number; consolidatedAmount: number; minorityInterest: number; }
export interface CurrencyTranslation { [key: string]: unknown; entityId: string; entityName?: string; fromCurrency: CurrencyCode; toCurrency: CurrencyCode; rate: number; rateType: 'current' | 'average' | 'historical'; effectiveDate: string; notes?: string; }
export interface ICReconciliation { [key: string]: unknown; period: string; entity1Id: string; entity1Name?: string; entity2Id: string; entity2Name?: string; entity1Balance: number; entity2Balance: number; difference: number; reconciled: boolean; reconciledDate?: string; notes?: string; }
export interface SegmentReport { [key: string]: unknown; period: string; segmentName: string; segmentType: 'division' | 'region' | 'product_line' | 'custom'; revenue: number; expenses: number; operatingIncome: number; assets: number; liabilities: number; headcount: number; }

const round2 = (n: number): number => Math.round(n * 100) / 100;
function currentDate(): string { return new Date().toISOString().split('T')[0]; }

export class IntercompanyService {
  constructor(
    private transactions: Collection<ICTransaction>, private eliminations: Collection<EliminationEntry>,
    private transferPricing: Collection<TransferPricingRule>, private allocations: Collection<SharedServiceAllocation>,
    private managementFees: Collection<ManagementFee>, private trialBalances: Collection<ConsolidatedTrialBalance>,
    private statements: Collection<ConsolidatedStatement>, private translations: Collection<CurrencyTranslation>,
    private reconciliations: Collection<ICReconciliation>, private segments: Collection<SegmentReport>,
    private events: EventBus,
  ) {}

  // IC Transactions
  async createICTransaction(data: { transactionNumber: string; type: ICTransactionType; fromEntityId: string; fromEntityName?: string; toEntityId: string; toEntityName?: string; amount: number; currency?: CurrencyCode; exchangeRate?: number; description: string; date: string; glAccountId?: string; reference?: string }): Promise<ICTransaction & CollectionMeta> {
    const rate = data.exchangeRate ?? 1; const baseAmt = round2(data.amount * rate);
    const t = await this.transactions.insert({ ...data, status: 'pending' as ICStatus, currency: data.currency ?? 'USD', exchangeRate: rate, baseAmount: baseAmt, fromEntityName: data.fromEntityName ?? '', toEntityName: data.toEntityName ?? '', amount: round2(data.amount), glAccountId: data.glAccountId ?? '', reference: data.reference ?? '' });
    this.events.emit('ic.transaction.created', { transaction: t }); return t;
  }
  async postTransaction(id: string): Promise<ICTransaction & CollectionMeta> { const e = await this.transactions.get(id); if (!e) throw new Error(`IC txn ${id} not found`); return this.transactions.update(id, { status: 'posted' as ICStatus }); }
  async eliminateTransaction(id: string, eliminationId: string): Promise<ICTransaction & CollectionMeta> { return this.transactions.update(id, { status: 'eliminated' as ICStatus, eliminationId }); }
  async listICTransactions(filters?: { type?: ICTransactionType; status?: ICStatus; entityId?: string; search?: string }): Promise<(ICTransaction & CollectionMeta)[]> { const q = this.transactions.query(); if (filters?.type) q.where('type', '=', filters.type); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('date', 'desc'); let r = await q.execute(); if (filters?.entityId) r = r.filter(t => t.fromEntityId === filters.entityId || t.toEntityId === filters.entityId); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.transactionNumber.toLowerCase().includes(s) || x.description.toLowerCase().includes(s)); } return r; }

  // Eliminations
  async createElimination(data: { eliminationId: string; period: string; description: string; entries: string; totalDebits: number; totalCredits: number; createdBy: string; notes?: string }): Promise<EliminationEntry & CollectionMeta> {
    const e = await this.eliminations.insert({ ...data, status: 'draft' as EliminationStatus, totalDebits: round2(data.totalDebits), totalCredits: round2(data.totalCredits), createdDate: currentDate(), notes: data.notes ?? '' });
    this.events.emit('ic.elimination.created', { elimination: e }); return e;
  }
  async approveElimination(id: string, approvedBy: string): Promise<EliminationEntry & CollectionMeta> { return this.eliminations.update(id, { status: 'approved' as EliminationStatus, approvedBy, approvedDate: currentDate() }); }
  async postElimination(id: string): Promise<EliminationEntry & CollectionMeta> { return this.eliminations.update(id, { status: 'posted' as EliminationStatus }); }
  async listEliminations(filters?: { period?: string; status?: EliminationStatus }): Promise<(EliminationEntry & CollectionMeta)[]> { const q = this.eliminations.query(); if (filters?.period) q.where('period', '=', filters.period); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('createdDate', 'desc'); return q.execute(); }

  // Transfer Pricing
  async createTransferPricingRule(data: { name: string; fromEntityId: string; toEntityId: string; serviceType: string; method: TransferPricingRule['method']; markupPct?: number; fixedRate?: number; effectiveDate: string; endDate?: string }): Promise<TransferPricingRule & CollectionMeta> {
    return this.transferPricing.insert({ ...data, markupPct: data.markupPct ?? 0, fixedRate: round2(data.fixedRate ?? 0), endDate: data.endDate ?? '', active: true });
  }
  async listTransferPricingRules(): Promise<(TransferPricingRule & CollectionMeta)[]> { return this.transferPricing.query().orderBy('name', 'asc').execute(); }

  // Shared Service Allocation
  async createAllocation(data: { allocationId: string; period: string; serviceName: string; totalAmount: number; method: AllocationMethod; allocations: string; createdBy: string; notes?: string }): Promise<SharedServiceAllocation & CollectionMeta> {
    return this.allocations.insert({ ...data, totalAmount: round2(data.totalAmount), createdDate: currentDate(), posted: false, notes: data.notes ?? '' });
  }
  async postAllocation(id: string): Promise<SharedServiceAllocation & CollectionMeta> { return this.allocations.update(id, { posted: true }); }
  async listAllocations(filters?: { period?: string; posted?: boolean }): Promise<(SharedServiceAllocation & CollectionMeta)[]> { const q = this.allocations.query(); if (filters?.period) q.where('period', '=', filters.period); if (filters?.posted !== undefined) q.where('posted', '=', filters.posted); q.orderBy('createdDate', 'desc'); return q.execute(); }

  // Management Fees
  async calculateManagementFee(data: { fromEntityId: string; fromEntityName?: string; toEntityId: string; toEntityName?: string; period: string; feeType: string; basisAmount: number; feePct: number }): Promise<ManagementFee & CollectionMeta> {
    const feeAmount = round2(data.basisAmount * (data.feePct / 100));
    return this.managementFees.insert({ ...data, fromEntityName: data.fromEntityName ?? '', toEntityName: data.toEntityName ?? '', basisAmount: round2(data.basisAmount), feeAmount, posted: false });
  }
  async postManagementFee(id: string): Promise<ManagementFee & CollectionMeta> { return this.managementFees.update(id, { posted: true, postDate: currentDate() }); }
  async listManagementFees(filters?: { period?: string; posted?: boolean }): Promise<(ManagementFee & CollectionMeta)[]> { const q = this.managementFees.query(); if (filters?.period) q.where('period', '=', filters.period); if (filters?.posted !== undefined) q.where('posted', '=', filters.posted); q.orderBy('period', 'desc'); return q.execute(); }

  // Consolidated Trial Balance
  async addTrialBalanceLine(data: { period: string; accountNumber: string; accountName: string; entityId: string; entityName?: string; debitBalance: number; creditBalance: number; eliminationDebit?: number; eliminationCredit?: number }): Promise<ConsolidatedTrialBalance & CollectionMeta> {
    const elimD = round2(data.eliminationDebit ?? 0); const elimC = round2(data.eliminationCredit ?? 0);
    return this.trialBalances.insert({ ...data, entityName: data.entityName ?? '', debitBalance: round2(data.debitBalance), creditBalance: round2(data.creditBalance), eliminationDebit: elimD, eliminationCredit: elimC, consolidatedDebit: round2(data.debitBalance - elimD), consolidatedCredit: round2(data.creditBalance - elimC) });
  }
  async getTrialBalance(period: string): Promise<(ConsolidatedTrialBalance & CollectionMeta)[]> { const q = this.trialBalances.query(); q.where('period', '=', period); q.orderBy('accountNumber', 'asc'); return q.execute(); }

  // Consolidated Statements
  async addStatementLine(data: ConsolidatedStatement): Promise<ConsolidatedStatement & CollectionMeta> { return this.statements.insert(data); }
  async getStatement(statementType: string, period: string): Promise<(ConsolidatedStatement & CollectionMeta)[]> { const q = this.statements.query(); q.where('statementType', '=', statementType); q.where('period', '=', period); q.orderBy('lineOrder', 'asc'); return q.execute(); }

  // Currency Translation
  async addTranslationRate(data: { entityId: string; entityName?: string; fromCurrency: CurrencyCode; toCurrency: CurrencyCode; rate: number; rateType: CurrencyTranslation['rateType']; effectiveDate: string; notes?: string }): Promise<CurrencyTranslation & CollectionMeta> {
    return this.translations.insert({ ...data, entityName: data.entityName ?? '', notes: data.notes ?? '' });
  }
  async listTranslationRates(entityId?: string): Promise<(CurrencyTranslation & CollectionMeta)[]> { const q = this.translations.query(); if (entityId) q.where('entityId', '=', entityId); q.orderBy('effectiveDate', 'desc'); return q.execute(); }

  // IC Reconciliation
  async createReconciliation(data: { period: string; entity1Id: string; entity1Name?: string; entity2Id: string; entity2Name?: string; entity1Balance: number; entity2Balance: number; notes?: string }): Promise<ICReconciliation & CollectionMeta> {
    const diff = round2(data.entity1Balance - data.entity2Balance);
    return this.reconciliations.insert({ ...data, entity1Name: data.entity1Name ?? '', entity2Name: data.entity2Name ?? '', entity1Balance: round2(data.entity1Balance), entity2Balance: round2(data.entity2Balance), difference: diff, reconciled: diff === 0, notes: data.notes ?? '' });
  }
  async markReconciled(id: string): Promise<ICReconciliation & CollectionMeta> { return this.reconciliations.update(id, { reconciled: true, reconciledDate: currentDate() }); }
  async listReconciliations(period?: string): Promise<(ICReconciliation & CollectionMeta)[]> { const q = this.reconciliations.query(); if (period) q.where('period', '=', period); q.orderBy('period', 'desc'); return q.execute(); }

  // Segment Reporting
  async addSegmentReport(data: SegmentReport): Promise<SegmentReport & CollectionMeta> { return this.segments.insert({ ...data, revenue: round2(data.revenue), expenses: round2(data.expenses), operatingIncome: round2(data.operatingIncome), assets: round2(data.assets), liabilities: round2(data.liabilities) }); }
  async getSegmentReports(period: string): Promise<(SegmentReport & CollectionMeta)[]> { const q = this.segments.query(); q.where('period', '=', period); q.orderBy('segmentName', 'asc'); return q.execute(); }
}

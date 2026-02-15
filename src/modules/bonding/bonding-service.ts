/**
 * Concrete -- Bonding & Insurance Service (Phase 24)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type BondType = 'bid' | 'performance' | 'payment' | 'maintenance' | 'subdivision' | 'supply' | 'other';
export type BondStatus = 'active' | 'released' | 'claimed' | 'expired';
export type PolicyType = 'general_liability' | 'auto' | 'umbrella' | 'workers_comp' | 'builders_risk' | 'professional' | 'pollution' | 'cyber' | 'other';
export type PolicyStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled';
export type ClaimStatus = 'open' | 'investigating' | 'settled' | 'denied' | 'closed';
export type COIStatus = 'issued' | 'pending' | 'expired' | 'revoked';
export type WrapUpType = 'ocip' | 'ccip';

export interface SuretyCompany {
  [key: string]: unknown;
  name: string;
  agentName: string;
  agentEmail?: string;
  agentPhone?: string;
  address?: string;
  singleJobLimit: number;
  aggregateLimit: number;
  currentExposure: number;
  availableCapacity: number;
  rating?: string;
  active: boolean;
}
export interface BondRecord {
  [key: string]: unknown;
  bondNumber: string;
  type: BondType;
  status: BondStatus;
  suretyId: string;
  suretyName?: string;
  jobId: string;
  jobName?: string;
  principal: string;
  obligee: string;
  amount: number;
  premium: number;
  effectiveDate: string;
  expirationDate?: string;
  releasedDate?: string;
  notes?: string;
}
export interface InsurancePolicy {
  [key: string]: unknown;
  policyNumber: string;
  type: PolicyType;
  status: PolicyStatus;
  carrier: string;
  agentName?: string;
  effectiveDate: string;
  expirationDate: string;
  premiumAmount: number;
  coverageLimit: number;
  deductible: number;
  description?: string;
  notes?: string;
}
export interface COIRecord {
  [key: string]: unknown;
  certificateNumber: string;
  status: COIStatus;
  issuedTo: string;
  issuedDate: string;
  expirationDate: string;
  policyIds?: string;
  projectId?: string;
  projectName?: string;
  holderName: string;
  holderAddress?: string;
  notes?: string;
}
export interface SubInsurance {
  [key: string]: unknown;
  subcontractorId: string;
  subcontractorName: string;
  glPolicyNumber?: string;
  glExpiration?: string;
  wcPolicyNumber?: string;
  wcExpiration?: string;
  autoExpiration?: string;
  umbrellaExpiration?: string;
  compliant: boolean;
  lastVerifiedDate?: string;
  notes?: string;
}
export interface WrapUpProgram {
  [key: string]: unknown;
  name: string;
  type: WrapUpType;
  jobId: string;
  jobName?: string;
  carrier: string;
  startDate: string;
  endDate?: string;
  enrolledSubs: number;
  totalPremium: number;
  active: boolean;
  notes?: string;
}
export interface LossRun {
  [key: string]: unknown;
  carrier: string;
  policyType: PolicyType;
  periodStart: string;
  periodEnd: string;
  totalClaims: number;
  totalPaid: number;
  totalReserved: number;
  totalIncurred: number;
  requestedDate: string;
  receivedDate?: string;
  notes?: string;
}
export interface InsuranceClaim {
  [key: string]: unknown;
  claimNumber: string;
  policyId?: string;
  policyNumber?: string;
  status: ClaimStatus;
  type: PolicyType;
  dateOfLoss: string;
  reportedDate: string;
  description: string;
  claimant?: string;
  jobId?: string;
  jobName?: string;
  paidAmount: number;
  reserveAmount: number;
  notes?: string;
}
export interface JobInsuranceCost {
  [key: string]: unknown;
  jobId: string;
  jobName?: string;
  policyType: PolicyType;
  allocatedAmount: number;
  period: string;
  method: string;
  notes?: string;
}

export interface BondingAnalysis { suretyId: string; suretyName: string; singleLimit: number; aggregateLimit: number; activeBonds: number; totalExposure: number; availableCapacity: number; utilizationPct: number; }
export interface PolicyAlert { policyId: string; policyNumber: string; type: PolicyType; carrier: string; expirationDate: string; daysUntilExpiry: number; status: PolicyStatus; }

const round2 = (n: number): number => Math.round(n * 100) / 100;
function currentDate(): string { return new Date().toISOString().split('T')[0]; }
function daysBetween(a: string, b: string): number { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000); }

export class BondingService {
  constructor(
    private sureties: Collection<SuretyCompany>,
    private bonds: Collection<BondRecord>,
    private policies: Collection<InsurancePolicy>,
    private cois: Collection<COIRecord>,
    private subInsurance: Collection<SubInsurance>,
    private wrapUps: Collection<WrapUpProgram>,
    private lossRuns: Collection<LossRun>,
    private claims: Collection<InsuranceClaim>,
    private jobCosts: Collection<JobInsuranceCost>,
    private events: EventBus,
  ) {}

  // Surety
  async createSurety(data: { name: string; agentName: string; agentEmail?: string; agentPhone?: string; address?: string; singleJobLimit: number; aggregateLimit: number; }): Promise<SuretyCompany & CollectionMeta> {
    const s = await this.sureties.insert({ ...data, agentEmail: data.agentEmail ?? '', agentPhone: data.agentPhone ?? '', address: data.address ?? '', singleJobLimit: round2(data.singleJobLimit), aggregateLimit: round2(data.aggregateLimit), currentExposure: 0, availableCapacity: round2(data.aggregateLimit), rating: '', active: true });
    this.events.emit('bonding.surety.created', { surety: s }); return s;
  }
  async updateSurety(id: string, changes: Partial<SuretyCompany>): Promise<SuretyCompany & CollectionMeta> { const e = await this.sureties.get(id); if (!e) throw new Error(`Surety ${id} not found`); const u = await this.sureties.update(id, changes); this.events.emit('bonding.surety.updated', { surety: u }); return u; }
  async listSureties(filters?: { active?: boolean; search?: string }): Promise<(SuretyCompany & CollectionMeta)[]> { const q = this.sureties.query(); if (filters?.active !== undefined) q.where('active', '=', filters.active); q.orderBy('name', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s) || x.agentName.toLowerCase().includes(s)); } return r; }

  // Bonds
  async issueBond(data: { bondNumber: string; type: BondType; suretyId: string; suretyName?: string; jobId: string; jobName?: string; principal: string; obligee: string; amount: number; premium: number; effectiveDate: string; expirationDate?: string; notes?: string; }): Promise<BondRecord & CollectionMeta> {
    const b = await this.bonds.insert({ ...data, status: 'active' as BondStatus, suretyName: data.suretyName ?? '', jobName: data.jobName ?? '', amount: round2(data.amount), premium: round2(data.premium), expirationDate: data.expirationDate ?? '', notes: data.notes ?? '' });
    this.events.emit('bonding.bond.issued', { bond: b }); return b;
  }
  async releaseBond(id: string): Promise<BondRecord & CollectionMeta> { const e = await this.bonds.get(id); if (!e) throw new Error(`Bond ${id} not found`); const u = await this.bonds.update(id, { status: 'released' as BondStatus, releasedDate: currentDate() }); this.events.emit('bonding.bond.released', { bond: u }); return u; }
  async listBonds(filters?: { type?: BondType; status?: BondStatus; suretyId?: string; jobId?: string; search?: string }): Promise<(BondRecord & CollectionMeta)[]> { const q = this.bonds.query(); if (filters?.type) q.where('type', '=', filters.type); if (filters?.status) q.where('status', '=', filters.status); if (filters?.suretyId) q.where('suretyId', '=', filters.suretyId); if (filters?.jobId) q.where('jobId', '=', filters.jobId); q.orderBy('effectiveDate', 'desc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.bondNumber.toLowerCase().includes(s) || (x.jobName ?? '').toLowerCase().includes(s)); } return r; }
  async getBondingAnalysis(): Promise<BondingAnalysis[]> { const all = await this.sureties.query().execute(); const bonds = await this.bonds.query().execute(); return all.filter(s => s.active).map(s => { const sid = (s as any).id; const active = bonds.filter(b => b.suretyId === sid && b.status === 'active'); const exposure = active.reduce((sum, b) => sum + b.amount, 0); return { suretyId: sid, suretyName: s.name, singleLimit: s.singleJobLimit, aggregateLimit: s.aggregateLimit, activeBonds: active.length, totalExposure: round2(exposure), availableCapacity: round2(s.aggregateLimit - exposure), utilizationPct: s.aggregateLimit > 0 ? round2((exposure / s.aggregateLimit) * 100) : 0 }; }); }

  // Policies
  async createPolicy(data: { policyNumber: string; type: PolicyType; carrier: string; agentName?: string; effectiveDate: string; expirationDate: string; premiumAmount: number; coverageLimit: number; deductible: number; description?: string; notes?: string; }): Promise<InsurancePolicy & CollectionMeta> {
    const p = await this.policies.insert({ ...data, status: 'active' as PolicyStatus, agentName: data.agentName ?? '', premiumAmount: round2(data.premiumAmount), coverageLimit: round2(data.coverageLimit), deductible: round2(data.deductible), description: data.description ?? '', notes: data.notes ?? '' });
    this.events.emit('bonding.policy.created', { policy: p }); return p;
  }
  async updatePolicy(id: string, changes: Partial<InsurancePolicy>): Promise<InsurancePolicy & CollectionMeta> { const e = await this.policies.get(id); if (!e) throw new Error(`Policy ${id} not found`); const u = await this.policies.update(id, changes); this.events.emit('bonding.policy.updated', { policy: u }); return u; }
  async listPolicies(filters?: { type?: PolicyType; status?: PolicyStatus; search?: string }): Promise<(InsurancePolicy & CollectionMeta)[]> { const q = this.policies.query(); if (filters?.type) q.where('type', '=', filters.type); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('expirationDate', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.policyNumber.toLowerCase().includes(s) || x.carrier.toLowerCase().includes(s)); } return r; }
  async getPolicyAlerts(daysAhead: number = 90): Promise<PolicyAlert[]> { const all = await this.policies.query().execute(); const today = currentDate(); return all.filter(p => p.status !== 'cancelled').map(p => { const days = daysBetween(today, p.expirationDate); let st: PolicyStatus = p.status; if (days < 0) st = 'expired'; else if (days <= daysAhead) st = 'expiring_soon'; return { policyId: (p as any).id, policyNumber: p.policyNumber, type: p.type, carrier: p.carrier, expirationDate: p.expirationDate, daysUntilExpiry: days, status: st }; }).filter(a => a.daysUntilExpiry <= daysAhead).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry); }

  // COI
  async issueCOI(data: { certificateNumber: string; issuedTo: string; expirationDate: string; policyIds?: string; projectId?: string; projectName?: string; holderName: string; holderAddress?: string; notes?: string; }): Promise<COIRecord & CollectionMeta> {
    const c = await this.cois.insert({ ...data, status: 'issued' as COIStatus, issuedDate: currentDate(), policyIds: data.policyIds ?? '', projectId: data.projectId ?? '', projectName: data.projectName ?? '', holderAddress: data.holderAddress ?? '', notes: data.notes ?? '' });
    this.events.emit('bonding.coi.issued', { coi: c }); return c;
  }
  async revokeCOI(id: string): Promise<COIRecord & CollectionMeta> { const e = await this.cois.get(id); if (!e) throw new Error(`COI ${id} not found`); const u = await this.cois.update(id, { status: 'revoked' as COIStatus }); this.events.emit('bonding.coi.revoked', { coi: u }); return u; }
  async listCOIs(filters?: { status?: COIStatus; search?: string }): Promise<(COIRecord & CollectionMeta)[]> { const q = this.cois.query(); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('issuedDate', 'desc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.certificateNumber.toLowerCase().includes(s) || x.issuedTo.toLowerCase().includes(s) || x.holderName.toLowerCase().includes(s)); } return r; }

  // Sub Insurance Compliance
  async addSubInsurance(data: { subcontractorId: string; subcontractorName: string; glPolicyNumber?: string; glExpiration?: string; wcPolicyNumber?: string; wcExpiration?: string; autoExpiration?: string; umbrellaExpiration?: string; notes?: string; }): Promise<SubInsurance & CollectionMeta> {
    const today = currentDate(); const compliant = (!data.glExpiration || data.glExpiration >= today) && (!data.wcExpiration || data.wcExpiration >= today);
    const s = await this.subInsurance.insert({ ...data, glPolicyNumber: data.glPolicyNumber ?? '', glExpiration: data.glExpiration ?? '', wcPolicyNumber: data.wcPolicyNumber ?? '', wcExpiration: data.wcExpiration ?? '', autoExpiration: data.autoExpiration ?? '', umbrellaExpiration: data.umbrellaExpiration ?? '', compliant, lastVerifiedDate: currentDate(), notes: data.notes ?? '' });
    this.events.emit('bonding.subInsurance.added', { record: s }); return s;
  }
  async updateSubInsurance(id: string, changes: Partial<SubInsurance>): Promise<SubInsurance & CollectionMeta> { const e = await this.subInsurance.get(id); if (!e) throw new Error(`Sub insurance ${id} not found`); const u = await this.subInsurance.update(id, changes); return u; }
  async listSubInsurance(filters?: { compliant?: boolean; search?: string }): Promise<(SubInsurance & CollectionMeta)[]> { const q = this.subInsurance.query(); if (filters?.compliant !== undefined) q.where('compliant', '=', filters.compliant); q.orderBy('subcontractorName', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.subcontractorName.toLowerCase().includes(s)); } return r; }

  // Wrap-Up Programs
  async createWrapUp(data: { name: string; type: WrapUpType; jobId: string; jobName?: string; carrier: string; startDate: string; endDate?: string; totalPremium?: number; notes?: string; }): Promise<WrapUpProgram & CollectionMeta> {
    const w = await this.wrapUps.insert({ ...data, jobName: data.jobName ?? '', endDate: data.endDate ?? '', enrolledSubs: 0, totalPremium: round2(data.totalPremium ?? 0), active: true, notes: data.notes ?? '' });
    this.events.emit('bonding.wrapUp.created', { program: w }); return w;
  }
  async updateWrapUp(id: string, changes: Partial<WrapUpProgram>): Promise<WrapUpProgram & CollectionMeta> { const e = await this.wrapUps.get(id); if (!e) throw new Error(`Wrap-up ${id} not found`); const u = await this.wrapUps.update(id, changes); return u; }
  async listWrapUps(filters?: { active?: boolean; search?: string }): Promise<(WrapUpProgram & CollectionMeta)[]> { const q = this.wrapUps.query(); if (filters?.active !== undefined) q.where('active', '=', filters.active); q.orderBy('name', 'asc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s)); } return r; }

  // Loss Runs
  async addLossRun(data: { carrier: string; policyType: PolicyType; periodStart: string; periodEnd: string; totalClaims: number; totalPaid: number; totalReserved: number; notes?: string; }): Promise<LossRun & CollectionMeta> {
    const l = await this.lossRuns.insert({ ...data, totalIncurred: round2(data.totalPaid + data.totalReserved), totalPaid: round2(data.totalPaid), totalReserved: round2(data.totalReserved), requestedDate: currentDate(), notes: data.notes ?? '' });
    this.events.emit('bonding.lossRun.added', { lossRun: l }); return l;
  }
  async listLossRuns(): Promise<(LossRun & CollectionMeta)[]> { return this.lossRuns.query().orderBy('periodEnd', 'desc').execute(); }

  // Claims
  async fileClaim(data: { claimNumber: string; policyId?: string; policyNumber?: string; type: PolicyType; dateOfLoss: string; description: string; claimant?: string; jobId?: string; jobName?: string; reserveAmount?: number; notes?: string; }): Promise<InsuranceClaim & CollectionMeta> {
    const c = await this.claims.insert({ ...data, status: 'open' as ClaimStatus, reportedDate: currentDate(), policyId: data.policyId ?? '', policyNumber: data.policyNumber ?? '', claimant: data.claimant ?? '', jobId: data.jobId ?? '', jobName: data.jobName ?? '', paidAmount: 0, reserveAmount: round2(data.reserveAmount ?? 0), notes: data.notes ?? '' });
    this.events.emit('bonding.claim.filed', { claim: c }); return c;
  }
  async updateClaim(id: string, changes: Partial<InsuranceClaim>): Promise<InsuranceClaim & CollectionMeta> { const e = await this.claims.get(id); if (!e) throw new Error(`Claim ${id} not found`); const u = await this.claims.update(id, changes); this.events.emit('bonding.claim.updated', { claim: u }); return u; }
  async closeClaim(id: string): Promise<InsuranceClaim & CollectionMeta> { const e = await this.claims.get(id); if (!e) throw new Error(`Claim ${id} not found`); const u = await this.claims.update(id, { status: 'closed' as ClaimStatus }); this.events.emit('bonding.claim.closed', { claim: u }); return u; }
  async listClaims(filters?: { status?: ClaimStatus; type?: PolicyType; search?: string }): Promise<(InsuranceClaim & CollectionMeta)[]> { const q = this.claims.query(); if (filters?.status) q.where('status', '=', filters.status); if (filters?.type) q.where('type', '=', filters.type); q.orderBy('dateOfLoss', 'desc'); let r = await q.execute(); if (filters?.search) { const s = filters.search.toLowerCase(); r = r.filter(x => x.claimNumber.toLowerCase().includes(s) || x.description.toLowerCase().includes(s)); } return r; }

  // Job Insurance Cost Allocation
  async allocateCost(data: { jobId: string; jobName?: string; policyType: PolicyType; allocatedAmount: number; period: string; method: string; notes?: string; }): Promise<JobInsuranceCost & CollectionMeta> {
    const c = await this.jobCosts.insert({ ...data, jobName: data.jobName ?? '', allocatedAmount: round2(data.allocatedAmount), notes: data.notes ?? '' });
    this.events.emit('bonding.cost.allocated', { cost: c }); return c;
  }
  async listJobCosts(jobId?: string): Promise<(JobInsuranceCost & CollectionMeta)[]> { const q = this.jobCosts.query(); if (jobId) q.where('jobId', '=', jobId); q.orderBy('period', 'desc'); return q.execute(); }
}

import { TaxComplianceService } from './tax-compliance-service';
import type { FederalFiling, StateFiling, MultiStateWithholding, ReciprocityAgreement, Form1099, SalesTaxRecord, ContractorLicense, OCIPCCIPRecord, EEOAAReport, PrevailingWageReport, CertifiedPayroll, TaxAuditEntry, TaxRateRecord, YearEndProcess } from './tax-compliance-service';
let _service: TaxComplianceService | null = null;
export function getTaxComplianceService(): TaxComplianceService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('TaxCompliance: app not initialized');
  const s = app.store; const e = app.events;
  _service = new TaxComplianceService(s.collection<FederalFiling>('tax/federalFiling'), s.collection<StateFiling>('tax/stateFiling'), s.collection<MultiStateWithholding>('tax/multiState'), s.collection<ReciprocityAgreement>('tax/reciprocity'), s.collection<Form1099>('tax/form1099'), s.collection<SalesTaxRecord>('tax/salesTax'), s.collection<ContractorLicense>('tax/license'), s.collection<OCIPCCIPRecord>('tax/ocipCcip'), s.collection<EEOAAReport>('tax/eeoaa'), s.collection<PrevailingWageReport>('tax/prevailingWage'), s.collection<CertifiedPayroll>('tax/certifiedPayroll'), s.collection<TaxAuditEntry>('tax/audit'), s.collection<TaxRateRecord>('tax/rate'), s.collection<YearEndProcess>('tax/yearEnd'), e);
  return _service;
}

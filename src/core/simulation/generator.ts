/**
 * Simulation Mode — Comprehensive Data Generator
 *
 * Populates every module in Concrete with realistic construction-industry
 * demo data so users can explore the full platform.
 * All records are tagged with _simSource: 'simulation' for cleanup.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _ridSeq = 0;
function rid(): string { return `sim-${(++_ridSeq).toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randAmt(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function isoDate(daysAgo: number): string { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split('T')[0]; }
function isoTS(daysAgo: number): string { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString(); }
function today(): string { return new Date().toISOString().split('T')[0]; }
function ts(): string { return new Date().toISOString(); }
function qtr(): number { return Math.ceil((new Date().getMonth() + 1) / 3); }
function yr(): number { return new Date().getFullYear(); }
function empName(): string { return `${pick(EMPLOYEE_FIRST)} ${pick(EMPLOYEE_LAST)}`; }

const STATES = ['CA','TX','NY','FL','IL','PA','OH','GA','NC','MI','NJ','VA','WA','AZ','MA','TN','IN','MO','MD','WI','CO','MN','SC','AL','LA','KY','OR','OK','CT','UT','IA','NV','AR','MS','KS','NM','NE','ID','WV','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WY','DC'];

const ENTITY_NAMES = ['Concrete General Contractors','Metro Mechanical','Summit Electrical','Ironworks Equipment','Concrete Service Division'];
const JOB_NAMES = ['City Hall Renovation','Highway 101 Bridge','Oakwood Medical Center','Riverside Apartments Ph2','Municipal Water Treatment','Tech Campus Building C','Airport Terminal Extension','Downtown Parking Structure','School District Modernization','Industrial Park Phase 3'];
const VENDOR_NAMES = ['ABC Supply Co','Builders FirstSource','HD Supply','Ferguson Enterprises','Graybar Electric','Core & Main','Kiewit Materials','Vulcan Materials','Martin Marietta','US Concrete','Pacific Pipe','Western Allied','National Trench Safety','United Rentals','Sunbelt Rentals'];
const CUSTOMER_NAMES = ['City of Springfield','Metro Transit Authority','Riverside Health System','Oakwood School District','TechCorp Industries','Greenfield Development','Pacific Gateway Holdings','Mountain View Properties','Harbor Construction Group','Allied Building Corp'];
const EMPLOYEE_FIRST = ['James','Maria','Robert','Lisa','Michael','Jennifer','David','Sarah','Carlos','Emily','William','Ana','Daniel','Patricia','Thomas','Michelle','Brian','Laura','Kevin','Angela'];
const EMPLOYEE_LAST = ['Johnson','Martinez','Williams','Anderson','Garcia','Miller','Davis','Rodriguez','Wilson','Taylor','Moore','Jackson','Lee','Harris','Clark','Lewis','Walker','Hall','Allen','Young'];
const TRADES = ['General','Electrical','Mechanical','Plumbing','HVAC','Concrete','Steel','Roofing','Fire Protection','Excavation','Paving','Landscaping'];
const EQUIP_NAMES = ['CAT 320 Excavator','CAT D6 Dozer','Liebherr LTM 1100','John Deere 310L','Komatsu PC200','Volvo A30G','Case 580N','Bomag BW211','Manitowoc 999','Link-Belt 298','Deere 644K Loader','CAT 740 Truck','Grove GMK5250L','Hitachi ZX350','Kobelco SK500'];
const EQUIP_TYPES = ['excavator','dozer','crane','loader','hauler','compactor','generator','pump'];

// ---------------------------------------------------------------------------
// All collection names populated by the simulation (used for cleanup)
// ---------------------------------------------------------------------------

const ALL_COLLECTIONS: string[] = [
  // Core
  'entity/entity', 'job/job', 'ap/vendor', 'ar/customer', 'payroll/employee', 'equip/equipment',
  // GL, AP, AR
  'gl/journalEntry', 'ap/invoice', 'ar/invoice',
  // Payroll
  'payroll/payRun', 'payroll/taxFiling',
  // Sub, PO, Safety, CO, Workflow, Integration
  'sub/subcontract', 'po/purchaseOrder', 'safety/incident', 'co/changeOrder', 'wf/request', 'integ/integration',
  // Tax Compliance
  'tax/federalFiling', 'tax/stateFiling', 'tax/multiState', 'tax/reciprocity', 'tax/form1099',
  'tax/salesTax', 'tax/license', 'tax/ocipCcip', 'tax/eeoaa', 'tax/prevailingWage',
  'tax/certifiedPayroll', 'tax/audit', 'tax/rate', 'tax/yearEnd',
  // Banking
  'bank/account', 'bank/statementLine', 'bank/reconciliation', 'bank/cashFlow',
  'bank/positivePay', 'bank/achBatch', 'bank/check', 'bank/ccTransaction',
  'bank/pettyCash', 'bank/pettyCashTxn', 'bank/trustAccount',
  // Bonding
  'bond/surety', 'bond/bond', 'bond/policy', 'bond/coi', 'bond/subInsurance',
  'bond/wrapUp', 'bond/lossRun', 'bond/claim', 'bond/jobCost',
  // Project
  'project/project', 'project/milestone', 'project/task', 'project/taskDependency',
  'project/dailyLog', 'project/rfi', 'project/submittal', 'project/meetingMinutes',
  'project/weatherDelay', 'project/resourceAllocation',
  // HR
  'hr/employee', 'hr/position', 'hr/certification', 'hr/trainingRecord',
  'hr/benefitPlan', 'hr/benefitEnrollment', 'hr/leaveRequest', 'hr/leaveBalance',
  'hr/applicant', 'hr/employeeDocument',
  // Intercompany
  'ic/transaction', 'ic/elimination', 'ic/transferPricing', 'ic/allocation',
  'ic/managementFee', 'ic/trialBalance', 'ic/statement', 'ic/translation',
  'ic/reconciliation', 'ic/segment',
  // Union
  'union/union', 'union/rateTable', 'union/rateTableLine', 'union/fringeBenefit',
  'union/prevailingWage', 'union/certifiedPayroll', 'union/apprentice', 'union/remittance',
  // Service Management
  'service/serviceAgreement', 'service/workOrder', 'service/workOrderLine',
  'service/serviceCall', 'service/customerEquipment', 'service/preventiveMaintenance',
  'service/technicianTimeEntry',
  // Inventory
  'inv/item', 'inv/warehouse', 'inv/transaction', 'inv/requisition', 'inv/count',
  // Document Management
  'doc/document', 'doc/revision', 'doc/template', 'doc/transmittal', 'doc/photo',
  // Estimating
  'job/estimate', 'job/estimateLine', 'job/bid',
  // Analytics
  'analytics/widget', 'analytics/kpi', 'analytics/jobFade', 'analytics/cashFlowModel',
  'analytics/revenueForecast', 'analytics/laborProductivity', 'analytics/equipmentROI',
  'analytics/vendorScore', 'analytics/retention', 'analytics/scenario',
  'analytics/benchmark', 'analytics/dashboard', 'analytics/scheduledReport', 'analytics/dataExport',
  // Mobile
  'mobile/timeEntry', 'mobile/dailyLog', 'mobile/inspection', 'mobile/receipt',
  'mobile/equipmentLog', 'mobile/crewEntry', 'mobile/fieldWO',
  'mobile/notification', 'mobile/qrScan', 'mobile/signature',
  // Import/Export
  'integration/importBatch', 'integration/exportJob', 'integration/fieldMapping',
];

// ---------------------------------------------------------------------------
// Bulk inserter — tags every record with _simSource for cleanup
// ---------------------------------------------------------------------------

async function bulkInsert(store: any, collectionName: string, records: Record<string, unknown>[]): Promise<void> {
  const tagged = records.map(r => ({ ...r, _simSource: 'simulation' }));
  const col = store.collection(collectionName);
  if (col.bulkInsert) {
    await col.bulkInsert(tagged);
  } else {
    for (const rec of tagged) {
      await col.insert(rec);
    }
  }
}

// ---------------------------------------------------------------------------
// Main Generator
// ---------------------------------------------------------------------------

export async function runSimulation(app: any): Promise<{ totalRecords: number; modules: Record<string, number> }> {
  _ridSeq = 0;
  const store = app.store;
  const counts: Record<string, number> = {};

  // =========================================================================
  // CORE DATA — Entities, Jobs, Vendors, Customers, Employees, Equipment
  // =========================================================================

  const entities = ENTITY_NAMES.map((name, i) => ({
    id: `ent-${i + 1}`, name, code: `ENT-${String(i + 1).padStart(3, '0')}`,
    type: i === 0 ? 'holding' : i < 3 ? 'subsidiary' : 'division',
    parentId: i === 0 ? null : 'ent-1', status: 'active',
    currency: 'USD', fiscalYearEndMonth: 12, fiscalYearEndDay: 31,
    depth: i === 0 ? 0 : 1, path: i === 0 ? '/ent-1' : `/ent-1/ent-${i + 1}`,
  }));
  await bulkInsert(store, 'entity/entity', entities);
  counts['Entities'] = entities.length;

  const jobs = JOB_NAMES.map((name, i) => ({
    id: `job-${i + 1}`, number: `${yr()}-${String(i + 1).padStart(3, '0')}`, name,
    entityId: pick(entities).id, status: pick(['active','active','active','bidding','complete']),
    type: pick(['lump_sum','time_material','cost_plus','unit_price']),
    contractAmount: randAmt(500000, 25000000), startDate: isoDate(randInt(30, 365)),
  }));
  await bulkInsert(store, 'job/job', jobs);
  counts['Jobs'] = jobs.length;

  const vendors = VENDOR_NAMES.map((name, i) => ({
    id: `vendor-${i + 1}`, name, vendorType: pick(TRADES), status: 'active',
    is1099: i < 5, defaultTerms: pick(['Net 30','Net 45','Net 60','2/10 Net 30']),
    insuranceRequired: true, bondRequired: i < 3,
    ytdPayments: randAmt(50000, 800000), ytd1099Amount: i < 5 ? randAmt(20000, 400000) : 0,
  }));
  await bulkInsert(store, 'ap/vendor', vendors);
  counts['Vendors'] = vendors.length;

  const customers = CUSTOMER_NAMES.map((name, i) => ({
    id: `cust-${i + 1}`, name, entityId: pick(entities).id, status: 'active',
    creditLimit: randAmt(100000, 5000000), terms: pick(['Net 30','Net 45','Net 60']),
    ytdBillings: randAmt(100000, 2000000), ytdPayments: randAmt(80000, 1800000),
  }));
  await bulkInsert(store, 'ar/customer', customers);
  counts['Customers'] = customers.length;

  const employees: any[] = [];
  for (let i = 0; i < 40; i++) {
    employees.push({
      id: `emp-${i + 1}`, firstName: pick(EMPLOYEE_FIRST), lastName: pick(EMPLOYEE_LAST),
      ssn: `***-**-${String(1000 + i).slice(1)}`,
      entityId: pick(entities).id, trade: pick(TRADES),
      payType: pick(['salary','hourly','hourly','hourly']), payRate: randAmt(28, 85),
      payFrequency: pick(['weekly','biweekly','semimonthly']),
      status: 'active', hireDate: isoDate(randInt(60, 1800)),
    });
  }
  await bulkInsert(store, 'payroll/employee', employees);
  counts['Employees'] = employees.length;

  const equipment = EQUIP_NAMES.map((name, i) => ({
    id: `equip-${i + 1}`, equipmentNumber: `EQ-${String(i + 1).padStart(4, '0')}`,
    description: name, category: pick(EQUIP_TYPES), entityId: pick(entities).id,
    status: pick(['active','active','active','active','inactive']),
    hourlyRate: randAmt(75, 350), purchasePrice: randAmt(80000, 1500000),
  }));
  await bulkInsert(store, 'equip/equipment', equipment);
  counts['Equipment'] = equipment.length;

  // =========================================================================
  // GL — Journal Entries
  // =========================================================================

  const txns: any[] = [];
  for (let m = 0; m < 12; m++) {
    for (let i = 0; i < 80; i++) {
      const type = pick(['revenue','revenue','expense','expense','expense','asset','liability']);
      txns.push({
        id: rid(), entityId: pick(entities).id, jobId: Math.random() > 0.3 ? pick(jobs).id : undefined,
        date: isoTS(m * 30 + randInt(0, 29)), type,
        category: type === 'revenue' ? pick(['Contract Revenue','Change Order','T&M Billing','Service Revenue']) : pick(['Labor','Materials','Subcontractor','Equipment','Overhead','Insurance']),
        amount: type === 'revenue' ? randAmt(5000, 500000) : -randAmt(1000, 200000),
        description: `${type} - ${pick(JOB_NAMES)}`,
      });
    }
  }
  await bulkInsert(store, 'gl/journalEntry', txns);
  counts['GL Transactions'] = txns.length;

  // =========================================================================
  // AP — Invoices
  // =========================================================================

  const apInvoices: any[] = [];
  for (let i = 0; i < 30; i++) {
    const v = pick(vendors);
    const apAmt = randAmt(2000, 150000);
    const apTax = Math.round(apAmt * 0.08 * 100) / 100;
    const apRetention = Math.round(apAmt * 0.1 * 100) / 100;
    const apNet = Math.round((apAmt + apTax - apRetention) * 100) / 100;
    const apStatus = pick(['pending','approved','paid','paid','paid']);
    const apPaid = apStatus === 'paid' ? apNet : 0;
    apInvoices.push({
      id: rid(), vendorId: v.id, vendorName: v.name,
      invoiceNumber: `INV-${yr()}-${String(i + 1).padStart(4, '0')}`,
      jobId: pick(jobs).id, amount: apAmt, taxAmount: apTax,
      retentionAmount: apRetention, netAmount: apNet,
      paidAmount: apPaid, balanceDue: Math.round((apNet - apPaid) * 100) / 100,
      duplicateFlag: false,
      status: apStatus,
      invoiceDate: isoDate(randInt(5, 90)), dueDate: isoDate(randInt(0, 30)),
      description: `${v.name} - ${pick(['Materials','Labor','Equipment rental','Subcontract work'])}`,
    });
  }
  await bulkInsert(store, 'ap/invoice', apInvoices);
  counts['AP Invoices'] = apInvoices.length;

  // =========================================================================
  // AR — Invoices
  // =========================================================================

  const arInvoices: any[] = [];
  for (let i = 0; i < 20; i++) {
    const c = pick(customers);
    const arAmt = randAmt(10000, 500000);
    const arTax = Math.round(arAmt * 0.08 * 100) / 100;
    const arRetainage = Math.round(arAmt * 0.1 * 100) / 100;
    const arNet = Math.round((arAmt + arTax - arRetainage) * 100) / 100;
    const arStatus = pick(['sent','paid','paid','overdue']);
    const arPaid = arStatus === 'paid' ? arNet : 0;
    arInvoices.push({
      id: rid(), customerId: c.id, customerName: c.name,
      invoiceNumber: `AR-${yr()}-${String(i + 1).padStart(4, '0')}`,
      jobId: pick(jobs).id, amount: arAmt, taxAmount: arTax,
      retainageAmount: arRetainage, netAmount: arNet,
      paidAmount: arPaid, balanceDue: Math.round((arNet - arPaid) * 100) / 100,
      status: arStatus,
      invoiceDate: isoDate(randInt(5, 90)), dueDate: isoDate(randInt(0, 30)),
      description: `Progress billing - ${pick(JOB_NAMES)}`,
    });
  }
  await bulkInsert(store, 'ar/invoice', arInvoices);
  counts['AR Invoices'] = arInvoices.length;

  // =========================================================================
  // PAYROLL — Pay Runs, Tax Filings
  // =========================================================================

  const payRuns: any[] = [];
  for (let i = 0; i < 6; i++) {
    payRuns.push({
      id: `pr-${i + 1}`, payDate: isoDate(i * 14),
      periodStart: isoDate(i * 14 + 14), periodEnd: isoDate(i * 14),
      status: i < 5 ? 'completed' : 'processing',
      totalGross: randAmt(80000, 250000), totalNet: randAmt(55000, 180000),
      totalTaxes: randAmt(15000, 50000), totalDeductions: randAmt(5000, 20000),
      employeeCount: employees.length,
    });
  }
  await bulkInsert(store, 'payroll/payRun', payRuns);
  counts['Pay Runs'] = payRuns.length;

  const taxFilings: any[] = [];
  for (const type of ['941','941','940','w2'] as const) {
    taxFilings.push({
      id: rid(), type, period: `Q${qtr()} ${yr()}`, year: yr(), quarter: qtr(),
      status: pick(['draft','filed']), totalWages: randAmt(200000, 800000),
      totalTax: randAmt(30000, 120000), dueDate: isoDate(randInt(0, 30)),
    });
  }
  await bulkInsert(store, 'payroll/taxFiling', taxFilings);
  counts['Payroll Tax Filings'] = taxFilings.length;

  // =========================================================================
  // SUBCONTRACTORS
  // =========================================================================

  const subs: any[] = [];
  for (let i = 0; i < 12; i++) {
    subs.push({
      id: `sub-${i + 1}`, name: `${pick(TRADES)} Contractors Inc.`, trade: pick(TRADES),
      status: 'active', licenseNumber: `LIC-${randInt(100000, 999999)}`,
      insuranceExpiry: isoDate(-randInt(30, 365)), bondCapacity: randAmt(500000, 10000000),
    });
  }
  await bulkInsert(store, 'sub/subcontract', subs);
  counts['Subcontractors'] = subs.length;

  // =========================================================================
  // PURCHASE ORDERS
  // =========================================================================

  const pos: any[] = [];
  for (let i = 0; i < 15; i++) {
    const v = pick(vendors);
    pos.push({
      id: `po-${i + 1}`, poNumber: `PO-${yr()}-${String(i + 1).padStart(4, '0')}`,
      vendorId: v.id, vendorName: v.name, jobId: pick(jobs).id,
      amount: randAmt(5000, 250000), status: pick(['open','approved','received','closed']),
      orderDate: isoDate(randInt(5, 60)), deliveryDate: isoDate(randInt(0, 30)),
      description: `${pick(['Materials','Equipment','Supplies'])} for ${pick(JOB_NAMES)}`,
    });
  }
  await bulkInsert(store, 'po/purchaseOrder', pos);
  counts['Purchase Orders'] = pos.length;

  // =========================================================================
  // SAFETY
  // =========================================================================

  const incidents: any[] = [];
  for (let i = 0; i < 8; i++) {
    incidents.push({
      id: rid(), incidentNumber: `INC-${yr()}-${String(i + 1).padStart(3, '0')}`,
      jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      date: isoDate(randInt(5, 180)), type: pick(['injury','near_miss','property_damage','illness']),
      severity: pick(['low','medium','high']), description: `Safety incident at ${pick(JOB_NAMES)}`,
      employeeId: pick(employees).id, status: pick(['reported','investigating','closed']),
    });
  }
  await bulkInsert(store, 'safety/incident', incidents);
  counts['Safety Incidents'] = incidents.length;

  // =========================================================================
  // CHANGE ORDERS
  // =========================================================================

  const cos: any[] = [];
  for (let i = 0; i < 10; i++) {
    const job = pick(jobs);
    const coAmt = randAmt(5000, 500000);
    cos.push({
      id: rid(), number: `CO-${String(i + 1).padStart(3, '0')}`,
      jobId: job.id, jobName: job.name, title: `Change order for ${job.name}`,
      type: pick(['owner_directed','field_directive','value_engineering','scope_change']),
      amount: coAmt, approvedAmount: coAmt * (Math.random() > 0.3 ? 1 : 0),
      scheduleExtensionDays: randInt(0, 30),
      status: pick(['pending_approval','approved','rejected','executed']),
      requestDate: isoDate(randInt(10, 90)),
    });
  }
  await bulkInsert(store, 'co/changeOrder', cos);
  counts['Change Orders'] = cos.length;

  // =========================================================================
  // WORKFLOW — Requests
  // =========================================================================

  const wfRequests: any[] = [];
  for (let i = 0; i < 8; i++) {
    wfRequests.push({
      id: rid(), requestId: `WF-${String(i + 1).padStart(4, '0')}`, templateId: 'tpl-approval',
      title: `${pick(['AP Invoice','PO','Change Order','Budget Transfer'])} Approval`,
      status: pick(['pending','approved','rejected']),
      requestedBy: empName(), requestedDate: isoDate(randInt(1, 30)),
      priority: pick(['low','medium','high']),
    });
  }
  await bulkInsert(store, 'wf/request', wfRequests);
  counts['Workflow Requests'] = wfRequests.length;

  // =========================================================================
  // INTEGRATION HUB
  // =========================================================================

  const integrations: any[] = [
    { id: rid(), integrationId: 'integ-1', provider: 'procore', name: 'Procore Sync', status: 'active', direction: 'bidirectional', apiUrl: '', apiKey: '', clientId: '', clientSecret: '', refreshToken: '', settings: '{}', syncInterval: 3600, lastSyncAt: isoTS(0), errorMessage: '', createdDate: today() },
    { id: rid(), integrationId: 'integ-2', provider: 'quickbooks', name: 'QuickBooks Online', status: 'active', direction: 'outbound', apiUrl: '', apiKey: '', clientId: '', clientSecret: '', refreshToken: '', settings: '{}', syncInterval: 1800, lastSyncAt: isoTS(1), errorMessage: '', createdDate: today() },
    { id: rid(), integrationId: 'integ-3', provider: 'adp', name: 'ADP Payroll', status: 'error', direction: 'inbound', apiUrl: '', apiKey: '', clientId: '', clientSecret: '', refreshToken: '', settings: '{}', syncInterval: 86400, errorMessage: 'Authentication token expired. Please re-authorize.', createdDate: today() },
  ];
  await bulkInsert(store, 'integ/integration', integrations);
  counts['Integrations'] = integrations.length;

  // =========================================================================
  // TAX & REGULATORY COMPLIANCE (Phase 32)
  // =========================================================================

  const federalFilings: any[] = [];
  for (const formType of ['941','941','941','941','940','w2','w3'] as const) {
    const q = formType === '941' ? federalFilings.length + 1 : 0;
    federalFilings.push({
      id: rid(), filingId: rid(), formType, year: yr(), quarter: q > 4 ? 0 : q,
      period: formType === '941' ? `Q${Math.min(q, 4)} ${yr()}` : `Annual ${yr()}`,
      status: q <= qtr() ? 'filed' : 'draft', ein: '12-3456789',
      totalWages: randAmt(200000, 800000), totalFederalTax: randAmt(30000, 120000),
      totalFicaSS: randAmt(12000, 50000), totalFicaMed: randAmt(3000, 12000),
      totalFUTA: randAmt(500, 4000), employeeCount: employees.length,
      dueDate: isoDate(q <= qtr() ? randInt(30, 120) : -randInt(10, 60)),
      filedDate: q <= qtr() ? isoDate(randInt(30, 120)) : '',
      confirmationNumber: q <= qtr() ? `CONF-${randInt(100000, 999999)}` : '',
      preparedBy: 'admin', reviewedBy: q <= qtr() ? 'controller' : '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/federalFiling', federalFilings);
  counts['Federal Tax Filings'] = federalFilings.length;

  const stateFilings: any[] = [];
  for (const state of ['CA','TX','NY','FL','IL']) {
    for (let q = 1; q <= qtr(); q++) {
      stateFilings.push({
        id: rid(), filingId: rid(), state, formName: state === 'CA' ? 'DE 9' : `${state}-SUI`,
        year: yr(), quarter: q, period: `Q${q} ${yr()}`, status: q < qtr() ? 'filed' : 'draft',
        stateEIN: `${state}-${randInt(100000, 999999)}`,
        totalWages: randAmt(50000, 200000), totalStateTax: randAmt(2000, 15000),
        totalSUTA: randAmt(500, 5000), employeeCount: randInt(5, 15),
        dueDate: isoDate(q < qtr() ? randInt(30, 120) : -randInt(10, 60)),
        filedDate: q < qtr() ? isoDate(randInt(30, 120)) : '',
        confirmationNumber: q < qtr() ? `ST-${randInt(100000, 999999)}` : '',
        preparedBy: 'admin', notes: '',
      });
    }
  }
  await bulkInsert(store, 'tax/stateFiling', stateFilings);
  counts['State Tax Filings'] = stateFilings.length;

  const multiState: any[] = [];
  for (let i = 0; i < 12; i++) {
    const emp = pick(employees);
    const home = pick(STATES.slice(0, 10));
    let work = pick(STATES.slice(0, 10));
    while (work === home) work = pick(STATES.slice(0, 10));
    multiState.push({
      id: rid(), recordId: rid(), employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`,
      residentState: home, workState: work, year: yr(), quarter: pick([1, 2, 3, 4]),
      wagesEarned: randAmt(8000, 30000), residentWithholding: randAmt(300, 1500),
      workStateWithholding: randAmt(200, 1200), creditApplied: randAmt(100, 800),
      reciprocityApplies: Math.random() > 0.6, reciprocityAgreementId: '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/multiState', multiState);
  counts['Multi-State Records'] = multiState.length;

  const reciprocity = [
    { homeState: 'VA', workState: 'DC', exemptionType: 'Full', formRequired: 'D-4A' },
    { homeState: 'PA', workState: 'NJ', exemptionType: 'Full', formRequired: 'NJ-165' },
    { homeState: 'IL', workState: 'WI', exemptionType: 'Full', formRequired: 'W-220' },
    { homeState: 'IN', workState: 'KY', exemptionType: 'Full', formRequired: 'K-4' },
    { homeState: 'MD', workState: 'DC', exemptionType: 'Full', formRequired: 'D-4A' },
  ].map(a => ({ id: rid(), agreementId: rid(), ...a, effectiveDate: '2020-01-01', expirationDate: '', active: true, notes: '' }));
  await bulkInsert(store, 'tax/reciprocity', reciprocity);
  counts['Reciprocity Agreements'] = reciprocity.length;

  const form1099s: any[] = [];
  for (let i = 0; i < 10; i++) {
    const v = pick(vendors);
    form1099s.push({
      id: rid(), formId: rid(), type: i < 7 ? 'NEC' : 'MISC',
      year: yr(), status: pick(['draft','generated','reviewed','filed']),
      payerEIN: '12-3456789', payerName: 'Concrete General Contractors',
      recipientTIN: `${randInt(100, 999)}-${randInt(10, 99)}-${randInt(1000, 9999)}`,
      recipientName: v.name, recipientAddress: `${randInt(100, 9999)} Main St`,
      recipientCity: pick(['Los Angeles','Houston','New York','Miami']),
      recipientState: pick(STATES.slice(0, 10)), recipientZip: String(randInt(10000, 99999)),
      amount: randAmt(5000, 150000), federalTaxWithheld: randAmt(0, 5000),
      stateTaxWithheld: randAmt(0, 2000), stateIncome: randAmt(5000, 150000),
      state: pick(STATES.slice(0, 10)), generatedDate: isoDate(30),
      filedDate: '', corrected: false, originalFormId: '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/form1099', form1099s);
  counts['1099 Forms'] = form1099s.length;

  const salesTax: any[] = [];
  for (const state of ['CA','TX','NY','FL']) {
    for (let m = 1; m <= 6; m++) {
      salesTax.push({
        id: rid(), recordId: rid(), jurisdiction: `${state} State`,
        jurisdictionLevel: 'state', state, county: '', city: '',
        taxType: pick(['sales','use']), period: `${yr()}-${String(m).padStart(2, '0')}`,
        year: yr(), month: m, taxableAmount: randAmt(50000, 300000),
        exemptAmount: randAmt(5000, 30000), taxRate: pick([0.0625, 0.0725, 0.08, 0.06]),
        taxDue: randAmt(3000, 25000), taxPaid: randAmt(3000, 25000),
        status: m < 5 ? 'filed' : 'draft',
        dueDate: isoDate(m < 5 ? randInt(30, 120) : -randInt(10, 30)),
        filedDate: m < 5 ? isoDate(randInt(30, 120)) : '', notes: '',
      });
    }
  }
  await bulkInsert(store, 'tax/salesTax', salesTax);
  counts['Sales Tax Records'] = salesTax.length;

  const licenses: any[] = [];
  for (let i = 0; i < 8; i++) {
    const state = pick(STATES.slice(0, 10));
    licenses.push({
      id: rid(), licenseId: rid(), entityId: pick(entities).id, entityName: pick(ENTITY_NAMES),
      state, licenseNumber: `${state}-${randInt(100000, 999999)}`,
      licenseType: pick(['General Building','Specialty','Electrical','Plumbing','Mechanical']),
      classification: pick(['A','B','C-10','C-20','C-36']),
      issueDate: isoDate(randInt(180, 730)), expirationDate: isoDate(-randInt(30, 365)),
      status: pick(['active','active','active','expiring_soon','expired']),
      renewalDate: '', bondRequired: Math.random() > 0.3,
      bondAmount: randAmt(15000, 100000), insuranceRequired: true, notes: '',
    });
  }
  await bulkInsert(store, 'tax/license', licenses);
  counts['Contractor Licenses'] = licenses.length;

  const ocipCcip: any[] = [];
  for (let i = 0; i < 4; i++) {
    const job = pick(jobs);
    ocipCcip.push({
      id: rid(), programId: rid(), programType: pick(['OCIP','CCIP']),
      projectId: job.id, projectName: job.name,
      carrier: pick(['Zurich','Liberty Mutual','Travelers','CNA','Hartford']),
      policyNumber: `POL-${randInt(100000, 999999)}`,
      status: pick(['active','enrolled','pending']),
      effectiveDate: isoDate(randInt(30, 365)), expirationDate: isoDate(-randInt(180, 730)),
      enrolledContractors: randInt(3, 20), totalPremium: randAmt(50000, 500000),
      totalClaims: randAmt(0, 100000), lossRatio: Math.random() * 0.8,
      lastAuditDate: isoDate(randInt(30, 90)), nextAuditDate: isoDate(-randInt(30, 90)),
      notes: '',
    });
  }
  await bulkInsert(store, 'tax/ocipCcip', ocipCcip);
  counts['OCIP/CCIP Programs'] = ocipCcip.length;

  const eeoaa: any[] = [];
  for (let i = 0; i < 3; i++) {
    const total = randInt(50, 200);
    const minority = randInt(10, Math.floor(total * 0.4));
    const female = randInt(5, Math.floor(total * 0.25));
    eeoaa.push({
      id: rid(), reportId: rid(), reportType: pick(['EEO-1','EEO-CC','VETS-4212']),
      year: yr(), period: `Annual ${yr()}`, projectId: pick(jobs).id,
      projectName: pick(JOB_NAMES), status: pick(['draft','submitted','accepted']),
      totalEmployees: total, minorityCount: minority, femaleCount: female,
      veteranCount: randInt(2, 15), disabledCount: randInt(1, 8),
      minorityPct: minority / total, femalePct: female / total,
      goalMet: Math.random() > 0.3,
      submittedDate: '', dueDate: `${yr()}-09-30`, preparedBy: 'admin', notes: '',
    });
  }
  await bulkInsert(store, 'tax/eeoaa', eeoaa);
  counts['EEO/AA Reports'] = eeoaa.length;

  const prevWage: any[] = [];
  for (let i = 0; i < 6; i++) {
    const required = randAmt(35, 85);
    const actual = required + randAmt(-5, 15);
    prevWage.push({
      id: rid(), reportId: rid(), projectId: pick(jobs).id, projectName: pick(JOB_NAMES),
      jurisdiction: pick(['Federal (Davis-Bacon)','California','New York','Texas']),
      state: pick(STATES.slice(0, 10)), wageDecisionNumber: `WD-${yr()}-${randInt(1000, 9999)}`,
      classification: pick(['Carpenter','Electrician','Ironworker','Laborer','Operator','Plumber']),
      year: yr(), weekEnding: isoDate(i * 7),
      status: pick(['draft','submitted','accepted']),
      totalWorkers: randInt(5, 25), totalHours: randInt(200, 1000),
      totalWages: randAmt(10000, 80000), totalFringe: randAmt(2000, 15000),
      requiredRate: required, actualRate: actual, compliant: actual >= required,
      submittedDate: '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/prevailingWage', prevWage);
  counts['Prevailing Wage Reports'] = prevWage.length;

  const certPayroll: any[] = [];
  for (let i = 0; i < 6; i++) {
    const job = pick(jobs);
    const gross = randAmt(15000, 80000);
    const deductions = randAmt(2000, 15000);
    certPayroll.push({
      id: rid(), reportId: rid(), projectId: job.id, projectName: job.name,
      state: pick(STATES.slice(0, 10)),
      format: pick(['WH-347','CA DIR eCPR','NY CPR-2','IL CPR']),
      weekEnding: isoDate(i * 7), contractorName: pick(ENTITY_NAMES),
      contractorEIN: '12-3456789', year: yr(),
      status: pick(['draft','certified','submitted','accepted']),
      totalWorkers: randInt(5, 20), totalHours: randInt(200, 800),
      totalGross: gross, totalDeductions: deductions, totalNet: gross - deductions,
      certifiedBy: i > 2 ? empName() : '',
      certifiedDate: i > 2 ? isoDate(i * 7 - 1) : '', submittedDate: '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/certifiedPayroll', certPayroll);
  counts['Certified Payroll'] = certPayroll.length;

  const auditEntries: any[] = [
    { action: 'create', entityType: 'federal_filing', entityDescription: 'Created Form 941 Q1 filing' },
    { action: 'file', entityType: 'federal_filing', entityDescription: 'Filed Form 941 Q1 - CONF-384729' },
    { action: 'create', entityType: 'state_filing', entityDescription: 'Created CA DE-9 Q2 filing' },
    { action: 'generate', entityType: '1099', entityDescription: 'Generated 1099-NEC for ABC Supply Co' },
    { action: 'file', entityType: '1099', entityDescription: 'E-filed batch of 8 1099-NEC forms' },
    { action: 'import', entityType: 'tax_rates', entityDescription: 'Imported 52 state tax rates' },
    { action: 'approve', entityType: 'certified_payroll', entityDescription: 'Certified payroll for Highway 101 Bridge' },
    { action: 'create', entityType: 'eeoaa_report', entityDescription: 'Created EEO-1 Annual report' },
    { action: 'update', entityType: 'license', entityDescription: 'Renewed CA contractor license' },
    { action: 'create', entityType: 'year_end', entityDescription: 'Initiated year-end processing' },
  ].map((a, i) => ({
    id: rid(), entryId: rid(), timestamp: isoTS(i * 3 + randInt(0, 2)),
    userId: 'admin', userName: 'Admin User', ...a,
    entityId: rid(), previousValue: '', newValue: '',
    ipAddress: '192.168.1.100', sessionId: '', notes: '',
  }));
  await bulkInsert(store, 'tax/audit', auditEntries);
  counts['Tax Audit Entries'] = auditEntries.length;

  const taxRates: any[] = [];
  for (const [taxType, rate, wageBase] of [['fica_ss', 0.062, 168600], ['fica_med', 0.0145, 0], ['futa', 0.006, 7000]] as const) {
    taxRates.push({
      id: rid(), rateId: rid(), jurisdiction: 'Federal', jurisdictionLevel: 'federal',
      state: '', county: '', city: '', taxType, rate, wageBase,
      effectiveDate: `${yr()}-01-01`, expirationDate: '', source: 'manual',
      lastUpdated: ts(), updatedBy: 'admin', active: true, notes: '',
    });
  }
  for (const [state, rate] of [['CA',0.093],['TX',0],['NY',0.0685],['FL',0],['IL',0.0495],['PA',0.0307],['OH',0.04],['GA',0.055],['NC',0.0525],['MI',0.0425]] as const) {
    taxRates.push({
      id: rid(), rateId: rid(), jurisdiction: `${state} State Income`, jurisdictionLevel: 'state',
      state, county: '', city: '', taxType: 'income', rate, wageBase: 0,
      effectiveDate: `${yr()}-01-01`, expirationDate: '', source: 'import',
      lastUpdated: ts(), updatedBy: 'admin', active: true, notes: '',
    });
  }
  for (const state of ['CA','TX','NY','FL','IL']) {
    taxRates.push({
      id: rid(), rateId: rid(), jurisdiction: `${state} SUTA`, jurisdictionLevel: 'state',
      state, county: '', city: '', taxType: 'suta', rate: randAmt(0.01, 0.054), wageBase: randInt(7000, 47000),
      effectiveDate: `${yr()}-01-01`, expirationDate: '', source: 'import',
      lastUpdated: ts(), updatedBy: 'admin', active: true, notes: '',
    });
  }
  await bulkInsert(store, 'tax/rate', taxRates);
  counts['Tax Rates'] = taxRates.length;

  const yearEndSteps: any[] = [];
  const steps = ['review_payroll','reconcile_taxes','generate_w2','generate_w3','generate_1099','file_annual','archive','rollover'];
  for (let i = 0; i < steps.length; i++) {
    yearEndSteps.push({
      id: rid(), processId: `ye-${yr() - 1}-${steps[i]}`, year: yr() - 1,
      step: steps[i], status: 'completed',
      startedAt: isoTS(60 + i * 2), completedAt: isoTS(59 + i * 2),
      completedBy: 'admin', recordsProcessed: randInt(10, 500),
      errors: 0, warnings: randInt(0, 3), notes: '',
    });
  }
  await bulkInsert(store, 'tax/yearEnd', yearEndSteps);
  counts['Year-End Steps'] = yearEndSteps.length;

  // =========================================================================
  // BANKING
  // =========================================================================

  const bankAccounts = [
    { id: 'bank-1', name: 'Operating Account', accountNumber: '****1234', bankName: 'Chase', type: 'checking', status: 'active', currentBalance: randAmt(150000, 500000), lastReconciledDate: isoDate(5), lastReconciledBalance: randAmt(140000, 480000), notes: '' },
    { id: 'bank-2', name: 'Payroll Account', accountNumber: '****5678', bankName: 'Chase', type: 'checking', status: 'active', currentBalance: randAmt(80000, 300000), lastReconciledDate: isoDate(5), lastReconciledBalance: randAmt(75000, 290000), notes: '' },
    { id: 'bank-3', name: 'Business Savings', accountNumber: '****9012', bankName: 'Wells Fargo', type: 'savings', status: 'active', currentBalance: randAmt(500000, 2000000), notes: '' },
    { id: 'bank-4', name: 'Company Credit Card', accountNumber: '****3456', bankName: 'Amex', type: 'credit_card', status: 'active', currentBalance: -randAmt(5000, 30000), notes: '' },
  ];
  await bulkInsert(store, 'bank/account', bankAccounts);
  counts['Bank Accounts'] = bankAccounts.length;

  const stmtLines: any[] = [];
  for (let i = 0; i < 30; i++) {
    stmtLines.push({
      id: rid(), accountId: pick(['bank-1','bank-2']), statementDate: isoDate(randInt(1, 60)),
      postDate: isoDate(randInt(1, 60)), description: pick(['Deposit','Wire Transfer','ACH Payment','Check #'+randInt(1000,9999),'Vendor Payment','Payroll']),
      amount: pick([1,-1]) * randAmt(500, 50000), status: pick(['unmatched','matched','matched','matched']),
    });
  }
  await bulkInsert(store, 'bank/statementLine', stmtLines);
  counts['Statement Lines'] = stmtLines.length;

  const reconciliations: any[] = [];
  for (let i = 0; i < 3; i++) {
    const diff = randAmt(0, 500);
    reconciliations.push({
      id: rid(), accountId: 'bank-1', accountName: 'Operating Account',
      statementDate: isoDate(i * 30 + 5), statementBalance: randAmt(100000, 500000),
      bookBalance: randAmt(100000, 500000), adjustedBalance: randAmt(100000, 500000),
      difference: diff, status: diff < 10 ? 'completed' : 'in_progress',
      reconciledBy: i < 2 ? 'admin' : '', reconciledDate: i < 2 ? isoDate(i * 30 + 3) : '',
      outstandingDeposits: randAmt(0, 20000), outstandingChecks: randAmt(0, 15000), notes: '',
    });
  }
  await bulkInsert(store, 'bank/reconciliation', reconciliations);
  counts['Reconciliations'] = reconciliations.length;

  const cashFlows: any[] = [];
  for (let i = 0; i < 10; i++) {
    cashFlows.push({
      id: rid(), accountId: pick(['bank-1','bank-2']),
      type: pick(['inflow','inflow','outflow','outflow','outflow']),
      description: pick(['Progress billing','Vendor payment','Payroll','Equipment purchase','Material delivery','Insurance premium']),
      amount: randAmt(5000, 200000), expectedDate: isoDate(-randInt(1, 60)),
      source: pick(['AR','AP','Payroll','Manual']), probability: pick([0.9, 0.95, 1.0, 0.7, 0.8]),
    });
  }
  await bulkInsert(store, 'bank/cashFlow', cashFlows);
  counts['Cash Flow Projections'] = cashFlows.length;

  const posPay: any[] = [];
  for (let i = 0; i < 5; i++) {
    posPay.push({
      id: rid(), accountId: 'bank-1', checkNumber: String(randInt(10000, 99999)),
      payee: pick(VENDOR_NAMES), amount: randAmt(1000, 50000),
      issueDate: isoDate(randInt(1, 30)), voidFlag: false, exported: i < 3, exportDate: i < 3 ? isoDate(randInt(1, 10)) : '',
    });
  }
  await bulkInsert(store, 'bank/positivePay', posPay);
  counts['Positive Pay'] = posPay.length;

  const achBatches: any[] = [];
  for (let i = 0; i < 3; i++) {
    achBatches.push({
      id: rid(), batchNumber: `ACH-${yr()}-${String(i + 1).padStart(3, '0')}`,
      accountId: 'bank-1', description: pick(['Vendor Payments','Payroll ACH','Refunds']),
      totalAmount: randAmt(10000, 200000), entryCount: randInt(3, 20),
      effectiveDate: isoDate(randInt(0, 14)), status: pick(['pending','submitted','processed']),
      createdDate: isoDate(randInt(1, 20)), notes: '',
    });
  }
  await bulkInsert(store, 'bank/achBatch', achBatches);
  counts['ACH Batches'] = achBatches.length;

  const checks: any[] = [];
  for (let i = 0; i < 10; i++) {
    const num = 10001 + i;
    checks.push({
      id: rid(), accountId: 'bank-1', checkNumber: String(num),
      payee: pick(VENDOR_NAMES), amount: randAmt(500, 25000),
      issueDate: isoDate(randInt(5, 60)), clearedDate: i < 7 ? isoDate(randInt(1, 30)) : '',
      status: i < 7 ? 'cleared' : pick(['issued','stale']), memo: `Payment for ${pick(JOB_NAMES)}`,
    });
  }
  await bulkInsert(store, 'bank/check', checks);
  counts['Checks'] = checks.length;

  const ccTxns: any[] = [];
  for (let i = 0; i < 15; i++) {
    ccTxns.push({
      id: rid(), accountId: 'bank-4', transactionDate: isoDate(randInt(1, 45)),
      description: pick(['Office Depot','Home Depot','Hilton Hotels','Delta Airlines','Fuel Station','Amazon']),
      amount: randAmt(25, 3000), category: pick(['Office','Materials','Travel','Fuel','Supplies']),
      jobId: Math.random() > 0.4 ? pick(jobs).id : '', costCode: '',
      status: pick(['pending','coded','approved','posted']),
      codedBy: pick(['','admin',empName()]), notes: '',
    });
  }
  await bulkInsert(store, 'bank/ccTransaction', ccTxns);
  counts['Credit Card Txns'] = ccTxns.length;

  const pettyCash = [
    { id: 'pc-1', custodian: empName(), fundAmount: 500, currentBalance: randAmt(100, 450), lastReplenishedDate: isoDate(15), location: 'Main Office', active: true },
    { id: 'pc-2', custodian: empName(), fundAmount: 300, currentBalance: randAmt(50, 280), lastReplenishedDate: isoDate(20), location: 'Job Site', active: true },
  ];
  await bulkInsert(store, 'bank/pettyCash', pettyCash);
  counts['Petty Cash Funds'] = pettyCash.length;

  const pcTxns: any[] = [];
  for (let i = 0; i < 10; i++) {
    pcTxns.push({
      id: rid(), pettyCashId: pick(['pc-1','pc-2']), date: isoDate(randInt(1, 30)),
      description: pick(['Parking','Postage','Coffee for meeting','Small tools','First aid supplies']),
      amount: randAmt(5, 75), category: pick(['Office','Travel','Supplies','Other']),
      receipt: Math.random() > 0.2, approvedBy: empName(),
    });
  }
  await bulkInsert(store, 'bank/pettyCashTxn', pcTxns);
  counts['Petty Cash Txns'] = pcTxns.length;

  const trustAccounts: any[] = [];
  for (let i = 0; i < 2; i++) {
    const job = pick(jobs);
    trustAccounts.push({
      id: rid(), accountId: `trust-${i + 1}`, ownerName: pick(CUSTOMER_NAMES),
      projectId: job.id, projectName: job.name,
      balance: randAmt(50000, 500000), requiredBalance: randAmt(25000, 200000),
      lastActivityDate: isoDate(randInt(1, 30)), compliant: true, notes: '',
    });
  }
  await bulkInsert(store, 'bank/trustAccount', trustAccounts);
  counts['Trust Accounts'] = trustAccounts.length;

  // =========================================================================
  // BONDING & INSURANCE
  // =========================================================================

  const sureties = [
    { id: 'surety-1', name: 'Travelers Surety', agentName: 'John Baker', agentEmail: 'jbaker@travelers.com', agentPhone: '555-0101', singleJobLimit: 15000000, aggregateLimit: 50000000, currentExposure: randAmt(5000000, 20000000), availableCapacity: randAmt(20000000, 40000000), rating: 'A+', active: true },
    { id: 'surety-2', name: 'Liberty Mutual Surety', agentName: 'Sarah Chen', agentEmail: 'schen@liberty.com', agentPhone: '555-0102', singleJobLimit: 10000000, aggregateLimit: 35000000, currentExposure: randAmt(3000000, 15000000), availableCapacity: randAmt(15000000, 30000000), rating: 'A', active: true },
  ];
  await bulkInsert(store, 'bond/surety', sureties);
  counts['Sureties'] = sureties.length;

  const bonds: any[] = [];
  for (let i = 0; i < 6; i++) {
    const job = pick(jobs);
    bonds.push({
      id: rid(), bondNumber: `BD-${yr()}-${String(i + 1).padStart(3, '0')}`,
      type: pick(['bid','performance','payment','maintenance']),
      status: pick(['active','active','active','released']),
      suretyId: pick(sureties).id, suretyName: pick(sureties).name,
      jobId: job.id, jobName: job.name, principal: pick(ENTITY_NAMES),
      obligee: pick(CUSTOMER_NAMES), amount: randAmt(100000, 5000000),
      premium: randAmt(5000, 50000), effectiveDate: isoDate(randInt(30, 365)),
      expirationDate: isoDate(-randInt(60, 365)), notes: '',
    });
  }
  await bulkInsert(store, 'bond/bond', bonds);
  counts['Bonds'] = bonds.length;

  const policies = [
    { id: rid(), policyNumber: `GL-${yr()}-001`, type: 'general_liability', status: 'active', carrier: 'Hartford', effectiveDate: `${yr()}-01-01`, expirationDate: `${yr()}-12-31`, premiumAmount: 85000, coverageLimit: 2000000, deductible: 10000, description: 'Commercial General Liability' },
    { id: rid(), policyNumber: `WC-${yr()}-001`, type: 'workers_comp', status: 'active', carrier: 'Travelers', effectiveDate: `${yr()}-01-01`, expirationDate: `${yr()}-12-31`, premiumAmount: 120000, coverageLimit: 1000000, deductible: 5000, description: 'Workers Compensation' },
    { id: rid(), policyNumber: `AUTO-${yr()}-001`, type: 'auto', status: 'active', carrier: 'Liberty Mutual', effectiveDate: `${yr()}-01-01`, expirationDate: `${yr()}-12-31`, premiumAmount: 45000, coverageLimit: 1000000, deductible: 2500, description: 'Commercial Auto' },
    { id: rid(), policyNumber: `UMB-${yr()}-001`, type: 'umbrella', status: 'active', carrier: 'Zurich', effectiveDate: `${yr()}-01-01`, expirationDate: `${yr()}-12-31`, premiumAmount: 25000, coverageLimit: 10000000, deductible: 0, description: 'Umbrella / Excess Liability' },
  ];
  await bulkInsert(store, 'bond/policy', policies);
  counts['Insurance Policies'] = policies.length;

  const cois: any[] = [];
  for (let i = 0; i < 6; i++) {
    cois.push({
      id: rid(), certificateNumber: `COI-${yr()}-${String(i + 1).padStart(3, '0')}`,
      status: pick(['issued','issued','issued','pending']),
      issuedTo: pick(CUSTOMER_NAMES), issuedDate: isoDate(randInt(5, 60)),
      expirationDate: isoDate(-randInt(30, 365)), projectId: pick(jobs).id,
      projectName: pick(JOB_NAMES), holderName: pick(CUSTOMER_NAMES), notes: '',
    });
  }
  await bulkInsert(store, 'bond/coi', cois);
  counts['COIs'] = cois.length;

  const subIns: any[] = [];
  for (let i = 0; i < 5; i++) {
    const s = pick(subs);
    subIns.push({
      id: rid(), subcontractorId: s.id, subcontractorName: s.name,
      glPolicyNumber: `GL-SUB-${randInt(1000, 9999)}`, glExpiration: isoDate(-randInt(30, 180)),
      wcPolicyNumber: `WC-SUB-${randInt(1000, 9999)}`, wcExpiration: isoDate(-randInt(30, 180)),
      autoExpiration: isoDate(-randInt(30, 180)), umbrellaExpiration: isoDate(-randInt(30, 365)),
      compliant: Math.random() > 0.2, lastVerifiedDate: isoDate(randInt(5, 60)), notes: '',
    });
  }
  await bulkInsert(store, 'bond/subInsurance', subIns);
  counts['Sub Insurance'] = subIns.length;

  const wrapUps: any[] = [];
  for (let i = 0; i < 2; i++) {
    const job = pick(jobs);
    wrapUps.push({
      id: rid(), name: `${pick(['OCIP','CCIP'])} - ${job.name}`, type: pick(['ocip','ccip']),
      jobId: job.id, jobName: job.name, carrier: pick(['Zurich','Travelers']),
      startDate: isoDate(randInt(60, 365)), enrolledSubs: randInt(5, 15),
      totalPremium: randAmt(50000, 300000), active: true, notes: '',
    });
  }
  await bulkInsert(store, 'bond/wrapUp', wrapUps);
  counts['Wrap-Up Programs'] = wrapUps.length;

  const lossRuns: any[] = [];
  for (let i = 0; i < 3; i++) {
    lossRuns.push({
      id: rid(), carrier: pick(['Hartford','Travelers','Liberty Mutual']),
      policyType: pick(['general_liability','workers_comp','auto']),
      periodStart: `${yr() - 1}-01-01`, periodEnd: `${yr() - 1}-12-31`,
      totalClaims: randInt(0, 5), totalPaid: randAmt(0, 50000),
      totalReserved: randAmt(0, 30000), totalIncurred: randAmt(0, 80000),
      requestedDate: isoDate(randInt(30, 90)), receivedDate: isoDate(randInt(10, 60)),
    });
  }
  await bulkInsert(store, 'bond/lossRun', lossRuns);
  counts['Loss Runs'] = lossRuns.length;

  const claims: any[] = [];
  for (let i = 0; i < 3; i++) {
    claims.push({
      id: rid(), claimNumber: `CLM-${yr()}-${String(i + 1).padStart(3, '0')}`,
      policyNumber: pick(policies).policyNumber,
      status: pick(['open','investigating','settled','closed']),
      type: pick(['general_liability','workers_comp','auto']),
      dateOfLoss: isoDate(randInt(30, 180)), reportedDate: isoDate(randInt(25, 175)),
      description: pick(['Slip and fall on job site','Vehicle collision','Equipment malfunction','Material damage']),
      claimant: empName(), jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      paidAmount: randAmt(0, 25000), reserveAmount: randAmt(5000, 50000),
    });
  }
  await bulkInsert(store, 'bond/claim', claims);
  counts['Claims'] = claims.length;

  const jobInsCosts: any[] = [];
  for (let i = 0; i < 5; i++) {
    const job = pick(jobs);
    jobInsCosts.push({
      id: rid(), jobId: job.id, jobName: job.name,
      policyType: pick(['general_liability','workers_comp','auto','umbrella']),
      allocatedAmount: randAmt(1000, 15000), period: `${yr()}-Q${pick([1,2,3,4])}`,
      method: pick(['payroll_based','revenue_based','headcount']), notes: '',
    });
  }
  await bulkInsert(store, 'bond/jobCost', jobInsCosts);
  counts['Job Insurance Costs'] = jobInsCosts.length;

  // =========================================================================
  // PROJECT MANAGEMENT
  // =========================================================================

  const projects: any[] = [];
  for (let i = 0; i < 5; i++) {
    const job = jobs[i];
    projects.push({
      id: `proj-${i + 1}`, name: job.name, jobId: job.id,
      status: pick(['planning','active','active','active','on_hold']),
      startDate: isoDate(randInt(60, 365)), endDate: isoDate(-randInt(30, 365)),
      manager: empName(), percentComplete: randInt(10, 95),
      percentCompleteMethod: 'cost', budgetedCost: randAmt(500000, 10000000),
      actualCost: randAmt(200000, 8000000), earnedValue: randAmt(200000, 9000000),
    });
  }
  await bulkInsert(store, 'project/project', projects);
  counts['Projects'] = projects.length;

  const milestones: any[] = [];
  for (const proj of projects) {
    for (let i = 0; i < 3; i++) {
      milestones.push({
        id: rid(), projectId: proj.id,
        name: pick(['Foundation Complete','Steel Erection','Rough-In','Substantial Completion','Final Inspection','Punch List','Closeout']),
        dueDate: isoDate(-randInt(10, 180)), actualDate: Math.random() > 0.4 ? isoDate(randInt(0, 30)) : '',
        status: pick(['pending','completed','late']), isCritical: Math.random() > 0.5,
      });
    }
  }
  await bulkInsert(store, 'project/milestone', milestones);
  counts['Milestones'] = milestones.length;

  const tasks: any[] = [];
  for (let i = 0; i < 20; i++) {
    const proj = pick(projects);
    const budgetHours = randInt(20, 200);
    tasks.push({
      id: `task-${i + 1}`, projectId: proj.id, name: pick(['Excavation','Formwork','Rebar Install','Concrete Pour','Framing','Electrical Rough-In','Plumbing Rough-In','HVAC Ductwork','Drywall','Painting','Flooring','Trim Work','Punchlist','Commissioning']),
      assignee: empName(), startDate: isoDate(randInt(10, 120)),
      endDate: isoDate(-randInt(0, 90)), duration: randInt(3, 30),
      percentComplete: randInt(0, 100), status: pick(['not_started','in_progress','in_progress','completed','delayed']),
      isCriticalPath: Math.random() > 0.6, resourceType: pick(['labor','equipment','material']),
      budgetHours, actualHours: randInt(Math.floor(budgetHours * 0.5), Math.floor(budgetHours * 1.3)),
      budgetCost: randAmt(5000, 100000), actualCost: randAmt(3000, 110000), sortOrder: i,
    });
  }
  await bulkInsert(store, 'project/task', tasks);
  counts['Tasks'] = tasks.length;

  const deps: any[] = [];
  for (let i = 1; i < 10; i++) {
    deps.push({ id: rid(), taskId: `task-${i + 1}`, predecessorId: `task-${i}`, type: 'FS', lag: 0 });
  }
  await bulkInsert(store, 'project/taskDependency', deps);
  counts['Task Dependencies'] = deps.length;

  const dailyLogs: any[] = [];
  for (let i = 0; i < 10; i++) {
    dailyLogs.push({
      id: rid(), projectId: pick(projects).id, date: isoDate(i),
      weather: pick(['Clear','Partly Cloudy','Overcast','Rain','Windy']),
      temperature: `${randInt(45, 95)}°F`, crew: `${randInt(5, 30)} workers`,
      workPerformed: pick(['Poured foundation section B','Erected steel columns level 3','Installed electrical conduit wing A','Completed roofing section 2','Backfill and grading lot C']),
      visitors: pick(['','Owner representative','Inspector','Architect']),
      incidents: pick(['None','','','Near-miss reported']), notes: '',
    });
  }
  await bulkInsert(store, 'project/dailyLog', dailyLogs);
  counts['Daily Logs'] = dailyLogs.length;

  const rfis: any[] = [];
  for (let i = 0; i < 8; i++) {
    rfis.push({
      id: rid(), projectId: pick(projects).id, number: i + 1,
      subject: pick(['Clarification on structural detail','Door hardware spec','Grading elevation conflict','Electrical panel location','Window flashing detail','HVAC diffuser placement','Concrete mix design','ADA compliance']),
      requestedBy: empName(), assignedTo: pick(['Architect','Engineer','Owner']),
      dueDate: isoDate(-randInt(5, 30)), status: pick(['open','answered','closed','overdue']),
      priority: pick(['low','medium','high','urgent']),
      response: i < 5 ? 'See attached sketch for clarification.' : '',
      responseDate: i < 5 ? isoDate(randInt(1, 20)) : '',
    });
  }
  await bulkInsert(store, 'project/rfi', rfis);
  counts['RFIs'] = rfis.length;

  const submittals: any[] = [];
  for (let i = 0; i < 6; i++) {
    submittals.push({
      id: rid(), projectId: pick(projects).id, number: i + 1,
      specSection: pick(['03 30 00','05 12 00','08 41 13','09 29 00','23 05 93','26 05 00']),
      description: pick(['Concrete mix design','Structural steel shop drawings','Storefront system','Gypsum board assemblies','HVAC equipment','Electrical switchgear']),
      submittedBy: pick(VENDOR_NAMES), status: pick(['pending','approved','approved_as_noted','rejected','resubmit']),
      submittedDate: isoDate(randInt(10, 60)), reviewedDate: i < 4 ? isoDate(randInt(1, 20)) : '',
      reviewer: i < 4 ? 'Architect' : '',
    });
  }
  await bulkInsert(store, 'project/submittal', submittals);
  counts['Submittals'] = submittals.length;

  const meetings: any[] = [];
  for (let i = 0; i < 4; i++) {
    meetings.push({
      id: rid(), projectId: pick(projects).id, date: isoDate(i * 7),
      type: pick(['progress','safety','owner','pre_construction']),
      attendees: [empName(), empName(), empName()],
      topics: ['Schedule update', 'Budget review', 'Safety briefing'],
      actionItems: [`${empName()} to submit RFI`, `Review submittal by ${isoDate(-7)}`],
      nextMeetingDate: isoDate(-((i + 1) * 7)),
    });
  }
  await bulkInsert(store, 'project/meetingMinutes', meetings);
  counts['Meeting Minutes'] = meetings.length;

  const weatherDelays: any[] = [];
  for (let i = 0; i < 3; i++) {
    weatherDelays.push({
      id: rid(), projectId: pick(projects).id, date: isoDate(randInt(10, 60)),
      type: pick(['rain','wind','extreme_heat','snow']),
      hoursLost: randInt(4, 16), description: pick(['Heavy rain - site flooded','Wind > 35mph - crane shutdown','Heat index > 105°F']),
      impactedTasks: [`task-${randInt(1, 10)}`],
    });
  }
  await bulkInsert(store, 'project/weatherDelay', weatherDelays);
  counts['Weather Delays'] = weatherDelays.length;

  const allocations: any[] = [];
  for (let i = 0; i < 8; i++) {
    allocations.push({
      id: rid(), projectId: pick(projects).id, taskId: `task-${randInt(1, 15)}`,
      resourceType: pick(['labor','equipment']),
      resourceId: pick([...employees.slice(0, 10).map(e => e.id), ...equipment.slice(0, 5).map(e => e.id)]),
      hours: randInt(8, 80), startDate: isoDate(randInt(5, 30)), endDate: isoDate(-randInt(5, 30)),
    });
  }
  await bulkInsert(store, 'project/resourceAllocation', allocations);
  counts['Resource Allocations'] = allocations.length;

  // =========================================================================
  // HR
  // =========================================================================

  const hrEmployees: any[] = [];
  for (let i = 0; i < 20; i++) {
    const emp = employees[i];
    hrEmployees.push({
      id: `hr-emp-${i + 1}`, employeeId: emp.id,
      firstName: emp.firstName, lastName: emp.lastName,
      email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@concrete.com`,
      phone: `555-${String(randInt(1000, 9999))}`,
      state: pick(STATES.slice(0, 10)), status: 'active',
      type: pick(['full_time','full_time','full_time','part_time','contract']),
      hireDate: emp.hireDate, payRate: emp.rate,
      payType: emp.type === 'salary' ? 'salary' : 'hourly',
      eeoRace: pick(['white','black','hispanic','asian','not_specified']),
      eeoGender: pick(['male','female','not_specified']),
      i9Completed: true, eVerifyStatus: 'verified', newHireReported: true,
    });
  }
  await bulkInsert(store, 'hr/employee', hrEmployees);
  counts['HR Employees'] = hrEmployees.length;

  const positions = [
    { id: 'pos-1', title: 'Project Manager', status: 'filled', headcount: 3, filledCount: 3, payGradeMin: 85000, payGradeMax: 130000 },
    { id: 'pos-2', title: 'Superintendent', status: 'filled', headcount: 5, filledCount: 4, payGradeMin: 75000, payGradeMax: 110000 },
    { id: 'pos-3', title: 'Estimator', status: 'filled', headcount: 2, filledCount: 2, payGradeMin: 70000, payGradeMax: 100000 },
    { id: 'pos-4', title: 'Safety Manager', status: 'filled', headcount: 1, filledCount: 1, payGradeMin: 65000, payGradeMax: 90000 },
    { id: 'pos-5', title: 'Foreman', status: 'open', headcount: 8, filledCount: 6, payGradeMin: 55000, payGradeMax: 80000 },
    { id: 'pos-6', title: 'Equipment Operator', status: 'filled', headcount: 10, filledCount: 10, payGradeMin: 45000, payGradeMax: 65000 },
    { id: 'pos-7', title: 'Laborer', status: 'open', headcount: 15, filledCount: 12, payGradeMin: 35000, payGradeMax: 50000 },
    { id: 'pos-8', title: 'Controller', status: 'filled', headcount: 1, filledCount: 1, payGradeMin: 90000, payGradeMax: 140000 },
  ];
  await bulkInsert(store, 'hr/position', positions);
  counts['HR Positions'] = positions.length;

  const certs: any[] = [];
  const certTypes = ['osha_10','osha_30','cdl','crane','confined_space','first_aid','cpr','hazmat','scaffolding','rigging'];
  for (let i = 0; i < 15; i++) {
    const ct = pick(certTypes);
    certs.push({
      id: rid(), employeeId: `emp-${randInt(1, 20)}`, type: ct,
      name: ct.replace(/_/g, ' ').toUpperCase(), issuedBy: pick(['OSHA','Red Cross','NCCCO','State Board']),
      issuedDate: isoDate(randInt(60, 730)),
      expirationDate: isoDate(-randInt(30, 365)),
      certificateNumber: `CERT-${randInt(10000, 99999)}`,
      status: pick(['active','active','active','expiring_soon','expired']),
    });
  }
  await bulkInsert(store, 'hr/certification', certs);
  counts['Certifications'] = certs.length;

  const trainings: any[] = [];
  for (let i = 0; i < 10; i++) {
    trainings.push({
      id: rid(), employeeId: `emp-${randInt(1, 20)}`,
      courseName: pick(['OSHA 10-Hour','OSHA 30-Hour','First Aid/CPR','Fall Protection','Scaffolding Safety','Hazmat Awareness','Confined Space Entry','Crane Signal Person','Forklift Certification','Excavation Safety']),
      provider: pick(['OSHA','Red Cross','Internal','NCCCO','Safety Council']),
      completedDate: i < 7 ? isoDate(randInt(10, 180)) : '',
      expirationDate: i < 7 ? isoDate(-randInt(60, 365)) : '',
      status: i < 7 ? 'completed' : pick(['scheduled','in_progress']),
      score: i < 7 ? randInt(75, 100) : undefined, hours: pick([4, 8, 10, 30]),
    });
  }
  await bulkInsert(store, 'hr/trainingRecord', trainings);
  counts['Training Records'] = trainings.length;

  const benefitPlans = [
    { id: 'bp-1', name: 'Medical PPO', type: 'health', carrier: 'Blue Cross', status: 'active', effectiveDate: `${yr()}-01-01`, employerContribution: 450, employeeContribution: 150 },
    { id: 'bp-2', name: 'Dental PPO', type: 'dental', carrier: 'Delta Dental', status: 'active', effectiveDate: `${yr()}-01-01`, employerContribution: 35, employeeContribution: 15 },
    { id: 'bp-3', name: 'Vision', type: 'vision', carrier: 'VSP', status: 'active', effectiveDate: `${yr()}-01-01`, employerContribution: 10, employeeContribution: 5 },
    { id: 'bp-4', name: '401(k)', type: '401k', carrier: 'Fidelity', status: 'active', effectiveDate: `${yr()}-01-01`, employerContribution: 0, employeeContribution: 0 },
  ];
  await bulkInsert(store, 'hr/benefitPlan', benefitPlans);
  counts['Benefit Plans'] = benefitPlans.length;

  const enrollments: any[] = [];
  for (let i = 0; i < 20; i++) {
    enrollments.push({
      id: rid(), employeeId: `emp-${(i % 20) + 1}`, planId: pick(benefitPlans).id,
      planName: pick(benefitPlans).name, enrollmentDate: `${yr()}-01-01`,
      effectiveDate: `${yr()}-01-01`, status: 'enrolled',
      coverageLevel: pick(['employee','employee_spouse','family']),
      employeeContribution: randAmt(50, 300), employerContribution: randAmt(100, 500),
    });
  }
  await bulkInsert(store, 'hr/benefitEnrollment', enrollments);
  counts['Benefit Enrollments'] = enrollments.length;

  const leaveRequests: any[] = [];
  for (let i = 0; i < 8; i++) {
    leaveRequests.push({
      id: rid(), employeeId: `emp-${randInt(1, 20)}`, employeeName: empName(),
      type: pick(['vacation','sick','personal','fmla']),
      startDate: isoDate(-randInt(5, 30)), endDate: isoDate(-randInt(6, 35)),
      totalDays: randInt(1, 10), status: pick(['requested','approved','approved','completed','denied']),
      reason: pick(['Family vacation','Medical appointment','Personal matter','Moving']),
      approvedBy: i < 6 ? empName() : '', approvedDate: i < 6 ? isoDate(randInt(1, 5)) : '',
    });
  }
  await bulkInsert(store, 'hr/leaveRequest', leaveRequests);
  counts['Leave Requests'] = leaveRequests.length;

  const leaveBalances: any[] = [];
  for (let i = 0; i < 20; i++) {
    for (const type of ['vacation','sick'] as const) {
      const accrued = type === 'vacation' ? randInt(80, 120) : randInt(40, 64);
      const used = randInt(0, Math.floor(accrued * 0.7));
      leaveBalances.push({
        id: rid(), employeeId: `emp-${i + 1}`, type, year: yr(),
        accrued, used, available: accrued - used, carryOver: randInt(0, 16),
      });
    }
  }
  await bulkInsert(store, 'hr/leaveBalance', leaveBalances);
  counts['Leave Balances'] = leaveBalances.length;

  const applicants: any[] = [];
  for (let i = 0; i < 5; i++) {
    applicants.push({
      id: rid(), firstName: pick(EMPLOYEE_FIRST), lastName: pick(EMPLOYEE_LAST),
      email: `applicant${i + 1}@email.com`, positionId: pick(positions).id,
      positionTitle: pick(positions).title,
      status: pick(['applied','screening','interview','offer','hired','rejected']),
      appliedDate: isoDate(randInt(5, 60)),
      source: pick(['Indeed','LinkedIn','Referral','Website','Job Fair']),
    });
  }
  await bulkInsert(store, 'hr/applicant', applicants);
  counts['Applicants'] = applicants.length;

  const empDocs: any[] = [];
  for (let i = 0; i < 10; i++) {
    empDocs.push({
      id: rid(), employeeId: `emp-${randInt(1, 20)}`,
      name: pick(['W-4','I-9','Direct Deposit','Emergency Contact','Drug Test','Background Check','Offer Letter','Performance Review','Safety Training Cert','CDL Copy']),
      category: pick(['tax','identification','certification','performance','contract','benefits']),
      uploadDate: isoDate(randInt(10, 365)),
    });
  }
  await bulkInsert(store, 'hr/employeeDocument', empDocs);
  counts['Employee Documents'] = empDocs.length;

  // =========================================================================
  // INTERCOMPANY
  // =========================================================================

  const icTxns: any[] = [];
  for (let i = 0; i < 10; i++) {
    const from = pick(entities); let to = pick(entities);
    while (to.id === from.id) to = pick(entities);
    icTxns.push({
      id: rid(), transactionNumber: `IC-${yr()}-${String(i + 1).padStart(4, '0')}`,
      type: pick(['billing','loan','allocation','transfer']),
      status: pick(['pending','posted','eliminated']),
      fromEntityId: from.id, fromEntityName: from.name,
      toEntityId: to.id, toEntityName: to.name,
      amount: randAmt(5000, 200000), currency: 'USD', exchangeRate: 1, baseAmount: randAmt(5000, 200000),
      description: pick(['Shared overhead allocation','Management fee','Equipment rental','Labor recharge']),
      date: isoDate(randInt(5, 90)),
    });
  }
  await bulkInsert(store, 'ic/transaction', icTxns);
  counts['IC Transactions'] = icTxns.length;

  const eliminations: any[] = [];
  for (let i = 0; i < 3; i++) {
    eliminations.push({
      id: rid(), eliminationId: rid(), period: `${yr()}-Q${i + 1}`,
      description: `Q${i + 1} intercompany eliminations`,
      status: pick(['draft','approved','posted']),
      entries: '[]', totalDebits: randAmt(50000, 300000), totalCredits: randAmt(50000, 300000),
      createdBy: 'admin', createdDate: isoDate(randInt(10, 90)),
    });
  }
  await bulkInsert(store, 'ic/elimination', eliminations);
  counts['Eliminations'] = eliminations.length;

  const tpRules: any[] = [];
  for (let i = 0; i < 3; i++) {
    const from = entities[0]; const to = entities[i + 1];
    tpRules.push({
      id: rid(), name: `${from.name} → ${to.name} Services`,
      fromEntityId: from.id, toEntityId: to.id,
      serviceType: pick(['Equipment rental','IT services','Admin support']),
      method: pick(['cost_plus','market_rate','fixed_rate']),
      markupPct: pick([0.05, 0.10, 0.15]), effectiveDate: `${yr()}-01-01`, active: true,
    });
  }
  await bulkInsert(store, 'ic/transferPricing', tpRules);
  counts['Transfer Pricing Rules'] = tpRules.length;

  const ssAllocations: any[] = [];
  for (let i = 0; i < 3; i++) {
    ssAllocations.push({
      id: rid(), allocationId: rid(), period: `${yr()}-Q${i + 1}`,
      serviceName: pick(['IT Services','HR Admin','Accounting','Insurance']),
      totalAmount: randAmt(20000, 100000), method: pick(['headcount','revenue','custom']),
      allocations: '[]', createdBy: 'admin', createdDate: isoDate(randInt(10, 90)), posted: i < 2,
    });
  }
  await bulkInsert(store, 'ic/allocation', ssAllocations);
  counts['SS Allocations'] = ssAllocations.length;

  const mgmtFees: any[] = [];
  for (let i = 0; i < 4; i++) {
    const to = entities[i + 1];
    const basis = randAmt(500000, 2000000);
    const pct = pick([0.02, 0.03, 0.05]);
    mgmtFees.push({
      id: rid(), fromEntityId: entities[0].id, fromEntityName: entities[0].name,
      toEntityId: to.id, toEntityName: to.name,
      period: `${yr()}-Q${pick([1,2,3,4])}`, feeType: 'Management Fee',
      basisAmount: basis, feePct: pct, feeAmount: basis * pct,
      posted: Math.random() > 0.3, postDate: isoDate(randInt(5, 60)),
    });
  }
  await bulkInsert(store, 'ic/managementFee', mgmtFees);
  counts['Management Fees'] = mgmtFees.length;

  const trialBalances: any[] = [];
  for (const ent of entities.slice(0, 3)) {
    for (const [acctNum, acctName] of [['1000','Cash'],['1200','Accounts Receivable'],['2000','Accounts Payable']] as const) {
      trialBalances.push({
        id: rid(), period: `${yr()}-Q${qtr()}`, accountNumber: acctNum, accountName: acctName,
        entityId: ent.id, entityName: ent.name,
        debitBalance: randAmt(10000, 500000), creditBalance: randAmt(10000, 500000),
        eliminationDebit: randAmt(0, 20000), eliminationCredit: randAmt(0, 20000),
        consolidatedDebit: randAmt(10000, 480000), consolidatedCredit: randAmt(10000, 480000),
      });
    }
  }
  await bulkInsert(store, 'ic/trialBalance', trialBalances);
  counts['Trial Balances'] = trialBalances.length;

  const statements: any[] = [];
  for (const [stType, items] of [['income',['Revenue','Cost of Revenue','Gross Profit']],['balance_sheet',['Total Assets','Total Liabilities','Equity']]] as const) {
    for (let i = 0; i < items.length; i++) {
      statements.push({
        id: rid(), statementType: stType, period: `${yr()}-Q${qtr()}`,
        lineItem: items[i], lineOrder: i + 1, entityAmounts: '{}',
        eliminationAmount: randAmt(0, 50000), consolidatedAmount: randAmt(100000, 5000000),
        minorityInterest: 0,
      });
    }
  }
  await bulkInsert(store, 'ic/statement', statements);
  counts['Consolidated Statements'] = statements.length;

  const translations = [
    { fromCurrency: 'CAD', toCurrency: 'USD', rate: 0.74, rateType: 'current' },
    { fromCurrency: 'MXN', toCurrency: 'USD', rate: 0.058, rateType: 'average' },
    { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.08, rateType: 'current' },
  ].map(t => ({ id: rid(), entityId: pick(entities).id, ...t, effectiveDate: today() }));
  await bulkInsert(store, 'ic/translation', translations);
  counts['Currency Translations'] = translations.length;

  const icRecons: any[] = [];
  for (let i = 0; i < 3; i++) {
    const e1 = entities[0]; const e2 = entities[i + 1];
    const b1 = randAmt(20000, 100000); const b2 = b1 + randAmt(-500, 500);
    icRecons.push({
      id: rid(), period: `${yr()}-Q${qtr()}`,
      entity1Id: e1.id, entity1Name: e1.name, entity2Id: e2.id, entity2Name: e2.name,
      entity1Balance: b1, entity2Balance: b2, difference: Math.abs(b1 - b2),
      reconciled: Math.abs(b1 - b2) < 100, reconciledDate: Math.abs(b1 - b2) < 100 ? isoDate(5) : '',
    });
  }
  await bulkInsert(store, 'ic/reconciliation', icRecons);
  counts['IC Reconciliations'] = icRecons.length;

  const segments: any[] = [];
  for (const [name, sType] of [['West Region','region'],['East Region','region'],['Commercial','product_line'],['Residential','product_line']] as const) {
    segments.push({
      id: rid(), period: `${yr()}-Q${qtr()}`, segmentName: name, segmentType: sType,
      revenue: randAmt(500000, 5000000), expenses: randAmt(300000, 4000000),
      operatingIncome: randAmt(100000, 1000000), assets: randAmt(1000000, 10000000),
      liabilities: randAmt(500000, 5000000), headcount: randInt(10, 80),
    });
  }
  await bulkInsert(store, 'ic/segment', segments);
  counts['Segments'] = segments.length;

  // =========================================================================
  // UNION
  // =========================================================================

  const unions = [
    { id: 'union-1', name: 'IBEW Local 11', localNumber: '11', trade: 'Electrical', jurisdiction: 'Los Angeles County', status: 'active', contactName: 'Tom Wright', state: 'CA' },
    { id: 'union-2', name: 'Ironworkers Local 433', localNumber: '433', trade: 'Steel', jurisdiction: 'Southern California', status: 'active', contactName: 'Mike Hernandez', state: 'CA' },
    { id: 'union-3', name: 'Laborers Local 300', localNumber: '300', trade: 'General', jurisdiction: 'Los Angeles', status: 'active', contactName: 'Jose Garcia', state: 'CA' },
  ];
  await bulkInsert(store, 'union/union', unions);
  counts['Unions'] = unions.length;

  const rateTables: any[] = [];
  for (let i = 0; i < 4; i++) {
    const u = pick(unions);
    rateTables.push({
      id: `rt-${i + 1}`, unionId: u.id, name: `${u.name} - ${yr()} Rates`,
      effectiveDate: `${yr()}-07-01`, classification: pick(['Journeyman','Foreman','Apprentice 1st','Apprentice 3rd']),
      journeymanRate: randAmt(45, 75), apprenticePct: pick([0.5, 0.6, 0.7, 0.8, 0.9, 1.0]),
      status: 'active',
    });
  }
  await bulkInsert(store, 'union/rateTable', rateTables);
  counts['Rate Tables'] = rateTables.length;

  const rateLines: any[] = [];
  for (const rt of rateTables) {
    for (const [cat, rate] of [['base_wage', randAmt(40, 70)],['health', randAmt(8, 15)],['pension', randAmt(5, 12)]] as const) {
      rateLines.push({
        id: rid(), rateTableId: rt.id, category: cat, rate: rate as number,
        method: 'hourly', payableTo: cat === 'base_wage' ? 'employee' : 'fund',
        fundName: cat !== 'base_wage' ? `${pick(unions).name} ${(cat as string).charAt(0).toUpperCase() + (cat as string).slice(1)} Fund` : '',
      });
    }
  }
  await bulkInsert(store, 'union/rateTableLine', rateLines);
  counts['Rate Table Lines'] = rateLines.length;

  const fringes: any[] = [];
  for (const u of unions) {
    for (const [name, rate] of [['Health & Welfare', randAmt(10, 18)],['Pension', randAmt(6, 14)]] as const) {
      fringes.push({
        id: rid(), unionId: u.id, name, rate: rate as number, method: 'hourly',
        payableTo: 'fund', allocationMethod: 'plan',
        fundName: `${u.name} ${name} Fund`,
      });
    }
  }
  await bulkInsert(store, 'union/fringeBenefit', fringes);
  counts['Fringe Benefits'] = fringes.length;

  const unionPW: any[] = [];
  for (let i = 0; i < 5; i++) {
    const base = randAmt(35, 75); const fringe = randAmt(10, 25);
    unionPW.push({
      id: rid(), jurisdiction: pick(['Federal','California','New York']),
      state: pick(['CA','NY','TX']), projectType: pick(['federal','state','local']),
      classification: pick(['Carpenter','Electrician','Ironworker','Laborer','Operator']),
      trade: pick(TRADES), baseRate: base, fringeRate: fringe, totalRate: base + fringe,
      effectiveDate: `${yr()}-01-01`, source: pick(['davis_bacon','state']),
    });
  }
  await bulkInsert(store, 'union/prevailingWage', unionPW);
  counts['Union Prevailing Wages'] = unionPW.length;

  const unionCP: any[] = [];
  for (let i = 0; i < 4; i++) {
    const job = pick(jobs);
    unionCP.push({
      id: rid(), jobId: job.id, weekEndingDate: isoDate(i * 7),
      contractorName: pick(ENTITY_NAMES), projectName: job.name,
      reportNumber: `CPR-${String(i + 1).padStart(3, '0')}`,
      status: pick(['draft','submitted','approved']),
      totalGross: randAmt(20000, 80000), totalFringe: randAmt(5000, 20000),
      totalNet: randAmt(15000, 60000),
    });
  }
  await bulkInsert(store, 'union/certifiedPayroll', unionCP);
  counts['Union Certified Payroll'] = unionCP.length;

  const apprentices: any[] = [];
  for (let i = 0; i < 3; i++) {
    apprentices.push({
      id: rid(), employeeId: `emp-${randInt(30, 40)}`, unionId: pick(unions).id,
      trade: pick(TRADES), startDate: isoDate(randInt(90, 730)),
      periodNumber: randInt(1, 6), totalPeriods: pick([4, 5, 8]),
      currentRatio: pick([0.5, 0.6, 0.7, 0.8, 0.9]), status: 'active',
    });
  }
  await bulkInsert(store, 'union/apprentice', apprentices);
  counts['Apprentices'] = apprentices.length;

  const remittances: any[] = [];
  for (let i = 0; i < 4; i++) {
    remittances.push({
      id: rid(), unionId: pick(unions).id,
      periodStart: isoDate(i * 14 + 14), periodEnd: isoDate(i * 14),
      dueDate: isoDate(i * 14 - 10), totalHours: randInt(200, 800),
      totalAmount: randAmt(5000, 30000), status: pick(['draft','submitted','paid']),
      employeeCount: randInt(5, 20),
    });
  }
  await bulkInsert(store, 'union/remittance', remittances);
  counts['Remittances'] = remittances.length;

  // =========================================================================
  // SERVICE MANAGEMENT
  // =========================================================================

  const serviceAgreements: any[] = [];
  for (let i = 0; i < 4; i++) {
    serviceAgreements.push({
      id: `sa-${i + 1}`, customerId: pick(customers).id,
      name: `${pick(CUSTOMER_NAMES)} Service Agreement`,
      type: pick(['full_service','preventive','on_call']),
      status: pick(['active','active','active','expired']),
      startDate: isoDate(randInt(30, 365)), endDate: isoDate(-randInt(30, 365)),
      recurringAmount: randAmt(1000, 10000),
      billingFrequency: pick(['monthly','quarterly','annually']),
      responseTimeSla: pick(['4 hours','8 hours','24 hours','48 hours']),
    });
  }
  await bulkInsert(store, 'service/serviceAgreement', serviceAgreements);
  counts['Service Agreements'] = serviceAgreements.length;

  const workOrders: any[] = [];
  for (let i = 0; i < 10; i++) {
    const labor = randAmt(200, 3000); const material = randAmt(50, 2000);
    workOrders.push({
      id: `wo-${i + 1}`, agreementId: pick(serviceAgreements).id, customerId: pick(customers).id,
      number: `WO-${yr()}-${String(i + 1).padStart(4, '0')}`,
      type: pick(['scheduled','on_demand','emergency','callback']),
      status: pick(['open','assigned','in_progress','completed','invoiced']),
      priority: pick(['low','medium','high','emergency']),
      description: pick(['HVAC repair','Electrical fault','Plumbing leak','Generator maintenance','Fire alarm inspection','Roof leak repair']),
      assignedTo: empName(), scheduledDate: isoDate(randInt(-14, 30)),
      completedDate: i < 7 ? isoDate(randInt(0, 14)) : '',
      laborTotal: labor, materialTotal: material, totalAmount: labor + material,
      pricingType: pick(['flat_rate','tm']), flatRateAmount: 0,
      billingStatus: i < 5 ? 'billed' : 'unbilled',
    });
  }
  await bulkInsert(store, 'service/workOrder', workOrders);
  counts['Work Orders'] = workOrders.length;

  const woLines: any[] = [];
  for (const wo of workOrders.slice(0, 8)) {
    woLines.push(
      { id: rid(), workOrderId: wo.id, type: 'labor', description: 'Technician labor', quantity: randInt(2, 8), unitPrice: randAmt(65, 125), amount: randAmt(200, 1000) },
      { id: rid(), workOrderId: wo.id, type: 'material', description: pick(['Replacement parts','Filters','Wire','Fittings','Sealant']), quantity: randInt(1, 10), unitPrice: randAmt(10, 200), amount: randAmt(20, 800) },
    );
  }
  await bulkInsert(store, 'service/workOrderLine', woLines);
  counts['Work Order Lines'] = woLines.length;

  const serviceCalls: any[] = [];
  for (let i = 0; i < 8; i++) {
    serviceCalls.push({
      id: rid(), customerId: pick(customers).id,
      workOrderId: i < 5 ? `wo-${i + 1}` : '',
      callDate: isoTS(randInt(0, 30)),
      callType: pick(['request','complaint','inquiry','emergency']),
      priority: pick(['low','medium','high','emergency']),
      description: pick(['AC not cooling','Power outage in wing B','Bathroom leak','Generator alarm','Fire panel trouble']),
      callerName: empName(), status: pick(['new','dispatched','resolved']),
      assignedTo: i < 6 ? empName() : '',
    });
  }
  await bulkInsert(store, 'service/serviceCall', serviceCalls);
  counts['Service Calls'] = serviceCalls.length;

  const custEquip: any[] = [];
  for (let i = 0; i < 6; i++) {
    custEquip.push({
      id: `ce-${i + 1}`, customerId: pick(customers).id,
      name: pick(['Trane HVAC Unit','Carrier Chiller','Kohler Generator','Siemens Fire Panel','Otis Elevator','Grundfos Pump']),
      manufacturer: pick(['Trane','Carrier','Kohler','Siemens','Otis','Grundfos']),
      model: `Model-${randInt(100, 999)}`, serialNumber: `SN-${randInt(100000, 999999)}`,
      installDate: isoDate(randInt(180, 1800)),
      warrantyEndDate: isoDate(-randInt(0, 365)),
      location: pick(['Roof','Basement','Mechanical Room','Lobby','Penthouse']),
      status: 'active', lastServiceDate: isoDate(randInt(10, 90)),
      nextServiceDate: isoDate(-randInt(10, 90)),
    });
  }
  await bulkInsert(store, 'service/customerEquipment', custEquip);
  counts['Customer Equipment'] = custEquip.length;

  const pmSchedules: any[] = [];
  for (let i = 0; i < 4; i++) {
    pmSchedules.push({
      id: rid(), customerEquipmentId: `ce-${i + 1}`,
      agreementId: pick(serviceAgreements).id,
      name: pick(['Quarterly HVAC Filter Change','Annual Generator Load Test','Semi-Annual Fire Inspection','Monthly Elevator Check']),
      frequency: pick(['monthly','quarterly','semi_annual','annual']),
      lastPerformed: isoDate(randInt(10, 90)), nextDue: isoDate(-randInt(5, 60)),
      estimatedDuration: pick([1, 2, 4, 8]),
      assignedTo: empName(), status: 'active',
    });
  }
  await bulkInsert(store, 'service/preventiveMaintenance', pmSchedules);
  counts['PM Schedules'] = pmSchedules.length;

  const techTime: any[] = [];
  for (let i = 0; i < 12; i++) {
    const hours = randInt(1, 8); const rate = randAmt(65, 125);
    techTime.push({
      id: rid(), workOrderId: `wo-${(i % 10) + 1}`,
      technicianId: `emp-${randInt(1, 10)}`, date: isoDate(randInt(0, 30)),
      hours, hourlyRate: rate, amount: hours * rate, travelTime: pick([0, 0.5, 1, 1.5]),
      description: pick(['Diagnosis','Repair','Installation','Inspection','Testing']),
    });
  }
  await bulkInsert(store, 'service/technicianTimeEntry', techTime);
  counts['Technician Time'] = techTime.length;

  // =========================================================================
  // INVENTORY
  // =========================================================================

  const invItems: any[] = [];
  const itemData = ['Copper Wire 12AWG|lf|raw_material','PVC Pipe 4"|lf|raw_material','Concrete Mix 80lb|bag|raw_material','Rebar #5|lf|raw_material','2x4 Lumber 8ft|each|raw_material','Drywall 4x8|sheet|raw_material','Hard Hat|each|safety','Safety Vest|each|safety','Drill Bits Set|each|tool','Circular Saw Blade|each|consumable','Welding Rod E7018|lb|consumable','Joint Compound|gal|consumable','Outlet Box|each|raw_material','LED Light Fixture|each|raw_material','HVAC Filter 20x20|each|equipment_part'];
  for (let i = 0; i < itemData.length; i++) {
    const [desc, unit, cat] = itemData[i].split('|');
    const cost = randAmt(2, 150);
    invItems.push({
      id: `item-${i + 1}`, number: `MAT-${String(i + 1).padStart(4, '0')}`,
      description: desc, unit, category: cat,
      reorderPoint: randInt(10, 100), reorderQuantity: randInt(50, 500),
      unitCost: cost, lastCost: cost * (1 + (Math.random() - 0.5) * 0.1),
      avgCost: cost, active: true,
    });
  }
  await bulkInsert(store, 'inv/item', invItems);
  counts['Inventory Items'] = invItems.length;

  const warehouses = [
    { id: 'wh-1', name: 'Main Warehouse', type: 'warehouse', address: '1234 Industrial Blvd', active: true },
    { id: 'wh-2', name: 'Equipment Yard', type: 'yard', address: '5678 Yard Road', active: true },
    { id: 'wh-3', name: 'City Hall Site', type: 'job_site', jobId: 'job-1', active: true },
    { id: 'wh-4', name: 'Truck #12', type: 'vehicle', active: true },
  ];
  await bulkInsert(store, 'inv/warehouse', warehouses);
  counts['Warehouses'] = warehouses.length;

  const invTxns: any[] = [];
  for (let i = 0; i < 20; i++) {
    const item = pick(invItems);
    const qty = randInt(1, 50);
    invTxns.push({
      id: rid(), itemId: item.id, warehouseId: pick(warehouses).id,
      type: pick(['receipt','issue','issue','issue','transfer','adjustment']),
      quantity: qty, unitCost: item.unitCost as number, totalCost: qty * (item.unitCost as number),
      date: isoDate(randInt(1, 60)), reference: pick(['','PO-2026-0001','WO-2026-0001','']),
      jobId: Math.random() > 0.4 ? pick(jobs).id : '',
    });
  }
  await bulkInsert(store, 'inv/transaction', invTxns);
  counts['Inventory Txns'] = invTxns.length;

  const requisitions: any[] = [];
  for (let i = 0; i < 8; i++) {
    const item = pick(invItems);
    requisitions.push({
      id: rid(), number: `REQ-${yr()}-${String(i + 1).padStart(4, '0')}`,
      jobId: pick(jobs).id, requestedBy: empName(),
      requestDate: isoDate(randInt(1, 30)), neededDate: isoDate(-randInt(1, 14)),
      status: pick(['draft','submitted','approved','filled','cancelled']),
      itemId: item.id, itemDescription: item.description as string,
      quantity: randInt(5, 100), filledQuantity: randInt(0, 50),
      approvedBy: i < 5 ? empName() : '', approvedDate: i < 5 ? isoDate(randInt(1, 10)) : '',
    });
  }
  await bulkInsert(store, 'inv/requisition', requisitions);
  counts['Requisitions'] = requisitions.length;

  const invCounts: any[] = [];
  for (let i = 0; i < 5; i++) {
    const item = invItems[i];
    const sysQty = randInt(50, 200); const countedQty = sysQty + randInt(-10, 10);
    invCounts.push({
      id: rid(), warehouseId: 'wh-1', countDate: isoDate(randInt(5, 30)),
      status: pick(['draft','in_progress','completed','posted']),
      countedBy: empName(), itemId: item.id,
      systemQuantity: sysQty, countedQuantity: countedQty, variance: countedQty - sysQty,
      adjustmentPosted: countedQty === sysQty || i < 3,
    });
  }
  await bulkInsert(store, 'inv/count', invCounts);
  counts['Inventory Counts'] = invCounts.length;

  // =========================================================================
  // DOCUMENT MANAGEMENT
  // =========================================================================

  const docs: any[] = [];
  const docNames = ['General Conditions','Subcontract Agreement - Electrical','RFI #003 Response','Shop Drawing - Steel','Site Photo - Foundation','Monthly Progress Report','Insurance Certificate','Building Permit','Soil Test Report','Change Order #2','Drawing Set Rev C','Inspection Report','Safety Plan','Lien Waiver','Meeting Minutes 10/15'];
  for (let i = 0; i < docNames.length; i++) {
    docs.push({
      id: `doc-${i + 1}`, title: docNames[i],
      category: pick(['contract','change_order','rfi','submittal','drawing','photo','report','correspondence','insurance','permit']),
      description: `${docNames[i]} for ${pick(JOB_NAMES)}`,
      fileName: `${docNames[i].toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileSize: randInt(50000, 5000000), mimeType: 'application/pdf',
      jobId: pick(jobs).id, status: 'active',
      uploadedBy: empName(), uploadedAt: isoTS(randInt(5, 180)),
      tags: [pick(TRADES), pick(['important','review','archive'])],
    });
  }
  await bulkInsert(store, 'doc/document', docs);
  counts['Documents'] = docs.length;

  const revisions: any[] = [];
  for (let i = 0; i < 5; i++) {
    revisions.push({
      id: rid(), documentId: `doc-${randInt(1, 10)}`, revisionNumber: i + 1,
      description: `Revision ${i + 1} - Updated per comments`,
      uploadedBy: empName(), uploadedAt: isoTS(randInt(1, 30)),
    });
  }
  await bulkInsert(store, 'doc/revision', revisions);
  counts['Revisions'] = revisions.length;

  const templates = [
    { id: 'tpl-1', name: 'Subcontract Agreement', category: 'contract', isActive: true },
    { id: 'tpl-2', name: 'Change Order Form', category: 'change_order', isActive: true },
    { id: 'tpl-3', name: 'RFI Form', category: 'rfi', isActive: true },
    { id: 'tpl-4', name: 'Daily Report', category: 'report', isActive: true },
    { id: 'tpl-5', name: 'Lien Waiver', category: 'lien_waiver', isActive: true },
  ];
  await bulkInsert(store, 'doc/template', templates);
  counts['Templates'] = templates.length;

  const transmittals: any[] = [];
  for (let i = 0; i < 4; i++) {
    transmittals.push({
      id: rid(), number: `TR-${yr()}-${String(i + 1).padStart(3, '0')}`,
      jobId: pick(jobs).id, toName: empName(),
      toCompany: pick(VENDOR_NAMES), fromName: empName(),
      date: isoDate(randInt(5, 60)), subject: pick(['Shop drawings','Submittals','RFI response','Revised drawings']),
      status: pick(['draft','sent','acknowledged']), items: [],
    });
  }
  await bulkInsert(store, 'doc/transmittal', transmittals);
  counts['Transmittals'] = transmittals.length;

  const photos: any[] = [];
  for (let i = 0; i < 6; i++) {
    photos.push({
      id: rid(), documentId: `doc-${randInt(1, 15)}`, jobId: pick(jobs).id,
      dateTaken: isoDate(randInt(1, 60)),
      location: pick(['North Elevation','Foundation','Interior 2nd Floor','Parking Lot','Rooftop','Mechanical Room']),
      description: pick(['Progress photo','Safety inspection','Deficiency','Completed work','Material delivery']),
      takenBy: empName(),
    });
  }
  await bulkInsert(store, 'doc/photo', photos);
  counts['Photos'] = photos.length;

  // =========================================================================
  // ESTIMATING
  // =========================================================================

  const estimates: any[] = [];
  for (let i = 0; i < 4; i++) {
    const totalCost = randAmt(500000, 10000000);
    const markupPct = pick([0.08, 0.10, 0.12, 0.15]);
    const totalMarkup = totalCost * markupPct;
    estimates.push({
      id: `est-${i + 1}`, jobId: pick(jobs).id,
      name: `Estimate Rev ${i + 1}`, revision: i + 1,
      status: pick(['draft','submitted','won','lost']),
      totalCost, totalMarkup, totalPrice: totalCost + totalMarkup,
      marginPct: markupPct / (1 + markupPct),
      clientName: pick(CUSTOMER_NAMES), projectName: pick(JOB_NAMES),
      createdBy: empName(), defaultMarkupPct: markupPct,
      transferredToBudget: i === 2,
    });
  }
  await bulkInsert(store, 'job/estimate', estimates);
  counts['Estimates'] = estimates.length;

  const estLines: any[] = [];
  for (const est of estimates) {
    for (let i = 0; i < 5; i++) {
      const qty = randInt(1, 1000); const unitCost = randAmt(10, 500);
      const amount = qty * unitCost; const markupAmt = amount * (est.defaultMarkupPct as number);
      estLines.push({
        id: rid(), estimateId: est.id,
        description: pick(['Concrete foundation','Structural steel','Electrical rough-in','Plumbing','HVAC system','Roofing','Interior finishes','Site work','Demolition','Masonry']),
        costType: pick(['labor','material','equipment','subcontract','other']),
        quantity: qty, unit: pick(['sf','lf','ea','cy','ton','ls']),
        unitCost, amount, markupPct: est.defaultMarkupPct as number,
        markupAmount: markupAmt, totalPrice: amount + markupAmt,
        isAssembly: false, isAlternate: false, isAllowance: false, sortOrder: i,
      });
    }
  }
  await bulkInsert(store, 'job/estimateLine', estLines);
  counts['Estimate Lines'] = estLines.length;

  const bids: any[] = [];
  for (let i = 0; i < 12; i++) {
    bids.push({
      id: rid(), estimateId: pick(estimates).id,
      vendorId: pick(vendors).id, trade: pick(TRADES),
      description: `${pick(TRADES)} scope of work`,
      amount: randAmt(20000, 500000),
      status: pick(['solicited','received','selected','rejected']),
      receivedDate: i < 8 ? isoDate(randInt(5, 30)) : '',
      isLowBid: i < 3,
      contactName: empName(),
    });
  }
  await bulkInsert(store, 'job/bid', bids);
  counts['Bids'] = bids.length;

  // =========================================================================
  // ANALYTICS
  // =========================================================================

  const dashboards = [
    { id: 'dash-1', dashboardId: 'dash-1', name: 'Executive Overview', ownerId: 'admin', ownerName: 'Admin', isDefault: true, layout: 'grid', widgetIds: '[]', createdDate: today() },
    { id: 'dash-2', dashboardId: 'dash-2', name: 'Job Cost Analysis', ownerId: 'admin', ownerName: 'Admin', isDefault: false, layout: 'grid', widgetIds: '[]', createdDate: today() },
  ];
  await bulkInsert(store, 'analytics/dashboard', dashboards);
  counts['Dashboards'] = dashboards.length;

  const widgets: any[] = [
    { id: rid(), widgetId: rid(), dashboardId: 'dash-1', title: 'Revenue Trend', chartType: 'line', dataSource: 'gl/journalEntry', metrics: 'amount', width: 6, height: 4, posX: 0, posY: 0 },
    { id: rid(), widgetId: rid(), dashboardId: 'dash-1', title: 'Expense Breakdown', chartType: 'pie', dataSource: 'gl/journalEntry', metrics: 'amount', width: 6, height: 4, posX: 6, posY: 0 },
    { id: rid(), widgetId: rid(), dashboardId: 'dash-1', title: 'Job Profitability', chartType: 'bar', dataSource: 'job/job', metrics: 'contractAmount', width: 12, height: 4, posX: 0, posY: 4 },
    { id: rid(), widgetId: rid(), dashboardId: 'dash-2', title: 'Cost vs Budget', chartType: 'bar', dataSource: 'project/project', metrics: 'actualCost,budgetedCost', width: 12, height: 4, posX: 0, posY: 0 },
  ];
  await bulkInsert(store, 'analytics/widget', widgets);
  counts['Widgets'] = widgets.length;

  const kpiDefs: any[] = [
    { name: 'Gross Profit Margin', category: 'financial', formula: '(revenue - cogs) / revenue', unit: '%', targetValue: 0.25, warningThreshold: 0.18, higherIsBetter: true, active: true },
    { name: 'Current Ratio', category: 'financial', formula: 'current_assets / current_liabilities', unit: 'ratio', targetValue: 1.5, warningThreshold: 1.0, higherIsBetter: true, active: true },
    { name: 'Backlog', category: 'job_cost', formula: 'sum(contract_amount - billed_amount)', unit: '$', higherIsBetter: true, active: true },
    { name: 'OSHA Incident Rate', category: 'safety', formula: '(incidents * 200000) / total_hours', unit: 'rate', targetValue: 3.0, warningThreshold: 5.0, higherIsBetter: false, active: true },
    { name: 'Equipment Utilization', category: 'equipment', formula: 'hours_used / hours_available', unit: '%', targetValue: 0.75, higherIsBetter: true, active: true },
    { name: 'Bid Win Rate', category: 'job_cost', formula: 'won / total_bids', unit: '%', targetValue: 0.30, higherIsBetter: true, active: true },
  ].map(k => ({ id: rid(), kpiId: rid(), ...k }));
  await bulkInsert(store, 'analytics/kpi', kpiDefs);
  counts['KPI Definitions'] = kpiDefs.length;

  const jobFade: any[] = [];
  for (let i = 0; i < 3; i++) {
    const job = pick(jobs);
    const origMargin = randAmt(0.08, 0.20);
    const fadeAmt = randAmt(-0.05, 0.03);
    jobFade.push({
      id: rid(), jobId: job.id, jobName: job.name,
      originalMargin: origMargin, currentMargin: origMargin + fadeAmt,
      fadeAmount: fadeAmt, fadePct: fadeAmt / origMargin,
      period: `${yr()}-Q${qtr()}`, costOverruns: '[]', revenueShortfalls: '[]',
    });
  }
  await bulkInsert(store, 'analytics/jobFade', jobFade);
  counts['Job Fade Analyses'] = jobFade.length;

  const cfModels = [
    { id: rid(), modelId: rid(), name: '12-Month Cash Flow Forecast', method: 'moving_average', startDate: today(), endDate: isoDate(-365), periodicity: 'monthly', projectedInflows: '[]', projectedOutflows: '[]', netCashFlow: randAmt(-100000, 500000), confidenceLevel: 0.85 },
  ];
  await bulkInsert(store, 'analytics/cashFlowModel', cfModels);
  counts['Cash Flow Models'] = cfModels.length;

  const revForecasts: any[] = [];
  for (let i = 0; i < 6; i++) {
    const forecast = randAmt(200000, 2000000);
    const actual = i < 4 ? forecast + randAmt(-50000, 50000) : undefined;
    revForecasts.push({
      id: rid(), entityId: pick(entities).id, entityName: pick(ENTITY_NAMES),
      period: `${yr()}-${String(i + 1).padStart(2, '0')}`,
      forecastAmount: forecast, actualAmount: actual,
      variance: actual ? actual - forecast : undefined,
      method: 'moving_average', confidenceLevel: pick([0.7, 0.8, 0.85, 0.9]),
    });
  }
  await bulkInsert(store, 'analytics/revenueForecast', revForecasts);
  counts['Revenue Forecasts'] = revForecasts.length;

  const laborProd: any[] = [];
  for (let i = 0; i < 6; i++) {
    const hours = randInt(500, 2000); const units = randInt(100, 500);
    laborProd.push({
      id: rid(), period: `${yr()}-${String(i + 1).padStart(2, '0')}`,
      jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      totalHours: hours, totalUnits: units,
      costPerUnit: randAmt(50, 200), hoursPerUnit: hours / units,
      efficiencyPct: randAmt(0.7, 1.1), benchmark: 1.0,
    });
  }
  await bulkInsert(store, 'analytics/laborProductivity', laborProd);
  counts['Labor Productivity'] = laborProd.length;

  const equipROI: any[] = [];
  for (let i = 0; i < 5; i++) {
    const eq = equipment[i];
    const rev = randAmt(20000, 150000); const exp = randAmt(10000, 80000);
    equipROI.push({
      id: rid(), equipmentId: eq.id, equipmentName: eq.name,
      purchaseCost: eq.purchaseCost, totalRevenue: rev, totalExpenses: exp,
      netIncome: rev - exp, roiPct: (rev - exp) / (eq.purchaseCost as number),
      utilizationPct: randAmt(0.4, 0.95),
      costPerHour: randAmt(30, 150), revenuePerHour: randAmt(75, 350),
      ownershipMonths: randInt(12, 60),
    });
  }
  await bulkInsert(store, 'analytics/equipmentROI', equipROI);
  counts['Equipment ROI'] = equipROI.length;

  const vendorScores: any[] = [];
  for (let i = 0; i < 8; i++) {
    const v = vendors[i];
    vendorScores.push({
      id: rid(), vendorId: v.id, vendorName: v.name,
      qualityScore: randAmt(3, 5), deliveryScore: randAmt(3, 5),
      priceScore: randAmt(3, 5), communicationScore: randAmt(3, 5),
      overallScore: randAmt(3, 5), totalOrders: randInt(5, 50),
      onTimeDeliveryPct: randAmt(0.7, 0.99), defectRate: randAmt(0, 0.05),
      lastUpdated: today(),
    });
  }
  await bulkInsert(store, 'analytics/vendorScore', vendorScores);
  counts['Vendor Scores'] = vendorScores.length;

  const retentionAnalyses: any[] = [];
  for (let i = 0; i < 4; i++) {
    const start = randInt(80, 150); const terms = randInt(3, 15); const hires = randInt(2, 10);
    retentionAnalyses.push({
      id: rid(), period: `${yr()}-Q${i + 1}`,
      headcountStart: start, headcountEnd: start + hires - terms,
      hires, terminations: terms,
      turnoverRate: terms / start, retentionRate: 1 - terms / start,
      avgTenureDays: randInt(180, 1200),
      voluntaryTerms: randInt(1, terms), involuntaryTerms: terms - randInt(0, Math.floor(terms / 2)),
    });
  }
  await bulkInsert(store, 'analytics/retention', retentionAnalyses);
  counts['Retention Analyses'] = retentionAnalyses.length;

  const scenarios = [
    { id: rid(), scenarioId: rid(), name: 'Optimistic Growth', status: 'active', baselineData: '{}', adjustments: '{}', projectedRevenue: randAmt(10000000, 30000000), projectedExpenses: randAmt(8000000, 25000000), projectedProfit: randAmt(1000000, 5000000), createdBy: 'admin', createdDate: today() },
    { id: rid(), scenarioId: rid(), name: 'Conservative', status: 'active', baselineData: '{}', adjustments: '{}', projectedRevenue: randAmt(8000000, 15000000), projectedExpenses: randAmt(7000000, 14000000), projectedProfit: randAmt(500000, 2000000), createdBy: 'admin', createdDate: today() },
  ];
  await bulkInsert(store, 'analytics/scenario', scenarios);
  counts['Scenarios'] = scenarios.length;

  // Build period labels that match what the DashboardService generates
  const nowDate = new Date();
  const ytdStart = `${nowDate.getFullYear()}-01-01`;
  const ytdEnd = nowDate.toISOString().split('T')[0];
  const ytdLabel = `YTD (${ytdStart} - ${ytdEnd})`;
  const prevYr = nowDate.getFullYear() - 1;
  const prevYtdStart = `${prevYr}-01-01`;
  const prevYtdEnd = `${prevYr}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;
  const prevYtdLabel = `YTD (${prevYtdStart} - ${prevYtdEnd})`;

  // KPI benchmark records that the Executive Dashboard reads
  const kpiBenchmarks: { kpiCode: string; value: number; target?: number; prevValue: number }[] = [
    { kpiCode: 'revenue_ytd', value: randAmt(12000000, 28000000), target: 25000000, prevValue: randAmt(10000000, 22000000) },
    { kpiCode: 'gross_profit_pct', value: randAmt(18, 28), target: 22, prevValue: randAmt(16, 24) },
    { kpiCode: 'backlog', value: randAmt(15000000, 45000000), target: 30000000, prevValue: randAmt(12000000, 38000000) },
    { kpiCode: 'wip_total', value: randAmt(2000000, 8000000), prevValue: randAmt(1500000, 6000000) },
    { kpiCode: 'cash_position', value: randAmt(800000, 3500000), target: 1500000, prevValue: randAmt(600000, 2800000) },
    { kpiCode: 'ar_aging_total', value: randAmt(1200000, 4500000), prevValue: randAmt(1000000, 3800000) },
    { kpiCode: 'ap_aging_total', value: randAmt(900000, 3200000), prevValue: randAmt(800000, 2900000) },
    { kpiCode: 'equipment_utilization', value: randAmt(55, 85), target: 75, prevValue: randAmt(50, 80) },
    { kpiCode: 'payroll_burden_rate', value: randAmt(32, 48), target: 40, prevValue: randAmt(30, 45) },
    { kpiCode: 'safety_emr', value: randAmt(0.7, 1.1), target: 1.0, prevValue: randAmt(0.75, 1.15) },
    { kpiCode: 'bonding_utilized_pct', value: randAmt(45, 80), target: 70, prevValue: randAmt(40, 75) },
    { kpiCode: 'overbilling_total', value: randAmt(200000, 1200000), prevValue: randAmt(180000, 1000000) },
    { kpiCode: 'underbilling_total', value: randAmt(150000, 900000), prevValue: randAmt(120000, 800000) },
  ];

  const benchmarks: any[] = [];
  for (const kpi of kpiBenchmarks) {
    benchmarks.push({ id: rid(), kpiCode: kpi.kpiCode, period: ytdLabel, value: kpi.value, target: kpi.target });
    benchmarks.push({ id: rid(), kpiCode: kpi.kpiCode, period: prevYtdLabel, value: kpi.prevValue, target: kpi.target });
  }
  await bulkInsert(store, 'analytics/benchmark', benchmarks);
  counts['Benchmarks'] = benchmarks.length;

  const scheduledReports = [
    { id: rid(), reportId: rid(), name: 'Weekly Job Cost Summary', reportType: 'job_cost', schedule: 'weekly', recipients: 'pm@concrete.com', deliveryMethod: 'email', nextRunAt: isoDate(-7), active: true, createdBy: 'admin' },
    { id: rid(), reportId: rid(), name: 'Monthly Financial Package', reportType: 'financial', schedule: 'monthly', recipients: 'controller@concrete.com', deliveryMethod: 'email', nextRunAt: isoDate(-30), active: true, createdBy: 'admin' },
    { id: rid(), reportId: rid(), name: 'Daily Safety Report', reportType: 'safety', schedule: 'daily', recipients: 'safety@concrete.com', deliveryMethod: 'email', nextRunAt: isoDate(-1), active: true, createdBy: 'admin' },
  ];
  await bulkInsert(store, 'analytics/scheduledReport', scheduledReports);
  counts['Scheduled Reports'] = scheduledReports.length;

  const dataExports = [
    { id: rid(), exportId: rid(), name: 'QuickBooks GL Export', targetSystem: 'quickbooks', format: 'csv', collections: 'gl/journalEntry', active: true, lastExportAt: isoTS(1), recordCount: 960 },
    { id: rid(), exportId: rid(), name: 'Payroll API Export', targetSystem: 'adp', format: 'json', collections: 'payroll/payRun,payroll/employee', active: false, lastExportAt: isoTS(7), recordCount: 46 },
  ];
  await bulkInsert(store, 'analytics/dataExport', dataExports);
  counts['Data Exports'] = dataExports.length;

  // =========================================================================
  // MOBILE
  // =========================================================================

  const mobileTime: any[] = [];
  for (let i = 0; i < 20; i++) {
    const emp = pick(employees);
    mobileTime.push({
      id: rid(), employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`,
      jobId: pick(jobs).id, jobName: pick(JOB_NAMES), costCode: pick(['03','05','26','31']),
      date: isoDate(randInt(0, 14)), hours: pick([4, 6, 8, 8, 8, 10]),
      overtime: pick([0, 0, 0, 1, 2]),
      status: pick(['draft','submitted','approved','approved']),
      gpsLat: 34.05 + Math.random() * 0.1, gpsLon: -118.25 + Math.random() * 0.1,
      syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/timeEntry', mobileTime);
  counts['Mobile Time Entries'] = mobileTime.length;

  const mobileLogs: any[] = [];
  for (let i = 0; i < 5; i++) {
    mobileLogs.push({
      id: rid(), jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      date: isoDate(i), createdBy: empName(),
      weather: pick(['Clear','Cloudy','Rain','Windy']), temperature: `${randInt(50, 95)}°F`,
      crewCount: randInt(5, 25), workPerformed: pick(['Foundation work','Framing','Electrical','Concrete pour','Grading']),
      status: pick(['draft','submitted','approved']), syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/dailyLog', mobileLogs);
  counts['Mobile Daily Logs'] = mobileLogs.length;

  const inspections: any[] = [];
  for (let i = 0; i < 4; i++) {
    const total = randInt(15, 30); const passed = randInt(Math.floor(total * 0.7), total);
    inspections.push({
      id: rid(), templateName: pick(['Safety Walkthrough','Quality Check','Pre-Pour','Fire Safety','Scaffold Inspection']),
      jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      inspectorId: `emp-${randInt(1, 10)}`, inspectorName: empName(),
      date: isoDate(randInt(1, 14)), itemsTotal: total, itemsPassed: passed,
      itemsFailed: total - passed, overallStatus: passed === total ? 'pass' : 'fail',
      syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/inspection', inspections);
  counts['Mobile Inspections'] = inspections.length;

  const materialReceipts: any[] = [];
  for (let i = 0; i < 6; i++) {
    materialReceipts.push({
      id: rid(), jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      itemDescription: pick(['Rebar #5','Concrete 4000psi','Lumber 2x4','Pipe 4"','Wire 12AWG','Drywall sheets']),
      quantity: randInt(10, 500), unit: pick(['ea','lf','cy','ton','bundle']),
      receivedBy: empName(), date: isoDate(randInt(0, 14)),
      poNumber: `PO-${yr()}-${String(randInt(1, 15)).padStart(4, '0')}`,
      deliveryTicket: `DT-${randInt(10000, 99999)}`, syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/receipt', materialReceipts);
  counts['Material Receipts'] = materialReceipts.length;

  const equipLogs: any[] = [];
  for (let i = 0; i < 8; i++) {
    const eq = pick(equipment);
    equipLogs.push({
      id: rid(), equipmentId: eq.id, equipmentName: eq.name,
      jobId: pick(jobs).id, date: isoDate(randInt(0, 14)),
      hoursUsed: randInt(2, 10), meterReading: randInt(1000, 9000),
      operatorId: `emp-${randInt(1, 15)}`, operatorName: empName(),
      fuelAdded: randInt(0, 50), condition: pick(['good','good','fair','needs_service']),
      syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/equipmentLog', equipLogs);
  counts['Equipment Logs'] = equipLogs.length;

  const crewEntries: any[] = [];
  for (let i = 0; i < 5; i++) {
    crewEntries.push({
      id: rid(), foremanId: `emp-${randInt(1, 5)}`, foremanName: empName(),
      jobId: pick(jobs).id, jobName: pick(JOB_NAMES), costCode: pick(['03','05','26','31']),
      date: isoDate(randInt(0, 7)), crewMembers: '[]',
      crewSize: randInt(3, 12), totalHours: randInt(24, 96),
      status: pick(['draft','submitted','approved']), syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/crewEntry', crewEntries);
  counts['Crew Entries'] = crewEntries.length;

  const fieldWOs: any[] = [];
  for (let i = 0; i < 4; i++) {
    fieldWOs.push({
      id: rid(), workOrderId: `wo-${randInt(1, 10)}`,
      jobId: pick(jobs).id, jobName: pick(JOB_NAMES), assignedTo: empName(),
      description: pick(['Repair electrical outlet','Fix plumbing leak','Replace HVAC filter','Touch up paint']),
      status: pick(['assigned','in_progress','completed']),
      startedDate: isoDate(randInt(1, 7)), completedDate: i < 2 ? isoDate(randInt(0, 3)) : '',
      laborHours: randInt(1, 8), syncStatus: 'synced',
    });
  }
  await bulkInsert(store, 'mobile/fieldWO', fieldWOs);
  counts['Field Work Orders'] = fieldWOs.length;

  const notifications: any[] = [];
  for (let i = 0; i < 8; i++) {
    notifications.push({
      id: rid(), recipientId: `emp-${randInt(1, 10)}`,
      type: pick(['approval','alert','assignment','reminder']),
      title: pick(['Time entry approved','Safety alert','New work order assigned','Inspection due','Leave request','PO needs approval','Timecard reminder','Schedule change']),
      body: 'Please review and take action.',
      sentAt: isoTS(randInt(0, 7)), read: i < 5,
    });
  }
  await bulkInsert(store, 'mobile/notification', notifications);
  counts['Notifications'] = notifications.length;

  const qrScans: any[] = [];
  for (let i = 0; i < 4; i++) {
    qrScans.push({
      id: rid(), scannedBy: empName(), scannedAt: isoTS(randInt(0, 7)),
      qrData: `QR-${randInt(10000, 99999)}`,
      entityType: pick(['equipment','material','location']),
      entityId: pick(equipment).id, jobId: pick(jobs).id,
      action: pick(['check_in','check_out','inspect','log']),
    });
  }
  await bulkInsert(store, 'mobile/qrScan', qrScans);
  counts['QR Scans'] = qrScans.length;

  const signatures: any[] = [];
  for (let i = 0; i < 3; i++) {
    signatures.push({
      id: rid(), documentType: pick(['daily_log','inspection','work_order','receipt']),
      documentId: rid(), signerName: empName(),
      signerRole: pick(['Superintendent','Inspector','Foreman','Owner']),
      signedAt: isoTS(randInt(0, 14)), jobId: pick(jobs).id,
    });
  }
  await bulkInsert(store, 'mobile/signature', signatures);
  counts['Signatures'] = signatures.length;

  // =========================================================================
  // IMPORT / EXPORT
  // =========================================================================

  const importBatches = [
    { id: rid(), name: 'GL Import - January', sourceFormat: 'csv', collection: 'gl/journalEntry', status: 'completed', totalRows: 80, importedRows: 78, skippedRows: 2, errorRows: 0, mergeStrategy: 'append', compositeKeys: [], startedAt: isoTS(30), completedAt: isoTS(30) },
    { id: rid(), name: 'Vendor Import', sourceFormat: 'csv', collection: 'ap/vendor', status: 'completed', totalRows: 15, importedRows: 15, skippedRows: 0, errorRows: 0, mergeStrategy: 'skip', compositeKeys: ['name'], startedAt: isoTS(45), completedAt: isoTS(45) },
    { id: rid(), name: 'Employee Import', sourceFormat: 'csv', collection: 'payroll/employee', status: 'failed', totalRows: 40, importedRows: 35, skippedRows: 0, errorRows: 5, mergeStrategy: 'overwrite', compositeKeys: [], startedAt: isoTS(20) },
  ];
  await bulkInsert(store, 'integration/importBatch', importBatches);
  counts['Import Batches'] = importBatches.length;

  const exportJobs = [
    { id: rid(), name: 'Monthly GL Export', format: 'csv', collection: 'gl/journalEntry', status: 'completed', fileSize: 245000, startedAt: isoTS(5), completedAt: isoTS(5) },
    { id: rid(), name: 'Full Backup', format: 'json', collection: '*', status: 'completed', fileSize: 1250000, startedAt: isoTS(7), completedAt: isoTS(7) },
  ];
  await bulkInsert(store, 'integration/exportJob', exportJobs);
  counts['Export Jobs'] = exportJobs.length;

  const fieldMappings = [
    { id: rid(), batchId: importBatches[0].id, sourceField: 'Date', targetField: 'date', transform: 'date' },
    { id: rid(), batchId: importBatches[0].id, sourceField: 'Amount', targetField: 'amount', transform: 'number' },
    { id: rid(), batchId: importBatches[0].id, sourceField: 'Description', targetField: 'description', transform: 'trim' },
    { id: rid(), batchId: importBatches[1].id, sourceField: 'Vendor Name', targetField: 'name', transform: 'trim' },
    { id: rid(), batchId: importBatches[1].id, sourceField: 'Trade', targetField: 'trade', transform: 'none' },
    { id: rid(), batchId: importBatches[1].id, sourceField: 'Payment Terms', targetField: 'paymentTerms', transform: 'none' },
  ];
  await bulkInsert(store, 'integration/fieldMapping', fieldMappings);
  counts['Field Mappings'] = fieldMappings.length;

  // =========================================================================
  // DONE
  // =========================================================================

  const totalRecords = Object.values(counts).reduce((s, n) => s + n, 0);
  return { totalRecords, modules: counts };
}

// ---------------------------------------------------------------------------
// Cleanup — removes all simulation-tagged records
// ---------------------------------------------------------------------------

export async function cleanupSimulation(app: any): Promise<void> {
  const store = app.store;
  for (const name of ALL_COLLECTIONS) {
    try {
      const col = store.collection(name);
      const all = await col.getAll();
      const simRecords = (all as any[]).filter(r => r._simSource === 'simulation');
      for (const rec of simRecords) {
        await col.hardRemove(rec.id);
      }
    } catch {
      // Collection may not exist yet — skip
    }
  }
}

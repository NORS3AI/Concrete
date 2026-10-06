/**
 * Simulation Mode — Comprehensive Data Generator
 *
 * Populates every module in Concrete with realistic construction-industry
 * demo data so users can explore the full platform. Covers all phases
 * from GL through Tax & Regulatory Compliance (Phase 32).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rid(): string { return `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randAmt(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function isoDate(daysAgo: number): string { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split('T')[0]; }
function isoTS(daysAgo: number): string { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString(); }
function today(): string { return new Date().toISOString().split('T')[0]; }
function ts(): string { return new Date().toISOString(); }
function qtr(): number { return Math.ceil((new Date().getMonth() + 1) / 3); }
function yr(): number { return new Date().getFullYear(); }

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
// Collection bulk inserter
// ---------------------------------------------------------------------------

async function bulkInsert(store: any, collectionName: string, records: Record<string, unknown>[]): Promise<void> {
  const col = store.collection(collectionName);
  if (col.bulkInsert) {
    await col.bulkInsert(records);
  } else {
    for (const rec of records) {
      await col.insert(rec);
    }
  }
}

// ---------------------------------------------------------------------------
// Main Generator
// ---------------------------------------------------------------------------

export async function runSimulation(app: any): Promise<{ totalRecords: number; modules: Record<string, number> }> {
  const store = app.store;
  const counts: Record<string, number> = {};
  const now = ts();

  // =========================================================================
  // CORE DATA — Entities, Jobs, Vendors, Customers, Employees, Equipment
  // =========================================================================

  const entities = ENTITY_NAMES.map((name, i) => ({
    id: `ent-${i + 1}`, name, type: i === 0 ? 'holding' : i < 3 ? 'subsidiary' : 'division',
    parentId: i === 0 ? null : 'ent-1', status: 'active', industry: 'Construction',
    createdAt: now, updatedAt: now, version: 1,
  }));
  await bulkInsert(store, 'entity/entity', entities);
  counts['Entities'] = entities.length;

  const jobs = JOB_NAMES.map((name, i) => ({
    id: `job-${i + 1}`, number: `${yr()}-${String(i + 1).padStart(3, '0')}`, name,
    entityId: pick(entities).id, status: pick(['active','active','active','bidding','completed']),
    type: pick(['lump-sum','time-material','cost-plus','unit-price']),
    contractAmount: randAmt(500000, 25000000), startDate: isoDate(randInt(30, 365)),
    createdAt: now, updatedAt: now, version: 1,
  }));
  await bulkInsert(store, 'job/job', jobs);
  counts['Jobs'] = jobs.length;

  const vendors = VENDOR_NAMES.map((name, i) => ({
    id: `vendor-${i + 1}`, name, trade: pick(TRADES), status: 'active',
    is1099: i < 5, paymentTerms: pick(['Net 30','Net 45','Net 60','2/10 Net 30']),
    createdAt: now, updatedAt: now, version: 1,
  }));
  await bulkInsert(store, 'ap/vendor', vendors);
  counts['Vendors'] = vendors.length;

  const customers = CUSTOMER_NAMES.map((name, i) => ({
    id: `cust-${i + 1}`, name, entityId: pick(entities).id, status: 'active',
    creditLimit: randAmt(100000, 5000000), paymentTerms: pick(['Net 30','Net 45','Net 60']),
    createdAt: now, updatedAt: now, version: 1,
  }));
  await bulkInsert(store, 'ar/customer', customers);
  counts['Customers'] = customers.length;

  const employees: any[] = [];
  for (let i = 0; i < 40; i++) {
    employees.push({
      id: `emp-${i + 1}`, firstName: pick(EMPLOYEE_FIRST), lastName: pick(EMPLOYEE_LAST),
      entityId: pick(entities).id, trade: pick(TRADES),
      type: pick(['salary','hourly','hourly','hourly']), rate: randAmt(28, 85),
      status: 'active', hireDate: isoDate(randInt(60, 1800)),
      createdAt: now, updatedAt: now, version: 1,
    });
  }
  await bulkInsert(store, 'payroll/employee', employees);
  counts['Employees'] = employees.length;

  const equipment = EQUIP_NAMES.map((name, i) => ({
    id: `equip-${i + 1}`, name, type: pick(EQUIP_TYPES), entityId: pick(entities).id,
    status: pick(['available','in-use','in-use','in-use','maintenance']),
    hourlyRate: randAmt(75, 350), purchaseCost: randAmt(80000, 1500000),
    yearAcquired: 2019 + randInt(0, 5), hoursUsed: randInt(200, 8000),
    createdAt: now, updatedAt: now, version: 1,
  }));
  await bulkInsert(store, 'equip/equipment', equipment);
  counts['Equipment'] = equipment.length;

  // =========================================================================
  // GL — Journal Entries / Transactions
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
        description: `${type} - ${pick(JOB_NAMES)}`, createdAt: now, updatedAt: now, version: 1,
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
    apInvoices.push({
      id: rid(), vendorId: v.id, vendorName: v.name, invoiceNumber: `INV-${2024}-${String(i + 1).padStart(4, '0')}`,
      jobId: pick(jobs).id, amount: randAmt(2000, 150000), status: pick(['pending','approved','paid','paid','paid']),
      invoiceDate: isoDate(randInt(5, 90)), dueDate: isoDate(randInt(0, 30)),
      description: `${v.name} - ${pick(['Materials','Labor','Equipment rental','Subcontract work'])}`,
      createdAt: now, updatedAt: now, version: 1,
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
    arInvoices.push({
      id: rid(), customerId: c.id, customerName: c.name, invoiceNumber: `AR-${yr()}-${String(i + 1).padStart(4, '0')}`,
      jobId: pick(jobs).id, amount: randAmt(10000, 500000), status: pick(['sent','paid','paid','overdue']),
      invoiceDate: isoDate(randInt(5, 90)), dueDate: isoDate(randInt(0, 30)),
      description: `Progress billing - ${pick(JOB_NAMES)}`,
      createdAt: now, updatedAt: now, version: 1,
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
      id: `pr-${i + 1}`, period: `Period ${i + 1}`, payDate: isoDate(i * 14),
      status: i < 5 ? 'completed' : 'processing',
      totalGross: randAmt(80000, 250000), totalNet: randAmt(55000, 180000),
      totalTax: randAmt(15000, 50000), totalDeductions: randAmt(5000, 20000),
      employeeCount: employees.length,
      createdAt: now, updatedAt: now, version: 1,
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
      createdAt: now, updatedAt: now, version: 1,
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
      createdAt: now, updatedAt: now, version: 1,
    });
  }
  await bulkInsert(store, 'sub/subcontractor', subs);
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
      createdAt: now, updatedAt: now, version: 1,
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
      id: rid(), jobId: pick(jobs).id, jobName: pick(JOB_NAMES),
      date: isoDate(randInt(5, 180)), type: pick(['near-miss','first-aid','recordable','lost-time']),
      severity: pick(['low','medium','high']), description: `Safety incident at ${pick(JOB_NAMES)}`,
      employeeId: pick(employees).id, status: pick(['open','investigating','closed']),
      createdAt: now, updatedAt: now, version: 1,
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
    cos.push({
      id: rid(), coNumber: `CO-${String(i + 1).padStart(3, '0')}`,
      jobId: job.id, jobName: job.name, description: `Change order for ${job.name}`,
      amount: randAmt(5000, 500000), status: pick(['pending','approved','rejected','executed']),
      requestDate: isoDate(randInt(10, 90)),
      createdAt: now, updatedAt: now, version: 1,
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
      requestedBy: `${pick(EMPLOYEE_FIRST)} ${pick(EMPLOYEE_LAST)}`,
      requestedDate: isoDate(randInt(1, 30)), priority: pick(['low','medium','high']),
      createdAt: now, updatedAt: now, version: 1,
    });
  }
  await bulkInsert(store, 'wf/request', wfRequests);
  counts['Workflow Requests'] = wfRequests.length;

  // =========================================================================
  // INTEGRATION HUB — Connections
  // =========================================================================

  const integrations: any[] = [
    { id: rid(), integrationId: 'integ-1', provider: 'procore', name: 'Procore Sync', status: 'active', direction: 'bidirectional', apiUrl: '', apiKey: '', clientId: '', clientSecret: '', refreshToken: '', settings: '{}', syncInterval: 3600, lastSyncAt: isoTS(0), createdDate: today() },
    { id: rid(), integrationId: 'integ-2', provider: 'quickbooks', name: 'QuickBooks Online', status: 'active', direction: 'outbound', apiUrl: '', apiKey: '', clientId: '', clientSecret: '', refreshToken: '', settings: '{}', syncInterval: 1800, lastSyncAt: isoTS(1), createdDate: today() },
    { id: rid(), integrationId: 'integ-3', provider: 'adp', name: 'ADP Payroll', status: 'pending', direction: 'inbound', apiUrl: '', apiKey: '', clientId: '', clientSecret: '', refreshToken: '', settings: '{}', syncInterval: 86400, createdDate: today() },
  ];
  await bulkInsert(store, 'integ/integration', integrations);
  counts['Integrations'] = integrations.length;

  // =========================================================================
  // TAX & REGULATORY COMPLIANCE (Phase 32)
  // =========================================================================

  // Federal Filings
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

  // State Filings
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

  // Multi-state withholding
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

  // Reciprocity agreements
  const reciprocity = [
    { homeState: 'VA', workState: 'DC', exemptionType: 'Full', formRequired: 'D-4A' },
    { homeState: 'PA', workState: 'NJ', exemptionType: 'Full', formRequired: 'NJ-165' },
    { homeState: 'IL', workState: 'WI', exemptionType: 'Full', formRequired: 'W-220' },
    { homeState: 'IN', workState: 'KY', exemptionType: 'Full', formRequired: 'K-4' },
    { homeState: 'MD', workState: 'DC', exemptionType: 'Full', formRequired: 'D-4A' },
  ].map(a => ({
    id: rid(), agreementId: rid(), ...a,
    effectiveDate: '2020-01-01', expirationDate: '', active: true, notes: '',
  }));
  await bulkInsert(store, 'tax/reciprocity', reciprocity);
  counts['Reciprocity Agreements'] = reciprocity.length;

  // 1099 Forms
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

  // Sales & Use Tax
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

  // Contractor Licenses
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

  // OCIP/CCIP
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

  // EEO/AA Reports
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

  // Prevailing Wage Reports
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

  // Certified Payroll
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
      certifiedBy: i > 2 ? `${pick(EMPLOYEE_FIRST)} ${pick(EMPLOYEE_LAST)}` : '',
      certifiedDate: i > 2 ? isoDate(i * 7 - 1) : '', submittedDate: '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/certifiedPayroll', certPayroll);
  counts['Certified Payroll'] = certPayroll.length;

  // Audit Trail
  const auditEntries: any[] = [];
  const auditActions = [
    { action: 'create', entityType: 'federal_filing', desc: 'Created Form 941 Q1 filing' },
    { action: 'file', entityType: 'federal_filing', desc: 'Filed Form 941 Q1 - CONF-384729' },
    { action: 'create', entityType: 'state_filing', desc: 'Created CA DE-9 Q2 filing' },
    { action: 'generate', entityType: '1099', desc: 'Generated 1099-NEC for ABC Supply Co' },
    { action: 'file', entityType: '1099', desc: 'E-filed batch of 8 1099-NEC forms' },
    { action: 'import', entityType: 'tax_rates', desc: 'Imported 52 state tax rates for 2026' },
    { action: 'approve', entityType: 'certified_payroll', desc: 'Certified payroll for Highway 101 Bridge' },
    { action: 'create', entityType: 'eeoaa_report', desc: 'Created EEO-1 Annual report' },
    { action: 'update', entityType: 'license', desc: 'Renewed CA contractor license #CA-384621' },
    { action: 'create', entityType: 'year_end', desc: 'Initiated year-end processing for 2025' },
  ];
  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i];
    auditEntries.push({
      id: rid(), entryId: rid(), timestamp: isoTS(i * 3 + randInt(0, 2)),
      userId: 'admin', userName: 'Admin User', action: a.action,
      entityType: a.entityType, entityId: rid(), entityDescription: a.desc,
      previousValue: '', newValue: '', ipAddress: '192.168.1.100', sessionId: '', notes: '',
    });
  }
  await bulkInsert(store, 'tax/audit', auditEntries);
  counts['Audit Entries'] = auditEntries.length;

  // Tax Rates
  const taxRates: any[] = [];
  // Federal rates
  for (const [taxType, rate, wageBase] of [['fica_ss', 0.062, 168600], ['fica_med', 0.0145, 0], ['futa', 0.006, 7000]] as const) {
    taxRates.push({
      id: rid(), rateId: rid(), jurisdiction: 'Federal', jurisdictionLevel: 'federal',
      state: '', county: '', city: '', taxType, rate, wageBase,
      effectiveDate: `${yr()}-01-01`, expirationDate: '', source: 'manual',
      lastUpdated: ts(), updatedBy: 'admin', active: true, notes: '',
    });
  }
  // State income tax rates
  for (const [state, rate] of [['CA',0.093],['TX',0],['NY',0.0685],['FL',0],['IL',0.0495],['PA',0.0307],['OH',0.04],['GA',0.055],['NC',0.0525],['MI',0.0425]] as const) {
    taxRates.push({
      id: rid(), rateId: rid(), jurisdiction: `${state} State Income`, jurisdictionLevel: 'state',
      state, county: '', city: '', taxType: 'income', rate, wageBase: 0,
      effectiveDate: `${yr()}-01-01`, expirationDate: '', source: 'import',
      lastUpdated: ts(), updatedBy: 'admin', active: true, notes: '',
    });
  }
  // SUTA rates
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

  // Year-End Processing (prior year - completed)
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
  // DONE
  // =========================================================================

  const totalRecords = Object.values(counts).reduce((s, n) => s + n, 0);
  return { totalRecords, modules: counts };
}

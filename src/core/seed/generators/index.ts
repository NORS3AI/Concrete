/**
 * Phase Zed.20 - Seed Data Generators
 * Realistic construction industry data generators for entities, jobs,
 * cost codes, vendors, customers, employees, transactions, and equipment.
 */

// ---------------------------------------------------------------------------
// Reference Data
// ---------------------------------------------------------------------------

const ENTITY_NAMES: string[] = [
  'Concrete General Contractors',
  'Metro Mechanical',
  'Summit Electrical',
  'Ironworks Equipment',
  'Concrete Service Division',
];

const JOB_NAMES: string[] = [
  'City Hall Renovation',
  'Highway 101 Bridge',
  'Oakwood Medical Center',
  'Riverside Apartments Ph2',
  'Municipal Water Treatment',
  'Tech Campus Building C',
  'Airport Terminal Extension',
  'Downtown Parking Structure',
  'School District Modernization',
  'Industrial Park Phase 3',
];

const VENDOR_NAMES: string[] = [
  'ABC Supply Co',
  'Builders FirstSource',
  'HD Supply',
  'Ferguson Enterprises',
  'Graybar Electric',
  'Core & Main',
  'Kiewit Materials',
  'Vulcan Materials',
  'Martin Marietta',
  'US Concrete',
];

const TRADE_CATEGORIES: string[] = [
  'General',
  'Electrical',
  'Mechanical',
  'Plumbing',
  'HVAC',
  'Concrete',
  'Steel',
  'Roofing',
  'Fire Protection',
  'Excavation',
  'Paving',
  'Landscaping',
];

const EMPLOYEE_FIRST_NAMES: string[] = [
  'James',
  'Maria',
  'Robert',
  'Lisa',
  'Michael',
  'Jennifer',
  'David',
  'Sarah',
  'Carlos',
  'Emily',
];

const EMPLOYEE_LAST_NAMES: string[] = [
  'Johnson',
  'Martinez',
  'Williams',
  'Anderson',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Wilson',
  'Taylor',
];

const EQUIPMENT_NAMES: string[] = [
  'CAT 320 Excavator',
  'CAT D6 Dozer',
  'Liebherr LTM 1100',
  'John Deere 310L',
  'Komatsu PC200',
  'Volvo A30G',
  'Case 580N',
  'Bomag BW211',
  'Manitowoc 999',
  'Link-Belt 298',
];

const EQUIPMENT_TYPES: string[] = [
  'excavator',
  'dozer',
  'crane',
  'loader',
  'hauler',
  'compactor',
  'generator',
  'pump',
];

const JOB_STATUSES: string[] = [
  'active',
  'active',
  'active',
  'bidding',
  'completed',
  'closed',
];

const JOB_TYPES: string[] = [
  'lump-sum',
  'time-material',
  'cost-plus',
  'unit-price',
];

const PAYMENT_TERMS: string[] = [
  'Net 30',
  'Net 45',
  'Net 60',
  '2/10 Net 30',
];

const EQUIPMENT_STATUSES: string[] = [
  'available',
  'in-use',
  'in-use',
  'in-use',
  'maintenance',
];

const REVENUE_CATEGORIES: string[] = [
  'Contract Revenue',
  'Change Order',
  'T&M Billing',
  'Service Revenue',
];

const EXPENSE_CATEGORIES: string[] = [
  'Labor',
  'Materials',
  'Subcontractor',
  'Equipment',
  'Overhead',
  'Insurance',
  'Utilities',
];

const TRANSACTION_TYPES: string[] = [
  'revenue',
  'revenue',
  'expense',
  'expense',
  'expense',
  'asset',
  'liability',
];

// CSI MasterFormat divisions
const CSI_DIVISIONS: Array<{ code: string; name: string }> = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood/Plastics/Composites' },
  { code: '07', name: 'Thermal & Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
  { code: '22', name: 'Plumbing' },
  { code: '23', name: 'HVAC' },
  { code: '26', name: 'Electrical' },
  { code: '31', name: 'Earthwork' },
  { code: '32', name: 'Exterior Improvements' },
  { code: '33', name: 'Utilities' },
];

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function randomDate(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.floor(Math.random() * monthsBack));
  return d.toISOString();
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scaleCount(
  scale: string,
  small: number,
  medium: number,
  large: number,
): number {
  if (scale === 'small') return small;
  if (scale === 'large') return large;
  return medium;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export function generateEntities(
  scale: string,
): Record<string, unknown>[] {
  const count = scaleCount(scale, 1, 5, 20);
  return ENTITY_NAMES.slice(0, count).map((name, i) => ({
    id: `ent-${i + 1}`,
    name,
    type: i === 0 ? 'holding' : i < 3 ? 'subsidiary' : 'division',
    parentId: i === 0 ? null : 'ent-1',
    status: 'active',
    industry: 'Construction',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }));
}

export function generateJobs(
  scale: string,
  entities: Record<string, unknown>[],
): Record<string, unknown>[] {
  const count = scaleCount(scale, 5, 20, 100);
  return Array.from({ length: count }, (_, i) => ({
    id: `job-${i + 1}`,
    number: `${2024}-${String(i + 1).padStart(3, '0')}`,
    name: i < JOB_NAMES.length ? JOB_NAMES[i] : `Project ${i + 1}`,
    entityId: (pick(entities) as Record<string, unknown>).id,
    status: pick(JOB_STATUSES),
    type: pick(JOB_TYPES),
    contractAmount: randomAmount(100000, 50000000),
    startDate: randomDate(12),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }));
}

export function generateCostCodes(
  jobs: Record<string, unknown>[],
): Record<string, unknown>[] {
  const codes: Record<string, unknown>[] = [];
  const jobSlice = jobs.slice(0, 20); // Limit to first 20 jobs
  for (const job of jobSlice) {
    for (const div of CSI_DIVISIONS) {
      codes.push({
        id: randomId(),
        jobId: job.id,
        code: div.code,
        name: div.name,
        budgetAmount: randomAmount(10000, 500000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      });
    }
  }
  return codes;
}

export function generateVendors(
  scale: string,
): Record<string, unknown>[] {
  const count = scaleCount(scale, 10, 50, 200);
  return Array.from({ length: count }, (_, i) => ({
    id: `vendor-${i + 1}`,
    name: i < VENDOR_NAMES.length ? VENDOR_NAMES[i] : `Vendor ${i + 1}`,
    trade: pick(TRADE_CATEGORIES),
    status: 'active',
    is1099: Math.random() > 0.7,
    paymentTerms: pick(PAYMENT_TERMS),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }));
}

export function generateCustomers(
  scale: string,
  entities: Record<string, unknown>[],
): Record<string, unknown>[] {
  const count = scaleCount(scale, 5, 20, 100);
  return Array.from({ length: count }, (_, i) => ({
    id: `cust-${i + 1}`,
    name: `Customer ${i + 1}`,
    entityId: (pick(entities) as Record<string, unknown>).id,
    status: 'active',
    creditLimit: randomAmount(50000, 5000000),
    paymentTerms: pick(['Net 30', 'Net 45', 'Net 60']),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }));
}

export function generateEmployees(
  scale: string,
  entities: Record<string, unknown>[],
): Record<string, unknown>[] {
  const count = scaleCount(scale, 10, 50, 200);
  return Array.from({ length: count }, (_, i) => ({
    id: `emp-${i + 1}`,
    firstName: pick(EMPLOYEE_FIRST_NAMES),
    lastName: pick(EMPLOYEE_LAST_NAMES),
    entityId: (pick(entities) as Record<string, unknown>).id,
    trade: pick(TRADE_CATEGORIES),
    type: pick(['salary', 'hourly', 'hourly', 'hourly']),
    rate: randomAmount(25, 85),
    status: 'active',
    hireDate: randomDate(60),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }));
}

export function generateTransactions(
  scale: string,
  entities: Record<string, unknown>[],
  jobs: Record<string, unknown>[],
): Record<string, unknown>[] {
  const monthsOfData = scaleCount(scale, 3, 12, 24);
  const perMonth = scaleCount(scale, 20, 100, 500);
  const transactions: Record<string, unknown>[] = [];

  for (let m = 0; m < monthsOfData; m++) {
    for (let i = 0; i < perMonth; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      date.setDate(Math.floor(Math.random() * 28) + 1);

      const type = pick(TRANSACTION_TYPES);
      transactions.push({
        id: randomId(),
        entityId: (pick(entities) as Record<string, unknown>).id,
        jobId:
          Math.random() > 0.3
            ? (pick(jobs) as Record<string, unknown>).id
            : undefined,
        date: date.toISOString(),
        type,
        category:
          type === 'revenue'
            ? pick(REVENUE_CATEGORIES)
            : pick(EXPENSE_CATEGORIES),
        amount:
          type === 'revenue'
            ? randomAmount(5000, 500000)
            : -randomAmount(1000, 200000),
        description: `${type} transaction ${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      });
    }
  }
  return transactions;
}

export function generateEquipment(
  scale: string,
  entities: Record<string, unknown>[],
): Record<string, unknown>[] {
  const count = scaleCount(scale, 5, 25, 100);
  return Array.from({ length: count }, (_, i) => ({
    id: `equip-${i + 1}`,
    name:
      i < EQUIPMENT_NAMES.length ? EQUIPMENT_NAMES[i] : `Equipment ${i + 1}`,
    type: pick(EQUIPMENT_TYPES),
    entityId: (pick(entities) as Record<string, unknown>).id,
    status: pick(EQUIPMENT_STATUSES),
    hourlyRate: randomAmount(50, 350),
    purchaseCost: randomAmount(50000, 2000000),
    yearAcquired: 2018 + Math.floor(Math.random() * 6),
    hoursUsed: Math.floor(Math.random() * 5000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  }));
}

/**
 * Earnings / Deductions / Benefits Configuration view.
 * Three tabbed sections for managing earning types, deduction configurations,
 * and benefit plan configurations.
 * Wired to PayrollService for live data.
 */

import { getPayrollService } from '../service-accessor';
import type {
  EarningType, DeductionType, CalcMethod, BenefitType,
} from '../payroll-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EARNING_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'doubletime', label: 'Double Time' },
  { value: 'premium', label: 'Premium' },
  { value: 'perdiem', label: 'Per Diem' },
  { value: 'piecerate', label: 'Piece Rate' },
  { value: 'commission', label: 'Commission' },
];

const DEDUCTION_TYPE_OPTIONS = [
  { value: 'pretax', label: 'Pre-Tax' },
  { value: 'posttax', label: 'Post-Tax' },
  { value: 'garnishment', label: 'Garnishment' },
];

const BENEFIT_TYPE_OPTIONS = [
  { value: 'health', label: 'Health' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: 'life', label: 'Life' },
  { value: 'retirement', label: 'Retirement (401k)' },
  { value: 'hsa', label: 'HSA' },
  { value: 'fsa', label: 'FSA' },
  { value: 'other', label: 'Other' },
];

const CALC_METHOD_OPTIONS = [
  { value: 'flat', label: 'Flat Amount' },
  { value: 'percent', label: 'Percentage' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EarningRow {
  id: string;
  name: string;
  code: string;
  type: string;
  multiplier: number;
  isTaxable: boolean;
  isOvertime: boolean;
}

interface DeductionRow {
  id: string;
  name: string;
  code: string;
  type: string;
  method: string;
  amount: number;
  maxPerPeriod: number | null;
  maxPerYear: number | null;
}

interface BenefitRow {
  id: string;
  name: string;
  code: string;
  type: string;
  method: string;
  employeeContribution: number;
  employerContribution: number;
}

// ---------------------------------------------------------------------------
// Tab Bar
// ---------------------------------------------------------------------------

function buildTabBar(activeTab: string, onSwitch: (tab: string) => void): HTMLElement {
  const bar = el('div', 'flex border-b border-[var(--border)] mb-4');
  const tabs = [
    { id: 'earnings', label: 'Earnings' },
    { id: 'deductions', label: 'Deductions' },
    { id: 'benefits', label: 'Benefits' },
  ];

  for (const tab of tabs) {
    const isActive = tab.id === activeTab;
    const cls = isActive
      ? 'px-4 py-2 text-sm font-medium text-[var(--accent)] border-b-2 border-[var(--accent)]'
      : 'px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]';
    const btn = el('button', cls, tab.label);
    btn.type = 'button';
    btn.addEventListener('click', () => onSwitch(tab.id));
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Earnings Section
// ---------------------------------------------------------------------------

function buildEarningsSection(
  earnings: EarningRow[],
  onAdd: (data: { name: string; code: string; type: EarningType; multiplier: number }) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const section = el('div', '');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Add form
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Earning Type'));
  const grid = el('div', 'grid grid-cols-5 gap-3');

  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.placeholder = 'Name';
  grid.appendChild(nameInput);

  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.placeholder = 'Code';
  grid.appendChild(codeInput);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of EARNING_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  grid.appendChild(typeSelect);

  const multInput = el('input', inputCls) as HTMLInputElement;
  multInput.type = 'number';
  multInput.step = '0.1';
  multInput.value = '1.0';
  multInput.placeholder = 'Multiplier';
  grid.appendChild(multInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    if (!name || !code) return;
    onAdd({
      name,
      code,
      type: typeSelect.value as EarningType,
      multiplier: parseFloat(multInput.value) || 1.0,
    });
    nameInput.value = '';
    codeInput.value = '';
    multInput.value = '1.0';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  section.appendChild(card);

  // Table
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Code', 'Type', 'Multiplier', 'Taxable', 'Overtime', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (earnings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No earning types configured.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const earning of earnings) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', earning.name));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', earning.code));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', earning.type));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', earning.multiplier.toFixed(1)));
    tr.appendChild(el('td', 'py-2 px-3', earning.isTaxable ? 'Yes' : 'No'));
    tr.appendChild(el('td', 'py-2 px-3', earning.isOvertime ? 'Yes' : 'No'));
    const tdActions = el('td', 'py-2 px-3');
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(earning.id));
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

// ---------------------------------------------------------------------------
// Deductions Section
// ---------------------------------------------------------------------------

function buildDeductionsSection(
  deductions: DeductionRow[],
  onAdd: (data: { name: string; code: string; type: DeductionType; method: CalcMethod; amount: number }) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const section = el('div', '');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Add form
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Deduction'));
  const grid = el('div', 'grid grid-cols-5 gap-3');

  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.placeholder = 'Name';
  grid.appendChild(nameInput);

  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.placeholder = 'Code';
  grid.appendChild(codeInput);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of DEDUCTION_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  grid.appendChild(typeSelect);

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CALC_METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  grid.appendChild(methodSelect);

  const amountInput = el('input', inputCls) as HTMLInputElement;
  amountInput.type = 'number';
  amountInput.step = '0.01';
  amountInput.placeholder = 'Amount';
  grid.appendChild(amountInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const amount = parseFloat(amountInput.value) || 0;
    if (!name || !code || amount <= 0) return;
    onAdd({
      name,
      code,
      type: typeSelect.value as DeductionType,
      method: methodSelect.value as CalcMethod,
      amount,
    });
    nameInput.value = '';
    codeInput.value = '';
    amountInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  section.appendChild(card);

  // Table
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Code', 'Type', 'Method', 'Amount', 'Max/Period', 'Max/Year', 'Actions']) {
    const align = ['Amount', 'Max/Period', 'Max/Year'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (deductions.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No deductions configured.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const ded of deductions) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', ded.name));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', ded.code));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', ded.type));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', ded.method));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', ded.method === 'percent' ? `${ded.amount}%` : fmtCurrency(ded.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', ded.maxPerPeriod !== null ? fmtCurrency(ded.maxPerPeriod) : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', ded.maxPerYear !== null ? fmtCurrency(ded.maxPerYear) : '-'));
    const tdActions = el('td', 'py-2 px-3');
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(ded.id));
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

// ---------------------------------------------------------------------------
// Benefits Section
// ---------------------------------------------------------------------------

function buildBenefitsSection(
  benefits: BenefitRow[],
  onAdd: (data: {
    name: string;
    code: string;
    type: BenefitType;
    method: CalcMethod;
    employeeContribution: number;
    employerContribution: number;
  }) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const section = el('div', '');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Add form
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Benefit'));
  const grid = el('div', 'grid grid-cols-5 gap-3');

  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.placeholder = 'Name';
  grid.appendChild(nameInput);

  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.placeholder = 'Code';
  grid.appendChild(codeInput);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of BENEFIT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  grid.appendChild(typeSelect);

  const empContribInput = el('input', inputCls) as HTMLInputElement;
  empContribInput.type = 'number';
  empContribInput.step = '0.01';
  empContribInput.placeholder = 'EE Contrib';
  grid.appendChild(empContribInput);

  const erContribInput = el('input', inputCls) as HTMLInputElement;
  erContribInput.type = 'number';
  erContribInput.step = '0.01';
  erContribInput.placeholder = 'ER Contrib';
  grid.appendChild(erContribInput);

  const methodSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of CALC_METHOD_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    methodSelect.appendChild(o);
  }
  grid.appendChild(methodSelect);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    if (!name || !code) return;
    onAdd({
      name,
      code,
      type: typeSelect.value as BenefitType,
      method: methodSelect.value as CalcMethod,
      employeeContribution: parseFloat(empContribInput.value) || 0,
      employerContribution: parseFloat(erContribInput.value) || 0,
    });
    nameInput.value = '';
    codeInput.value = '';
    empContribInput.value = '';
    erContribInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  section.appendChild(card);

  // Table
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Code', 'Type', 'Method', 'EE Contribution', 'ER Contribution', 'Actions']) {
    const align = ['EE Contribution', 'ER Contribution'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (benefits.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No benefits configured.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const ben of benefits) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', ben.name));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', ben.code));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', ben.type));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', ben.method));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(ben.employeeContribution)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(ben.employerContribution)));
    const tdActions = el('td', 'py-2 px-3');
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(ben.id));
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Earnings, Deductions & Benefits'));
    wrapper.appendChild(headerRow);

    let activeTab = 'earnings';
    const contentArea = el('div', '');

    async function loadEarnings(): Promise<EarningRow[]> {
      const svc = getPayrollService();
      const data = await svc.getEarnings();
      return data.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        type: e.type,
        multiplier: e.multiplier,
        isTaxable: e.isTaxable,
        isOvertime: e.isOvertime,
      }));
    }

    async function loadDeductions(): Promise<DeductionRow[]> {
      const svc = getPayrollService();
      const data = await svc.getDeductions();
      return data.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        type: d.type,
        method: d.method,
        amount: d.amount,
        maxPerPeriod: d.maxPerPeriod ?? null,
        maxPerYear: d.maxPerYear ?? null,
      }));
    }

    async function loadBenefits(): Promise<BenefitRow[]> {
      const svc = getPayrollService();
      const data = await svc.getBenefits();
      return data.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        type: b.type,
        method: b.method,
        employeeContribution: b.employeeContribution,
        employerContribution: b.employerContribution,
      }));
    }

    async function renderTab(tab: string): Promise<void> {
      activeTab = tab;
      contentArea.innerHTML = '';

      try {
        if (tab === 'earnings') {
          const earnings = await loadEarnings();
          contentArea.appendChild(buildEarningsSection(
            earnings,
            (data) => {
              void (async () => {
                try {
                  const svc = getPayrollService();
                  await svc.createEarning(data);
                  showMsg(wrapper, 'Earning type created.', false);
                  void renderTab('earnings');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to create earning';
                  showMsg(wrapper, message, true);
                }
              })();
            },
            (id) => {
              if (!confirm('Delete this earning type?')) return;
              void (async () => {
                try {
                  const svc = getPayrollService();
                  await svc.deleteEarning(id);
                  showMsg(wrapper, 'Earning type deleted.', false);
                  void renderTab('earnings');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to delete earning';
                  showMsg(wrapper, message, true);
                }
              })();
            },
          ));
        } else if (tab === 'deductions') {
          const deductions = await loadDeductions();
          contentArea.appendChild(buildDeductionsSection(
            deductions,
            (data) => {
              void (async () => {
                try {
                  const svc = getPayrollService();
                  await svc.createDeduction(data);
                  showMsg(wrapper, 'Deduction created.', false);
                  void renderTab('deductions');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to create deduction';
                  showMsg(wrapper, message, true);
                }
              })();
            },
            (id) => {
              if (!confirm('Delete this deduction?')) return;
              void (async () => {
                try {
                  const svc = getPayrollService();
                  await svc.deleteDeduction(id);
                  showMsg(wrapper, 'Deduction deleted.', false);
                  void renderTab('deductions');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to delete deduction';
                  showMsg(wrapper, message, true);
                }
              })();
            },
          ));
        } else {
          const benefits = await loadBenefits();
          contentArea.appendChild(buildBenefitsSection(
            benefits,
            (data) => {
              void (async () => {
                try {
                  const svc = getPayrollService();
                  await svc.createBenefit(data);
                  showMsg(wrapper, 'Benefit created.', false);
                  void renderTab('benefits');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to create benefit';
                  showMsg(wrapper, message, true);
                }
              })();
            },
            (id) => {
              if (!confirm('Delete this benefit?')) return;
              void (async () => {
                try {
                  const svc = getPayrollService();
                  await svc.deleteBenefit(id);
                  showMsg(wrapper, 'Benefit deleted.', false);
                  void renderTab('benefits');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to delete benefit';
                  showMsg(wrapper, message, true);
                }
              })();
            },
          ));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        showMsg(wrapper, message, true);
      }
    }

    const tabBarContainer = el('div', '');
    function rebuildTabBar(): void {
      tabBarContainer.innerHTML = '';
      tabBarContainer.appendChild(buildTabBar(activeTab, (tab) => {
        void renderTab(tab);
        rebuildTabBar();
      }));
    }

    rebuildTabBar();
    wrapper.appendChild(tabBarContainer);

    void renderTab('earnings');
    wrapper.appendChild(contentArea);

    container.appendChild(wrapper);
  },
};

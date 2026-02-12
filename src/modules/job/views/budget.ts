/**
 * Budget management view for a single job.
 * Budget header with status/revision, line items table, add-line form, approve button.
 */

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const COST_TYPE_OPTIONS = [
  { value: 'labor', label: 'Labor' }, { value: 'material', label: 'Material' },
  { value: 'subcontract', label: 'Subcontract' }, { value: 'equipment', label: 'Equipment' },
  { value: 'overhead', label: 'Overhead' }, { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  revised: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

interface BudgetLineRow {
  id: string; costCode: string; costType: string;
  description: string; amount: number; quantity: number | null; unitCost: number | null;
}

function buildBudgetHeader(name: string, status: string, revision: number, totalAmount: number): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  const row = el('div', 'flex items-center justify-between');
  const left = el('div', 'flex items-center gap-4');
  left.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', name));
  const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? STATUS_BADGE.draft}`,
    status.charAt(0).toUpperCase() + status.slice(1));
  left.appendChild(badge);
  left.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Rev. ${revision}`));
  row.appendChild(left);
  row.appendChild(el('span', 'text-lg font-bold text-[var(--text)]', fmtCurrency(totalAmount)));
  card.appendChild(row);
  return card;
}

function buildLinesTable(lines: BudgetLineRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden mb-4');
  const table = el('table', 'w-full text-sm');
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Cost Code', 'Cost Type', 'Description', 'Qty', 'Unit Cost', 'Amount']) {
    const align = ['Qty', 'Unit Cost', 'Amount'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No budget lines yet. Add a line below.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  let total = 0;
  for (const line of lines) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-mono', line.costCode));
    tr.appendChild(el('td', 'py-2 px-3', line.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', line.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', line.quantity != null ? line.quantity.toLocaleString() : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', line.unitCost != null ? fmtCurrency(line.unitCost) : '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold', fmtCurrency(line.amount)));
    tbody.appendChild(tr);
    total += line.amount;
  }
  table.appendChild(tbody);
  if (lines.length > 0) {
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    for (let i = 0; i < 4; i++) footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3 text-right text-[var(--text-muted)]', 'Total'));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(total)));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);
  }
  wrap.appendChild(table);
  return wrap;
}

function buildAddLineForm(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Budget Line'));
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-6 gap-3');

  const ccInput = el('input', inputCls) as HTMLInputElement;
  ccInput.placeholder = 'Cost Code'; ccInput.name = 'costCode';
  grid.appendChild(ccInput);

  const ctSelect = el('select', inputCls) as HTMLSelectElement;
  ctSelect.name = 'costType';
  for (const opt of COST_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value; ctSelect.appendChild(o);
  }
  grid.appendChild(ctSelect);

  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.placeholder = 'Description'; descInput.name = 'description';
  grid.appendChild(descInput);

  const qtyInput = el('input', inputCls) as HTMLInputElement;
  qtyInput.type = 'number'; qtyInput.placeholder = 'Qty'; qtyInput.name = 'quantity';
  grid.appendChild(qtyInput);

  const ucInput = el('input', inputCls) as HTMLInputElement;
  ucInput.type = 'number'; ucInput.step = '0.01'; ucInput.placeholder = 'Unit Cost'; ucInput.name = 'unitCost';
  grid.appendChild(ucInput);

  const amtInput = el('input', inputCls) as HTMLInputElement;
  amtInput.type = 'number'; amtInput.step = '0.01'; amtInput.placeholder = 'Amount'; amtInput.name = 'amount';
  grid.appendChild(amtInput);

  card.appendChild(grid);
  const addBtn = el('button', 'mt-3 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => { /* add line placeholder */ });
  card.appendChild(addBtn);
  return card;
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Budget'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Job') as HTMLAnchorElement;
    backLink.href = '#/jobs';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);
    wrapper.appendChild(buildBudgetHeader('Original Budget', 'draft', 1, 0));
    const lines: BudgetLineRow[] = [];
    wrapper.appendChild(buildLinesTable(lines));
    wrapper.appendChild(buildAddLineForm());
    const approveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Approve Budget');
    approveBtn.type = 'button';
    approveBtn.addEventListener('click', () => { /* approve placeholder */ });
    wrapper.appendChild(approveBtn);
    container.appendChild(wrapper);
  },
};

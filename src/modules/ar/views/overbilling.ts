/**
 * Overbilling/Underbilling Analysis view.
 * Compares billed amounts vs earned revenue by job to identify
 * overbilling and underbilling conditions.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverbillingRow {
  jobId: string;
  jobNumber: string;
  jobName: string;
  customerName: string;
  contractAmount: number;
  totalBilled: number;
  totalCost: number;
  earnedRevenue: number;
  percentComplete: number;
  overbilled: number;
  underbilled: number;
  billingStatus: 'overbilled' | 'underbilled' | 'balanced';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  overbilled: 'bg-red-500/10 text-red-400 border border-red-500/20',
  underbilled: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  balanced: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  overbilled: 'Overbilled',
  underbilled: 'Underbilled',
  balanced: 'Balanced',
};

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search jobs...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of [
    { value: '', label: 'All' },
    { value: 'overbilled', label: 'Overbilled' },
    { value: 'underbilled', label: 'Underbilled' },
    { value: 'balanced', label: 'Balanced' },
  ]) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Billed', fmtCurrency(0)));
  row.appendChild(buildCard('Total Earned Revenue', fmtCurrency(0)));
  row.appendChild(buildCard('Net Overbilled', fmtCurrency(0), 'text-red-400'));
  row.appendChild(buildCard('Net Underbilled', fmtCurrency(0), 'text-amber-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: OverbillingRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Job', 'Customer', 'Contract', 'Total Billed', 'Total Cost', 'Earned Revenue', '% Complete', 'Overbilled', 'Underbilled', 'Status']) {
    const align = ['Contract', 'Total Billed', 'Total Cost', 'Earned Revenue', '% Complete', 'Overbilled', 'Underbilled'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No billing data available. Create invoices and AIA applications to generate the overbilling/underbilling analysis.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdJob = el('td', 'py-2 px-3');
    tdJob.appendChild(el('div', 'font-mono text-[var(--accent)]', row.jobNumber));
    tdJob.appendChild(el('div', 'text-xs text-[var(--text-muted)]', row.jobName));
    tr.appendChild(tdJob);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.customerName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.totalCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.earnedRevenue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.percentComplete)));

    const overbilledCls = row.overbilled > 0 ? 'py-2 px-3 text-right font-mono text-red-400' : 'py-2 px-3 text-right font-mono text-[var(--text-muted)]';
    tr.appendChild(el('td', overbilledCls, fmtCurrency(row.overbilled)));

    const underbilledCls = row.underbilled > 0 ? 'py-2 px-3 text-right font-mono text-amber-400' : 'py-2 px-3 text-right font-mono text-[var(--text-muted)]';
    tr.appendChild(el('td', underbilledCls, fmtCurrency(row.underbilled)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.billingStatus] ?? STATUS_BADGE.balanced}`,
      STATUS_LABELS[row.billingStatus] ?? row.billingStatus);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totalsRow = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-medium');
    totalsRow.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'Totals'));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-red-400', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(0)));
    totalsRow.appendChild(el('td', 'py-2 px-3', ''));
    tbody.appendChild(totalsRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Overbilling / Underbilling Analysis'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const rows: OverbillingRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};

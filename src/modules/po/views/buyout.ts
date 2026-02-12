/**
 * Buyout Tracking view.
 * Compares budget vs committed (PO) vs actual (invoiced) amounts by job and cost code.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string =>
  `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

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

interface BuyoutRow {
  costCodeId: string;
  description: string;
  budgetAmount: number;
  committedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePct: number;
}

// ---------------------------------------------------------------------------
// Job Selector
// ---------------------------------------------------------------------------

function buildJobSelector(onSelect: (jobId: string) => void): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.placeholder = 'Select or enter job...';
  bar.appendChild(jobInput);

  const loadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load Buyout');
  loadBtn.type = 'button';
  loadBtn.addEventListener('click', () => onSelect(jobInput.value));
  bar.appendChild(loadBtn);

  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]', 'Export CSV');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => { /* export placeholder */ });
  bar.appendChild(exportBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Buyout Table
// ---------------------------------------------------------------------------

function buildBuyoutTable(rows: BuyoutRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Cost Code', 'Description', 'Budget', 'Committed', 'Actual', 'Variance $', 'Variance %', 'Status']) {
    const align = ['Budget', 'Committed', 'Actual', 'Variance $', 'Variance %'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select a job above to view buyout tracking data.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', row.costCodeId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.budgetAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.committedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.actualAmount)));

    const varianceCls = row.varianceAmount >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${varianceCls}`, fmtCurrency(row.varianceAmount)));
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${varianceCls}`, fmtPct(row.variancePct)));

    // Status indicator
    const tdStatus = el('td', 'py-2 px-3');
    let statusLabel: string;
    let statusCls: string;
    if (row.committedAmount === 0 && row.budgetAmount > 0) {
      statusLabel = 'Unbought';
      statusCls = 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    } else if (row.varianceAmount >= 0) {
      statusLabel = 'Under Budget';
      statusCls = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else {
      statusLabel = 'Over Budget';
      statusCls = 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`, statusLabel);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totalRow = el('tr', 'bg-[var(--surface)] font-medium');
    totalRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    totalRow.appendChild(el('td', 'py-2 px-3', ''));

    const totalBudget = rows.reduce((sum, r) => sum + r.budgetAmount, 0);
    const totalCommitted = rows.reduce((sum, r) => sum + r.committedAmount, 0);
    const totalActual = rows.reduce((sum, r) => sum + r.actualAmount, 0);
    const totalVariance = rows.reduce((sum, r) => sum + r.varianceAmount, 0);
    const totalVariancePct = totalBudget !== 0 ? (totalVariance / totalBudget) * 100 : 0;

    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalBudget)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalCommitted)));
    totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalActual)));

    const varCls = totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400';
    totalRow.appendChild(el('td', `py-2 px-3 text-right font-mono font-bold ${varCls}`, fmtCurrency(totalVariance)));
    totalRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${varCls}`, fmtPct(totalVariancePct)));

    totalRow.appendChild(el('td', 'py-2 px-3', ''));

    tbody.appendChild(totalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: BuyoutRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const totalBudget = rows.reduce((sum, r) => sum + r.budgetAmount, 0);
  const totalCommitted = rows.reduce((sum, r) => sum + r.committedAmount, 0);
  const totalActual = rows.reduce((sum, r) => sum + r.actualAmount, 0);
  const totalVariance = rows.reduce((sum, r) => sum + r.varianceAmount, 0);
  const buyoutPct = totalBudget !== 0 ? (totalCommitted / totalBudget) * 100 : 0;

  const cardData = [
    { label: 'Budget', value: fmtCurrency(totalBudget), cls: 'text-[var(--text)]' },
    { label: 'Committed', value: fmtCurrency(totalCommitted), cls: 'text-blue-400' },
    { label: 'Actual', value: fmtCurrency(totalActual), cls: 'text-purple-400' },
    { label: 'Variance', value: fmtCurrency(totalVariance), cls: totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Buyout %', value: `${buyoutPct.toFixed(1)}%`, cls: 'text-amber-400' },
  ];

  for (const card of cardData) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    cardEl.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    section.appendChild(cardEl);
  }

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Buyout Tracking'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Compare budgeted amounts against committed (purchase orders) and actual (invoiced) costs by cost code.'));

    wrapper.appendChild(buildJobSelector((_jobId) => { /* load buyout data placeholder */ }));

    const rows: BuyoutRow[] = [];
    wrapper.appendChild(buildSummaryCards(rows));
    wrapper.appendChild(buildBuyoutTable(rows));

    container.appendChild(wrapper);
  },
};

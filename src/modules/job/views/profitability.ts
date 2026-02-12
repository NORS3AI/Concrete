/**
 * Job Profitability summary view across all active jobs.
 * Table with contract, COs, revised contract, budget, actual, committed,
 * projected cost, projected profit, and margin percentage.
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

interface ProfitRow {
  jobId: string;
  jobNumber: string;
  jobName: string;
  contractAmount: number;
  approvedCOs: number;
  revisedContract: number;
  totalBudget: number;
  actualCost: number;
  committedCost: number;
  projectedCost: number;
  projectedProfit: number;
  marginPct: number;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ProfitRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const cols = [
    'Job #', 'Name', 'Contract', 'Approved COs', 'Revised Contract',
    'Budget', 'Actual', 'Committed', 'Projected Cost', 'Projected Profit', 'Margin %',
  ];
  for (const col of cols) {
    const align = ['Contract', 'Approved COs', 'Revised Contract', 'Budget', 'Actual', 'Committed', 'Projected Cost', 'Projected Profit', 'Margin %'].includes(col)
      ? 'py-2 px-3 font-medium text-right whitespace-nowrap' : 'py-2 px-3 font-medium whitespace-nowrap';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No active jobs found.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totContract = 0, totCOs = 0, totRevised = 0, totBudget = 0;
  let totActual = 0, totCommitted = 0, totProjCost = 0, totProjProfit = 0;

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.jobNumber) as HTMLAnchorElement;
    link.href = `#/jobs/${row.jobId}/costs`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 truncate max-w-[200px]', row.jobName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.approvedCOs)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.revisedContract)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalBudget)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.actualCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.committedCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.projectedCost)));

    const profitCls = row.projectedProfit >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-semibold ${profitCls}`, fmtCurrency(row.projectedProfit)));

    const marginCls = row.marginPct >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-semibold ${marginCls}`, fmtPct(row.marginPct)));

    tbody.appendChild(tr);

    totContract += row.contractAmount;
    totCOs += row.approvedCOs;
    totRevised += row.revisedContract;
    totBudget += row.totalBudget;
    totActual += row.actualCost;
    totCommitted += row.committedCost;
    totProjCost += row.projectedCost;
    totProjProfit += row.projectedProfit;
  }

  table.appendChild(tbody);

  if (rows.length > 0) {
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    footRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totContract)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totCOs)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totRevised)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totBudget)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totActual)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totCommitted)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totProjCost)));
    const totalProfitCls = totProjProfit >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    footRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${totalProfitCls}`, fmtCurrency(totProjProfit)));
    const totalMargin = totRevised > 0 ? (totProjProfit / totRevised) * 100 : 0;
    const totalMarginCls = totalMargin >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    footRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${totalMarginCls}`, fmtPct(totalMargin)));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);
  }

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Job Profitability'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] border border-[var(--border)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    const rows: ProfitRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};

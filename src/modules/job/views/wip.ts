/**
 * WIP (Work In Progress) Schedule view across all active jobs.
 * Table with contract, budget, actual, ETC, EAC, % complete, earned revenue,
 * billed, over/under billing. Generate WIP button and totals row.
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

interface WipRow {
  jobId: string;
  jobNumber: string;
  jobName: string;
  contractAmount: number;
  totalBudget: number;
  actualCost: number;
  estimateToComplete: number;
  estimateAtCompletion: number;
  percentComplete: number;
  earnedRevenue: number;
  billedToDate: number;
  overUnderBilling: number;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: WipRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const cols = [
    'Job #', 'Name', 'Contract', 'Budget', 'Actual Cost', 'ETC', 'EAC',
    '% Complete', 'Earned Revenue', 'Billed', 'Over/Under',
  ];
  for (const col of cols) {
    const isNumeric = ['Contract', 'Budget', 'Actual Cost', 'ETC', 'EAC', '% Complete', 'Earned Revenue', 'Billed', 'Over/Under'].includes(col);
    const align = isNumeric
      ? 'py-2 px-3 font-medium text-right whitespace-nowrap' : 'py-2 px-3 font-medium whitespace-nowrap';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No WIP data found. Generate a WIP schedule to get started.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let totContract = 0, totBudget = 0, totActual = 0, totEtc = 0, totEac = 0;
  let totEarned = 0, totBilled = 0, totOverUnder = 0;

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.jobNumber) as HTMLAnchorElement;
    link.href = `#/jobs/${row.jobId}/costs`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 truncate max-w-[180px]', row.jobName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.totalBudget)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.actualCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.estimateToComplete)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.estimateAtCompletion)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(row.percentComplete)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.earnedRevenue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.billedToDate)));

    const ouCls = row.overUnderBilling >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-semibold ${ouCls}`, fmtCurrency(row.overUnderBilling)));

    tbody.appendChild(tr);

    totContract += row.contractAmount;
    totBudget += row.totalBudget;
    totActual += row.actualCost;
    totEtc += row.estimateToComplete;
    totEac += row.estimateAtCompletion;
    totEarned += row.earnedRevenue;
    totBilled += row.billedToDate;
    totOverUnder += row.overUnderBilling;
  }

  table.appendChild(tbody);

  // Totals row
  if (rows.length > 0) {
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    footRow.appendChild(el('td', 'py-2 px-3', 'Totals'));
    footRow.appendChild(el('td', 'py-2 px-3', ''));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totContract)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totBudget)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totActual)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totEtc)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totEac)));
    const avgPct = totEac > 0 ? (totActual / totEac) * 100 : 0;
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(avgPct)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totEarned)));
    footRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totBilled)));
    const ouTotCls = totOverUnder >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
    footRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${ouTotCls}`, fmtCurrency(totOverUnder)));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'WIP Schedule'));

    const btnGroup = el('div', 'flex items-center gap-3');
    const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate WIP');
    generateBtn.type = 'button';
    generateBtn.addEventListener('click', () => { /* generate WIP placeholder */ });
    btnGroup.appendChild(generateBtn);

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] border border-[var(--border)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);

    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    const rows: WipRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};

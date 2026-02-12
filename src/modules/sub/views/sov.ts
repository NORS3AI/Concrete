/**
 * Schedule of Values (SOV) view.
 * Displays a detailed schedule of values for a subcontract,
 * showing line items with scheduled value, previously billed,
 * current billing, total completed, and balance to finish.
 * Follows AIA G703 Continuation Sheet format.
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

interface SOVLine {
  lineNumber: number;
  description: string;
  scheduledValue: number;
  previouslyBilled: number;
  currentBilled: number;
  materialStored: number;
  totalCompleted: number;
  percentComplete: number;
  balanceToFinish: number;
  retainage: number;
}

interface SOVSummary {
  subcontractNumber: string;
  vendorName: string;
  jobName: string;
  originalAmount: number;
  changeOrders: number;
  revisedAmount: number;
  retentionPct: number;
}

// ---------------------------------------------------------------------------
// Header Card
// ---------------------------------------------------------------------------

function buildHeaderCard(summary: SOVSummary): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

  const titleRow = el('div', 'flex items-center justify-between mb-4');
  titleRow.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', `Schedule of Values - ${summary.subcontractNumber}`));
  titleRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Retention: ${summary.retentionPct}%`));
  card.appendChild(titleRow);

  const grid = el('div', 'grid grid-cols-5 gap-4');
  const summaryItems = [
    { label: 'Vendor', value: summary.vendorName },
    { label: 'Job', value: summary.jobName },
    { label: 'Original Amount', value: fmtCurrency(summary.originalAmount) },
    { label: 'Change Orders', value: fmtCurrency(summary.changeOrders) },
    { label: 'Revised Amount', value: fmtCurrency(summary.revisedAmount) },
  ];

  for (const item of summaryItems) {
    const div = el('div');
    div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', item.label));
    div.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', item.value));
    grid.appendChild(div);
  }

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildSOVTable(lines: SOVLine[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Description', 'Scheduled Value', 'Prev Billed', 'Current', 'Material Stored', 'Total Completed', '% Complete', 'Balance', 'Retainage']) {
    const align = ['Scheduled Value', 'Prev Billed', 'Current', 'Material Stored', 'Total Completed', '% Complete', 'Balance', 'Retainage'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No schedule of values defined. Add line items to track billing progress.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lines) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', line.lineNumber.toString()));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', line.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.scheduledValue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.previouslyBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.currentBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.materialStored)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.totalCompleted)));

    const pctCls = line.percentComplete >= 100
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono text-[var(--text)]';
    tr.appendChild(el('td', pctCls, fmtPct(line.percentComplete)));

    const balanceCls = line.balanceToFinish <= 0
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono';
    tr.appendChild(el('td', balanceCls, fmtCurrency(line.balanceToFinish)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.retainage)));

    tbody.appendChild(tr);
  }

  // Totals row
  if (lines.length > 0) {
    const totals = lines.reduce(
      (acc, l) => {
        acc.scheduledValue += l.scheduledValue;
        acc.previouslyBilled += l.previouslyBilled;
        acc.currentBilled += l.currentBilled;
        acc.materialStored += l.materialStored;
        acc.totalCompleted += l.totalCompleted;
        acc.balanceToFinish += l.balanceToFinish;
        acc.retainage += l.retainage;
        return acc;
      },
      { scheduledValue: 0, previouslyBilled: 0, currentBilled: 0, materialStored: 0, totalCompleted: 0, balanceToFinish: 0, retainage: 0 },
    );

    const totalPct = totals.scheduledValue > 0
      ? (totals.totalCompleted / totals.scheduledValue) * 100 : 0;

    const trTotal = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-semibold');
    trTotal.appendChild(el('td', 'py-2 px-3', ''));
    trTotal.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'TOTALS'));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.scheduledValue)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.previouslyBilled)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.currentBilled)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.materialStored)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.totalCompleted)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtPct(totalPct)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.balanceToFinish)));
    trTotal.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totals.retainage)));
    tbody.appendChild(trTotal);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Schedule of Values'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const addLineBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line Item');
    addLineBtn.type = 'button';
    addLineBtn.addEventListener('click', () => { /* add line placeholder */ });
    btnGroup.appendChild(addLineBtn);
    const backLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Back') as HTMLAnchorElement;
    backLink.href = '#/sub/contracts';
    btnGroup.appendChild(backLink);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    const summary: SOVSummary = {
      subcontractNumber: '',
      vendorName: '',
      jobName: '',
      originalAmount: 0,
      changeOrders: 0,
      revisedAmount: 0,
      retentionPct: 10,
    };
    wrapper.appendChild(buildHeaderCard(summary));

    const lines: SOVLine[] = [];
    wrapper.appendChild(buildSOVTable(lines));

    container.appendChild(wrapper);
  },
};

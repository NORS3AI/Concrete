/**
 * Schedule of Values (SOV) view.
 * Displays subcontract details and pay app progress as a schedule of values.
 * Follows AIA G703 Continuation Sheet format.
 * Wired to SubService for live subcontract and pay app data.
 */

import { getSubService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

function getIdFromHash(pattern: RegExp): string | null {
  const match = window.location.hash.match(pattern);
  if (match && match[1] !== 'new') return match[1];
  return null;
}

// ---------------------------------------------------------------------------
// Header Card
// ---------------------------------------------------------------------------

function buildHeaderCard(data: {
  number: string;
  vendorId: string;
  jobId: string;
  contractAmount: number;
  retentionPct: number;
  description: string;
  revisedAmount: number;
  approvedChangeOrders: number;
}): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

  const titleRow = el('div', 'flex items-center justify-between mb-4');
  titleRow.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', `Schedule of Values - ${data.number}`));
  titleRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Retention: ${data.retentionPct}%`));
  card.appendChild(titleRow);

  const grid = el('div', 'grid grid-cols-5 gap-4');
  const items = [
    { label: 'Vendor', value: data.vendorId },
    { label: 'Job', value: data.jobId },
    { label: 'Original Amount', value: fmtCurrency(data.contractAmount) },
    { label: 'Change Orders', value: fmtCurrency(data.approvedChangeOrders) },
    { label: 'Revised Amount', value: fmtCurrency(data.revisedAmount) },
  ];

  for (const item of items) {
    const div = el('div');
    div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', item.label));
    div.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', item.value));
    grid.appendChild(div);
  }

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// SOV Table (from pay apps)
// ---------------------------------------------------------------------------

interface SOVRow {
  applicationNumber: number;
  periodTo: string;
  previouslyBilled: number;
  currentBilled: number;
  materialStored: number;
  totalCompleted: number;
  percentComplete: number;
  balanceToFinish: number;
  retainage: number;
}

function buildSOVTable(rows: SOVRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['App #', 'Period', 'Previously Billed', 'Current Billed', 'Material Stored', 'Total Completed', '% Complete', 'Balance to Finish', 'Retainage']) {
    const align = ['Previously Billed', 'Current Billed', 'Material Stored', 'Total Completed', '% Complete', 'Balance to Finish', 'Retainage'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No pay applications found for this subcontract.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `#${row.applicationNumber}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.periodTo));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.previouslyBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentBilled)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.materialStored)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.totalCompleted)));

    const pctCls = row.percentComplete >= 100
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono text-[var(--text)]';
    tr.appendChild(el('td', pctCls, fmtPct(row.percentComplete)));

    const balanceCls = row.balanceToFinish <= 0
      ? 'py-2 px-3 text-right font-mono text-emerald-400'
      : 'py-2 px-3 text-right font-mono';
    tr.appendChild(el('td', balanceCls, fmtCurrency(row.balanceToFinish)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.retainage)));

    tbody.appendChild(tr);
  }

  // Totals row
  if (rows.length > 0) {
    const totals = rows.reduce(
      (acc, r) => {
        acc.previouslyBilled += r.previouslyBilled;
        acc.currentBilled += r.currentBilled;
        acc.materialStored += r.materialStored;
        acc.totalCompleted += r.totalCompleted;
        acc.balanceToFinish += r.balanceToFinish;
        acc.retainage += r.retainage;
        return acc;
      },
      { previouslyBilled: 0, currentBilled: 0, materialStored: 0, totalCompleted: 0, balanceToFinish: 0, retainage: 0 },
    );

    // Use the last row's percent complete as the overall (cumulative)
    const lastRow = rows[rows.length - 1];
    const totalPct = lastRow.percentComplete;

    const trTotal = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)] font-semibold');
    trTotal.appendChild(el('td', 'py-2 px-3', ''));
    trTotal.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', 'TOTALS'));
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

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getSubService();
    const subId = getIdFromHash(/\/sub\/contracts\/([^/]+)\/sov/);

    if (!subId) {
      showMsg(wrapper, 'No subcontract ID found in URL.', true);
      return;
    }

    const sub = await svc.getSubcontract(subId);
    if (!sub) {
      showMsg(wrapper, `Subcontract not found: ${subId}`, true);
      return;
    }

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Schedule of Values'));
    const backLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Back to Subcontracts') as HTMLAnchorElement;
    backLink.href = '#/sub/contracts';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Header card with subcontract summary
    wrapper.appendChild(buildHeaderCard({
      number: sub.number,
      vendorId: sub.vendorId,
      jobId: sub.jobId,
      contractAmount: sub.contractAmount,
      retentionPct: sub.retentionPct,
      description: sub.description ?? '',
      revisedAmount: sub.revisedAmount,
      approvedChangeOrders: sub.approvedChangeOrders,
    }));

    // Load pay apps for this subcontract
    const payApps = await svc.getPayApps({ subcontractId: subId });
    const revisedAmount = sub.revisedAmount;

    // Build SOV rows from pay apps
    let cumulativeBilled = 0;
    const sovRows: SOVRow[] = payApps.map((pa) => {
      const totalCompleted = cumulativeBilled + pa.currentBilled + pa.materialStored;
      const percentComplete = revisedAmount > 0 ? (totalCompleted / revisedAmount) * 100 : 0;
      const balanceToFinish = revisedAmount - totalCompleted;
      const retainage = pa.retainageAmount;

      const row: SOVRow = {
        applicationNumber: pa.applicationNumber,
        periodTo: pa.periodTo,
        previouslyBilled: cumulativeBilled,
        currentBilled: pa.currentBilled,
        materialStored: pa.materialStored,
        totalCompleted,
        percentComplete,
        balanceToFinish,
        retainage,
      };

      cumulativeBilled = totalCompleted;
      return row;
    });

    wrapper.appendChild(buildSOVTable(sovRows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load schedule of values';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

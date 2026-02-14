/**
 * Buyout Tracking view.
 * Compares budget vs committed (PO) vs actual (invoiced) amounts by job and cost code.
 * Wired to POService.
 */

import { getPOService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuyoutRow {
  jobId: string;
  costCodeId: string;
  description: string;
  budgetAmount: number;
  committedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePct: number;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    // Track current data for CSV export
    let currentRows: BuyoutRow[] = [];

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Buyout Tracking'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Compare budgeted amounts against committed (purchase orders) and actual (invoiced) costs by cost code.'));

    // ---- Job Selector Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const jobInput = el('input', inputCls) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Enter Job ID...';
    bar.appendChild(jobInput);

    const loadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load Buyout');
    loadBtn.type = 'button';
    bar.appendChild(loadBtn);

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]', 'Export CSV');
    exportBtn.type = 'button';
    bar.appendChild(exportBtn);

    wrapper.appendChild(bar);

    // ---- Summary Cards Container ----
    const summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Render Summary Cards ----
    function renderSummaryCards(rows: BuyoutRow[]): void {
      summaryContainer.innerHTML = '';

      if (rows.length === 0) return;

      const totalBudget = rows.reduce((sum, r) => sum + r.budgetAmount, 0);
      const totalCommitted = rows.reduce((sum, r) => sum + r.committedAmount, 0);
      const totalActual = rows.reduce((sum, r) => sum + r.actualAmount, 0);
      const totalVariance = rows.reduce((sum, r) => sum + r.varianceAmount, 0);
      const buyoutPct = totalBudget !== 0 ? (totalCommitted / totalBudget) * 100 : 0;

      const cardData = [
        { label: 'Total Budget', value: fmtCurrency(totalBudget), cls: 'text-[var(--text)]' },
        { label: 'Total Committed', value: fmtCurrency(totalCommitted), cls: 'text-blue-400' },
        { label: 'Total Actual', value: fmtCurrency(totalActual), cls: 'text-purple-400' },
        { label: 'Variance $', value: fmtCurrency(totalVariance), cls: totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Buyout %', value: fmtPct(buyoutPct), cls: 'text-amber-400' },
      ];

      const grid = el('div', 'grid grid-cols-5 gap-4 mb-6');
      for (const card of cardData) {
        const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
        cardEl.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', card.label));
        cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
        grid.appendChild(cardEl);
      }
      summaryContainer.appendChild(grid);
    }

    // ---- Render Buyout Table ----
    function renderBuyoutTable(rows: BuyoutRow[]): void {
      tableContainer.innerHTML = '';

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

        const varianceCls = row.varianceAmount > 0 ? 'text-emerald-400' : row.varianceAmount < 0 ? 'text-red-400' : 'text-[var(--text)]';
        tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${varianceCls}`, fmtCurrency(row.varianceAmount)));
        tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${varianceCls}`, fmtPct(row.variancePct)));

        // Status badge
        const tdStatus = el('td', 'py-2 px-3');
        let statusLabel: string;
        let statusCls: string;
        if (row.varianceAmount > 0 && row.committedAmount === 0) {
          statusLabel = 'Unbought';
          statusCls = 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
        } else if (row.varianceAmount >= 0 && row.committedAmount > 0) {
          statusLabel = 'Under Budget';
          statusCls = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        } else if (row.varianceAmount < 0) {
          statusLabel = 'Over Budget';
          statusCls = 'bg-red-500/10 text-red-400 border border-red-500/20';
        } else {
          // varianceAmount == 0 and committedAmount == 0
          statusLabel = 'Unbought';
          statusCls = 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
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

        const varCls = totalVariance > 0 ? 'text-emerald-400' : totalVariance < 0 ? 'text-red-400' : 'text-[var(--text)]';
        totalRow.appendChild(el('td', `py-2 px-3 text-right font-mono font-bold ${varCls}`, fmtCurrency(totalVariance)));
        totalRow.appendChild(el('td', `py-2 px-3 text-right font-mono ${varCls}`, fmtPct(totalVariancePct)));

        totalRow.appendChild(el('td', 'py-2 px-3', ''));

        tbody.appendChild(totalRow);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Data Loading ----
    async function loadBuyout(jobId: string): Promise<void> {
      if (!jobId.trim()) {
        showMsg(wrapper, 'Please enter a Job ID.', true);
        return;
      }

      const svc = getPOService();
      const rows = await svc.getBuyoutReport(jobId.trim());

      currentRows = rows;
      renderSummaryCards(rows);
      renderBuyoutTable(rows);
    }

    // ---- Event Handlers ----
    loadBtn.addEventListener('click', () => {
      void (async () => {
        try {
          await loadBuyout(jobInput.value);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- CSV Export ----
    exportBtn.addEventListener('click', () => {
      if (currentRows.length === 0) {
        showMsg(wrapper, 'No buyout data to export.', true);
        return;
      }

      const headers = ['Cost Code', 'Description', 'Budget', 'Committed', 'Actual', 'Variance $', 'Variance %', 'Status'];
      const csvRows = [headers.join(',')];

      for (const row of currentRows) {
        let status: string;
        if (row.varianceAmount > 0 && row.committedAmount === 0) {
          status = 'Unbought';
        } else if (row.varianceAmount >= 0 && row.committedAmount > 0) {
          status = 'Under Budget';
        } else if (row.varianceAmount < 0) {
          status = 'Over Budget';
        } else {
          status = 'Unbought';
        }

        const line = [
          `"${row.costCodeId}"`,
          `"${row.description}"`,
          row.budgetAmount,
          row.committedAmount,
          row.actualAmount,
          row.varianceAmount,
          `${row.variancePct.toFixed(1)}%`,
          `"${status}"`,
        ].join(',');
        csvRows.push(line);
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'buyout-tracking.csv';
      link.click();
      URL.revokeObjectURL(url);

      showMsg(wrapper, `Exported ${currentRows.length} buyout row(s) to CSV.`, false);
    });

    // ---- Render initial empty state ----
    renderSummaryCards([]);
    renderBuyoutTable([]);
  },
};

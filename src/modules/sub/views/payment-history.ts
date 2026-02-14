/**
 * Sub Payment History view.
 * Filterable table of all payment applications across subcontracts
 * with vendor and job context. Supports CSV export and open commitments
 * tab. Wired to SubService.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

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
    let currentPaymentRows: Array<{
      subcontractNumber: string;
      vendorName: string;
      applicationNumber: number;
      periodTo: string;
      currentBilled: number;
      retainageAmount: number;
      netPayable: number;
      status: string;
    }> = [];

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sub Payment History'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
    exportBtn.type = 'button';
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards Container ----
    const summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by vendor or subcontract...';
    bar.appendChild(searchInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
    bar.appendChild(fromLabel);
    const fromDate = el('input', inputCls) as HTMLInputElement;
    fromDate.type = 'date';
    fromDate.name = 'fromDate';
    bar.appendChild(fromDate);

    const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
    bar.appendChild(toLabel);
    const toDate = el('input', inputCls) as HTMLInputElement;
    toDate.type = 'date';
    toDate.name = 'toDate';
    bar.appendChild(toDate);

    wrapper.appendChild(bar);

    // ---- Tab Switcher ----
    let activeTab: 'history' | 'commitments' = 'history';
    const tabBar = el('div', 'flex items-center gap-1 mb-4 border-b border-[var(--border)]');

    const historyTab = el('button',
      'px-4 py-2 text-sm font-medium border-b-2 border-[var(--accent)] text-[var(--text)]',
      'Payment History');
    historyTab.type = 'button';

    const commitmentsTab = el('button',
      'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-[var(--text-muted)]',
      'Open Commitments');
    commitmentsTab.type = 'button';

    tabBar.appendChild(historyTab);
    tabBar.appendChild(commitmentsTab);
    wrapper.appendChild(tabBar);

    function updateTabStyles(): void {
      if (activeTab === 'history') {
        historyTab.className = 'px-4 py-2 text-sm font-medium border-b-2 border-[var(--accent)] text-[var(--text)]';
        commitmentsTab.className = 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-[var(--text-muted)]';
      } else {
        historyTab.className = 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-[var(--text-muted)]';
        commitmentsTab.className = 'px-4 py-2 text-sm font-medium border-b-2 border-[var(--accent)] text-[var(--text)]';
      }
    }

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Render Summary Cards ----
    function renderSummaryCards(
      rows: Array<{ currentBilled: number; retainageAmount: number; netPayable: number; status: string }>,
    ): void {
      summaryContainer.innerHTML = '';

      const totalBilled = rows.reduce((s, r) => s + r.currentBilled, 0);
      const totalRetainage = rows.reduce((s, r) => s + r.retainageAmount, 0);
      const totalNetPayable = rows.reduce((s, r) => s + r.netPayable, 0);
      const totalPaid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.netPayable, 0);

      const cards = [
        { label: 'Total Billed', value: fmtCurrency(totalBilled) },
        { label: 'Total Retainage', value: fmtCurrency(totalRetainage) },
        { label: 'Total Net Payable', value: fmtCurrency(totalNetPayable) },
        { label: 'Total Paid', value: fmtCurrency(totalPaid) },
      ];

      const grid = el('div', 'grid grid-cols-4 gap-4 mb-6');
      for (const card of cards) {
        const div = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
        div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
        div.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', card.value));
        grid.appendChild(div);
      }
      summaryContainer.appendChild(grid);
    }

    // ---- Render Payment History Table ----
    function renderHistoryTable(
      rows: Array<{
        subcontractNumber: string;
        vendorName: string;
        applicationNumber: number;
        periodTo: string;
        currentBilled: number;
        retainageAmount: number;
        netPayable: number;
        status: string;
      }>,
    ): void {
      tableContainer.innerHTML = '';

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      for (const col of ['SC #', 'Vendor', 'App #', 'Period To', 'Current Billed', 'Retainage', 'Net Payable', 'Status']) {
        const align = ['Current Billed', 'Retainage', 'Net Payable'].includes(col)
          ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', align, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No payment history found.');
        td.setAttribute('colspan', '8');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of rows) {
        const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

        tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.subcontractNumber));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.vendorName));
        tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', `#${row.applicationNumber}`));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.periodTo));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentBilled)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.retainageAmount)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.netPayable)));

        const tdStatus = el('td', 'py-2 px-3');
        const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
          row.status.charAt(0).toUpperCase() + row.status.slice(1));
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Render Open Commitments Table ----
    function renderCommitmentsTable(
      rows: Array<{
        subcontractNumber: string;
        vendorName: string;
        jobId: string;
        contractAmount: number;
        approvedChangeOrders: number;
        revisedAmount: number;
        billedToDate: number;
        remainingCommitment: number;
        retainageHeld: number;
        paidToDate: number;
      }>,
    ): void {
      tableContainer.innerHTML = '';

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      for (const col of ['SC #', 'Vendor', 'Job', 'Contract', 'Change Orders', 'Revised', 'Billed', 'Remaining', 'Retainage', 'Paid']) {
        const align = ['Contract', 'Change Orders', 'Revised', 'Billed', 'Remaining', 'Retainage', 'Paid'].includes(col)
          ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', align, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No open commitments found.');
        td.setAttribute('colspan', '10');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of rows) {
        const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

        tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', row.subcontractNumber));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.vendorName));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.jobId));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.contractAmount)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.approvedChangeOrders)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.revisedAmount)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.billedToDate)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.remainingCommitment)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.retainageHeld)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.paidToDate)));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Data Loading ----
    async function loadPaymentHistory(): Promise<void> {
      const svc = getSubService();

      let rows = await svc.getPaymentHistory();

      // Client-side status filter
      if (statusSelect.value) {
        rows = rows.filter((r) => r.status === statusSelect.value);
      }

      // Client-side date range filter
      if (fromDate.value) {
        rows = rows.filter((r) => r.periodTo >= fromDate.value);
      }
      if (toDate.value) {
        rows = rows.filter((r) => r.periodTo <= toDate.value);
      }

      // Client-side search
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        rows = rows.filter(
          (r) =>
            r.vendorName.toLowerCase().includes(search) ||
            r.subcontractNumber.toLowerCase().includes(search),
        );
      }

      currentPaymentRows = rows;
      renderSummaryCards(rows);
      renderHistoryTable(rows);
    }

    async function loadOpenCommitments(): Promise<void> {
      const svc = getSubService();

      let rows = await svc.getOpenCommitments();

      // Client-side search
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        rows = rows.filter(
          (r) =>
            r.vendorName.toLowerCase().includes(search) ||
            r.subcontractNumber.toLowerCase().includes(search),
        );
      }

      renderCommitmentsTable(rows);
    }

    async function loadActiveTab(): Promise<void> {
      if (activeTab === 'history') {
        await loadPaymentHistory();
      } else {
        await loadOpenCommitments();
      }
    }

    // ---- Tab Switching ----
    historyTab.addEventListener('click', () => {
      activeTab = 'history';
      updateTabStyles();
      void (async () => {
        try {
          await loadActiveTab();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load payment history.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    commitmentsTab.addEventListener('click', () => {
      activeTab = 'commitments';
      updateTabStyles();
      void (async () => {
        try {
          await loadActiveTab();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load open commitments.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- CSV Export ----
    exportBtn.addEventListener('click', () => {
      if (currentPaymentRows.length === 0) {
        showMsg(wrapper, 'No payment history data to export.', true);
        return;
      }

      const headers = ['SC #', 'Vendor', 'App #', 'Period To', 'Current Billed', 'Retainage', 'Net Payable', 'Status'];
      const csvRows = [headers.join(',')];

      for (const row of currentPaymentRows) {
        const line = [
          `"${row.subcontractNumber}"`,
          `"${row.vendorName}"`,
          row.applicationNumber,
          `"${row.periodTo}"`,
          row.currentBilled,
          row.retainageAmount,
          row.netPayable,
          `"${row.status}"`,
        ].join(',');
        csvRows.push(line);
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sub-payment-history.csv';
      link.click();
      URL.revokeObjectURL(url);

      showMsg(wrapper, `Exported ${currentPaymentRows.length} payment record(s) to CSV.`, false);
    });

    // ---- Filter Handlers ----
    statusSelect.addEventListener('change', () => {
      void (async () => {
        try { await loadActiveTab(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });
    searchInput.addEventListener('input', () => {
      void (async () => {
        try { await loadActiveTab(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });
    fromDate.addEventListener('change', () => {
      void (async () => {
        try { await loadActiveTab(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });
    toDate.addEventListener('change', () => {
      void (async () => {
        try { await loadActiveTab(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadActiveTab();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load payment data.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

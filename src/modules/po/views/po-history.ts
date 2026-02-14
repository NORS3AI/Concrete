/**
 * PO History view.
 * Shows purchase order history filterable by vendor, job, and status.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'partial_receipt', label: 'Partial Receipt' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  partial_receipt: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  standard: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  blanket: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  service: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface POHistoryRow {
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  jobId: string;
  type: string;
  status: string;
  amount: number;
  totalAmount: number;
  issuedDate: string;
  closedDate: string;
  amendmentCount: number;
  receiptCount: number;
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

    // Track current filtered data for CSV export
    let currentRows: POHistoryRow[] = [];

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'PO History'));
    wrapper.appendChild(headerRow);

    // ---- Summary Cards Container ----
    const summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search PO history...';
    bar.appendChild(searchInput);

    const vendorInput = el('input', inputCls) as HTMLInputElement;
    vendorInput.type = 'text';
    vendorInput.placeholder = 'Filter by vendor...';
    bar.appendChild(vendorInput);

    const jobInput = el('input', inputCls) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Filter by job...';
    bar.appendChild(jobInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]', 'Export CSV');
    exportBtn.type = 'button';
    bar.appendChild(exportBtn);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Render Summary Cards ----
    function renderSummaryCards(rows: POHistoryRow[]): void {
      summaryContainer.innerHTML = '';

      const totalPOs = rows.length;
      const openPOs = rows.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').length;
      const closedPOs = rows.filter((r) => r.status === 'closed').length;
      const totalValue = rows.reduce((sum, r) => sum + r.totalAmount, 0);
      const totalAmendments = rows.reduce((sum, r) => sum + r.amendmentCount, 0);

      const cardData = [
        { label: 'Total POs', value: String(totalPOs), cls: 'text-[var(--text)]' },
        { label: 'Open', value: String(openPOs), cls: 'text-blue-400' },
        { label: 'Closed', value: String(closedPOs), cls: 'text-emerald-400' },
        { label: 'Total Value', value: fmtCurrency(totalValue), cls: 'text-purple-400' },
        { label: 'Amendments', value: String(totalAmendments), cls: 'text-amber-400' },
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

    // ---- Render History Table ----
    function renderHistoryTable(rows: POHistoryRow[]): void {
      tableContainer.innerHTML = '';

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      for (const col of ['PO #', 'Vendor', 'Job', 'Type', 'Amount', 'Total', 'Issued', 'Closed', 'Amendments', 'Receipts', 'Status', 'Actions']) {
        const align = ['Amount', 'Total', 'Amendments', 'Receipts'].includes(col)
          ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
        headRow.appendChild(el('th', align, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No purchase order history found.');
        td.setAttribute('colspan', '12');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of rows) {
        const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

        const tdNum = el('td', 'py-2 px-3 font-mono');
        const link = el('a', 'text-[var(--accent)] hover:underline', row.poNumber) as HTMLAnchorElement;
        link.href = `#/po/${row.poId}`;
        tdNum.appendChild(link);
        tr.appendChild(tdNum);

        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.vendorName));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] font-mono', row.jobId));

        const tdType = el('td', 'py-2 px-3');
        const typeBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[row.type] ?? TYPE_BADGE.standard}`,
          row.type.charAt(0).toUpperCase() + row.type.slice(1));
        tdType.appendChild(typeBadge);
        tr.appendChild(tdType);

        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));
        tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(row.totalAmount)));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.issuedDate));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.closedDate || '-'));

        // Amendments badge
        const tdAmend = el('td', 'py-2 px-3 text-right');
        if (row.amendmentCount > 0) {
          const amendBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', String(row.amendmentCount));
          tdAmend.appendChild(amendBadge);
        } else {
          tdAmend.appendChild(el('span', 'text-[var(--text-muted)] font-mono', '0'));
        }
        tr.appendChild(tdAmend);

        // Receipts badge
        const tdReceipt = el('td', 'py-2 px-3 text-right');
        if (row.receiptCount > 0) {
          const receiptBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', String(row.receiptCount));
          tdReceipt.appendChild(receiptBadge);
        } else {
          tdReceipt.appendChild(el('span', 'text-[var(--text-muted)] font-mono', '0'));
        }
        tr.appendChild(tdReceipt);

        // Status badge
        const tdStatus = el('td', 'py-2 px-3');
        const statusLabel = row.status.replace(/_/g, ' ');
        const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
          statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);

        // View link
        const tdActions = el('td', 'py-2 px-3');
        const viewLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'View') as HTMLAnchorElement;
        viewLink.href = `#/po/${row.poId}`;
        tdActions.appendChild(viewLink);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      // Totals row
      if (rows.length > 0) {
        const totalRow = el('tr', 'bg-[var(--surface)] font-medium');
        const tdLabel = el('td', 'py-2 px-3', `${rows.length} Purchase Orders`);
        tdLabel.setAttribute('colspan', '4');
        totalRow.appendChild(tdLabel);

        const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
        const totalTotal = rows.reduce((sum, r) => sum + r.totalAmount, 0);
        totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(totalAmount)));
        totalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(totalTotal)));

        const emptyTd = el('td', 'py-2 px-3');
        emptyTd.setAttribute('colspan', '6');
        totalRow.appendChild(emptyTd);

        tbody.appendChild(totalRow);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Data Loading ----
    async function loadHistory(): Promise<void> {
      const svc = getPOService();

      // Build server-side filters (vendorId, jobId only supported by service)
      const filters: { vendorId?: string; jobId?: string } = {};
      // We do NOT pass vendorId/jobId to server because the inputs are free-text
      // partial matches, and the service does exact matching. We'll filter client-side.

      let rows = await svc.getPOHistory(filters);

      // Client-side status filter
      if (statusSelect.value) {
        rows = rows.filter((r) => r.status === statusSelect.value);
      }

      // Client-side vendor filter
      const vendorFilter = vendorInput.value.toLowerCase().trim();
      if (vendorFilter) {
        rows = rows.filter(
          (r) =>
            r.vendorName.toLowerCase().includes(vendorFilter) ||
            r.vendorId.toLowerCase().includes(vendorFilter),
        );
      }

      // Client-side job filter
      const jobFilter = jobInput.value.toLowerCase().trim();
      if (jobFilter) {
        rows = rows.filter((r) => r.jobId.toLowerCase().includes(jobFilter));
      }

      // Client-side search
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        rows = rows.filter(
          (r) =>
            r.poNumber.toLowerCase().includes(search) ||
            r.vendorName.toLowerCase().includes(search) ||
            r.vendorId.toLowerCase().includes(search) ||
            r.jobId.toLowerCase().includes(search),
        );
      }

      currentRows = rows;
      renderSummaryCards(rows);
      renderHistoryTable(rows);
    }

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => {
      void (async () => {
        try { await loadHistory(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });
    vendorInput.addEventListener('input', () => {
      void (async () => {
        try { await loadHistory(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });
    jobInput.addEventListener('input', () => {
      void (async () => {
        try { await loadHistory(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });
    statusSelect.addEventListener('change', () => {
      void (async () => {
        try { await loadHistory(); }
        catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Operation failed';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- CSV Export ----
    exportBtn.addEventListener('click', () => {
      if (currentRows.length === 0) {
        showMsg(wrapper, 'No PO history data to export.', true);
        return;
      }

      const headers = ['PO #', 'Vendor', 'Job', 'Type', 'Amount', 'Total', 'Issued', 'Closed', 'Amendments', 'Receipts', 'Status'];
      const csvRows = [headers.join(',')];

      for (const row of currentRows) {
        const line = [
          `"${row.poNumber}"`,
          `"${row.vendorName}"`,
          `"${row.jobId}"`,
          `"${row.type}"`,
          row.amount,
          row.totalAmount,
          `"${row.issuedDate}"`,
          `"${row.closedDate || ''}"`,
          row.amendmentCount,
          row.receiptCount,
          `"${row.status}"`,
        ].join(',');
        csvRows.push(line);
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'po-history.csv';
      link.click();
      URL.revokeObjectURL(url);

      showMsg(wrapper, `Exported ${currentRows.length} PO record(s) to CSV.`, false);
    });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadHistory();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load PO history.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

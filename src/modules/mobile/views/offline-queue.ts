/**
 * Offline Sync Queue view.
 * Displays offline queue items with action, collection, retry count, and sync status.
 * Shows pending/synced/failed counts in summary cards.
 */

import { getMobileService } from '../service-accessor';

const svc = () => getMobileService();

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const showMsg = (c: HTMLElement, msg: string, ok = true) => {
  const d = el('div', `p-3 rounded mb-4 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`, msg);
  c.prepend(d);
  setTimeout(() => d.remove(), 3000);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const SYNC_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  synced: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  conflict: 'bg-red-500/10 text-red-400 border border-red-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Offline Sync Queue'));
    const badge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6');

    const pendingCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    pendingCard.appendChild(el('p', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1', 'Pending'));
    const pendingCount = el('p', 'text-2xl font-bold text-amber-400', '0');
    pendingCard.appendChild(pendingCount);
    summaryRow.appendChild(pendingCard);

    const syncedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    syncedCard.appendChild(el('p', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1', 'Synced'));
    const syncedCount = el('p', 'text-2xl font-bold text-emerald-400', '0');
    syncedCard.appendChild(syncedCount);
    summaryRow.appendChild(syncedCard);

    const failedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    failedCard.appendChild(el('p', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1', 'Failed'));
    const failedCount = el('p', 'text-2xl font-bold text-red-400', '0');
    failedCard.appendChild(failedCount);
    summaryRow.appendChild(failedCard);

    wrapper.appendChild(summaryRow);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Loading State ----
    const loading = el('div', 'flex items-center justify-center py-12');
    loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading queue items...'));
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // ---- Load & Render ----
    async function loadTable(): Promise<void> {
      const service = svc();
      const records = await service.getQueueItems();

      // Update summary counts
      const pending = records.filter(r => r.syncStatus === 'pending').length;
      const synced = records.filter(r => r.syncStatus === 'synced').length;
      const failed = records.filter(r => r.syncStatus === 'failed' || r.syncStatus === 'conflict').length;

      pendingCount.textContent = String(pending);
      syncedCount.textContent = String(synced);
      failedCount.textContent = String(failed);

      badge.textContent = String(records.length);
      renderTable(records);
    }

    function renderTable(records: any[]): void {
      tableContainer.innerHTML = '';

      if (records.length === 0) {
        const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
        empty.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'Offline queue is empty. Items queued while offline will appear here.'));
        tableContainer.appendChild(empty);
        return;
      }

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Action', 'Collection', 'Record ID', 'Created At', 'Retry Count', 'Last Error', 'Sync Status']) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const row of records) {
        const tr = el('tr', trCls);

        tr.appendChild(el('td', tdCls + ' font-medium', row.action));
        tr.appendChild(el('td', tdCls + ' font-mono text-xs', row.collection));
        tr.appendChild(el('td', tdCls + ' font-mono text-xs text-[var(--text-muted)]', row.recordId || '--'));

        // Format timestamp
        const createdDate = new Date(row.createdAt);
        const formattedDate = createdDate.toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', formattedDate));

        // Retry count with warning color for high retries
        const retryTd = el('td', tdCls + ' font-mono text-right');
        const retryText = String(row.retryCount);
        if (row.retryCount >= 3) {
          retryTd.appendChild(el('span', 'text-red-400 font-medium', retryText));
        } else if (row.retryCount > 0) {
          retryTd.appendChild(el('span', 'text-amber-400', retryText));
        } else {
          retryTd.textContent = retryText;
        }
        tr.appendChild(retryTd);

        // Last error - truncate
        const errorText = row.lastError
          ? (row.lastError.length > 40 ? row.lastError.substring(0, 40) + '...' : row.lastError)
          : '--';
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)] text-xs', errorText));

        // Sync status badge
        const tdSync = el('td', tdCls);
        const syncCls = SYNC_BADGE[row.syncStatus] ?? SYNC_BADGE.pending;
        const syncLabel = row.syncStatus.charAt(0).toUpperCase() + row.syncStatus.slice(1);
        tdSync.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${syncCls}`, syncLabel));
        tr.appendChild(tdSync);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load offline queue.';
        showMsg(wrapper, message, false);
      }
    })();
  },
};

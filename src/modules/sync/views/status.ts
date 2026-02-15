/**
 * Sync Status Indicators view.
 * Shows component sync status with last sync time, pending changes, and status.
 * Color-coded: synced=emerald, syncing=blue, pending=amber, error=red, offline=zinc.
 */

import { getSyncService } from '../service-accessor';

const svc = () => getSyncService();

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
  setTimeout(() => msg.remove(), 3000);
}

const STATUS_BADGE: Record<string, string> = {
  synced: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  syncing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border border-red-500/20',
  offline: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  pending: 'Pending',
  error: 'Error',
  offline: 'Offline',
};

const STATUS_DOT: Record<string, string> = {
  synced: 'bg-emerald-500',
  syncing: 'bg-blue-500',
  pending: 'bg-amber-500',
  error: 'bg-red-500',
  offline: 'bg-zinc-500',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sync Status'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading sync status...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().getStatusIndicators();
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Component', 'Status', 'Last Sync', 'Pending Changes', 'Error Message']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No sync status indicators found.');
          td.setAttribute('colspan', '5');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          // Component with status dot
          const tdComp = el('td', 'px-4 py-3 text-sm');
          const compWrap = el('div', 'flex items-center gap-2');
          const dot = el('div', `w-2.5 h-2.5 rounded-full ${STATUS_DOT[item.status] ?? STATUS_DOT.offline}`);
          compWrap.appendChild(dot);
          compWrap.appendChild(el('span', 'text-[var(--text)] font-medium', item.component));
          tdComp.appendChild(compWrap);
          tr.appendChild(tdComp);

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.offline}`,
            STATUS_LABEL[item.status] ?? item.status);
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'));

          // Pending changes with color
          const tdPending = el('td', 'px-4 py-3 text-sm font-mono');
          tdPending.classList.add(item.pendingChanges > 0 ? 'text-amber-400' : 'text-[var(--text)]');
          tdPending.textContent = String(item.pendingChanges);
          tr.appendChild(tdPending);

          // Error message
          const tdErr = el('td', 'px-4 py-3 text-sm');
          if (item.errorMessage) {
            tdErr.classList.add('text-red-400');
            tdErr.textContent = item.errorMessage;
          } else {
            tdErr.classList.add('text-[var(--text-muted)]');
            tdErr.textContent = '-';
          }
          tr.appendChild(tdErr);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load sync status';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};

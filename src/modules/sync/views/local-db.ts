/**
 * Local DB Status view.
 * Shows collection-level sync status with local/remote counts, pending push/pull,
 * last sync time, and size. Summary statistics displayed at top.
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Local Database Status'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Summary cards container
    const summaryContainer = el('div', 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading local DB status...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    function renderSummary(items: Array<{ localCount: number; remoteCount: number; pendingPush: number; pendingPull: number; sizeBytes: number }>): void {
      summaryContainer.innerHTML = '';

      const totalLocal = items.reduce((s, i) => s + i.localCount, 0);
      const totalRemote = items.reduce((s, i) => s + i.remoteCount, 0);
      const totalPush = items.reduce((s, i) => s + i.pendingPush, 0);
      const totalPull = items.reduce((s, i) => s + i.pendingPull, 0);
      const totalSize = items.reduce((s, i) => s + i.sizeBytes, 0);

      const stats = [
        { label: 'Total Local Records', value: totalLocal.toLocaleString(), color: 'text-blue-400' },
        { label: 'Total Remote Records', value: totalRemote.toLocaleString(), color: 'text-emerald-400' },
        { label: 'Pending Push / Pull', value: `${totalPush} / ${totalPull}`, color: totalPush + totalPull > 0 ? 'text-amber-400' : 'text-emerald-400' },
        { label: 'Total Size', value: formatBytes(totalSize), color: 'text-[var(--text)]' },
      ];

      for (const stat of stats) {
        const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
        card.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1', stat.label));
        card.appendChild(el('div', `text-xl font-bold ${stat.color}`, stat.value));
        summaryContainer.appendChild(card);
      }
    }

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().getLocalDBStatus();
        countBadge.textContent = String(items.length);

        renderSummary(items);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Collection', 'Local Count', 'Remote Count', 'Pending Push', 'Pending Pull', 'Last Sync', 'Size']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No local database collections found.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.collection));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.localCount.toLocaleString()));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.remoteCount.toLocaleString()));

          // Pending push with color
          const tdPush = el('td', 'px-4 py-3 text-sm font-mono');
          tdPush.classList.add(item.pendingPush > 0 ? 'text-amber-400' : 'text-[var(--text)]');
          tdPush.textContent = String(item.pendingPush);
          tr.appendChild(tdPush);

          // Pending pull with color
          const tdPull = el('td', 'px-4 py-3 text-sm font-mono');
          tdPull.classList.add(item.pendingPull > 0 ? 'text-amber-400' : 'text-[var(--text)]');
          tdPull.textContent = String(item.pendingPull);
          tr.appendChild(tdPull);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', formatBytes(item.sizeBytes)));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load local DB status';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};

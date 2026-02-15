/**
 * Sync Sessions view.
 * Displays sync session history with session ID, direction, records pushed/pulled,
 * conflicts, errors, status, connection quality, and bytes transferred.
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
  in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
};

const DIRECTION_BADGE: Record<string, string> = {
  push: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  pull: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  bidirectional: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

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
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sync Sessions'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading sync sessions...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listSessions();
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Session ID', 'Direction', 'Pushed', 'Pulled', 'Conflicts', 'Errors', 'Status', 'Quality', 'Bytes', 'Started']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No sync sessions found.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.sessionId));

          // Direction badge
          const tdDir = el('td', 'px-4 py-3 text-sm');
          const dirBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${DIRECTION_BADGE[item.direction] ?? DIRECTION_BADGE.push}`,
            item.direction);
          tdDir.appendChild(dirBadge);
          tr.appendChild(tdDir);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.recordsPushed)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.recordsPulled)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.conflicts)));

          // Errors with color
          const tdErrors = el('td', 'px-4 py-3 text-sm font-mono');
          tdErrors.classList.add(item.errors > 0 ? 'text-red-400' : 'text-[var(--text)]');
          tdErrors.textContent = String(item.errors);
          tr.appendChild(tdErrors);

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.in_progress}`,
            STATUS_LABEL[item.status] ?? item.status);
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] uppercase', item.connectionQuality));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', formatBytes(item.bytesTransferred)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', new Date(item.startedAt).toLocaleString()));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load sync sessions';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};

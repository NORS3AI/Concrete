/**
 * Sync Conflicts view.
 * Displays sync conflicts with collection, record ID, detected timestamp,
 * priority, and resolution status. Filter by resolved/unresolved. Resolve button.
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

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  normal: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const RESOLUTION_BADGE: Record<string, string> = {
  resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  unresolved: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sync Conflicts'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [
      { value: 'all', label: 'All Conflicts' },
      { value: 'unresolved', label: 'Unresolved' },
      { value: 'resolved', label: 'Resolved' },
    ]) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);
    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading conflicts...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filterVal = statusSelect.value;
        const resolved = filterVal === 'all' ? undefined : filterVal === 'resolved';
        const items = await svc().listConflicts(resolved);
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Collection', 'Record ID', 'Detected', 'Priority', 'Status', 'Resolution', 'Resolved By', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No sync conflicts found.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.collection));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.recordId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', new Date(item.detectedAt).toLocaleString()));

          // Priority badge
          const tdPrio = el('td', 'px-4 py-3 text-sm');
          const prioBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.normal}`,
            item.priority.charAt(0).toUpperCase() + item.priority.slice(1));
          tdPrio.appendChild(prioBadge);
          tr.appendChild(tdPrio);

          // Resolution status
          const isResolved = !!item.resolvedAt;
          const tdResStatus = el('td', 'px-4 py-3 text-sm');
          const resStatusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${isResolved ? RESOLUTION_BADGE.resolved : RESOLUTION_BADGE.unresolved}`,
            isResolved ? 'Resolved' : 'Unresolved');
          tdResStatus.appendChild(resStatusBadge);
          tr.appendChild(tdResStatus);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.resolution ?? '-'));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.resolvedBy ?? '-'));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (!isResolved) {
            const resolveBtn = el('button',
              'px-3 py-1 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90',
              'Resolve');
            resolveBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().resolveLoggedConflict(item.id, 'local_wins', 'user');
                  showMsg(wrapper, `Conflict for ${item.recordId} resolved.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to resolve conflict';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            tdActions.appendChild(resolveBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)]', '-'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load conflicts';
        showMsg(wrapper, message, true);
      }
    }

    statusSelect.addEventListener('change', () => void loadAndRender());

    void loadAndRender();
  },
};

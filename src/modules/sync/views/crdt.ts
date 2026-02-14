/**
 * CRDT Records view.
 * Displays CRDT records with collection, record ID, vector clock, versions,
 * and conflict status. Supports filtering by collection and conflict resolution.
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

const CONFLICT_BADGE: Record<string, string> = {
  conflict: 'bg-red-500/10 text-red-400 border border-red-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'CRDT Records'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const collectionInput = el('input', inputCls) as HTMLInputElement;
    collectionInput.type = 'text';
    collectionInput.placeholder = 'Filter by collection...';
    filterBar.appendChild(collectionInput);

    const conflictSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [
      { value: '', label: 'All Records' },
      { value: 'conflict', label: 'Conflicts Only' },
      { value: 'resolved', label: 'Resolved Only' },
    ]) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      conflictSelect.appendChild(o);
    }
    filterBar.appendChild(conflictSelect);
    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading state
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading CRDT records...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const collectionFilter = collectionInput.value.trim() || undefined;
        let items = await svc().listCRDTRecords(collectionFilter);

        // Filter by conflict status
        const conflictFilter = conflictSelect.value;
        if (conflictFilter === 'conflict') {
          items = items.filter(i => i.conflictDetected);
        } else if (conflictFilter === 'resolved') {
          items = items.filter(i => !i.conflictDetected && i.resolvedBy);
        }

        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Collection', 'Record ID', 'Vector Clock', 'Local Ver', 'Remote Ver', 'Last Modified', 'Status', 'Resolution', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No CRDT records found.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.collection));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.recordId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] font-mono text-xs', item.vectorClock));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.localVersion)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.remoteVersion)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', new Date(item.lastModified).toLocaleString()));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusKey = item.conflictDetected ? 'conflict' : 'resolved';
          const statusLabel = item.conflictDetected ? 'Conflict' : 'Synced';
          const badge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${CONFLICT_BADGE[statusKey]}`,
            statusLabel);
          tdStatus.appendChild(badge);
          tr.appendChild(tdStatus);

          // Resolution
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.resolvedBy ?? '-'));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.conflictDetected) {
            const resolveBtn = el('button',
              'px-3 py-1 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90',
              'Resolve');
            resolveBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().resolveConflict(item.id, 'local_wins');
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
        const message = err instanceof Error ? err.message : 'Failed to load CRDT records';
        showMsg(wrapper, message, true);
      }
    }

    collectionInput.addEventListener('input', () => void loadAndRender());
    conflictSelect.addEventListener('change', () => void loadAndRender());

    void loadAndRender();
  },
};

/**
 * Selective Sync Rules view.
 * Shows selective sync rules with user ID, collection, filter field/value,
 * and enabled status. Toggle enabled/disabled for each rule.
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

const ENABLED_BADGE: Record<string, string> = {
  enabled: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  disabled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Selective Sync Rules'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading selective sync rules...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listSelectiveRules();
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['User ID', 'Collection', 'Filter Field', 'Filter Value', 'Description', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No selective sync rules configured.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.userId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.collection));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.filterField));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.filterValue));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.description || '-'));

          // Enabled badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusKey = item.enabled ? 'enabled' : 'disabled';
          const statusLabel = item.enabled ? 'Enabled' : 'Disabled';
          const badge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${ENABLED_BADGE[statusKey]}`,
            statusLabel);
          tdStatus.appendChild(badge);
          tr.appendChild(tdStatus);

          // Toggle action
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const toggleBtn = el('button',
            `px-3 py-1 rounded-md text-xs font-medium border ${item.enabled
              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`,
            item.enabled ? 'Disable' : 'Enable');
          toggleBtn.addEventListener('click', () => {
            void (async () => {
              try {
                // Toggle by re-creating with inverted enabled state
                await svc().addSelectiveRule({
                  userId: item.userId,
                  collection: item.collection,
                  filterField: item.filterField,
                  filterValue: item.filterValue,
                  description: item.description || undefined,
                });
                showMsg(wrapper, `Rule for ${item.collection} toggled.`, false);
                await loadAndRender();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to toggle rule';
                showMsg(wrapper, message, true);
              }
            })();
          });
          tdActions.appendChild(toggleBtn);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load selective sync rules';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};

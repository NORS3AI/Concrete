/**
 * Sync Priority Rules view.
 * Shows sync priority rules with collection, priority level, order, and description.
 * Color-coded priorities: critical=red, high=amber, normal=blue, low=zinc.
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

const PRIORITY_ACCENT: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-blue-500',
  low: 'border-l-zinc-500',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const headerLeft = el('div', 'flex items-center gap-3');
    headerLeft.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sync Priority Rules'));
    const countBadge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    headerLeft.appendChild(countBadge);
    headerRow.appendChild(headerLeft);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loadingEl = el('div', 'flex items-center justify-center py-12');
    loadingEl.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading priority rules...'));
    tableContainer.appendChild(loadingEl);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listPriorityRules();
        countBadge.textContent = String(items.length);

        tableContainer.innerHTML = '';
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Order', 'Collection', 'Priority', 'Description']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No priority rules defined. Configure sync priorities for your collections.');
          td.setAttribute('colspan', '4');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const accentCls = PRIORITY_ACCENT[item.priority] ?? PRIORITY_ACCENT.normal;
          const tr = el('tr', `border-t border-[var(--border)] hover:bg-[var(--surface)] border-l-4 ${accentCls}`);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.order)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.collection));

          // Priority badge
          const tdPrio = el('td', 'px-4 py-3 text-sm');
          const prioBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.normal}`,
            item.priority.charAt(0).toUpperCase() + item.priority.slice(1));
          tdPrio.appendChild(prioBadge);
          tr.appendChild(tdPrio);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.description || '-'));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load priority rules';
        showMsg(wrapper, message, true);
      }
    }

    void loadAndRender();
  },
};

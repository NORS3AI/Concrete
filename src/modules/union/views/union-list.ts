/**
 * Union List view.
 * Filterable table of unions with status dropdown and search.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';
import type { UnionStatus } from '../union-service';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnionRow {
  id: string;
  name: string;
  localNumber: string;
  trade: string;
  jurisdiction: string;
  status: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search unions...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  unions: UnionRow[],
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Local #', 'Name', 'Trade', 'Jurisdiction', 'Status', 'Contact', 'Phone', 'Email', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (unions.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No unions found. Create your first union to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const union of unions) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdLocal = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', union.localNumber) as HTMLAnchorElement;
    link.href = `#/union/unions/${union.id}`;
    tdLocal.appendChild(link);
    tr.appendChild(tdLocal);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', union.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', union.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', union.jurisdiction));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[union.status] ?? STATUS_BADGE.active}`,
      union.status.charAt(0).toUpperCase() + union.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', union.contactName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', union.contactPhone));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', union.contactEmail));

    const tdActions = el('td', 'py-2 px-3 flex gap-2');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/union/unions/${union.id}`;
    tdActions.appendChild(editLink);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(union.id));
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Unions'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/union/unions/new';
    newBtn.textContent = 'New Union';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    const tableContainer = el('div', '');

    // Current filter state
    let currentStatus = '';
    let currentSearch = '';

    async function loadUnions(): Promise<void> {
      try {
        const svc = getUnionService();
        const filters: { status?: UnionStatus } = {};
        if (currentStatus) filters.status = currentStatus as UnionStatus;

        let unions = await svc.getUnions(filters);

        // Client-side search filtering
        if (currentSearch) {
          const term = currentSearch.toLowerCase();
          unions = unions.filter((u) => {
            const name = (u.name ?? '').toLowerCase();
            const localNum = (u.localNumber ?? '').toLowerCase();
            const trade = (u.trade ?? '').toLowerCase();
            return name.includes(term) || localNum.includes(term) || trade.includes(term);
          });
        }

        const rows: UnionRow[] = unions.map((u) => ({
          id: u.id,
          name: u.name,
          localNumber: u.localNumber,
          trade: u.trade,
          jurisdiction: u.jurisdiction ?? '',
          status: u.status,
          contactName: u.contactName ?? '',
          contactPhone: u.contactPhone ?? '',
          contactEmail: u.contactEmail ?? '',
        }));

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          (id) => {
            if (!confirm('Are you sure you want to delete this union?')) return;
            void (async () => {
              try {
                const svcInner = getUnionService();
                await svcInner.deleteUnion(id);
                showMsg(wrapper, 'Union deleted.', false);
                void loadUnions();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete union';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load unions';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(buildFilterBar((status, search) => {
      currentStatus = status;
      currentSearch = search;
      void loadUnions();
    }));

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadUnions();
  },
};

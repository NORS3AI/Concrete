/**
 * Union List view.
 * Filterable table of unions with status and trade dropdowns.
 */

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

function buildTable(unions: UnionRow[]): HTMLElement {
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

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/union/unions/${union.id}`;
    tdActions.appendChild(editLink);
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

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const unions: UnionRow[] = [];
    wrapper.appendChild(buildTable(unions));

    container.appendChild(wrapper);
  },
};

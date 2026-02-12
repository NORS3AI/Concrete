/**
 * Entity list view.
 * Filterable table of entities with type/status filters and action links.
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
// Types
// ---------------------------------------------------------------------------

type EntityType = 'corporation' | 'llc' | 'partnership' | 'branch' | 'division' | 'consolidation';
type EntityStatus = 'active' | 'inactive' | 'pending';

interface EntityRow {
  id: string;
  code: string;
  name: string;
  type: EntityType;
  parentName: string;
  currency: string;
  status: EntityStatus;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES: Array<{ value: EntityType; label: string }> = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'branch', label: 'Branch' },
  { value: 'division', label: 'Division' },
  { value: 'consolidation', label: 'Consolidation' },
];

const TYPE_LABELS: Record<EntityType, string> = {
  corporation: 'Corporation',
  llc: 'LLC',
  partnership: 'Partnership',
  branch: 'Branch',
  division: 'Division',
  consolidation: 'Consolidation',
};

const STATUS_BADGE: Record<EntityStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(onFilter: (type: string, status: string) => void): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  // Type dropdown
  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  const allTypeOpt = el('option', '', 'All Types') as HTMLOptionElement;
  allTypeOpt.value = '';
  typeSelect.appendChild(allTypeOpt);
  for (const t of ENTITY_TYPES) {
    const opt = el('option', '', t.label) as HTMLOptionElement;
    opt.value = t.value;
    typeSelect.appendChild(opt);
  }
  bar.appendChild(typeSelect);

  // Status toggle
  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const [val, label] of [['', 'All Statuses'], ['active', 'Active'], ['inactive', 'Inactive'], ['pending', 'Pending']]) {
    const opt = el('option', '', label) as HTMLOptionElement;
    opt.value = val;
    statusSelect.appendChild(opt);
  }
  bar.appendChild(statusSelect);

  // Wire events
  typeSelect.addEventListener('change', () => onFilter(typeSelect.value, statusSelect.value));
  statusSelect.addEventListener('change', () => onFilter(typeSelect.value, statusSelect.value));

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(entities: EntityRow[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Code', 'Name', 'Type', 'Parent', 'Currency', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'entity-rows');

  if (entities.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No entities found. Create your first entity to get started.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entity of entities) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Code
    const tdCode = el('td', 'py-2 px-3 font-mono');
    const codeLink = el('a', 'text-[var(--accent)] hover:underline', entity.code) as HTMLAnchorElement;
    codeLink.href = `#/entities/${entity.id}`;
    tdCode.appendChild(codeLink);
    tr.appendChild(tdCode);

    // Name
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', entity.name));

    // Type
    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', TYPE_LABELS[entity.type] ?? entity.type);
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    // Parent
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entity.parentName || '--'));

    // Currency
    tr.appendChild(el('td', 'py-2 px-3 font-mono', entity.currency));

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const statusBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[entity.status] ?? STATUS_BADGE.pending}`,
      entity.status.charAt(0).toUpperCase() + entity.status.slice(1),
    );
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/entities/${entity.id}`;
    tdActions.appendChild(editLink);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  return tableWrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Entities'));

    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/entities/new';
    newBtn.textContent = 'New Entity';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    wrapper.appendChild(buildFilterBar((_type, _status) => { /* filter handler placeholder */ }));

    // Table (empty shell -- service populates later)
    const entities: EntityRow[] = [];
    wrapper.appendChild(buildTable(entities));

    container.appendChild(wrapper);
  },
};

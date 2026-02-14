/**
 * Workflow Templates view.
 * Filterable table of workflow templates with status, record type, approval type,
 * step count, and status badges. Supports search and filter by status / record type.
 */

import { getWorkflowService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const svc = () => getWorkflowService();

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

function showMsg(container: HTMLElement, msg: string, ok = true): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = ok
    ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const d = el('div', cls, msg);
  d.setAttribute('data-msg', '1');
  container.prepend(d);
  setTimeout(() => d.remove(), 3000);
}

const fmtDate = (v: string): string => v || '--';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

const RECORD_TYPE_OPTIONS = [
  { value: '', label: 'All Record Types' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'expense', label: 'Expense' },
  { value: 'payment', label: 'Payment' },
  { value: 'contract', label: 'Contract' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const APPROVAL_TYPE_BADGE: Record<string, string> = {
  sequential: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  parallel: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  conditional: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const INPUT_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  recordType: string;
  approvalType: string;
  status: string;
  steps: string;
  createdBy: string;
  createdDate: string;
  updatedDate: string;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: TemplateRow[]): HTMLElement {
  const section = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const total = rows.length;
  const active = rows.filter((r) => r.status === 'active').length;
  const draft = rows.filter((r) => r.status === 'draft').length;
  const inactive = rows.filter((r) => r.status === 'inactive').length;

  const cardData = [
    { label: 'Total Templates', value: String(total), cls: 'text-[var(--text)]' },
    { label: 'Active', value: String(active), cls: 'text-emerald-400' },
    { label: 'Draft', value: String(draft), cls: 'text-amber-400' },
    { label: 'Inactive', value: String(inactive), cls: 'text-zinc-400' },
  ];

  for (const card of cardData) {
    const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    cardEl.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
    cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
    section.appendChild(cardEl);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, recordType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const searchInput = el('input', INPUT_CLS) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search templates...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const recordTypeSelect = el('select', INPUT_CLS) as HTMLSelectElement;
  for (const opt of RECORD_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    recordTypeSelect.appendChild(o);
  }
  bar.appendChild(recordTypeSelect);

  const fire = () => onFilter(statusSelect.value, recordTypeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  recordTypeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: TemplateRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Record Type', 'Approval Type', 'Status', 'Steps', 'Created By', 'Created', 'Updated']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No workflow templates found. Create your first template to get started.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    tdName.appendChild(el('div', 'font-medium text-[var(--text)]', row.name));
    if (row.description) {
      tdName.appendChild(el('div', 'text-xs text-[var(--text-muted)] truncate max-w-[200px]', row.description));
    }
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.recordType.replace(/_/g, ' ')));

    const tdType = el('td', 'py-2 px-3');
    const typeBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${APPROVAL_TYPE_BADGE[row.approvalType] ?? APPROVAL_TYPE_BADGE.sequential}`,
      row.approvalType.charAt(0).toUpperCase() + row.approvalType.slice(1),
    );
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-center font-mono text-[var(--text)]', row.steps));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.createdBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(row.createdDate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(row.updatedDate)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let allRows: TemplateRow[] = [];
let summaryContainer: HTMLElement | null = null;
let tableContainer: HTMLElement | null = null;

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function getFiltered(status: string, recordType: string, search: string): TemplateRow[] {
  let filtered = allRows;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (recordType) filtered = filtered.filter((r) => r.recordType === recordType);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.recordType.toLowerCase().includes(q) ||
      r.createdBy.toLowerCase().includes(q),
    );
  }
  return filtered;
}

function renderContent(rows: TemplateRow[]): void {
  if (summaryContainer) {
    summaryContainer.replaceChildren(buildSummaryCards(rows));
  }
  if (tableContainer) {
    tableContainer.replaceChildren(buildTable(rows));
  }
}

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  // Loading state
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading workflow templates...'));

  try {
    const templates = await svc().listTemplates();
    allRows = templates.map((t) => ({
      id: (t as any).id ?? '',
      name: t.name,
      description: t.description ?? '',
      recordType: t.recordType,
      approvalType: t.approvalType,
      status: t.status,
      steps: t.steps,
      createdBy: t.createdBy,
      createdDate: t.createdDate,
      updatedDate: t.updatedDate ?? '',
    }));

    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Workflow Templates'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', String(allRows.length));
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    summaryContainer = el('div');
    wrapper.appendChild(summaryContainer);

    // Filters
    wrapper.appendChild(buildFilterBar((status, recordType, search) => {
      renderContent(getFiltered(status, recordType, search));
    }));

    // Table
    tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    renderContent(allRows);
  } catch (err: unknown) {
    wrapper.innerHTML = '';
    const message = err instanceof Error ? err.message : 'Failed to load workflow templates';
    showMsg(wrapper, message, false);
  }
})();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

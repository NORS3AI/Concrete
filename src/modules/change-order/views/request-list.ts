/**
 * Change Order Request (PCO/COR) List view.
 * Filterable table of requests with status badges, source type, estimated amount.
 * Wired to ChangeOrderService for live data.
 */

import { getChangeOrderService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'owner', label: 'Owner' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'internal', label: 'Internal' },
  { value: 'field', label: 'Field' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  withdrawn: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

const SOURCE_BADGE: Record<string, string> = {
  owner: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  subcontractor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  internal: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  field: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestRow {
  id: string;
  number: string;
  title: string;
  source: string;
  status: string;
  requestedBy: string;
  requestDate: string;
  estimatedAmount: number;
  scheduleImpactDays: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rows: RequestRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-3 mb-4');

  const totalCount = rows.length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const totalEstimated = rows.reduce((sum, r) => sum + r.estimatedAmount, 0);

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Requests', String(totalCount), 'text-[var(--text)]'));
  row.appendChild(buildCard('Pending', String(pendingCount), 'text-amber-400'));
  row.appendChild(buildCard('Approved', String(approvedCount), 'text-emerald-400'));
  row.appendChild(buildCard('Est. Total', fmtCurrency(totalEstimated), 'text-[var(--accent)]'));

  return row;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, source: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search requests...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const sourceSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of SOURCE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    sourceSelect.appendChild(o);
  }
  bar.appendChild(sourceSelect);

  const fire = () => onFilter(statusSelect.value, sourceSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  sourceSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: RequestRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Title', 'Source', 'Status', 'Requested By', 'Date', 'Est. Amount', 'Schedule Impact']) {
    const align = ['Est. Amount', 'Schedule Impact'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No change order requests found. Create a new PCO/COR to get started.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.number) as HTMLAnchorElement;
    link.href = `#/change-orders/requests/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.title));

    const tdSource = el('td', 'py-2 px-3');
    tdSource.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_BADGE[row.source] ?? SOURCE_BADGE.internal}`,
      row.source.charAt(0).toUpperCase() + row.source.slice(1)));
    tr.appendChild(tdSource);

    const tdStatus = el('td', 'py-2 px-3');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.requestDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.estimatedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]',
      row.scheduleImpactDays > 0 ? `${row.scheduleImpactDays} days` : '-'));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getChangeOrderService();

    // Load all requests (unfiltered) for initial render
    const allRequests = svc.listRequests();
    let allRows: RequestRow[] = allRequests.map((req) => ({
      id: req.id as string,
      number: req.number,
      title: req.title,
      source: req.source,
      status: req.status,
      requestedBy: req.requestedBy ?? '',
      requestDate: req.requestDate ?? '',
      estimatedAmount: req.estimatedAmount ?? 0,
      scheduleImpactDays: req.scheduleImpactDays ?? 0,
    }));

    // Containers for dynamic sections
    const summaryContainer = el('div');
    const filterContainer = el('div');
    const tableContainer = el('div');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Order Requests (PCOs)'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/change-orders/requests/new';
    newBtn.textContent = 'New Request';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);
    wrapper.appendChild(summaryContainer);
    wrapper.appendChild(filterContainer);
    wrapper.appendChild(tableContainer);

    // Apply filter and re-render dynamic sections
    const applyFilter = (status: string, source: string, search: string) => {
      let filtered = allRows;
      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }
      if (source) {
        filtered = filtered.filter((r) => r.source === source);
      }
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter((r) =>
          r.number.toLowerCase().includes(term) ||
          r.title.toLowerCase().includes(term) ||
          r.requestedBy.toLowerCase().includes(term),
        );
      }
      renderContent(filtered);
    };

    const renderContent = (rows: RequestRow[]) => {
      summaryContainer.innerHTML = '';
      summaryContainer.appendChild(buildSummaryCards(rows));

      tableContainer.innerHTML = '';
      tableContainer.appendChild(buildTable(rows));
    };

    // Build filter bar (only once)
    filterContainer.appendChild(buildFilterBar(applyFilter));

    // Initial render with all rows
    renderContent(allRows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

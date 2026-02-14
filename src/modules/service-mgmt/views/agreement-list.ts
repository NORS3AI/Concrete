/**
 * Service Agreement List view.
 * Filterable table of service agreements with type, status, and customer filters.
 * Integrates with ServiceMgmtService for live data.
 */

import { getServiceMgmtService } from '../service-accessor';

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

function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const colors: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  const toast = el('div', `fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-white text-sm shadow-lg ${colors[type]}`);
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'full_service', label: 'Full Service' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'on_call', label: 'On Call' },
  { value: 'warranty', label: 'Warranty' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgreementRow {
  id: string;
  name: string;
  customerId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  recurringAmount: number;
  coveredEquipment: string;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(agreements: AgreementRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-4 mb-4');

  const activeCount = agreements.filter(a => a.status === 'active').length;
  const totalRecurring = agreements
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + a.recurringAmount, 0);

  const today = new Date().toISOString().split('T')[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const expiringSoon = agreements.filter(
    a => a.status === 'active' && a.endDate && a.endDate >= today && a.endDate <= in30,
  ).length;

  const buildCard = (label: string, value: string, accent?: boolean): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Active Agreements', String(activeCount), true));
  row.appendChild(buildCard('Total Monthly Recurring', fmtCurrency(totalRecurring)));
  row.appendChild(buildCard('Expiring in 30 Days', String(expiringSoon), expiringSoon > 0));

  return row;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, type: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search agreements...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(statusSelect.value, typeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(agreements: AgreementRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Customer', 'Type', 'Status', 'Start', 'End', 'Amount', 'Coverage', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (agreements.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No service agreements found. Create your first agreement to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of agreements) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-medium', row.name) as HTMLAnchorElement;
    link.href = `#/service/agreements/${row.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', row.customerId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.type));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.active}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.startDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.endDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.recurringAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.coveredEquipment || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/service/agreements/${row.id}`;
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

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Service Agreements'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/service/agreements/new';
    newBtn.textContent = 'New Agreement';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Loading indicator
    const loadingEl = el('div', 'text-center py-8 text-[var(--text-muted)]', 'Loading agreements...');
    wrapper.appendChild(loadingEl);
    container.appendChild(wrapper);

    // Load data from service
    const svc = getServiceMgmtService();
    svc.listAgreements().then((rawAgreements) => {
      const allAgreements: AgreementRow[] = rawAgreements.map(a => ({
        id: a.id,
        name: a.name,
        customerId: a.customerId,
        type: a.type,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate ?? '',
        recurringAmount: a.recurringAmount,
        coveredEquipment: a.coveredEquipment ?? '',
      }));

      // Remove loading indicator
      loadingEl.remove();

      // Summary cards
      const summaryEl = buildSummaryCards(allAgreements);
      wrapper.appendChild(summaryEl);

      // Container for the table (will be replaced on filter)
      const tableContainer = el('div');

      // Filter bar with client-side filtering
      const filterBar = buildFilterBar((status, type, search) => {
        const searchLower = search.toLowerCase();
        const filtered = allAgreements.filter(a => {
          if (status && a.status !== status) return false;
          if (type && a.type !== type) return false;
          if (search) {
            const haystack = `${a.name} ${a.customerId} ${a.type} ${a.coveredEquipment}`.toLowerCase();
            if (!haystack.includes(searchLower)) return false;
          }
          return true;
        });
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(filtered));
      });
      wrapper.appendChild(filterBar);

      // Initial table render
      tableContainer.appendChild(buildTable(allAgreements));
      wrapper.appendChild(tableContainer);
    }).catch((err: unknown) => {
      loadingEl.remove();
      const errMsg = err instanceof Error ? err.message : String(err);
      showMsg(`Failed to load agreements: ${errMsg}`, 'error');
      wrapper.appendChild(el('div', 'text-center py-8 text-red-400', `Error loading agreements: ${errMsg}`));
    });
  },
};

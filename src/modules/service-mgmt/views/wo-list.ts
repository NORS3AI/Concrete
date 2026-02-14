/**
 * Work Order List view.
 * Filterable table of work orders with number, type, priority badge, status,
 * assigned technician, and dates.
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
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'on_demand', label: 'On Demand' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'callback', label: 'Callback' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  assigned: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  on_hold: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  invoiced: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  emergency: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkOrderRow {
  id: string;
  number: string;
  type: string;
  priority: string;
  status: string;
  customerId: string;
  assignedTo: string;
  scheduledDate: string;
  totalAmount: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(workOrders: WorkOrderRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const totalCount = workOrders.length;
  const openCount = workOrders.filter(wo => wo.status === 'open' || wo.status === 'assigned' || wo.status === 'in_progress').length;
  const emergencyCount = workOrders.filter(wo => wo.priority === 'emergency').length;
  const totalAmount = workOrders.reduce((sum, wo) => sum + wo.totalAmount, 0);

  const buildCard = (label: string, value: string, accent?: boolean): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Total Work Orders', String(totalCount)));
  row.appendChild(buildCard('Open / Active', String(openCount), true));
  row.appendChild(buildCard('Emergency', String(emergencyCount), emergencyCount > 0));
  row.appendChild(buildCard('Total Amount', fmtCurrency(totalAmount)));

  return row;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, type: string, priority: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search work orders...';
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

  const prioritySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PRIORITY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    prioritySelect.appendChild(o);
  }
  bar.appendChild(prioritySelect);

  const fire = () => onFilter(statusSelect.value, typeSelect.value, prioritySelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  prioritySelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(workOrders: WorkOrderRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['WO #', 'Type', 'Priority', 'Status', 'Customer', 'Assigned To', 'Scheduled', 'Amount', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (workOrders.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No work orders found. Create a new work order to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const wo of workOrders) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline font-mono', wo.number) as HTMLAnchorElement;
    link.href = `#/service/work-orders/${wo.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wo.type));

    const tdPriority = el('td', 'py-2 px-3');
    const prioBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[wo.priority] ?? PRIORITY_BADGE.medium}`,
      wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1));
    tdPriority.appendChild(prioBadge);
    tr.appendChild(tdPriority);

    const tdStatus = el('td', 'py-2 px-3');
    const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[wo.status] ?? STATUS_BADGE.open}`,
      wo.status.replace('_', ' '));
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', wo.customerId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wo.assignedTo || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wo.scheduledDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(wo.totalAmount)));

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/service/work-orders/${wo.id}`;
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Work Orders'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/service/work-orders/new';
    newBtn.textContent = 'New Work Order';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Loading indicator
    const loadingEl = el('div', 'text-center py-8 text-[var(--text-muted)]', 'Loading work orders...');
    wrapper.appendChild(loadingEl);
    container.appendChild(wrapper);

    // Load data from service
    const svc = getServiceMgmtService();
    svc.listWorkOrders().then((rawWorkOrders) => {
      const allWorkOrders: WorkOrderRow[] = rawWorkOrders.map(wo => ({
        id: wo.id,
        number: wo.number,
        type: wo.type,
        priority: wo.priority,
        status: wo.status,
        customerId: wo.customerId,
        assignedTo: wo.assignedTo ?? '',
        scheduledDate: wo.scheduledDate ?? '',
        totalAmount: wo.totalAmount,
      }));

      // Remove loading indicator
      loadingEl.remove();

      // Summary cards
      const summaryEl = buildSummaryCards(allWorkOrders);
      wrapper.appendChild(summaryEl);

      // Container for the table (will be replaced on filter)
      const tableContainer = el('div');

      // Filter bar with client-side filtering
      const filterBar = buildFilterBar((status, type, priority, search) => {
        const searchLower = search.toLowerCase();
        const filtered = allWorkOrders.filter(wo => {
          if (status && wo.status !== status) return false;
          if (type && wo.type !== type) return false;
          if (priority && wo.priority !== priority) return false;
          if (search) {
            const haystack = `${wo.number} ${wo.customerId} ${wo.assignedTo} ${wo.type} ${wo.status}`.toLowerCase();
            if (!haystack.includes(searchLower)) return false;
          }
          return true;
        });
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(filtered));
      });
      wrapper.appendChild(filterBar);

      // Initial table render
      tableContainer.appendChild(buildTable(allWorkOrders));
      wrapper.appendChild(tableContainer);
    }).catch((err: unknown) => {
      loadingEl.remove();
      const errMsg = err instanceof Error ? err.message : String(err);
      showMsg(`Failed to load work orders: ${errMsg}`, 'error');
      wrapper.appendChild(el('div', 'text-center py-8 text-red-400', `Error loading work orders: ${errMsg}`));
    });
  },
};

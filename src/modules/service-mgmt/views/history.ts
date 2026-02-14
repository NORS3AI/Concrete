/**
 * Customer Service History view.
 * Timeline of work orders, service calls, and equipment events for a customer.
 * Integrates with ServiceMgmtService for data.
 */

import { getServiceMgmtService } from '../service-accessor';

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

function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = el('div', `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity duration-300 ${
    type === 'success' ? 'bg-emerald-600 text-white' :
    type === 'error' ? 'bg-red-600 text-white' :
    'bg-blue-600 text-white'
  }`);
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  setTimeout(() => { toast.remove(); }, 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  workOrder: { icon: 'WO', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  call: { icon: 'SC', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  equipment: { icon: 'EQ', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
};

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'workOrder', label: 'Work Orders' },
  { value: 'call', label: 'Service Calls' },
  { value: 'equipment', label: 'Equipment' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryEntry {
  type: string;
  date: string;
  description: string;
  id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Customer Select + Type Filter
// ---------------------------------------------------------------------------

function buildCustomerSelect(
  onSelect: (customerId: string) => void,
  onTypeFilter: (type: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const customerInput = el('input', inputCls) as HTMLInputElement;
  customerInput.type = 'text';
  customerInput.placeholder = 'Enter Customer ID and press Enter...';
  bar.appendChild(customerInput);

  const loadBtn = el('button', 'px-3 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load History');
  loadBtn.type = 'button';
  bar.appendChild(loadBtn);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_FILTER_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fireCustomer = () => {
    const val = customerInput.value.trim();
    if (val) onSelect(val);
  };
  loadBtn.addEventListener('click', fireCustomer);
  customerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fireCustomer();
  });

  typeSelect.addEventListener('change', () => onTypeFilter(typeSelect.value));

  return bar;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function buildTimeline(entries: HistoryEntry[]): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');

  if (entries.length === 0) {
    section.appendChild(el('p', 'text-center text-[var(--text-muted)] py-8', 'No service history found. Select a customer to view their history.'));
    return section;
  }

  const timeline = el('div', 'space-y-4');

  for (const entry of entries) {
    const item = el('div', 'flex items-start gap-4');

    // Type badge
    const typeInfo = TYPE_ICON[entry.type] ?? TYPE_ICON.workOrder;
    const typeBadge = el('div', `flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${typeInfo.color}`);
    typeBadge.textContent = typeInfo.icon;
    item.appendChild(typeBadge);

    // Content
    const content = el('div', 'flex-1 min-w-0');
    const topRow = el('div', 'flex items-center justify-between');
    topRow.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', entry.description));

    const statusBadgeCls = entry.status === 'completed' || entry.status === 'resolved' || entry.status === 'active'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : entry.status === 'cancelled' || entry.status === 'retired'
        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
        : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    topRow.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeCls}`, entry.status));

    content.appendChild(topRow);
    content.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', entry.date));

    item.appendChild(content);
    timeline.appendChild(item);

    // Divider (except last)
    if (entry !== entries[entries.length - 1]) {
      const divider = el('div', 'ml-5 border-l border-[var(--border)] h-4');
      timeline.appendChild(divider);
    }
  }

  section.appendChild(timeline);
  return section;
}

// ---------------------------------------------------------------------------
// Summary Stats
// ---------------------------------------------------------------------------

function buildSummaryStats(
  workOrderCount: number,
  callCount: number,
  equipmentCount: number,
  agreementCount: number,
): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildStat = (label: string, value: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', value));
    return card;
  };

  row.appendChild(buildStat('Total Work Orders', String(workOrderCount)));
  row.appendChild(buildStat('Service Calls', String(callCount)));
  row.appendChild(buildStat('Equipment', String(equipmentCount)));
  row.appendChild(buildStat('Active Agreements', String(agreementCount)));

  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');
    container.appendChild(wrapper);

    // Async UI setup
    (async () => {
      const svc = getServiceMgmtService();
      let allEntries: HistoryEntry[] = [];
      let filteredEntries: HistoryEntry[] = [];
      let currentTypeFilter = '';
      let currentCustomerId = '';

      // Stat counts
      let workOrderCount = 0;
      let callCount = 0;
      let equipmentCount = 0;
      let agreementCount = 0;

      // --- Render timeline in place ---
      const renderTimeline = () => {
        const existing = wrapper.querySelector('[data-role="history-timeline"]');
        if (existing) existing.remove();

        const timelineWrap = buildTimeline(filteredEntries);
        timelineWrap.setAttribute('data-role', 'history-timeline');
        wrapper.appendChild(timelineWrap);
      };

      // --- Render stats in place ---
      const renderStats = () => {
        const existing = wrapper.querySelector('[data-role="history-stats"]');
        if (existing) existing.remove();

        const stats = buildSummaryStats(workOrderCount, callCount, equipmentCount, agreementCount);
        stats.setAttribute('data-role', 'history-stats');

        // Insert stats before the timeline
        const timeline = wrapper.querySelector('[data-role="history-timeline"]');
        if (timeline) {
          wrapper.insertBefore(stats, timeline);
        } else {
          wrapper.appendChild(stats);
        }
      };

      // --- Apply type filter ---
      const applyFilters = () => {
        if (currentTypeFilter) {
          filteredEntries = allEntries.filter((e) => e.type === currentTypeFilter);
        } else {
          filteredEntries = [...allEntries];
        }
        renderTimeline();
      };

      // --- Load customer history ---
      const loadCustomerHistory = async (customerId: string) => {
        currentCustomerId = customerId;
        try {
          // Load history entries, work orders, calls, and agreements in parallel
          const [history, workOrders, calls, agreements] = await Promise.all([
            svc.getCustomerServiceHistory(customerId),
            svc.getWorkOrdersByCustomer(customerId),
            svc.getCallsByCustomer(customerId),
            svc.getAgreementsByCustomer(customerId),
          ]);

          allEntries = history.map((entry) => ({
            type: entry.type,
            date: entry.date ?? '',
            description: entry.description ?? '',
            id: entry.id ?? '',
            status: entry.status ?? '',
          }));

          workOrderCount = workOrders.length;
          callCount = calls.length;
          // Equipment count: count entries of type 'equipment' from history
          equipmentCount = allEntries.filter((e) => e.type === 'equipment').length;
          agreementCount = agreements.filter((a) => a.status === 'active').length;

          applyFilters();
          renderStats();
          showMsg(`Loaded service history for customer (${allEntries.length} entries).`, 'info');
        } catch (err) {
          showMsg(`Failed to load customer history: ${err}`, 'error');
        }
      };

      // --- Export handler ---
      const handleExport = () => {
        if (allEntries.length === 0) {
          showMsg('No history to export. Load a customer first.', 'info');
          return;
        }

        const headers = ['Type', 'Date', 'Description', 'ID', 'Status'];
        const csvRows = [headers.join(',')];

        for (const entry of allEntries) {
          csvRows.push([
            `"${entry.type}"`,
            `"${entry.date}"`,
            `"${entry.description.replace(/"/g, '""')}"`,
            `"${entry.id}"`,
            `"${entry.status}"`,
          ].join(','));
        }

        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-history-${currentCustomerId}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('Service history exported.', 'success');
      };

      // --- Build UI ---
      wrapper.innerHTML = '';

      const headerRow = el('div', 'flex items-center justify-between mb-4');
      headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Customer Service History'));
      const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export History');
      exportBtn.type = 'button';
      exportBtn.addEventListener('click', handleExport);
      headerRow.appendChild(exportBtn);
      wrapper.appendChild(headerRow);

      wrapper.appendChild(buildCustomerSelect(
        (customerId) => {
          loadCustomerHistory(customerId);
        },
        (type) => {
          currentTypeFilter = type;
          applyFilters();
        },
      ));

      // Initial empty stats and timeline
      renderStats();
      renderTimeline();
    })();
  },
};

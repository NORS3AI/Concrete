/**
 * Customer Service History view.
 * Timeline of work orders, service calls, and equipment events for a customer.
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
// Customer Select
// ---------------------------------------------------------------------------

function buildCustomerSelect(onSelect: (customerId: string) => void): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const customerInput = el('input', inputCls) as HTMLInputElement;
  customerInput.type = 'text';
  customerInput.placeholder = 'Search customer...';
  bar.appendChild(customerInput);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_FILTER_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  customerInput.addEventListener('change', () => onSelect(customerInput.value));

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

function buildSummaryStats(): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const buildStat = (label: string, value: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', 'text-xl font-bold text-[var(--text)]', value));
    return card;
  };

  row.appendChild(buildStat('Total Work Orders', '0'));
  row.appendChild(buildStat('Service Calls', '0'));
  row.appendChild(buildStat('Equipment', '0'));
  row.appendChild(buildStat('Active Agreements', '0'));

  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Customer Service History'));
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export History');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildCustomerSelect((_customerId) => { /* select placeholder */ }));
    wrapper.appendChild(buildSummaryStats());

    const entries: HistoryEntry[] = [];
    wrapper.appendChild(buildTimeline(entries));

    container.appendChild(wrapper);
  },
};

/**
 * Equipment Work Orders view.
 * Displays work orders with priority, status filtering, and completion actions.
 * Wired to EquipService for data persistence.
 */

import { getEquipService } from '../service-accessor';

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  high: 'bg-red-500/10 text-red-400 border border-red-500/20',
  critical: 'bg-red-500/10 text-red-400 border-2 border-red-500/40',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // Equipment map for resolving IDs to numbers
    let equipMap: Map<string, string> = new Map();

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(
      el('h1', 'text-2xl font-bold text-[var(--text)]', 'Work Orders'),
    );
    const newBtn = el('button', btnCls, 'New Work Order');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Inline Form (hidden by default) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Work Order'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    // Equipment select
    const equipGroup = el('div');
    equipGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Equipment'));
    const equipSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    equipGroup.appendChild(equipSelect);
    formGrid.appendChild(equipGroup);

    // Work Order Number
    const woNumGroup = el('div');
    woNumGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Work Order #'));
    const woNumInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    woNumInput.type = 'text';
    woNumInput.placeholder = 'WO-001';
    woNumGroup.appendChild(woNumInput);
    formGrid.appendChild(woNumGroup);

    // Description
    const descGroup = el('div');
    descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    const descInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    descInput.type = 'text';
    descInput.placeholder = 'Work order description';
    descGroup.appendChild(descInput);
    formGrid.appendChild(descGroup);

    // Priority select
    const priGroup = el('div');
    priGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Priority'));
    const priInput = el('select', inputCls + ' w-full') as HTMLSelectElement;
    for (const opt of [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' },
    ]) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      priInput.appendChild(o);
    }
    priInput.value = 'medium';
    priGroup.appendChild(priInput);
    formGrid.appendChild(priGroup);

    // Assigned To
    const assignGroup = el('div');
    assignGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Assigned To'));
    const assignInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    assignInput.type = 'text';
    assignInput.placeholder = 'Assignee name';
    assignGroup.appendChild(assignInput);
    formGrid.appendChild(assignGroup);

    formWrap.appendChild(formGrid);

    // Form buttons
    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]',
      'Cancel',
    );
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    // Toggle form
    newBtn.addEventListener('click', () => {
      formWrap.classList.toggle('hidden');
    });
    cancelBtn.addEventListener('click', () => {
      formWrap.classList.add('hidden');
    });

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    const priorityFilter = el('select', inputCls) as HTMLSelectElement;
    for (const opt of PRIORITY_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      priorityFilter.appendChild(o);
    }
    bar.appendChild(priorityFilter);

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search work orders...';
    bar.appendChild(searchInput);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Data Loading & Rendering ----

    async function loadEquipment(): Promise<void> {
      const svc = getEquipService();
      const list = await svc.getEquipmentList();
      equipMap = new Map(list.map((e) => [e.id, e.equipmentNumber]));

      // Populate equipment select in form
      equipSelect.innerHTML = '';
      const placeholder = el('option', '', 'Select equipment') as HTMLOptionElement;
      placeholder.value = '';
      equipSelect.appendChild(placeholder);
      for (const e of list) {
        const o = el('option', '', `${e.equipmentNumber} - ${e.description}`) as HTMLOptionElement;
        o.value = e.id;
        equipSelect.appendChild(o);
      }
    }

    function resolveEquipNum(equipmentId: string): string {
      return equipMap.get(equipmentId) ?? equipmentId;
    }

    async function loadTable(): Promise<void> {
      const svc = getEquipService();

      const filters: { status?: string; priority?: string } = {};
      if (statusSelect.value) {
        (filters as Record<string, string>).status = statusSelect.value;
      }
      if (priorityFilter.value) {
        (filters as Record<string, string>).priority = priorityFilter.value;
      }

      let records = await svc.getWorkOrders(filters as Parameters<typeof svc.getWorkOrders>[0]);

      // Apply text search
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        records = records.filter((r) => {
          const equipNum = resolveEquipNum(r.equipmentId).toLowerCase();
          const desc = r.description.toLowerCase();
          const woNum = r.number.toLowerCase();
          const assigned = (r.assignedTo ?? '').toLowerCase();
          return (
            equipNum.includes(search) ||
            desc.includes(search) ||
            woNum.includes(search) ||
            assigned.includes(search)
          );
        });
      }

      renderTable(records);
    }

    function renderTable(
      records: Array<{
        id: string;
        equipmentId: string;
        number: string;
        description: string;
        priority: string;
        assignedTo?: string;
        reportedDate?: string;
        completedDate?: string;
        laborHours?: number;
        partsCost?: number;
        totalCost?: number;
        status: string;
      }>,
    ): void {
      tableContainer.innerHTML = '';

      const wrap = el(
        'div',
        'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      );
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of [
        'WO #',
        'Equip #',
        'Description',
        'Priority',
        'Assigned To',
        'Reported',
        'Completed',
        'Labor Hrs',
        'Parts Cost',
        'Total Cost',
        'Status',
        'Actions',
      ]) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');

      if (records.length === 0) {
        const tr = el('tr');
        const td = el(
          'td',
          'px-4 py-8 text-center text-sm text-[var(--text-muted)]',
          'No work orders found. Create a work order to get started.',
        );
        td.setAttribute('colspan', '12');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of records) {
        const tr = el('tr', trCls);

        // WO #
        tr.appendChild(el('td', tdCls + ' font-mono text-[var(--accent)]', row.number));

        // Equip #
        tr.appendChild(el('td', tdCls + ' font-mono', resolveEquipNum(row.equipmentId)));

        // Description
        tr.appendChild(el('td', tdCls, row.description));

        // Priority badge
        const tdPriority = el('td', tdCls);
        const priBadgeCls = PRIORITY_BADGE[row.priority] ?? PRIORITY_BADGE.medium;
        const priBadge = el(
          'span',
          `px-2 py-1 rounded-full text-xs font-medium ${priBadgeCls}`,
          row.priority.charAt(0).toUpperCase() + row.priority.slice(1),
        );
        tdPriority.appendChild(priBadge);
        tr.appendChild(tdPriority);

        // Assigned To
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.assignedTo ?? ''));

        // Reported
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.reportedDate ?? ''));

        // Completed
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.completedDate ?? ''));

        // Labor Hrs
        tr.appendChild(
          el('td', tdCls + ' font-mono text-right', row.laborHours ? String(row.laborHours) : ''),
        );

        // Parts Cost
        tr.appendChild(
          el('td', tdCls + ' font-mono text-right', row.partsCost ? fmtCurrency(row.partsCost) : ''),
        );

        // Total Cost
        tr.appendChild(
          el('td', tdCls + ' font-mono text-right', row.totalCost ? fmtCurrency(row.totalCost) : ''),
        );

        // Status badge
        const tdStatus = el('td', tdCls);
        const statusLabel = row.status.replace('_', ' ');
        const statusBadgeCls = STATUS_BADGE[row.status] ?? STATUS_BADGE.open;
        const statusBadge = el(
          'span',
          `px-2 py-1 rounded-full text-xs font-medium ${statusBadgeCls}`,
          statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
        );
        tdStatus.appendChild(statusBadge);
        tr.appendChild(tdStatus);

        // Actions
        const tdActions = el('td', tdCls);
        if (row.status === 'open' || row.status === 'in_progress') {
          const completeBtn = el(
            'button',
            'text-[var(--accent)] hover:underline text-sm mr-2',
            'Complete',
          );
          completeBtn.addEventListener('click', () => {
            void handleComplete(row.id);
          });
          tdActions.appendChild(completeBtn);
        }
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Complete Work Order ----
    async function handleComplete(id: string): Promise<void> {
      const completedDate = prompt('Completed date (YYYY-MM-DD):');
      if (!completedDate) return;

      const laborStr = prompt('Labor hours (leave blank to skip):');
      const partsStr = prompt('Parts cost (leave blank to skip):');
      const totalStr = prompt('Total cost (leave blank to skip):');

      const laborHours = laborStr ? parseFloat(laborStr) : undefined;
      const partsCost = partsStr ? parseFloat(partsStr) : undefined;
      const totalCost = totalStr ? parseFloat(totalStr) : undefined;

      void (async () => {
        try {
          const svc = getEquipService();
          await svc.completeWorkOrder(id, completedDate, laborHours, partsCost, totalCost);
          showMsg(wrapper, 'Work order completed successfully.', false);
          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to complete work order.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Save New Work Order ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getEquipService();

          if (!equipSelect.value) {
            showMsg(wrapper, 'Please select equipment.', true);
            return;
          }
          if (!woNumInput.value.trim()) {
            showMsg(wrapper, 'Please enter a work order number.', true);
            return;
          }
          if (!descInput.value.trim()) {
            showMsg(wrapper, 'Please enter a description.', true);
            return;
          }

          await svc.createWorkOrder({
            equipmentId: equipSelect.value,
            number: woNumInput.value.trim(),
            description: descInput.value.trim(),
            priority: priInput.value as 'low' | 'medium' | 'high' | 'critical',
            assignedTo: assignInput.value.trim() || undefined,
          });

          showMsg(wrapper, 'Work order created successfully.', false);
          formWrap.classList.add('hidden');

          // Reset form
          equipSelect.value = '';
          woNumInput.value = '';
          descInput.value = '';
          priInput.value = 'medium';
          assignInput.value = '';

          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create work order.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    statusSelect.addEventListener('change', () => {
      void loadTable();
    });
    priorityFilter.addEventListener('change', () => {
      void loadTable();
    });
    searchInput.addEventListener('input', () => {
      void loadTable();
    });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadEquipment();
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load work orders.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

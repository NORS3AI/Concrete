/**
 * Equipment Maintenance view.
 * Displays maintenance schedule and history with status filtering.
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
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
];

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  preventive: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  repair: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  inspection: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
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
      el('h1', 'text-2xl font-bold text-[var(--text)]', 'Maintenance Schedule'),
    );
    const newBtn = el('button', btnCls, 'Schedule Maintenance');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Inline Form (hidden by default) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Schedule Maintenance'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    // Equipment select
    const equipGroup = el('div');
    equipGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Equipment'));
    const equipSelect = el('select', inputCls) as HTMLSelectElement;
    equipSelect.className = inputCls + ' w-full';
    equipGroup.appendChild(equipSelect);
    formGrid.appendChild(equipGroup);

    // Type select
    const typeGroup = el('div');
    typeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Type'));
    const typeInput = el('select', inputCls + ' w-full') as HTMLSelectElement;
    for (const opt of [
      { value: 'preventive', label: 'Preventive' },
      { value: 'repair', label: 'Repair' },
      { value: 'inspection', label: 'Inspection' },
    ]) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeInput.appendChild(o);
    }
    typeGroup.appendChild(typeInput);
    formGrid.appendChild(typeGroup);

    // Description
    const descGroup = el('div');
    descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    const descInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    descInput.type = 'text';
    descInput.placeholder = 'Maintenance description';
    descGroup.appendChild(descInput);
    formGrid.appendChild(descGroup);

    // Scheduled Date
    const schedGroup = el('div');
    schedGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Scheduled Date'));
    const schedInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    schedInput.type = 'date';
    schedGroup.appendChild(schedInput);
    formGrid.appendChild(schedGroup);

    // Vendor ID
    const vendorGroup = el('div');
    vendorGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Vendor ID'));
    const vendorInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    vendorInput.type = 'text';
    vendorInput.placeholder = 'Vendor ID';
    vendorGroup.appendChild(vendorInput);
    formGrid.appendChild(vendorGroup);

    // Next Service Meter
    const nsMeterGroup = el('div');
    nsMeterGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Next Service Meter'));
    const nsMeterInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    nsMeterInput.type = 'number';
    nsMeterInput.placeholder = 'Meter reading';
    nsMeterGroup.appendChild(nsMeterInput);
    formGrid.appendChild(nsMeterGroup);

    // Next Service Date
    const nsDateGroup = el('div');
    nsDateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Next Service Date'));
    const nsDateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    nsDateInput.type = 'date';
    nsDateGroup.appendChild(nsDateInput);
    formGrid.appendChild(nsDateGroup);

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

    const typeFilter = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeFilter.appendChild(o);
    }
    bar.appendChild(typeFilter);

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search maintenance...';
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

      const filters: { status?: string; type?: string } = {};
      if (statusSelect.value) {
        (filters as Record<string, string>).status = statusSelect.value;
      }
      if (typeFilter.value) {
        (filters as Record<string, string>).type = typeFilter.value;
      }

      let records = await svc.getMaintenanceRecords(filters as Parameters<typeof svc.getMaintenanceRecords>[0]);

      // Also merge overdue if no status filter or overdue is selected
      if (!statusSelect.value || statusSelect.value === 'overdue') {
        const overdue = await svc.getOverdueMaintenance();
        if (statusSelect.value === 'overdue') {
          records = overdue;
        } else {
          // Mark overdue records in the existing set
          const overdueIds = new Set(overdue.map((r) => r.id));
          for (const rec of records) {
            if (overdueIds.has(rec.id) && rec.status !== 'completed') {
              (rec as Record<string, unknown>).status = 'overdue';
            }
          }
        }
      }

      // Apply text search
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        records = records.filter((r) => {
          const equipNum = resolveEquipNum(r.equipmentId).toLowerCase();
          const desc = (r.description ?? '').toLowerCase();
          const type = r.type.toLowerCase();
          return equipNum.includes(search) || desc.includes(search) || type.includes(search);
        });
      }

      renderTable(records);
    }

    function renderTable(
      records: Array<{ id: string; equipmentId: string; type: string; description?: string; scheduledDate?: string; completedDate?: string; cost?: number; meterAtService?: number; nextServiceDate?: string; status: string }>,
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
        'Equip #', 'Type', 'Description', 'Scheduled', 'Completed', 'Cost', 'Status', 'Actions',
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
          'No maintenance records found. Schedule maintenance to get started.',
        );
        td.setAttribute('colspan', '8');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of records) {
        const tr = el('tr', trCls);

        // Equip #
        tr.appendChild(el('td', tdCls + ' font-mono', resolveEquipNum(row.equipmentId)));

        // Type badge
        const tdType = el('td', tdCls);
        const typeBadgeCls = TYPE_BADGE[row.type] ?? TYPE_BADGE.preventive;
        const typeBadge = el(
          'span',
          `px-2 py-1 rounded-full text-xs font-medium ${typeBadgeCls}`,
          row.type.charAt(0).toUpperCase() + row.type.slice(1),
        );
        tdType.appendChild(typeBadge);
        tr.appendChild(tdType);

        // Description
        tr.appendChild(el('td', tdCls, row.description ?? ''));

        // Scheduled
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.scheduledDate ?? ''));

        // Completed
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.completedDate ?? ''));

        // Cost
        tr.appendChild(el('td', tdCls + ' font-mono', row.cost ? fmtCurrency(row.cost) : ''));

        // Status badge
        const tdStatus = el('td', tdCls);
        const statusLabel = row.status.replace('_', ' ');
        const statusBadgeCls = STATUS_BADGE[row.status] ?? STATUS_BADGE.scheduled;
        const statusBadge = el(
          'span',
          `px-2 py-1 rounded-full text-xs font-medium ${statusBadgeCls}`,
          statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
        );
        tdStatus.appendChild(statusBadge);
        tr.appendChild(tdStatus);

        // Actions
        const tdActions = el('td', tdCls);
        if (row.status !== 'completed') {
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

    // ---- Complete Maintenance ----
    async function handleComplete(id: string): Promise<void> {
      const completedDate = prompt('Completed date (YYYY-MM-DD):');
      if (!completedDate) return;

      const costStr = prompt('Cost (leave blank to skip):');
      const meterStr = prompt('Meter reading at service (leave blank to skip):');

      const cost = costStr ? parseFloat(costStr) : undefined;
      const meter = meterStr ? parseFloat(meterStr) : undefined;

      void (async () => {
        try {
          const svc = getEquipService();
          await svc.completeMaintenance(id, completedDate, cost, meter);
          showMsg(wrapper, 'Maintenance record completed successfully.', false);
          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to complete maintenance record.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Save New Maintenance ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getEquipService();

          if (!equipSelect.value) {
            showMsg(wrapper, 'Please select equipment.', true);
            return;
          }

          await svc.createMaintenance({
            equipmentId: equipSelect.value,
            type: typeInput.value as 'preventive' | 'repair' | 'inspection',
            description: descInput.value || undefined,
            scheduledDate: schedInput.value || undefined,
            vendorId: vendorInput.value || undefined,
            nextServiceMeter: nsMeterInput.value ? parseFloat(nsMeterInput.value) : undefined,
            nextServiceDate: nsDateInput.value || undefined,
          });

          showMsg(wrapper, 'Maintenance scheduled successfully.', false);
          formWrap.classList.add('hidden');

          // Reset form
          equipSelect.value = '';
          typeInput.value = 'preventive';
          descInput.value = '';
          schedInput.value = '';
          vendorInput.value = '';
          nsMeterInput.value = '';
          nsDateInput.value = '';

          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to schedule maintenance.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    statusSelect.addEventListener('change', () => {
      void loadTable();
    });
    typeFilter.addEventListener('change', () => {
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
        const message = err instanceof Error ? err.message : 'Failed to load maintenance records.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

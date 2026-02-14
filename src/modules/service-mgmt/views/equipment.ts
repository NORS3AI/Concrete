/**
 * Customer Equipment Registry view.
 * Table of customer equipment with name, model, serial, warranty, and next service.
 * Integrates with ServiceMgmtService for data and mutations.
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'retired', label: 'Retired' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  retired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentRow {
  id: string;
  name: string;
  customerId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  warrantyEndDate: string;
  nextServiceDate: string;
  location: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Filter Bar (with customer search)
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
  onCustomerSearch: (customerId: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const customerInput = el('input', inputCls) as HTMLInputElement;
  customerInput.type = 'text';
  customerInput.placeholder = 'Enter Customer ID and press Enter...';
  bar.appendChild(customerInput);

  const loadBtn = el('button', 'px-3 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load');
  loadBtn.type = 'button';
  bar.appendChild(loadBtn);

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Filter equipment...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fireFilter = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fireFilter);
  searchInput.addEventListener('input', fireFilter);

  const fireCustomer = () => {
    const val = customerInput.value.trim();
    if (val) onCustomerSearch(val);
  };
  loadBtn.addEventListener('click', fireCustomer);
  customerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fireCustomer();
  });

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  equipment: EquipmentRow[],
  onEdit: (eqId: string) => void,
  onRetire: (eqId: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Customer', 'Manufacturer', 'Model', 'Serial #', 'Warranty End', 'Next Service', 'Location', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (equipment.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No equipment found. Enter a Customer ID above to load equipment, or register new equipment.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const eq of equipment) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', eq.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', eq.customerId));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.manufacturer));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.model));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', eq.serialNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.warrantyEndDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.nextServiceDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', eq.location));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[eq.status] ?? STATUS_BADGE.active}`,
      eq.status.charAt(0).toUpperCase() + eq.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (eq.status !== 'retired') {
      const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
      editBtn.type = 'button';
      editBtn.addEventListener('click', () => onEdit(eq.id));
      tdActions.appendChild(editBtn);
      const retireBtn = el('button', 'text-red-400 hover:underline text-sm', 'Retire');
      retireBtn.type = 'button';
      retireBtn.addEventListener('click', () => onRetire(eq.id));
      tdActions.appendChild(retireBtn);
    }
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

    // Loading indicator
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Enter a Customer ID above to load equipment.');
    wrapper.appendChild(loading);
    container.appendChild(wrapper);

    // Async data loading and UI build
    (async () => {
      const svc = getServiceMgmtService();
      let allEquipment: EquipmentRow[] = [];
      let filteredEquipment: EquipmentRow[] = [];
      let currentCustomerId = '';

      // --- Map raw data to rows ---
      const mapEquipment = (raw: any[]): EquipmentRow[] => {
        return raw.map((eq) => ({
          id: eq.id,
          name: eq.name ?? '',
          customerId: eq.customerId ?? '',
          manufacturer: eq.manufacturer ?? '',
          model: eq.model ?? '',
          serialNumber: eq.serialNumber ?? '',
          warrantyEndDate: eq.warrantyEndDate ?? '',
          nextServiceDate: eq.nextServiceDate ?? '',
          location: eq.location ?? '',
          status: eq.status ?? 'active',
        }));
      };

      // --- Re-render table in place ---
      const renderTable = () => {
        const existing = wrapper.querySelector('[data-role="equipment-table"]');
        if (existing) existing.remove();

        const tableWrap = buildTable(filteredEquipment, handleEdit, handleRetire);
        tableWrap.setAttribute('data-role', 'equipment-table');
        wrapper.appendChild(tableWrap);
      };

      // --- Load equipment for a customer ---
      const loadByCustomer = async (customerId: string) => {
        currentCustomerId = customerId;
        try {
          const raw = await svc.listEquipmentByCustomer(customerId);
          allEquipment = mapEquipment(raw);
          applyFilters();
          showMsg(`Loaded ${allEquipment.length} equipment record(s) for customer.`, 'info');
        } catch (err) {
          showMsg(`Failed to load equipment: ${err}`, 'error');
        }
      };

      // --- Reload ---
      const reloadData = async () => {
        if (currentCustomerId) {
          await loadByCustomer(currentCustomerId);
        }
      };

      // --- Filters ---
      let currentStatusFilter = '';
      let currentSearchFilter = '';

      const applyFilters = () => {
        filteredEquipment = allEquipment.filter((eq) => {
          if (currentStatusFilter && eq.status !== currentStatusFilter) return false;
          if (currentSearchFilter) {
            const q = currentSearchFilter.toLowerCase();
            const searchable = `${eq.name} ${eq.manufacturer} ${eq.model} ${eq.serialNumber} ${eq.location}`.toLowerCase();
            if (!searchable.includes(q)) return false;
          }
          return true;
        });
        renderTable();
      };

      // --- Actions ---
      const handleEdit = async (eqId: string) => {
        const eq = allEquipment.find((e) => e.id === eqId);
        if (!eq) return;

        const name = prompt('Name:', eq.name);
        if (name === null) return;
        const manufacturer = prompt('Manufacturer:', eq.manufacturer);
        if (manufacturer === null) return;
        const model = prompt('Model:', eq.model);
        if (model === null) return;
        const location = prompt('Location:', eq.location);
        if (location === null) return;
        const notes = prompt('Notes (optional):');

        const changes: Record<string, unknown> = {};
        if (name && name !== eq.name) changes.name = name;
        if (manufacturer !== eq.manufacturer) changes.manufacturer = manufacturer;
        if (model !== eq.model) changes.model = model;
        if (location !== eq.location) changes.location = location;
        if (notes) changes.notes = notes;

        if (Object.keys(changes).length === 0) {
          showMsg('No changes made.', 'info');
          return;
        }

        try {
          await svc.updateEquipment(eqId, changes);
          showMsg('Equipment updated successfully.', 'success');
          await reloadData();
        } catch (err) {
          showMsg(`Failed to update equipment: ${err}`, 'error');
        }
      };

      const handleRetire = async (eqId: string) => {
        if (!confirm('Are you sure you want to retire this equipment?')) return;
        try {
          await svc.retireEquipment(eqId);
          showMsg('Equipment retired successfully.', 'success');
          await reloadData();
        } catch (err) {
          showMsg(`Failed to retire equipment: ${err}`, 'error');
        }
      };

      const handleRegister = async () => {
        const customerId = prompt('Customer ID:', currentCustomerId || '');
        if (!customerId) return;
        const name = prompt('Equipment name:');
        if (!name) return;
        const manufacturer = prompt('Manufacturer (optional):') || undefined;
        const model = prompt('Model (optional):') || undefined;
        const serialNumber = prompt('Serial number (optional):') || undefined;
        const installDate = prompt('Install date (YYYY-MM-DD, optional):') || undefined;
        const warrantyEndDate = prompt('Warranty end date (YYYY-MM-DD, optional):') || undefined;
        const location = prompt('Location (optional):') || undefined;

        try {
          await svc.registerEquipment({
            customerId,
            name,
            manufacturer,
            model,
            serialNumber,
            installDate,
            warrantyEndDate,
            location,
          });
          showMsg('Equipment registered successfully.', 'success');
          // Load the customer's equipment if we registered for current customer
          if (customerId === currentCustomerId || !currentCustomerId) {
            currentCustomerId = customerId;
          }
          await reloadData();
        } catch (err) {
          showMsg(`Failed to register equipment: ${err}`, 'error');
        }
      };

      // --- Build UI ---
      wrapper.innerHTML = '';

      const headerRow = el('div', 'flex items-center justify-between mb-4');
      headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Customer Equipment'));
      const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Register Equipment');
      newBtn.type = 'button';
      newBtn.addEventListener('click', handleRegister);
      headerRow.appendChild(newBtn);
      wrapper.appendChild(headerRow);

      wrapper.appendChild(buildFilterBar(
        (status, search) => {
          currentStatusFilter = status;
          currentSearchFilter = search;
          applyFilters();
        },
        (customerId) => {
          loadByCustomer(customerId);
        },
      ));

      renderTable();
    })();
  },
};

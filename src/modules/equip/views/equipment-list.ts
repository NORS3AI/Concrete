/**
 * Equipment List view.
 * Filterable table of equipment with category, status, and search filters.
 * Wired to EquipService for data and delete operations.
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

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rented', label: 'Rented' },
  { value: 'idle', label: 'Idle' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disposed', label: 'Disposed' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-red-500/10 text-red-400 border border-red-500/20',
  disposed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const CATEGORY_BADGE: Record<string, string> = {
  owned: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  leased: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rented: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  idle: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/equipment/new';
    newBtn.textContent = 'New Equipment';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const categorySelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of CATEGORY_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      categorySelect.appendChild(o);
    }
    filterBar.appendChild(categorySelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search equipment...';
    filterBar.appendChild(searchInput);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const svc = getEquipService();

        // Build service-level filters
        const filters: { category?: 'owned' | 'leased' | 'rented' | 'idle'; status?: 'active' | 'inactive' | 'disposed' } = {};
        if (categorySelect.value) {
          filters.category = categorySelect.value as 'owned' | 'leased' | 'rented' | 'idle';
        }
        if (statusSelect.value) {
          filters.status = statusSelect.value as 'active' | 'inactive' | 'disposed';
        }

        let items = await svc.getEquipmentList(filters);

        // Client-side search filter
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          items = items.filter((item) => {
            const searchable = [
              item.equipmentNumber,
              item.description,
              item.make ?? '',
              item.model ?? '',
              item.serialNumber ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
        }

        // Build the table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Table header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Equip #', 'Description', 'Year/Make/Model', 'Serial #', 'Category', 'Status', 'Meter', 'Current Value', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No equipment found. Add your first piece of equipment to get started.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

          // Equip #
          const tdNum = el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono');
          const link = el('a', 'text-[var(--accent)] hover:underline', item.equipmentNumber) as HTMLAnchorElement;
          link.href = `#/equipment/${item.id}`;
          tdNum.appendChild(link);
          tr.appendChild(tdNum);

          // Description
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.description));

          // Year/Make/Model
          const ymm = [item.year ? String(item.year) : '', item.make ?? '', item.model ?? ''].filter(Boolean).join(' ');
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', ymm));

          // Serial #
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.serialNumber ?? ''));

          // Category badge
          const tdCat = el('td', 'px-4 py-3 text-sm');
          const catBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_BADGE[item.category] ?? CATEGORY_BADGE.owned}`,
            item.category.charAt(0).toUpperCase() + item.category.slice(1));
          tdCat.appendChild(catBadge);
          tr.appendChild(tdCat);

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.active}`,
            item.status.charAt(0).toUpperCase() + item.status.slice(1));
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          // Meter
          const meterText = item.meterReading ? `${item.meterReading.toLocaleString()} ${item.meterUnit ?? ''}`.trim() : '';
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', meterText));

          // Current Value
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.currentValue ?? 0)));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const actionsWrap = el('div', 'flex items-center gap-3');

          const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
          editLink.href = `#/equipment/${item.id}`;
          actionsWrap.appendChild(editLink);

          const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
          deleteBtn.addEventListener('click', () => {
            if (!confirm(`Delete equipment "${item.equipmentNumber}"? This cannot be undone.`)) return;
            void (async () => {
              try {
                await svc.deleteEquipment(item.id);
                showMsg(wrapper, `Equipment "${item.equipmentNumber}" deleted.`, false);
                await loadAndRender();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete equipment';
                showMsg(wrapper, message, true);
              }
            })();
          });
          actionsWrap.appendChild(deleteBtn);

          tdActions.appendChild(actionsWrap);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load equipment list';
        showMsg(wrapper, message, true);
      }
    }

    // Wire up filter events
    categorySelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());
    searchInput.addEventListener('input', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};

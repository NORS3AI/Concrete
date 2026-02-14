/**
 * Item Master list view.
 * Filterable table of inventory items with category, status, and search filters.
 * Includes summary stats row and deactivation support.
 * Wired to InventoryService for data and operations.
 */

import { getInventoryService } from '../service-accessor';

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
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'finished_good', label: 'Finished Good' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'safety', label: 'Safety' },
  { value: 'tool', label: 'Tool' },
  { value: 'equipment_part', label: 'Equipment Part' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Item Master'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/inventory/items/new';
    newBtn.textContent = 'New Item';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary stats container
    const statsContainer = el('div', 'grid grid-cols-4 gap-4 mb-4');
    wrapper.appendChild(statsContainer);

    // Filter bar
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search items...';
    filterBar.appendChild(searchInput);

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

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Summary card builder
    // -----------------------------------------------------------------------

    function buildStatCard(label: string, value: string, accent?: boolean): HTMLElement {
      const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
      card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
      card.appendChild(el('div', `text-xl font-bold font-mono ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
      return card;
    }

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    let allItems: Awaited<ReturnType<typeof svc.listItems>> = [];
    let svc: ReturnType<typeof getInventoryService>;

    async function loadAndRender(): Promise<void> {
      try {
        svc = getInventoryService();

        // Load all items (no service-level filters so we can compute stats on the full set)
        allItems = await svc.listItems();

        // Compute summary stats
        const totalItems = allItems.length;
        const activeItems = allItems.filter((i) => i.active).length;
        const lowStockItems = await svc.getLowStockItems();
        const categories = new Set(allItems.map((i) => i.category));

        statsContainer.innerHTML = '';
        statsContainer.appendChild(buildStatCard('Total Items', String(totalItems)));
        statsContainer.appendChild(buildStatCard('Active Items', String(activeItems), true));
        statsContainer.appendChild(buildStatCard('Low Stock', String(lowStockItems.length)));
        statsContainer.appendChild(buildStatCard('Categories', String(categories.size)));

        // Apply client-side filters
        let filtered = allItems;

        const catFilter = categorySelect.value;
        if (catFilter) {
          filtered = filtered.filter((i) => i.category === catFilter);
        }

        const statusFilter = statusSelect.value;
        if (statusFilter === 'active') {
          filtered = filtered.filter((i) => i.active);
        } else if (statusFilter === 'inactive') {
          filtered = filtered.filter((i) => !i.active);
        }

        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          filtered = filtered.filter((i) => {
            const searchable = [
              i.number,
              i.description,
              i.preferredVendorName ?? '',
              i.category,
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
        }

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Table header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Number', 'Description', 'Unit', 'Category', 'Vendor', 'Reorder Point', 'Unit Cost', 'Avg Cost', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (filtered.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No items found. Add your first inventory item to get started.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of filtered) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

          // Number
          const tdNum = el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono');
          const link = el('a', 'text-[var(--accent)] hover:underline', item.number) as HTMLAnchorElement;
          link.href = `#/inventory/items/${(item as any).id}`;
          tdNum.appendChild(link);
          tr.appendChild(tdNum);

          // Description
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.description));

          // Unit
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.unit));

          // Category
          const catLabel = CATEGORY_OPTIONS.find((c) => c.value === item.category)?.label ?? item.category;
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', catLabel));

          // Vendor
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.preferredVendorName ?? ''));

          // Reorder Point
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.reorderPoint)));

          // Unit Cost
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.unitCost)));

          // Avg Cost
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.avgCost)));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusLabel = item.active ? 'Active' : 'Inactive';
          const statusKey = item.active ? 'active' : 'inactive';
          const statusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[statusKey]}`,
            statusLabel);
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const actionsWrap = el('div', 'flex items-center gap-3');

          const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
          editLink.href = `#/inventory/items/${(item as any).id}`;
          actionsWrap.appendChild(editLink);

          if (item.active) {
            const deactivateBtn = el('button', 'text-red-400 hover:underline text-sm', 'Deactivate');
            deactivateBtn.type = 'button';
            deactivateBtn.addEventListener('click', () => {
              if (!confirm(`Deactivate item "${item.number} - ${item.description}"?`)) return;
              void (async () => {
                try {
                  await svc.deactivateItem((item as any).id);
                  showMsg(wrapper, `Item "${item.number}" deactivated.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to deactivate item';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            actionsWrap.appendChild(deactivateBtn);
          }

          tdActions.appendChild(actionsWrap);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load items';
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

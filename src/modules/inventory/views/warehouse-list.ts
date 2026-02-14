/**
 * Warehouses & Locations list view.
 * Filterable table of warehouses, yards, job sites, and vehicles.
 * Includes summary stats, inline creation via prompt(), and deactivation.
 * Wired to InventoryService for data and operations.
 */

import { getInventoryService } from '../service-accessor';
import type { WarehouseType } from '../inventory-service';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'yard', label: 'Yard' },
  { value: 'job_site', label: 'Job Site' },
  { value: 'vehicle', label: 'Vehicle' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_BADGE: Record<string, string> = {
  warehouse: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  yard: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  job_site: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  vehicle: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  yard: 'Yard',
  job_site: 'Job Site',
  vehicle: 'Vehicle',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Warehouses & Locations'));

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Location');
    newBtn.type = 'button';
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
    searchInput.placeholder = 'Search locations...';
    filterBar.appendChild(searchInput);

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

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

    let svc: ReturnType<typeof getInventoryService>;

    async function loadAndRender(): Promise<void> {
      try {
        svc = getInventoryService();

        // Load all warehouses
        const allWarehouses = await svc.listWarehouses();

        // Compute summary stats
        const totalLocations = allWarehouses.length;
        const warehouseCount = allWarehouses.filter((w) => w.type === 'warehouse').length;
        const yardCount = allWarehouses.filter((w) => w.type === 'yard').length;
        const jobSiteCount = allWarehouses.filter((w) => w.type === 'job_site').length;

        statsContainer.innerHTML = '';
        statsContainer.appendChild(buildStatCard('Total Locations', String(totalLocations)));
        statsContainer.appendChild(buildStatCard('Warehouses', String(warehouseCount), true));
        statsContainer.appendChild(buildStatCard('Yards', String(yardCount)));
        statsContainer.appendChild(buildStatCard('Job Sites', String(jobSiteCount)));

        // Apply client-side filters
        let filtered = allWarehouses;

        const typeFilter = typeSelect.value;
        if (typeFilter) {
          filtered = filtered.filter((w) => w.type === typeFilter);
        }

        const statusFilter = statusSelect.value;
        if (statusFilter === 'active') {
          filtered = filtered.filter((w) => w.active);
        } else if (statusFilter === 'inactive') {
          filtered = filtered.filter((w) => !w.active);
        }

        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          filtered = filtered.filter((w) => {
            const searchable = [
              w.name,
              w.address ?? '',
              w.jobId ?? '',
              w.contactName ?? '',
              w.contactPhone ?? '',
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
        for (const col of ['Name', 'Type', 'Address', 'Job ID', 'Contact', 'Phone', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (filtered.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No locations found. Add your first warehouse or location to get started.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const wh of filtered) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

          // Name
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', wh.name));

          // Type badge
          const tdType = el('td', 'px-4 py-3 text-sm');
          const typeLabel = TYPE_LABELS[wh.type] ?? wh.type;
          const typeBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[wh.type] ?? TYPE_BADGE.warehouse}`,
            typeLabel);
          tdType.appendChild(typeBadge);
          tr.appendChild(tdType);

          // Address
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', wh.address ?? ''));

          // Job ID
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', wh.jobId ?? ''));

          // Contact
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', wh.contactName ?? ''));

          // Phone
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', wh.contactPhone ?? ''));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusLabel = wh.active ? 'Active' : 'Inactive';
          const statusKey = wh.active ? 'active' : 'inactive';
          const statusBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[statusKey]}`,
            statusLabel);
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const actionsWrap = el('div', 'flex items-center gap-3');

          if (wh.active) {
            const deactivateBtn = el('button', 'text-red-400 hover:underline text-sm', 'Deactivate');
            deactivateBtn.type = 'button';
            deactivateBtn.addEventListener('click', () => {
              if (!confirm(`Deactivate location "${wh.name}"?`)) return;
              void (async () => {
                try {
                  await svc.deactivateWarehouse((wh as any).id);
                  showMsg(wrapper, `Location "${wh.name}" deactivated.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to deactivate location';
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
        const message = err instanceof Error ? err.message : 'Failed to load locations';
        showMsg(wrapper, message, true);
      }
    }

    // -----------------------------------------------------------------------
    // New Location handler (prompt-based)
    // -----------------------------------------------------------------------

    newBtn.addEventListener('click', () => {
      const name = prompt('Location name:');
      if (!name || !name.trim()) return;

      const typeInput = prompt('Type (warehouse, yard, job_site, vehicle):');
      if (!typeInput || !['warehouse', 'yard', 'job_site', 'vehicle'].includes(typeInput.trim())) {
        showMsg(wrapper, 'Invalid type. Must be one of: warehouse, yard, job_site, vehicle.', true);
        return;
      }

      const address = prompt('Address (optional):') ?? '';
      const jobId = prompt('Job ID (optional):') ?? '';
      const contactName = prompt('Contact name (optional):') ?? '';
      const contactPhone = prompt('Contact phone (optional):') ?? '';

      void (async () => {
        try {
          svc = getInventoryService();
          await svc.createWarehouse({
            name: name.trim(),
            type: typeInput.trim() as WarehouseType,
            address: address.trim() || undefined,
            jobId: jobId.trim() || undefined,
            contactName: contactName.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
          });
          showMsg(wrapper, `Location "${name.trim()}" created successfully.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create location';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // Wire up filter events
    typeSelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());
    searchInput.addEventListener('input', () => void loadAndRender());

    // Initial load
    void loadAndRender();
  },
};

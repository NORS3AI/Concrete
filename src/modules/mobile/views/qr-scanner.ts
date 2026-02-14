/**
 * QR Scanner Records view.
 * Displays QR scan records with scanned by, entity type, entity ID, job, and action.
 * Filterable by entity type and job.
 */

import { getMobileService } from '../service-accessor';

const svc = () => getMobileService();

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const showMsg = (c: HTMLElement, msg: string, ok = true) => {
  const d = el('div', `p-3 rounded mb-4 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`, msg);
  c.prepend(d);
  setTimeout(() => d.remove(), 3000);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const ENTITY_TYPE_BADGE: Record<string, string> = {
  equipment: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  material: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  location: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'material', label: 'Material' },
  { value: 'location', label: 'Location' },
];

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'QR Scan Records'));
    const badge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const entityTypeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of ENTITY_TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      entityTypeSelect.appendChild(o);
    }
    bar.appendChild(entityTypeSelect);

    const jobInput = el('input', inputCls) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Filter by job...';
    bar.appendChild(jobInput);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Loading State ----
    const loading = el('div', 'flex items-center justify-center py-12');
    loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading scan records...'));
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // ---- Load & Render ----
    async function loadTable(): Promise<void> {
      const service = svc();
      const filters: Record<string, string> = {};
      if (entityTypeSelect.value) filters.entityType = entityTypeSelect.value;

      let records = await service.listScans(filters as any);

      const jobFilter = jobInput.value.toLowerCase().trim();
      if (jobFilter) {
        records = records.filter(r =>
          (r.jobId ?? '').toLowerCase().includes(jobFilter)
        );
      }

      badge.textContent = String(records.length);
      renderTable(records);
    }

    function renderTable(records: any[]): void {
      tableContainer.innerHTML = '';

      if (records.length === 0) {
        const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
        empty.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No QR scan records found. Scans will appear here once performed from a mobile device.'));
        tableContainer.appendChild(empty);
        return;
      }

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Scanned By', 'Scanned At', 'Entity Type', 'Entity ID', 'Job', 'Action', 'Notes']) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const row of records) {
        const tr = el('tr', trCls);

        tr.appendChild(el('td', tdCls + ' font-medium', row.scannedBy));

        // Scanned at timestamp
        const scannedDate = new Date(row.scannedAt);
        const formattedDate = scannedDate.toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', formattedDate));

        // Entity type badge
        const tdEntityType = el('td', tdCls);
        const entityCls = ENTITY_TYPE_BADGE[row.entityType] ?? ENTITY_TYPE_BADGE.equipment;
        const entityLabel = row.entityType.charAt(0).toUpperCase() + row.entityType.slice(1);
        tdEntityType.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${entityCls}`, entityLabel));
        tr.appendChild(tdEntityType);

        tr.appendChild(el('td', tdCls + ' font-mono text-xs', row.entityId || '--'));
        tr.appendChild(el('td', tdCls, row.jobId || '--'));
        tr.appendChild(el('td', tdCls, row.action));
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.notes || '--'));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Filter Handlers ----
    entityTypeSelect.addEventListener('change', () => { void loadTable(); });
    jobInput.addEventListener('input', () => { void loadTable(); });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load scan records.';
        showMsg(wrapper, message, false);
      }
    })();
  },
};

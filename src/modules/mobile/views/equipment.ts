/**
 * Equipment Hours Logging view.
 * Displays equipment hours with equipment ID, job, hours used, meter reading, operator, and fuel.
 * Filterable by equipment and job.
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Hours'));
    const badge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const equipInput = el('input', inputCls) as HTMLInputElement;
    equipInput.type = 'text';
    equipInput.placeholder = 'Filter by equipment...';
    bar.appendChild(equipInput);

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
    loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading equipment logs...'));
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // ---- Load & Render ----
    async function loadTable(): Promise<void> {
      const service = svc();
      let records = await service.listEquipmentLogs();

      const equipFilter = equipInput.value.toLowerCase().trim();
      const jobFilter = jobInput.value.toLowerCase().trim();

      if (equipFilter) {
        records = records.filter(r =>
          (r.equipmentName ?? r.equipmentId).toLowerCase().includes(equipFilter)
        );
      }
      if (jobFilter) {
        records = records.filter(r =>
          r.jobId.toLowerCase().includes(jobFilter)
        );
      }

      badge.textContent = String(records.length);
      renderTable(records);
    }

    function renderTable(records: any[]): void {
      tableContainer.innerHTML = '';

      if (records.length === 0) {
        const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
        empty.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No equipment logs found. Equipment hours will appear here once logged from the field.'));
        tableContainer.appendChild(empty);
        return;
      }

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Equipment', 'Job', 'Date', 'Hours Used', 'Meter Reading', 'Operator', 'Fuel (gal)', 'Condition', 'Sync']) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const row of records) {
        const tr = el('tr', trCls);

        tr.appendChild(el('td', tdCls + ' font-medium font-mono', row.equipmentName || row.equipmentId));
        tr.appendChild(el('td', tdCls, row.jobId));
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.date));
        tr.appendChild(el('td', tdCls + ' font-mono text-right', String(row.hoursUsed)));
        tr.appendChild(el('td', tdCls + ' font-mono text-right', row.meterReading ? String(row.meterReading) : '--'));
        tr.appendChild(el('td', tdCls, row.operatorName || row.operatorId || '--'));
        tr.appendChild(el('td', tdCls + ' font-mono text-right', row.fuelAdded ? String(row.fuelAdded) : '--'));
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.condition || '--'));

        // Sync status
        const tdSync = el('td', tdCls);
        const syncCls = row.syncStatus === 'synced'
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : row.syncStatus === 'failed'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        tdSync.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${syncCls}`, row.syncStatus));
        tr.appendChild(tdSync);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Filter Handlers ----
    equipInput.addEventListener('input', () => { void loadTable(); });
    jobInput.addEventListener('input', () => { void loadTable(); });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load equipment logs.';
        showMsg(wrapper, message, false);
      }
    })();
  },
};

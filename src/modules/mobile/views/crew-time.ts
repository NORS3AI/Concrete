/**
 * Crew Time Entry view.
 * Displays foreman crew-based time entries with foreman, job, cost code, crew size, and total hours.
 * Filterable by foreman, job, and status.
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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Crew Time Entry'));
    const badge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const foremanInput = el('input', inputCls) as HTMLInputElement;
    foremanInput.type = 'text';
    foremanInput.placeholder = 'Filter by foreman...';
    bar.appendChild(foremanInput);

    const jobInput = el('input', inputCls) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Filter by job...';
    bar.appendChild(jobInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Loading State ----
    const loading = el('div', 'flex items-center justify-center py-12');
    loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading crew time entries...'));
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // ---- Load & Render ----
    async function loadTable(): Promise<void> {
      const service = svc();
      const filters: Record<string, string> = {};
      if (statusSelect.value) filters.status = statusSelect.value;

      let records = await service.listCrewEntries(filters as any);

      const foremanFilter = foremanInput.value.toLowerCase().trim();
      const jobFilter = jobInput.value.toLowerCase().trim();

      if (foremanFilter) {
        records = records.filter(r =>
          (r.foremanName ?? r.foremanId).toLowerCase().includes(foremanFilter)
        );
      }
      if (jobFilter) {
        records = records.filter(r =>
          (r.jobName ?? r.jobId).toLowerCase().includes(jobFilter)
        );
      }

      badge.textContent = String(records.length);
      renderTable(records);
    }

    function renderTable(records: any[]): void {
      tableContainer.innerHTML = '';

      if (records.length === 0) {
        const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
        empty.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No crew time entries found. Crew time entries will appear here once submitted by foremen.'));
        tableContainer.appendChild(empty);
        return;
      }

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Foreman', 'Job', 'Cost Code', 'Date', 'Crew Size', 'Total Hours', 'Status', 'Sync']) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const row of records) {
        const tr = el('tr', trCls);

        tr.appendChild(el('td', tdCls + ' font-medium', row.foremanName || row.foremanId));
        tr.appendChild(el('td', tdCls, row.jobName || row.jobId));
        tr.appendChild(el('td', tdCls + ' font-mono', row.costCode || '--'));
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.date));
        tr.appendChild(el('td', tdCls + ' font-mono text-right', String(row.crewSize)));
        tr.appendChild(el('td', tdCls + ' font-mono text-right', String(row.totalHours)));

        // Status badge
        const tdStatus = el('td', tdCls);
        const statusCls = STATUS_BADGE[row.status] ?? STATUS_BADGE.draft;
        const statusLabel = row.status.charAt(0).toUpperCase() + row.status.slice(1);
        tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${statusCls}`, statusLabel));
        tr.appendChild(tdStatus);

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
    foremanInput.addEventListener('input', () => { void loadTable(); });
    jobInput.addEventListener('input', () => { void loadTable(); });
    statusSelect.addEventListener('change', () => { void loadTable(); });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load crew time entries.';
        showMsg(wrapper, message, false);
      }
    })();
  },
};

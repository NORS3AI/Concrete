/**
 * Scheduled Reports view.
 * Shows name, type, schedule, recipients, delivery method, last/next run,
 * active status. Toggle active.
 */

import { getAnalyticsService } from '../service-accessor';

const svc = () => getAnalyticsService();

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
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const header = el('div', 'flex items-center justify-between mb-6');
    const titleRow = el('div', 'flex items-center gap-3');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Scheduled Reports'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading scheduled reports...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(reports: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Name', 'Type', 'Schedule', 'Recipients', 'Delivery', 'Last Run', 'Next Run', 'Active'];
      for (const col of cols) {
        headRow.appendChild(el('th', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left', col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (reports.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No scheduled reports found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const r of reports) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', r.name));

        const typeTd = el('td', 'px-4 py-3 text-sm');
        const typeBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', r.reportType);
        typeTd.appendChild(typeBadge);
        tr.appendChild(typeTd);

        const schedTd = el('td', 'px-4 py-3 text-sm');
        const schedBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--accent)]/10 text-[var(--accent)]', r.schedule);
        schedTd.appendChild(schedBadge);
        tr.appendChild(schedTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] max-w-[180px] truncate', r.recipients || '-'));

        const deliveryTd = el('td', 'px-4 py-3 text-sm');
        const deliveryBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', r.deliveryMethod);
        deliveryTd.appendChild(deliveryBadge);
        tr.appendChild(deliveryTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', r.lastRunAt || 'Never'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', r.nextRunAt || '-'));

        // Active toggle
        const activeTd = el('td', 'px-4 py-3 text-sm');
        const toggleBtn = el('button', '') as HTMLButtonElement;

        const updateToggle = (active: boolean) => {
          toggleBtn.className = active
            ? 'relative inline-flex h-5 w-9 items-center rounded-full bg-emerald-500 transition-colors'
            : 'relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-300 transition-colors';
          toggleBtn.innerHTML = '';
          const dot = el('span', `inline-block h-3.5 w-3.5 rounded-full bg-white transform transition-transform ${active ? 'translate-x-4.5' : 'translate-x-0.5'}`);
          toggleBtn.appendChild(dot);
        };

        updateToggle(r.active);
        toggleBtn.addEventListener('click', async () => {
          try {
            if (r.active) {
              await svc().deactivateReport((r as any)._id ?? r.reportId);
              r.active = false;
              showMsg(wrapper, `Report "${r.name}" deactivated.`);
            } else {
              showMsg(wrapper, 'Reactivation not supported from this view.', false);
              return;
            }
            updateToggle(r.active);
          } catch (err: unknown) {
            showMsg(wrapper, err instanceof Error ? err.message : 'Failed to toggle report', false);
          }
        });
        activeTd.appendChild(toggleBtn);
        tr.appendChild(activeTd);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    async function loadData(): Promise<void> {
      try {
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        const reports = await svc().listScheduledReports();
        badge.textContent = String(reports.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(reports));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load scheduled reports', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};

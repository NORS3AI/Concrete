/**
 * Custom Dashboards list view.
 * Shows name, owner, role access, default flag, widget count,
 * created/updated dates.
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
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Custom Dashboards'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading dashboards...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function getWidgetCount(widgetIds: string): number {
      if (!widgetIds || widgetIds.trim() === '') return 0;
      return widgetIds.split(',').filter(id => id.trim() !== '').length;
    }

    function buildTable(dashboards: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Name', 'Owner', 'Role Access', 'Default', 'Widgets', 'Created', 'Updated'];
      for (const col of cols) {
        const thCls = ['Widgets'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (dashboards.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No custom dashboards found. Create a dashboard to get started.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const d of dashboards) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', d.name));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', d.ownerName || d.ownerId || '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', d.roleAccess || 'All'));

        const defaultTd = el('td', 'px-4 py-3 text-sm');
        if (d.isDefault) {
          const defaultBadge = el('span', 'px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 font-medium', 'Default');
          defaultTd.appendChild(defaultBadge);
        } else {
          defaultTd.appendChild(el('span', 'text-[var(--text-muted)]', '-'));
        }
        tr.appendChild(defaultTd);

        const widgetCount = getWidgetCount(d.widgetIds);
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', String(widgetCount)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', d.createdDate || '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', d.updatedDate || '-'));

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

        const dashboards = await svc().listDashboards();
        badge.textContent = String(dashboards.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(dashboards));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load dashboards', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};

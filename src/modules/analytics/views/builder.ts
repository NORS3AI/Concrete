/**
 * Analytics Builder view.
 * Drag-and-drop analytics builder showing widgets for a dashboard.
 * List widgets with title, chart type, data source, dimensions.
 * Add/remove widget buttons. Dashboard selector.
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
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Analytics Builder'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);

    const btnGroup = el('div', 'flex items-center gap-2');
    const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', '+ Add Widget');
    btnGroup.appendChild(addBtn);
    header.appendChild(btnGroup);
    wrapper.appendChild(header);

    // Dashboard selector
    const selectorRow = el('div', 'flex items-center gap-3 mb-6');
    selectorRow.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Dashboard:'));
    const dashSelect = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
    const defaultOpt = el('option', '', 'All Dashboards') as HTMLOptionElement;
    defaultOpt.value = '';
    dashSelect.appendChild(defaultOpt);
    selectorRow.appendChild(dashSelect);
    wrapper.appendChild(selectorRow);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading widgets...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // State
    let selectedDashboardId = '';

    function buildTable(widgets: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Title', 'Chart Type', 'Data Source', 'Metrics', 'Width', 'Height', 'Position', 'Actions'];
      for (const col of cols) {
        const thCls = ['Width', 'Height'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (widgets.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No widgets found. Click "+ Add Widget" to create one.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const w of widgets) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');
        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', w.title));
        const typeBadge = el('td', 'px-4 py-3 text-sm');
        const typeSpan = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--accent)]/10 text-[var(--accent)]', w.chartType);
        typeBadge.appendChild(typeSpan);
        tr.appendChild(typeBadge);
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', w.dataSource));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', w.metrics || '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', String(w.width)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', String(w.height)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] font-mono', `(${w.posX}, ${w.posY})`));

        const actionsTd = el('td', 'px-4 py-3 text-sm');
        const removeBtn = el('button', 'px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50', 'Remove');
        removeBtn.addEventListener('click', async () => {
          try {
            await svc().removeWidget((w as any)._id ?? w.widgetId);
            showMsg(wrapper, `Widget "${w.title}" removed.`);
            void loadData();
          } catch (err: unknown) {
            showMsg(wrapper, err instanceof Error ? err.message : 'Failed to remove widget', false);
          }
        });
        actionsTd.appendChild(removeBtn);
        tr.appendChild(actionsTd);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    async function loadDashboards(): Promise<void> {
      try {
        const dashboards = await svc().listDashboards();
        for (const d of dashboards) {
          const opt = el('option', '', d.name) as HTMLOptionElement;
          opt.value = d.dashboardId;
          dashSelect.appendChild(opt);
        }
      } catch { /* ignore */ }
    }

    async function loadData(): Promise<void> {
      try {
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        const dashboardId = selectedDashboardId || '__default__';
        const widgets = await svc().listWidgets(dashboardId);

        badge.textContent = String(widgets.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(widgets));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load widgets', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    dashSelect.addEventListener('change', () => {
      selectedDashboardId = dashSelect.value;
      void loadData();
    });

    addBtn.addEventListener('click', async () => {
      try {
        const dashboardId = selectedDashboardId || '__default__';
        await svc().addWidget({
          widgetId: `w-${Date.now()}`,
          dashboardId,
          title: `Widget ${Date.now().toString(36)}`,
          chartType: 'bar',
          dataSource: 'transactions',
          metrics: 'amount',
        });
        showMsg(wrapper, 'Widget added successfully.');
        void loadData();
      } catch (err: unknown) {
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to add widget', false);
      }
    });

    void loadDashboards();
    void loadData();
  },
};

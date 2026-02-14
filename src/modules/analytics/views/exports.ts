/**
 * Data Export Configs view.
 * Shows name, target system, format, collections, schedule, last export,
 * record count, file size, active status.
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

function fmtFileSize(bytes: number | undefined | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtNumber(n: number | undefined | null): string {
  if (n == null) return '-';
  return n.toLocaleString('en-US');
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const header = el('div', 'flex items-center justify-between mb-6');
    const titleRow = el('div', 'flex items-center gap-3');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Data Export Configs'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading export configs...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(exports: any[]): HTMLElement {
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Name', 'Target System', 'Format', 'Collections', 'Schedule', 'Last Export', 'Records', 'File Size', 'Active'];
      for (const col of cols) {
        const thCls = ['Records', 'File Size'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (exports.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No export configurations found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const ex of exports) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', ex.name));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', ex.targetSystem));

        const formatTd = el('td', 'px-4 py-3 text-sm');
        const fmtBadge = el('span', 'px-2 py-0.5 text-xs font-mono rounded bg-[var(--accent)]/10 text-[var(--accent)]', ex.format.toUpperCase());
        formatTd.appendChild(fmtBadge);
        tr.appendChild(formatTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)] max-w-[180px] truncate', ex.collections || '-'));

        const schedTd = el('td', 'px-4 py-3 text-sm');
        if (ex.schedule) {
          const schedBadge = el('span', 'px-2 py-0.5 text-xs rounded bg-[var(--surface)] text-[var(--text-muted)]', ex.schedule);
          schedTd.appendChild(schedBadge);
        } else {
          schedTd.appendChild(el('span', 'text-[var(--text-muted)]', 'Manual'));
        }
        tr.appendChild(schedTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', ex.lastExportAt || 'Never'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtNumber(ex.recordCount)));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtFileSize(ex.fileSizeBytes)));

        const activeTd = el('td', 'px-4 py-3 text-sm');
        const activeBadge = el('span',
          ex.active
            ? 'px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 font-medium'
            : 'px-2 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-500 font-medium',
          ex.active ? 'Active' : 'Inactive');
        activeTd.appendChild(activeBadge);
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

        const exports = await svc().listExportConfigs();
        badge.textContent = String(exports.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(exports));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load export configs', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};

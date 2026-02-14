/**
 * Shared Service Allocations view.
 * Filterable table of allocations with post action.
 */

import { getIntercompanyService } from '../service-accessor';

const svc = () => getIntercompanyService();

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

const fmtDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METHOD_LABELS: Record<string, string> = {
  headcount: 'Headcount',
  revenue: 'Revenue',
  square_footage: 'Square Footage',
  custom: 'Custom',
};

const POSTED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Posted' },
  { value: 'false', label: 'Unposted' },
];

const COLUMNS = [
  'Allocation ID', 'Period', 'Service Name', 'Total Amount',
  'Method', 'Created By', 'Created Date', 'Posted', 'Actions',
];

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'p-6 space-y-0');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Shared Service Allocations'));
    const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    badge.setAttribute('data-role', 'count-badge');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const periodInput = document.createElement('input');
    periodInput.type = 'text';
    periodInput.placeholder = 'Filter by period (e.g. 2025-01)...';
    periodInput.className = inputCls;
    bar.appendChild(periodInput);

    const postedSelect = document.createElement('select');
    postedSelect.className = inputCls;
    for (const opt of POSTED_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      postedSelect.appendChild(o);
    }
    bar.appendChild(postedSelect);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading allocations...');
    wrapper.appendChild(loading);

    // Table container
    const tableContainer = el('div');
    tableContainer.style.display = 'none';
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Data load
    const loadData = async () => {
      try {
        const period = periodInput.value.trim() || undefined;
        const postedVal = postedSelect.value;
        const posted = postedVal === '' ? undefined : postedVal === 'true';
        const data = await svc().listAllocations({ period, posted });

        badge.textContent = String(data.length);
        loading.style.display = 'none';
        tableContainer.style.display = '';
        tableContainer.innerHTML = '';

        const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // thead
        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of COLUMNS) {
          const align = ['Total Amount'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No allocations found.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const alloc of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', alloc.allocationId));
          tr.appendChild(el('td', 'py-2 px-3', alloc.period));
          tr.appendChild(el('td', 'py-2 px-3', alloc.serviceName));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(alloc.totalAmount)));
          tr.appendChild(el('td', 'py-2 px-3', METHOD_LABELS[alloc.method] ?? alloc.method));
          tr.appendChild(el('td', 'py-2 px-3', alloc.createdBy));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(alloc.createdDate)));

          // Posted status
          const tdPosted = el('td', 'py-2 px-3');
          const postedBadge = el(
            'span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${alloc.posted
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`,
            alloc.posted ? 'Posted' : 'Unposted',
          );
          tdPosted.appendChild(postedBadge);
          tr.appendChild(tdPosted);

          // Actions
          const tdActions = el('td', 'py-2 px-3');
          if (!alloc.posted) {
            const postBtn = el('button', 'px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20', 'Post');
            postBtn.addEventListener('click', async () => {
              try {
                await svc().postAllocation((alloc as any).id);
                showMsg(wrapper, `Allocation ${alloc.allocationId} posted.`);
                loadData();
              } catch (err: any) {
                showMsg(wrapper, `Post failed: ${err.message}`, false);
              }
            });
            tdActions.appendChild(postBtn);
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableContainer.appendChild(tableWrap);
      } catch (err: any) {
        loading.style.display = 'none';
        tableContainer.style.display = '';
        showMsg(wrapper, `Failed to load allocations: ${err.message}`, false);
      }
    };

    // Wire filter events
    periodInput.addEventListener('input', loadData);
    postedSelect.addEventListener('change', loadData);

    loadData();
  },
};

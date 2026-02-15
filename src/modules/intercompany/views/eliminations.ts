/**
 * Elimination Entries view.
 * Filterable table of elimination journal entries with approve/post actions.
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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_review: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  posted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  posted: 'Posted',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
];

const COLUMNS = [
  'Elimination ID', 'Period', 'Description', 'Status',
  'Total Debits', 'Total Credits', 'Created By', 'Created Date',
  'Approved By', 'Approved Date', 'Actions',
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
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Elimination Entries'));
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

    const statusSelect = document.createElement('select');
    statusSelect.className = inputCls;
    for (const opt of STATUS_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    wrapper.appendChild(bar);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading eliminations...');
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
        const status = statusSelect.value || undefined;
        const data = await svc().listEliminations({
          period,
          status: status as any,
        });

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
          const align = ['Total Debits', 'Total Credits'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // tbody
        const tbody = el('tbody');
        if (data.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No elimination entries found.');
          td.setAttribute('colspan', String(COLUMNS.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const entry of data) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', entry.eliminationId));
          tr.appendChild(el('td', 'py-2 px-3', entry.period));
          tr.appendChild(el('td', 'py-2 px-3 truncate max-w-[200px]', entry.description));

          // Status badge
          const tdStatus = el('td', 'py-2 px-3');
          const statusBadge = el(
            'span',
            `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[entry.status] ?? STATUS_BADGE.draft}`,
            STATUS_LABELS[entry.status] ?? entry.status,
          );
          tdStatus.appendChild(statusBadge);
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(entry.totalDebits)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(entry.totalCredits)));
          tr.appendChild(el('td', 'py-2 px-3', entry.createdBy));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', fmtDate(entry.createdDate)));
          tr.appendChild(el('td', 'py-2 px-3', entry.approvedBy ?? ''));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.approvedDate ? fmtDate(entry.approvedDate) : ''));

          // Actions
          const tdActions = el('td', 'py-2 px-3');
          const btnCls = 'px-2 py-1 rounded text-xs font-medium mr-1';

          if (entry.status === 'draft' || entry.status === 'pending_review') {
            const approveBtn = el('button', `${btnCls} bg-blue-500/10 text-blue-400 hover:bg-blue-500/20`, 'Approve');
            approveBtn.addEventListener('click', async () => {
              try {
                await svc().approveElimination((entry as any).id, 'current-user');
                showMsg(wrapper, `Elimination ${entry.eliminationId} approved.`);
                loadData();
              } catch (err: any) {
                showMsg(wrapper, `Approve failed: ${err.message}`, false);
              }
            });
            tdActions.appendChild(approveBtn);
          }

          if (entry.status === 'approved') {
            const postBtn = el('button', `${btnCls} bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`, 'Post');
            postBtn.addEventListener('click', async () => {
              try {
                await svc().postElimination((entry as any).id);
                showMsg(wrapper, `Elimination ${entry.eliminationId} posted.`);
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
        showMsg(wrapper, `Failed to load eliminations: ${err.message}`, false);
      }
    };

    // Wire filter events
    periodInput.addEventListener('input', loadData);
    statusSelect.addEventListener('change', loadData);

    loadData();
  },
};

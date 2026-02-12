/**
 * Estimate List view.
 * Filterable table of estimates with status badges, margin display,
 * and quick actions for creating, editing, and managing estimates.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-400 border border-red-500/20',
  withdrawn: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EstimateRow {
  id: string;
  name: string;
  revision: number;
  status: string;
  clientName: string;
  projectName: string;
  totalCost: number;
  totalPrice: number;
  marginPct: number;
  bidDate: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search estimates...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(estimates: EstimateRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Rev', 'Status', 'Client', 'Project', 'Total Cost', 'Total Price', 'Margin', 'Bid Date', 'Actions']) {
    const align = ['Total Cost', 'Total Price', 'Margin'].includes(col)
      ? 'py-2 px-3 font-medium text-right'
      : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (estimates.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No estimates found. Create your first estimate to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const est of estimates) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3 font-medium');
    const link = el('a', 'text-[var(--accent)] hover:underline', est.name) as HTMLAnchorElement;
    link.href = `#/estimating/${est.id}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', String(est.revision)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[est.status] ?? STATUS_BADGE.draft}`,
      est.status.charAt(0).toUpperCase() + est.status.slice(1),
    );
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', est.clientName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', est.projectName));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(est.totalCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(est.totalPrice)));

    const marginCls = est.marginPct >= 15 ? 'text-emerald-400' : est.marginPct >= 5 ? 'text-amber-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${marginCls}`, fmtPct(est.marginPct)));

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', est.bidDate ?? ''));

    const tdActions = el('td', 'py-2 px-3');
    const actionsWrap = el('div', 'flex items-center gap-2');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/estimating/${est.id}`;
    actionsWrap.appendChild(editLink);
    const linesLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Lines') as HTMLAnchorElement;
    linesLink.href = `#/estimating/${est.id}/lines`;
    actionsWrap.appendChild(linesLink);
    const bidsLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Bids') as HTMLAnchorElement;
    bidsLink.href = `#/estimating/${est.id}/bids`;
    actionsWrap.appendChild(bidsLink);
    tdActions.appendChild(actionsWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Estimates'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/estimating/new';
    newBtn.textContent = 'New Estimate';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const estimates: EstimateRow[] = [];
    wrapper.appendChild(buildTable(estimates));

    container.appendChild(wrapper);
  },
};

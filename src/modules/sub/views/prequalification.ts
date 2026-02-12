/**
 * Prequalification view.
 * Filterable table of subcontractor prequalification records with
 * review/approval workflow actions. Tracks EMR, bonding capacity,
 * years in business, and revenue history.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  expired: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrequalRow {
  id: string;
  vendorName: string;
  submittedDate: string;
  reviewedDate: string;
  score: number;
  status: string;
  emr: number;
  bondingCapacity: number;
  yearsInBusiness: number;
  revenueAvg3Year: number;
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
  searchInput.placeholder = 'Search by vendor name...';
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
// Score Bar
// ---------------------------------------------------------------------------

function buildScoreBar(score: number): HTMLElement {
  const wrap = el('div', 'flex items-center gap-2');
  const barOuter = el('div', 'w-16 h-2 rounded-full bg-[var(--surface)] overflow-hidden');
  const barInner = el('div', 'h-full rounded-full');

  let colorClass = 'bg-red-500';
  if (score >= 80) colorClass = 'bg-emerald-500';
  else if (score >= 60) colorClass = 'bg-amber-500';
  else if (score >= 40) colorClass = 'bg-orange-500';

  barInner.className = `h-full rounded-full ${colorClass}`;
  barInner.style.width = `${Math.min(score, 100)}%`;
  barOuter.appendChild(barInner);
  wrap.appendChild(barOuter);
  wrap.appendChild(el('span', 'text-xs font-mono text-[var(--text)]', score.toString()));
  return wrap;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: PrequalRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Vendor', 'Submitted', 'Reviewed', 'Score', 'EMR', 'Bonding Capacity', 'Years', 'Avg Revenue', 'Status', 'Actions']) {
    const align = ['Bonding Capacity', 'Avg Revenue'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No prequalification records found.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const pq of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', pq.vendorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pq.submittedDate || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', pq.reviewedDate || '-'));

    const tdScore = el('td', 'py-2 px-3');
    tdScore.appendChild(buildScoreBar(pq.score));
    tr.appendChild(tdScore);

    const emrCls = pq.emr > 1.0 ? 'py-2 px-3 font-mono text-red-400' : 'py-2 px-3 font-mono text-emerald-400';
    tr.appendChild(el('td', emrCls, pq.emr ? pq.emr.toFixed(2) : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', pq.bondingCapacity ? fmtCurrency(pq.bondingCapacity) : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-center font-mono', pq.yearsInBusiness ? pq.yearsInBusiness.toString() : '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', pq.revenueAvg3Year ? fmtCurrency(pq.revenueAvg3Year) : '-'));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pq.status] ?? STATUS_BADGE.pending}`,
      pq.status.charAt(0).toUpperCase() + pq.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (pq.status === 'pending') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', () => { /* approve placeholder */ });
      tdActions.appendChild(approveBtn);

      const rejectBtn = el('button', 'text-red-400 hover:underline text-sm', 'Reject');
      rejectBtn.type = 'button';
      rejectBtn.addEventListener('click', () => { /* reject placeholder */ });
      tdActions.appendChild(rejectBtn);
    } else {
      const viewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'View');
      viewBtn.type = 'button';
      viewBtn.addEventListener('click', () => { /* view placeholder */ });
      tdActions.appendChild(viewBtn);
    }
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontractor Prequalification'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Prequalification');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new prequal placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const rows: PrequalRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};

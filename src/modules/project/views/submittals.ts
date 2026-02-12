/**
 * Submittals view.
 * Submittal log with number, spec section, description, status, and dates.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  approved_as_noted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  resubmit: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  approved_as_noted: 'Approved as Noted',
  rejected: 'Rejected',
  resubmit: 'Resubmit',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'approved_as_noted', label: 'Approved as Noted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resubmit', label: 'Resubmit' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubmittalRow {
  id: string;
  number: number;
  specSection: string;
  description: string;
  submittedBy: string;
  status: string;
  submittedDate: string;
  reviewedDate: string;
  reviewer: string;
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
  searchInput.placeholder = 'Search submittals...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_FILTER_OPTIONS) {
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

function buildTable(submittals: SubmittalRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Spec Section', 'Description', 'Submitted By', 'Status', 'Submitted', 'Reviewed', 'Reviewer', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (submittals.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No submittals found. Create a submittal to track project submissions.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const sub of submittals) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `SUB-${String(sub.number).padStart(3, '0')}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.specSection));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)] max-w-xs truncate', sub.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.submittedBy));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[sub.status] ?? STATUS_BADGE.pending}`,
      STATUS_LABELS[sub.status] ?? sub.status);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.submittedDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.reviewedDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.reviewer || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const reviewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Review');
    reviewBtn.type = 'button';
    tdActions.appendChild(reviewBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Submittals'));
    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Submittal');
    newBtn.type = 'button';
    newBtn.addEventListener('click', () => { /* new submittal placeholder */ });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const submittals: SubmittalRow[] = [];
    wrapper.appendChild(buildTable(submittals));

    container.appendChild(wrapper);
  },
};

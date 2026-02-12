/**
 * Certified Payroll view.
 * Lists WH-347 certified payroll reports with job, week ending,
 * totals, and status. Supports filtering and status workflow.
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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertPayrollRow {
  id: string;
  projectName: string;
  projectNumber: string;
  contractorName: string;
  weekEndingDate: string;
  reportNumber: string;
  totalGross: number;
  totalFringe: number;
  totalNet: number;
  status: string;
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
  searchInput.placeholder = 'Search by project, contractor...';
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

function buildTable(reports: CertPayrollRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Report #', 'Project', 'Contractor', 'Week Ending', 'Gross', 'Fringe', 'Net', 'Status', 'Actions']) {
    const align = (col === 'Gross' || col === 'Fringe' || col === 'Net') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (reports.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No certified payroll reports found. Generate one from a pay run to get started.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const report of reports) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', report.reportNumber || '--'));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', report.projectName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', report.contractorName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', report.weekEndingDate));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(report.totalGross)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(report.totalFringe)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(report.totalNet)));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[report.status] ?? STATUS_BADGE.draft}`,
      report.status.charAt(0).toUpperCase() + report.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (report.status === 'draft') {
      const submitBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Submit');
      tdActions.appendChild(submitBtn);
    }
    if (report.status === 'submitted') {
      const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm mr-2', 'Approve');
      tdActions.appendChild(approveBtn);
    }
    const viewBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'View');
    tdActions.appendChild(viewBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Certified Payroll (WH-347)'));
    const genBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate Report');
    headerRow.appendChild(genBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _search) => { /* filter placeholder */ }));

    const reports: CertPayrollRow[] = [];
    wrapper.appendChild(buildTable(reports));

    container.appendChild(wrapper);
  },
};

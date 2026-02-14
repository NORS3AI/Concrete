/**
 * Position Management & Org Chart view.
 * Filterable table of positions with summary stats, plus an org chart
 * section showing each position and its assigned employees.
 * Wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';
import type { PositionStatus } from '../hr-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-toast]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-toast': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'filled', label: 'Filled' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'eliminated', label: 'Eliminated' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  filled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  frozen: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  eliminated: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const COLUMNS = [
  'Title',
  'Job Code',
  'Department',
  'Pay Range',
  'Headcount',
  'Filled',
  'Status',
];

// ---------------------------------------------------------------------------
// Summary Stats
// ---------------------------------------------------------------------------

function buildSummaryStats(positions: Array<{ status: PositionStatus }>): HTMLElement {
  const total = positions.length;
  const open = positions.filter((p) => p.status === 'open').length;
  const filled = positions.filter((p) => p.status === 'filled').length;
  const frozen = positions.filter((p) => p.status === 'frozen').length;

  const items: { label: string; value: number; color: string }[] = [
    { label: 'Total Positions', value: total, color: 'text-[var(--text)]' },
    { label: 'Open', value: open, color: 'text-emerald-400' },
    { label: 'Filled', value: filled, color: 'text-blue-400' },
    { label: 'Frozen', value: frozen, color: 'text-amber-400' },
  ];

  const bar = el('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6' });

  for (const item of items) {
    const card = el(
      'div',
      {
        className:
          'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center',
      },
      el('div', { className: `text-2xl font-bold ${item.color}` }, String(item.value)),
      el('div', { className: 'text-xs text-[var(--text-muted)] mt-1' }, item.label),
    );
    bar.appendChild(card);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (search: string, status: string) => void,
): HTMLElement {
  const bar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });
  const inputCls =
    'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', {
    className: inputCls,
    type: 'text',
    placeholder: 'Search positions...',
  }) as HTMLInputElement;
  bar.appendChild(searchInput);

  const statusSelect = el('select', { className: inputCls }) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(searchInput.value, statusSelect.value);
  searchInput.addEventListener('input', fire);
  statusSelect.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Position Table
// ---------------------------------------------------------------------------

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface PositionRow {
  id: string;
  title: string;
  jobCode: string;
  departmentId: string;
  payGradeMin: number;
  payGradeMax: number;
  headcount: number;
  filledCount: number;
  status: PositionStatus;
}

function buildTable(positions: PositionRow[]): HTMLElement {
  const wrap = el('div', {
    className:
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto',
  });
  const table = el('table', { className: 'w-full text-sm' });

  // Header
  const thead = el('thead');
  const headRow = el('tr', {
    className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
  });
  for (const col of COLUMNS) {
    const align =
      col === 'Pay Range' || col === 'Headcount' || col === 'Filled'
        ? 'py-2 px-3 font-medium text-right'
        : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', { className: align }, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');

  if (positions.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      {
        className: 'py-8 px-3 text-center text-[var(--text-muted)]',
        colspan: String(COLUMNS.length),
      },
      'No positions found.',
    );
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const pos of positions) {
    const tr = el('tr', {
      className:
        'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    });

    tr.appendChild(
      el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, pos.title),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs' }, pos.jobCode || '--'),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, pos.departmentId || '--'),
    );

    // Pay Range
    const payRange =
      pos.payGradeMin || pos.payGradeMax
        ? `${fmtCurrency(pos.payGradeMin)} - ${fmtCurrency(pos.payGradeMax)}`
        : '--';
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-right font-mono text-[var(--text-muted)]' }, payRange),
    );

    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-right text-[var(--text)]' }, String(pos.headcount)),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-right text-[var(--text)]' }, String(pos.filledCount)),
    );

    // Status badge
    const tdStatus = el('td', { className: 'py-2 px-3' });
    const badgeCls = STATUS_BADGE[pos.status] ?? STATUS_BADGE.open;
    tdStatus.appendChild(
      el(
        'span',
        { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` },
        formatStatus(pos.status),
      ),
    );
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Org Chart Section
// ---------------------------------------------------------------------------

interface OrgChartEntry {
  position: PositionRow;
  employees: Array<{ firstName: string; lastName: string; employeeId: string }>;
}

function buildOrgChart(entries: OrgChartEntry[]): HTMLElement {
  const section = el('div', { className: 'mt-8' });
  section.appendChild(
    el(
      'h2',
      { className: 'text-xl font-bold text-[var(--text)] mb-4' },
      'Org Chart',
    ),
  );

  if (entries.length === 0) {
    section.appendChild(
      el(
        'div',
        { className: 'py-8 text-center text-[var(--text-muted)]' },
        'No positions found for org chart.',
      ),
    );
    return section;
  }

  const grid = el('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' });

  for (const entry of entries) {
    const card = el('div', {
      className:
        'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
    });

    // Position title header
    const badgeCls = STATUS_BADGE[entry.position.status] ?? STATUS_BADGE.open;
    const header = el('div', { className: 'flex items-center justify-between mb-3' });
    header.appendChild(
      el('div', { className: 'font-semibold text-[var(--text)]' }, entry.position.title),
    );
    header.appendChild(
      el(
        'span',
        { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` },
        formatStatus(entry.position.status),
      ),
    );
    card.appendChild(header);

    if (entry.position.jobCode) {
      card.appendChild(
        el(
          'div',
          { className: 'text-xs text-[var(--text-muted)] mb-2' },
          `Job Code: ${entry.position.jobCode}`,
        ),
      );
    }

    // Employees list
    if (entry.employees.length > 0) {
      const empList = el('div', { className: 'space-y-1' });
      for (const emp of entry.employees) {
        empList.appendChild(
          el(
            'div',
            { className: 'text-sm text-[var(--text)] flex items-center gap-2' },
            el('span', { className: 'w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block' }),
            el('span', {}, `${emp.firstName} ${emp.lastName}`),
            el('span', { className: 'text-xs text-[var(--text-muted)]' }, `(${emp.employeeId})`),
          ),
        );
      }
      card.appendChild(empList);
    } else {
      card.appendChild(
        el(
          'div',
          { className: 'text-sm text-[var(--text-muted)] italic' },
          'No employees assigned',
        ),
      );
    }

    grid.appendChild(card);
  }

  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'space-y-0' });

    // Header row
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(
      el(
        'h1',
        { className: 'text-2xl font-bold text-[var(--text)]' },
        'Position Management & Org Chart',
      ),
    );

    const newBtn = el(
      'button',
      {
        className:
          'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
        type: 'button',
      },
      'New Position',
    );
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Containers
    const summaryContainer = el('div', { className: '' });
    wrapper.appendChild(summaryContainer);

    const tableContainer = el('div', { className: '' });
    const orgChartContainer = el('div', { className: '' });

    // Filter state
    let currentSearch = '';
    let currentStatus = '';

    // All data for client-side filtering
    let allPositions: PositionRow[] = [];
    let orgChartData: OrgChartEntry[] = [];

    // Render filtered table
    function renderFiltered(): void {
      let filtered = allPositions;

      if (currentStatus) {
        filtered = filtered.filter((p) => p.status === currentStatus);
      }

      if (currentSearch) {
        const s = currentSearch.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(s) ||
            (p.jobCode ?? '').toLowerCase().includes(s) ||
            (p.departmentId ?? '').toLowerCase().includes(s),
        );
      }

      tableContainer.innerHTML = '';
      tableContainer.appendChild(buildTable(filtered));
    }

    // Load data
    async function loadData(): Promise<void> {
      try {
        const svc = getHRService();

        // Show loading state
        tableContainer.innerHTML = '';
        tableContainer.appendChild(
          el(
            'div',
            { className: 'py-12 text-center text-[var(--text-muted)]' },
            'Loading positions...',
          ),
        );

        const [positions, orgChart] = await Promise.all([
          svc.listPositions(),
          svc.getOrgChart(),
        ]);

        // Map to rows
        allPositions = positions.map((pos) => ({
          id: (pos as any).id as string,
          title: pos.title,
          jobCode: pos.jobCode ?? '',
          departmentId: pos.departmentId ?? '',
          payGradeMin: pos.payGradeMin ?? 0,
          payGradeMax: pos.payGradeMax ?? 0,
          headcount: pos.headcount,
          filledCount: pos.filledCount,
          status: pos.status,
        }));

        orgChartData = orgChart.map((entry) => ({
          position: {
            id: (entry.position as any).id as string,
            title: entry.position.title,
            jobCode: entry.position.jobCode ?? '',
            departmentId: entry.position.departmentId ?? '',
            payGradeMin: entry.position.payGradeMin ?? 0,
            payGradeMax: entry.position.payGradeMax ?? 0,
            headcount: entry.position.headcount,
            filledCount: entry.position.filledCount,
            status: entry.position.status,
          },
          employees: entry.employees.map((e) => ({
            firstName: e.firstName,
            lastName: e.lastName,
            employeeId: e.employeeId,
          })),
        }));

        // Summary stats
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(buildSummaryStats(allPositions));

        // Table
        renderFiltered();

        // Org chart
        orgChartContainer.innerHTML = '';
        orgChartContainer.appendChild(buildOrgChart(orgChartData));
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load positions';
        showMsg(wrapper, message, 'error');
      }
    }

    // New position handler via prompt()
    newBtn.addEventListener('click', () => {
      const title = prompt('Position title:');
      if (!title) return;

      const departmentId = prompt('Department ID (optional):') ?? '';
      const jobCode = prompt('Job code (optional):') ?? '';
      const payMinStr = prompt('Pay grade min (optional):') ?? '';
      const payMaxStr = prompt('Pay grade max (optional):') ?? '';
      const headcountStr = prompt('Headcount (default 1):') ?? '1';
      const description = prompt('Description (optional):') ?? '';

      void (async () => {
        try {
          const svc = getHRService();
          await svc.createPosition({
            title,
            departmentId: departmentId || undefined,
            jobCode: jobCode || undefined,
            payGradeMin: parseFloat(payMinStr) || undefined,
            payGradeMax: parseFloat(payMaxStr) || undefined,
            headcount: parseInt(headcountStr, 10) || 1,
            description: description || undefined,
          });
          showMsg(wrapper, 'Position created successfully.', 'success');
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create position';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // Filter bar
    wrapper.appendChild(
      buildFilterBar((search, status) => {
        currentSearch = search;
        currentStatus = status;
        renderFiltered();
      }),
    );

    wrapper.appendChild(tableContainer);
    wrapper.appendChild(orgChartContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadData();
  },
};

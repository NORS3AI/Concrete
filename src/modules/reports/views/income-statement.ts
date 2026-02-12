/**
 * Income Statement view.
 * Renders the income statement (P&L) with support for standard, by-job,
 * by-entity, and comparative styles. Includes period selection, entity/job
 * filters, and export controls.
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

const STYLE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'by-job', label: 'By Job' },
  { value: 'by-entity', label: 'By Entity' },
  { value: 'comparative', label: 'Comparative' },
];

const CATEGORY_ORDER: Record<string, number> = {
  revenue: 1,
  cogs: 2,
  expense: 3,
  other: 4,
};

const CATEGORY_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  cogs: 'Cost of Goods Sold',
  expense: 'Operating Expenses',
  other: 'Other Income / Expense',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IncomeStatementDisplayRow {
  accountNumber: string;
  accountName: string;
  category: string;
  currentAmount: number;
  priorAmount?: number;
  budget?: number;
  variance?: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (style: string, periodStart: string, periodEnd: string, comparePeriodStart: string, comparePeriodEnd: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const styleSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STYLE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    styleSelect.appendChild(o);
  }
  bar.appendChild(styleSelect);

  const fromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const periodStartInput = el('input', inputCls) as HTMLInputElement;
  periodStartInput.type = 'date';
  bar.appendChild(periodStartInput);

  const toLabel = el('label', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const compareFromLabel = el('label', 'text-sm text-[var(--text-muted)]', 'Compare From:');
  bar.appendChild(compareFromLabel);
  const comparePeriodStartInput = el('input', inputCls) as HTMLInputElement;
  comparePeriodStartInput.type = 'date';
  bar.appendChild(comparePeriodStartInput);

  const compareToLabel = el('label', 'text-sm text-[var(--text-muted)]', 'Compare To:');
  bar.appendChild(compareToLabel);
  const comparePeriodEndInput = el('input', inputCls) as HTMLInputElement;
  comparePeriodEndInput.type = 'date';
  bar.appendChild(comparePeriodEndInput);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(styleSelect.value, periodStartInput.value, periodEndInput.value, comparePeriodStartInput.value, comparePeriodEndInput.value);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: IncomeStatementDisplayRow[], showComparative: boolean): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  const columns = ['Account', 'Current Amount'];
  if (showComparative) {
    columns.push('Prior Amount', 'Variance');
  }

  for (const col of columns) {
    const isNumeric = col !== 'Account';
    const align = isNumeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const colSpan = showComparative ? '4' : '2';
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No income statement data available. Select a period and generate the report.');
    td.setAttribute('colspan', colSpan);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  const sorted = [...rows].sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99));

  let currentCategory = '';
  let categoryTotal = 0;

  for (const row of sorted) {
    if (row.category !== currentCategory) {
      if (currentCategory) {
        const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
        subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${CATEGORY_LABELS[currentCategory] ?? currentCategory}`));
        subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(categoryTotal)));
        if (showComparative) {
          subtotalRow.appendChild(el('td', 'py-2 px-3'));
          subtotalRow.appendChild(el('td', 'py-2 px-3'));
        }
        tbody.appendChild(subtotalRow);
        categoryTotal = 0;
      }
      currentCategory = row.category;

      const sectionRow = el('tr', 'bg-[var(--surface)]');
      const sectionTd = el('td', 'py-2 px-3 font-semibold text-[var(--accent)]', CATEGORY_LABELS[currentCategory] ?? currentCategory);
      sectionTd.setAttribute('colspan', showComparative ? '4' : '2');
      sectionRow.appendChild(sectionTd);
      tbody.appendChild(sectionRow);
    }

    categoryTotal += row.currentAmount;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3', `${row.accountNumber} - ${row.accountName}`));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentAmount)));

    if (showComparative) {
      tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.priorAmount !== undefined ? fmtCurrency(row.priorAmount) : '-'));
      const varCls = (row.variance ?? 0) >= 0
        ? 'py-2 px-3 text-right font-mono text-emerald-400'
        : 'py-2 px-3 text-right font-mono text-red-400';
      tr.appendChild(el('td', varCls, row.variance !== undefined ? fmtCurrency(row.variance) : '-'));
    }

    tbody.appendChild(tr);
  }

  if (currentCategory) {
    const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
    subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${CATEGORY_LABELS[currentCategory] ?? currentCategory}`));
    subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(categoryTotal)));
    if (showComparative) {
      subtotalRow.appendChild(el('td', 'py-2 px-3'));
      subtotalRow.appendChild(el('td', 'py-2 px-3'));
    }
    tbody.appendChild(subtotalRow);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Export Bar
// ---------------------------------------------------------------------------

function buildExportBar(): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mt-4');
  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  for (const format of ['PDF', 'CSV', 'Excel']) {
    const btn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', format);
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Income Statement'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_style, _periodStart, _periodEnd, _compareStart, _compareEnd) => {
      /* filter action placeholder */
    }));

    const rows: IncomeStatementDisplayRow[] = [];
    wrapper.appendChild(buildTable(rows, false));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};

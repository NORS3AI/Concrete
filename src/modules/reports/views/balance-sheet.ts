/**
 * Balance Sheet view.
 * Renders the balance sheet report with support for standard, comparative,
 * and consolidated views. Includes period selection and export controls.
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
  { value: 'comparative', label: 'Comparative' },
  { value: 'consolidated', label: 'Consolidated' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BalanceSheetDisplayRow {
  accountNumber: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
  priorBalance?: number;
  change?: number;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onApply: (style: string, periodEnd: string, comparePeriodEnd: string, consolidated: boolean) => void,
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

  const periodLabel = el('label', 'text-sm text-[var(--text-muted)]', 'As of:');
  bar.appendChild(periodLabel);

  const periodEndInput = el('input', inputCls) as HTMLInputElement;
  periodEndInput.type = 'date';
  periodEndInput.value = new Date().toISOString().split('T')[0];
  bar.appendChild(periodEndInput);

  const compareLabel = el('label', 'text-sm text-[var(--text-muted)]', 'Compare:');
  bar.appendChild(compareLabel);

  const comparePeriodInput = el('input', inputCls) as HTMLInputElement;
  comparePeriodInput.type = 'date';
  bar.appendChild(comparePeriodInput);

  const consolidatedLabel = el('label', 'flex items-center gap-1 text-sm text-[var(--text-muted)]');
  const consolidatedCheck = el('input') as HTMLInputElement;
  consolidatedCheck.type = 'checkbox';
  consolidatedLabel.appendChild(consolidatedCheck);
  consolidatedLabel.appendChild(document.createTextNode('Consolidated'));
  bar.appendChild(consolidatedLabel);

  const applyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate');
  applyBtn.addEventListener('click', () => {
    onApply(styleSelect.value, periodEndInput.value, comparePeriodInput.value, consolidatedCheck.checked);
  });
  bar.appendChild(applyBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: BalanceSheetDisplayRow[], showComparative: boolean): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');

  const columns = ['Account', 'Type', 'Current Balance'];
  if (showComparative) {
    columns.push('Prior Balance', 'Change');
  }

  for (const col of columns) {
    const isNumeric = col !== 'Account' && col !== 'Type';
    const align = isNumeric ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const colSpan = showComparative ? '5' : '3';
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No balance sheet data available. Generate the report to see results.');
    td.setAttribute('colspan', colSpan);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  let currentType = '';
  let typeTotal = 0;

  for (const row of rows) {
    if (row.accountType !== currentType) {
      if (currentType) {
        const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
        subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${currentType.charAt(0).toUpperCase() + currentType.slice(1)}s`));
        subtotalRow.appendChild(el('td', 'py-2 px-3'));
        subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(typeTotal)));
        if (showComparative) {
          subtotalRow.appendChild(el('td', 'py-2 px-3'));
          subtotalRow.appendChild(el('td', 'py-2 px-3'));
        }
        tbody.appendChild(subtotalRow);
        typeTotal = 0;
      }
      currentType = row.accountType;

      const sectionRow = el('tr', 'bg-[var(--surface)]');
      const sectionTd = el('td', 'py-2 px-3 font-semibold text-[var(--accent)]', currentType.charAt(0).toUpperCase() + currentType.slice(1) + 's');
      sectionTd.setAttribute('colspan', showComparative ? '5' : '3');
      sectionRow.appendChild(sectionTd);
      tbody.appendChild(sectionRow);
    }

    typeTotal += row.currentBalance;

    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3', `${row.accountNumber} - ${row.accountName}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.accountType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.currentBalance)));

    if (showComparative) {
      tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', row.priorBalance !== undefined ? fmtCurrency(row.priorBalance) : '-'));
      const changeCls = (row.change ?? 0) >= 0
        ? 'py-2 px-3 text-right font-mono text-emerald-400'
        : 'py-2 px-3 text-right font-mono text-red-400';
      tr.appendChild(el('td', changeCls, row.change !== undefined ? fmtCurrency(row.change) : '-'));
    }

    tbody.appendChild(tr);
  }

  if (currentType) {
    const subtotalRow = el('tr', 'bg-[var(--surface)] font-semibold');
    subtotalRow.appendChild(el('td', 'py-2 px-3', `Total ${currentType.charAt(0).toUpperCase() + currentType.slice(1)}s`));
    subtotalRow.appendChild(el('td', 'py-2 px-3'));
    subtotalRow.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(typeTotal)));
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Balance Sheet'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_style, _periodEnd, _comparePeriodEnd, _consolidated) => {
      /* filter action placeholder */
    }));

    const rows: BalanceSheetDisplayRow[] = [];
    wrapper.appendChild(buildTable(rows, false));
    wrapper.appendChild(buildExportBar());

    container.appendChild(wrapper);
  },
};

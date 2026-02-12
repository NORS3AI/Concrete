/**
 * Prevailing Wage view.
 * Lists prevailing wage rate tables by jurisdiction, classification,
 * and source. Supports filtering and Davis-Bacon compliance tracking.
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

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'davis_bacon', label: 'Davis-Bacon (Federal)' },
  { value: 'state', label: 'State' },
  { value: 'local', label: 'Local' },
];

const PROJECT_TYPE_OPTIONS = [
  { value: '', label: 'All Project Types' },
  { value: 'federal', label: 'Federal' },
  { value: 'state', label: 'State' },
  { value: 'local', label: 'Local' },
];

const SOURCE_BADGE: Record<string, string> = {
  davis_bacon: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  state: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  local: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrevailingWageRow {
  id: string;
  jurisdiction: string;
  state: string;
  county: string;
  projectType: string;
  classification: string;
  trade: string;
  baseRate: number;
  fringeRate: number;
  totalRate: number;
  effectiveDate: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (source: string, projectType: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by jurisdiction, classification...';
  bar.appendChild(searchInput);

  const sourceSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of SOURCE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    sourceSelect.appendChild(o);
  }
  bar.appendChild(sourceSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PROJECT_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(sourceSelect.value, typeSelect.value, searchInput.value);
  sourceSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(wages: PrevailingWageRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Jurisdiction', 'State', 'County', 'Type', 'Classification', 'Trade', 'Base Rate', 'Fringe', 'Total', 'Effective', 'Source']) {
    const align = (col === 'Base Rate' || col === 'Fringe' || col === 'Total') ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (wages.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No prevailing wage records found. Import a schedule to get started.');
    td.setAttribute('colspan', '11');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const wage of wages) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', wage.jurisdiction));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.state));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.county || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.projectType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', wage.classification));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.trade));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(wage.baseRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(wage.fringeRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-bold', fmtCurrency(wage.totalRate)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', wage.effectiveDate));

    const tdSource = el('td', 'py-2 px-3');
    const sourceLabel = wage.source === 'davis_bacon' ? 'Davis-Bacon' : wage.source.charAt(0).toUpperCase() + wage.source.slice(1);
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_BADGE[wage.source] ?? SOURCE_BADGE.state}`, sourceLabel);
    tdSource.appendChild(badge);
    tr.appendChild(tdSource);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Prevailing Wage Rates'));
    const importBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Import Schedule');
    headerRow.appendChild(importBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_source, _type, _search) => { /* filter placeholder */ }));

    const wages: PrevailingWageRow[] = [];
    wrapper.appendChild(buildTable(wages));

    container.appendChild(wrapper);
  },
};

/**
 * Compliance Matrix view.
 * Visual matrix showing compliance status for each subcontractor
 * across all compliance types (insurance, license, bond, OSHA, E-Verify).
 * Includes insurance certificate expiration alerts.
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

const COMPLIANCE_TYPES = [
  { key: 'insuranceGl', label: 'GL Insurance' },
  { key: 'insuranceAuto', label: 'Auto Insurance' },
  { key: 'insuranceUmbrella', label: 'Umbrella' },
  { key: 'insuranceWc', label: 'Workers Comp' },
  { key: 'license', label: 'License' },
  { key: 'bond', label: 'Bond' },
  { key: 'osha', label: 'OSHA' },
  { key: 'everify', label: 'E-Verify' },
];

const STATUS_COLORS: Record<string, string> = {
  valid: 'bg-emerald-500',
  expired: 'bg-red-500',
  pending: 'bg-amber-500',
  missing: 'bg-zinc-600',
};

const STATUS_TEXT: Record<string, string> = {
  valid: 'Valid',
  expired: 'Expired',
  pending: 'Pending',
  missing: 'Missing',
};

const OVERALL_BADGE: Record<string, string> = {
  compliant: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  non_compliant: 'bg-red-500/10 text-red-400 border border-red-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const OVERALL_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-Compliant',
  partial: 'Partial',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceMatrixRow {
  vendorId: string;
  vendorName: string;
  insuranceGl: string;
  insuranceAuto: string;
  insuranceUmbrella: string;
  insuranceWc: string;
  license: string;
  bond: string;
  osha: string;
  everify: string;
  overallStatus: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (overall: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search vendors...';
  bar.appendChild(searchInput);

  const overallSelect = el('select', inputCls) as HTMLSelectElement;
  const overallOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'compliant', label: 'Compliant' },
    { value: 'partial', label: 'Partial' },
    { value: 'non_compliant', label: 'Non-Compliant' },
  ];
  for (const opt of overallOptions) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    overallSelect.appendChild(o);
  }
  bar.appendChild(overallSelect);

  const fire = () => onFilter(overallSelect.value, searchInput.value);
  overallSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function buildLegend(): HTMLElement {
  const legend = el('div', 'flex items-center gap-4 mb-4');
  legend.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Legend:'));

  const entries: { color: string; label: string }[] = [
    { color: 'bg-emerald-500', label: 'Valid' },
    { color: 'bg-amber-500', label: 'Pending' },
    { color: 'bg-red-500', label: 'Expired' },
    { color: 'bg-zinc-600', label: 'Missing' },
  ];

  for (const entry of entries) {
    const item = el('div', 'flex items-center gap-1');
    item.appendChild(el('div', `w-3 h-3 rounded-full ${entry.color}`));
    item.appendChild(el('span', 'text-xs text-[var(--text-muted)]', entry.label));
    legend.appendChild(item);
  }

  return legend;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildComplianceCell(status: string): HTMLElement {
  const td = el('td', 'py-2 px-3 text-center');
  const dot = el('div', `w-4 h-4 rounded-full mx-auto ${STATUS_COLORS[status] ?? STATUS_COLORS.missing}`);
  dot.title = STATUS_TEXT[status] ?? 'Unknown';
  td.appendChild(dot);
  return td;
}

function buildTable(rows: ComplianceMatrixRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Vendor'));
  for (const ct of COMPLIANCE_TYPES) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium text-center', ct.label));
  }
  headRow.appendChild(el('th', 'py-2 px-3 font-medium text-center', 'Overall'));
  headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Actions'));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No compliance records found. Add compliance tracking for your subcontractors.');
    td.setAttribute('colspan', (COMPLIANCE_TYPES.length + 3).toString());
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.vendorName));

    const rowData = row as unknown as Record<string, unknown>;
    for (const ct of COMPLIANCE_TYPES) {
      tr.appendChild(buildComplianceCell(rowData[ct.key] as string));
    }

    const tdOverall = el('td', 'py-2 px-3 text-center');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${OVERALL_BADGE[row.overallStatus] ?? OVERALL_BADGE.non_compliant}`,
      OVERALL_LABEL[row.overallStatus] ?? 'Unknown');
    tdOverall.appendChild(badge);
    tr.appendChild(tdOverall);

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Update');
    editBtn.type = 'button';
    editBtn.addEventListener('click', () => { /* update compliance placeholder */ });
    tdActions.appendChild(editBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Expiration Alerts
// ---------------------------------------------------------------------------

function buildExpirationAlerts(): HTMLElement {
  const section = el('div', 'bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-6');
  section.appendChild(el('h3', 'text-sm font-semibold text-red-400 mb-2', 'Expiring Soon'));
  section.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No certificates expiring in the next 30 days.'));
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Compliance Matrix'));
    const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Compliance Record');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => { /* add compliance placeholder */ });
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildExpirationAlerts());
    wrapper.appendChild(buildLegend());
    wrapper.appendChild(buildFilterBar((_overall, _search) => { /* filter placeholder */ }));

    const rows: ComplianceMatrixRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};

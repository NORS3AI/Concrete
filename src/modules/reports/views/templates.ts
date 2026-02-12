/**
 * Report Templates view.
 * Manages saved report templates allowing users to create, view, edit,
 * and delete templates for quick access to commonly used report configurations.
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

const REPORT_TYPE_LABELS: Record<string, string> = {
  'balance-sheet': 'Balance Sheet',
  'income-statement': 'Income Statement',
  'cash-flow': 'Cash Flow Statement',
  'wip-schedule': 'WIP Schedule',
  'job-cost-summary': 'Job Cost Summary',
  'job-cost-detail': 'Job Cost Detail',
  'aging-ap': 'AP Aging',
  'aging-ar': 'AR Aging',
  'payroll-summary': 'Payroll Summary',
  'payroll-detail': 'Payroll Detail',
  'equipment-utilization': 'Equipment Utilization',
  'equipment-cost': 'Equipment Cost',
  'bonding-capacity': 'Bonding Capacity',
  'custom': 'Custom',
};

const TYPE_BADGE: Record<string, string> = {
  'balance-sheet': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'income-statement': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'cash-flow': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'wip-schedule': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'job-cost-summary': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'job-cost-detail': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'aging-ap': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'aging-ar': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'payroll-summary': 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  'payroll-detail': 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  'equipment-utilization': 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'equipment-cost': 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'bonding-capacity': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  'custom': 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  name: string;
  reportType: string;
  description: string;
  columns: number;
  filters: number;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(templates: TemplateRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Report Type', 'Description', 'Columns', 'Filters', 'Default', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (templates.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No report templates found. Create a template to save your report configurations.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const template of templates) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', template.name));

    const tdType = el('td', 'py-2 px-3');
    const badgeCls = TYPE_BADGE[template.reportType] ?? TYPE_BADGE.custom;
    const label = REPORT_TYPE_LABELS[template.reportType] ?? template.reportType;
    tdType.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, label));
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', template.description || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-center', String(template.columns)));
    tr.appendChild(el('td', 'py-2 px-3 text-center', String(template.filters)));

    const tdDefault = el('td', 'py-2 px-3 text-center');
    if (template.isDefault) {
      tdDefault.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Default'));
    } else {
      tdDefault.appendChild(el('span', 'text-xs text-[var(--text-muted)]', '-'));
    }
    tr.appendChild(tdDefault);

    const tdActions = el('td', 'py-2 px-3');
    const actionsRow = el('div', 'flex items-center gap-2');

    const runBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Run');
    actionsRow.appendChild(runBtn);

    const editBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'Edit');
    actionsRow.appendChild(editBtn);

    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    actionsRow.appendChild(deleteBtn);

    tdActions.appendChild(actionsRow);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Report Templates'));

    const actionsRow = el('div', 'flex items-center gap-3');

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Template');
    actionsRow.appendChild(newBtn);

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    actionsRow.appendChild(backLink);

    headerRow.appendChild(actionsRow);
    wrapper.appendChild(headerRow);

    const templates: TemplateRow[] = [];
    wrapper.appendChild(buildTable(templates));

    container.appendChild(wrapper);
  },
};

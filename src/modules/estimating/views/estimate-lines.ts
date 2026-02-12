/**
 * Estimate Lines view.
 * Displays and manages line items for an estimate including assemblies,
 * alternates, allowances, cost buildup by type, and markup per line.
 * Supports CSV import and drag-and-drop reordering.
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

const COST_TYPE_COLORS: Record<string, string> = {
  labor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  material: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  equipment: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  subcontract: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineRow {
  id: string;
  description: string;
  costType: string;
  quantity: number;
  unit: string;
  unitCost: number;
  amount: number;
  markupPct: number;
  markupAmount: number;
  totalPrice: number;
  isAssembly: boolean;
  assemblyName: string;
  isAlternate: boolean;
  isAllowance: boolean;
  parentId: string;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(lines: LineRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const costTypes = ['labor', 'material', 'equipment', 'subcontract', 'other'];
  for (const ct of costTypes) {
    const filtered = lines.filter((l) => l.costType === ct && !l.isAssembly && !l.isAlternate);
    const total = filtered.reduce((sum, l) => sum + l.amount, 0);
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', ct.charAt(0).toUpperCase() + ct.slice(1)));
    card.appendChild(el('div', 'text-lg font-bold text-[var(--text)] mt-1 font-mono', fmtCurrency(total)));
    row.appendChild(card);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Line Item Table
// ---------------------------------------------------------------------------

function buildLinesTable(lines: LineRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Description', 'Type', 'Qty', 'Unit', 'Unit Cost', 'Amount', 'Markup %', 'Markup $', 'Total Price', 'Flags', 'Actions']) {
    const align = ['Qty', 'Unit Cost', 'Amount', 'Markup %', 'Markup $', 'Total Price'].includes(col)
      ? 'py-2 px-2 font-medium text-right'
      : 'py-2 px-2 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-2 text-center text-[var(--text-muted)]', 'No line items. Add lines manually or import from CSV.');
    td.setAttribute('colspan', '12');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lines) {
    const isChild = !!line.parentId;
    const rowCls = line.isAssembly
      ? 'border-b border-[var(--border)] bg-[var(--surface)] font-semibold'
      : `border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors ${isChild ? 'pl-4' : ''}`;
    const tr = el('tr', rowCls);

    tr.appendChild(el('td', 'py-2 px-2 text-[var(--text-muted)] font-mono text-xs', String(line.sortOrder)));

    const tdDesc = el('td', `py-2 px-2 text-[var(--text)] ${isChild ? 'pl-6' : ''}`);
    if (line.isAssembly) {
      tdDesc.appendChild(el('span', 'text-[var(--accent)]', `[Assembly] ${line.assemblyName || line.description}`));
    } else {
      tdDesc.textContent = line.description;
    }
    tr.appendChild(tdDesc);

    const tdType = el('td', 'py-2 px-2');
    const typeBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${COST_TYPE_COLORS[line.costType] ?? COST_TYPE_COLORS.other}`,
      line.costType,
    );
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono', line.isAssembly ? '' : String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-2 text-right text-[var(--text-muted)]', line.unit));
    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono', line.isAssembly ? '' : fmtCurrency(line.unitCost)));
    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono', fmtCurrency(line.amount)));
    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono', fmtPct(line.markupPct)));
    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono', fmtCurrency(line.markupAmount)));
    tr.appendChild(el('td', 'py-2 px-2 text-right font-mono font-semibold', fmtCurrency(line.totalPrice)));

    const tdFlags = el('td', 'py-2 px-2');
    const flagsWrap = el('div', 'flex items-center gap-1');
    if (line.isAlternate) {
      flagsWrap.appendChild(el('span', 'px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400', 'ALT'));
    }
    if (line.isAllowance) {
      flagsWrap.appendChild(el('span', 'px-1.5 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400', 'ALLOW'));
    }
    tdFlags.appendChild(flagsWrap);
    tr.appendChild(tdFlags);

    const tdActions = el('td', 'py-2 px-2');
    const actionsWrap = el('div', 'flex items-center gap-2');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-xs', 'Edit');
    editBtn.addEventListener('click', () => { /* edit placeholder */ });
    actionsWrap.appendChild(editBtn);
    const removeBtn = el('button', 'text-red-400 hover:underline text-xs', 'Remove');
    removeBtn.addEventListener('click', () => { /* remove placeholder */ });
    actionsWrap.appendChild(removeBtn);
    tdActions.appendChild(actionsWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function buildToolbar(): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  const addLineBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line');
  addLineBtn.addEventListener('click', () => { /* add line placeholder */ });
  bar.appendChild(addLineBtn);

  const addAssemblyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-zinc-600 text-white hover:opacity-90', 'Add Assembly');
  addAssemblyBtn.addEventListener('click', () => { /* add assembly placeholder */ });
  bar.appendChild(addAssemblyBtn);

  const importBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Import CSV');
  importBtn.addEventListener('click', () => { /* import CSV placeholder */ });
  bar.appendChild(importBtn);

  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
  exportBtn.addEventListener('click', () => { /* export CSV placeholder */ });
  bar.appendChild(exportBtn);

  const markupBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Apply Overall Markup');
  markupBtn.addEventListener('click', () => { /* markup placeholder */ });
  bar.appendChild(markupBtn);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Estimate Line Items'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Estimate') as HTMLAnchorElement;
    backLink.href = '#/estimating';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const lines: LineRow[] = [];

    wrapper.appendChild(buildSummaryCards(lines));
    wrapper.appendChild(buildToolbar());
    wrapper.appendChild(buildLinesTable(lines));

    container.appendChild(wrapper);
  },
};

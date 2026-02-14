/**
 * Estimate Lines view.
 * Displays and manages line items for an estimate including assemblies,
 * alternates, allowances, cost buildup by type, and markup per line.
 * Supports CSV import and export, inline editing, and overall markup.
 */

import { getEstimatingService } from '../service-accessor';
import type { EstimateLineCostType } from '../estimating-service';

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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

const COST_TYPE_OPTIONS: { value: EstimateLineCostType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'other', label: 'Other' },
];

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
  alternateGroup: string;
}

// ---------------------------------------------------------------------------
// URL Parsing
// ---------------------------------------------------------------------------

function getEstimateIdFromHash(): string | null {
  const hash = window.location.hash; // e.g. #/estimating/abc123/lines
  const match = hash.match(/#\/estimating\/([^/]+)/);
  if (!match) return null;
  return match[1];
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(lines: LineRow[], estimate: { totalCost: number; totalPrice: number; marginPct: number }): HTMLElement {
  const row = el('div', 'grid grid-cols-6 gap-4 mb-6');

  const costTypes = ['labor', 'material', 'equipment', 'subcontract', 'other'] as const;
  for (const ct of costTypes) {
    const filtered = lines.filter((l) => l.costType === ct && !l.isAssembly && !l.isAlternate);
    const total = filtered.reduce((sum, l) => sum + l.amount, 0);
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-md p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', ct.charAt(0).toUpperCase() + ct.slice(1)));
    card.appendChild(el('div', 'text-lg font-bold text-[var(--text)] mt-1 font-mono', fmtCurrency(total)));
    row.appendChild(card);
  }

  // Grand Total card
  const grandCard = el('div', 'bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-md p-3 text-center');
  grandCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Grand Total'));
  grandCard.appendChild(el('div', 'text-lg font-bold text-[var(--accent)] mt-1 font-mono', fmtCurrency(estimate.totalPrice)));
  row.appendChild(grandCard);

  return row;
}

// ---------------------------------------------------------------------------
// Add Line Form (inline at bottom of table)
// ---------------------------------------------------------------------------

function buildAddLineRow(
  estimateId: string,
  wrapper: HTMLElement,
  reRender: () => void,
): HTMLTableRowElement {
  const tr = el('tr', 'border-b border-[var(--border)] bg-[var(--surface)]') as HTMLTableRowElement;
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text)]';

  // # column
  tr.appendChild(el('td', 'py-2 px-2 text-[var(--text-muted)] text-xs', '+'));

  // Description
  const tdDesc = el('td', 'py-2 px-2');
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.placeholder = 'Description';
  tdDesc.appendChild(descInput);
  tr.appendChild(tdDesc);

  // Cost type
  const tdType = el('td', 'py-2 px-2');
  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of COST_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  tdType.appendChild(typeSelect);
  tr.appendChild(tdType);

  // Qty
  const tdQty = el('td', 'py-2 px-2');
  const qtyInput = el('input', inputCls) as HTMLInputElement;
  qtyInput.type = 'number';
  qtyInput.step = '0.01';
  qtyInput.value = '1';
  tdQty.appendChild(qtyInput);
  tr.appendChild(tdQty);

  // Unit
  const tdUnit = el('td', 'py-2 px-2');
  const unitInput = el('input', inputCls) as HTMLInputElement;
  unitInput.placeholder = 'ea';
  tdUnit.appendChild(unitInput);
  tr.appendChild(tdUnit);

  // Unit Cost
  const tdUnitCost = el('td', 'py-2 px-2');
  const unitCostInput = el('input', inputCls) as HTMLInputElement;
  unitCostInput.type = 'number';
  unitCostInput.step = '0.01';
  unitCostInput.value = '0';
  tdUnitCost.appendChild(unitCostInput);
  tr.appendChild(tdUnitCost);

  // Amount (auto-calc placeholder)
  tr.appendChild(el('td', 'py-2 px-2 text-right text-xs text-[var(--text-muted)]', '--'));

  // Markup %
  const tdMarkup = el('td', 'py-2 px-2');
  const markupInput = el('input', inputCls) as HTMLInputElement;
  markupInput.type = 'number';
  markupInput.step = '0.1';
  markupInput.value = '0';
  tdMarkup.appendChild(markupInput);
  tr.appendChild(tdMarkup);

  // Markup $ (auto-calc)
  tr.appendChild(el('td', 'py-2 px-2 text-right text-xs text-[var(--text-muted)]', '--'));
  // Total Price (auto-calc)
  tr.appendChild(el('td', 'py-2 px-2 text-right text-xs text-[var(--text-muted)]', '--'));

  // Flags
  const tdFlags = el('td', 'py-2 px-2');
  const flagsWrap = el('div', 'flex items-center gap-1');
  const altLabel = el('label', 'flex items-center gap-0.5 text-xs text-[var(--text-muted)]');
  const altCheck = el('input') as HTMLInputElement;
  altCheck.type = 'checkbox';
  altLabel.appendChild(altCheck);
  altLabel.appendChild(document.createTextNode('Alt'));
  flagsWrap.appendChild(altLabel);

  const allowLabel = el('label', 'flex items-center gap-0.5 text-xs text-[var(--text-muted)]');
  const allowCheck = el('input') as HTMLInputElement;
  allowCheck.type = 'checkbox';
  allowLabel.appendChild(allowCheck);
  allowLabel.appendChild(document.createTextNode('Allow'));
  flagsWrap.appendChild(allowLabel);
  tdFlags.appendChild(flagsWrap);
  tr.appendChild(tdFlags);

  // Actions
  const tdActions = el('td', 'py-2 px-2');
  const addBtn = el('button', 'text-emerald-400 hover:underline text-xs font-medium', 'Add');
  addBtn.addEventListener('click', async () => {
    const description = descInput.value.trim();
    if (!description) {
      showMsg(wrapper, 'Description is required.', true);
      return;
    }

    try {
      const svc = getEstimatingService();
      await svc.addEstimateLine({
        estimateId,
        description,
        costType: typeSelect.value as EstimateLineCostType,
        quantity: parseFloat(qtyInput.value) || 1,
        unit: unitInput.value.trim() || undefined,
        unitCost: parseFloat(unitCostInput.value) || 0,
        markupPct: parseFloat(markupInput.value) || 0,
        isAlternate: altCheck.checked,
        isAllowance: allowCheck.checked,
      });
      showMsg(wrapper, 'Line added.', false);
      reRender();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add line.';
      showMsg(wrapper, message, true);
    }
  });
  tdActions.appendChild(addBtn);
  tr.appendChild(tdActions);

  return tr;
}

// ---------------------------------------------------------------------------
// Inline Edit Row
// ---------------------------------------------------------------------------

function buildEditRow(
  line: LineRow,
  wrapper: HTMLElement,
  reRender: () => void,
): HTMLTableRowElement {
  const tr = el('tr', 'border-b border-[var(--border)] bg-[var(--surface)]') as HTMLTableRowElement;
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text)]';

  tr.appendChild(el('td', 'py-2 px-2 text-[var(--text-muted)] font-mono text-xs', String(line.sortOrder)));

  const tdDesc = el('td', 'py-2 px-2');
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.value = line.description;
  tdDesc.appendChild(descInput);
  tr.appendChild(tdDesc);

  const tdType = el('td', 'py-2 px-2');
  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of COST_TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === line.costType) o.selected = true;
    typeSelect.appendChild(o);
  }
  tdType.appendChild(typeSelect);
  tr.appendChild(tdType);

  const tdQty = el('td', 'py-2 px-2');
  const qtyInput = el('input', inputCls) as HTMLInputElement;
  qtyInput.type = 'number';
  qtyInput.step = '0.01';
  qtyInput.value = String(line.quantity);
  tdQty.appendChild(qtyInput);
  tr.appendChild(tdQty);

  const tdUnit = el('td', 'py-2 px-2');
  const unitInput = el('input', inputCls) as HTMLInputElement;
  unitInput.value = line.unit;
  tdUnit.appendChild(unitInput);
  tr.appendChild(tdUnit);

  const tdUnitCost = el('td', 'py-2 px-2');
  const unitCostInput = el('input', inputCls) as HTMLInputElement;
  unitCostInput.type = 'number';
  unitCostInput.step = '0.01';
  unitCostInput.value = String(line.unitCost);
  tdUnitCost.appendChild(unitCostInput);
  tr.appendChild(tdUnitCost);

  tr.appendChild(el('td', 'py-2 px-2 text-right font-mono text-xs', fmtCurrency(line.amount)));

  const tdMarkup = el('td', 'py-2 px-2');
  const markupInput = el('input', inputCls) as HTMLInputElement;
  markupInput.type = 'number';
  markupInput.step = '0.1';
  markupInput.value = String(line.markupPct);
  tdMarkup.appendChild(markupInput);
  tr.appendChild(tdMarkup);

  tr.appendChild(el('td', 'py-2 px-2 text-right font-mono text-xs', fmtCurrency(line.markupAmount)));
  tr.appendChild(el('td', 'py-2 px-2 text-right font-mono text-xs', fmtCurrency(line.totalPrice)));

  // Flags
  const tdFlags = el('td', 'py-2 px-2');
  const flagsWrap = el('div', 'flex items-center gap-1');
  const altLabel = el('label', 'flex items-center gap-0.5 text-xs text-[var(--text-muted)]');
  const altCheck = el('input') as HTMLInputElement;
  altCheck.type = 'checkbox';
  altCheck.checked = line.isAlternate;
  altLabel.appendChild(altCheck);
  altLabel.appendChild(document.createTextNode('Alt'));
  flagsWrap.appendChild(altLabel);

  const allowLabel = el('label', 'flex items-center gap-0.5 text-xs text-[var(--text-muted)]');
  const allowCheck = el('input') as HTMLInputElement;
  allowCheck.type = 'checkbox';
  allowCheck.checked = line.isAllowance;
  allowLabel.appendChild(allowCheck);
  allowLabel.appendChild(document.createTextNode('Allow'));
  flagsWrap.appendChild(allowLabel);
  tdFlags.appendChild(flagsWrap);
  tr.appendChild(tdFlags);

  // Actions: Save / Cancel
  const tdActions = el('td', 'py-2 px-2');
  const actionsWrap = el('div', 'flex items-center gap-2');

  const saveBtn = el('button', 'text-emerald-400 hover:underline text-xs', 'Save');
  saveBtn.addEventListener('click', async () => {
    try {
      const svc = getEstimatingService();
      await svc.updateEstimateLine(line.id, {
        description: descInput.value.trim(),
        costType: typeSelect.value as EstimateLineCostType,
        quantity: parseFloat(qtyInput.value) || 0,
        unit: unitInput.value.trim() || undefined,
        unitCost: parseFloat(unitCostInput.value) || 0,
        markupPct: parseFloat(markupInput.value) || 0,
        isAlternate: altCheck.checked,
        isAllowance: allowCheck.checked,
      });
      showMsg(wrapper, 'Line updated.', false);
      reRender();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update line.';
      showMsg(wrapper, message, true);
    }
  });
  actionsWrap.appendChild(saveBtn);

  const cancelBtn = el('button', 'text-[var(--text-muted)] hover:underline text-xs', 'Cancel');
  cancelBtn.addEventListener('click', () => reRender());
  actionsWrap.appendChild(cancelBtn);

  tdActions.appendChild(actionsWrap);
  tr.appendChild(tdActions);

  return tr;
}

// ---------------------------------------------------------------------------
// Line Item Table
// ---------------------------------------------------------------------------

function buildLinesTable(
  lines: LineRow[],
  estimateId: string,
  wrapper: HTMLElement,
  reRender: () => void,
  editingLineId: string | null,
  setEditingLineId: (id: string | null) => void,
): HTMLElement {
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
    // If this line is being edited, show the edit row
    if (editingLineId === line.id) {
      tbody.appendChild(buildEditRow(line, wrapper, reRender));
      continue;
    }

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
    editBtn.addEventListener('click', () => {
      setEditingLineId(line.id);
    });
    actionsWrap.appendChild(editBtn);

    const removeBtn = el('button', 'text-red-400 hover:underline text-xs', 'Remove');
    removeBtn.addEventListener('click', async () => {
      if (!confirm(`Remove line "${line.description}"?`)) return;
      try {
        const svc = getEstimatingService();
        await svc.removeEstimateLine(line.id);
        showMsg(wrapper, 'Line removed.', false);
        reRender();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove line.';
        showMsg(wrapper, message, true);
      }
    });
    actionsWrap.appendChild(removeBtn);

    tdActions.appendChild(actionsWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  // Add-line row at the bottom
  tbody.appendChild(buildAddLineRow(estimateId, wrapper, reRender));

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function buildToolbar(
  estimateId: string,
  lines: LineRow[],
  wrapper: HTMLElement,
  reRender: () => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

  // Add Assembly
  const addAssemblyBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-zinc-600 text-white hover:opacity-90', 'Add Assembly');
  addAssemblyBtn.addEventListener('click', async () => {
    const assemblyName = prompt('Assembly name:');
    if (!assemblyName) return;
    const description = prompt('Description:') ?? assemblyName;
    try {
      const svc = getEstimatingService();
      await svc.createAssembly({
        estimateId,
        assemblyName,
        description,
      });
      showMsg(wrapper, `Assembly "${assemblyName}" created.`, false);
      reRender();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create assembly.';
      showMsg(wrapper, message, true);
    }
  });
  bar.appendChild(addAssemblyBtn);

  // Import CSV
  const importBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Import CSV');
  importBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const Papa = (window as Record<string, unknown>).Papa as {
        parse(file: File, config: {
          header: boolean;
          skipEmptyLines: boolean;
          complete: (results: { data: Record<string, string>[] }) => void;
          error: (err: Error) => void;
        }): void;
      } | undefined;

      if (!Papa) {
        showMsg(wrapper, 'Papa Parse library not loaded. Cannot import CSV.', true);
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data.map((row) => ({
              description: row['description'] ?? row['Description'] ?? '',
              costType: (row['costType'] ?? row['cost_type'] ?? row['CostType'] ?? 'other') as EstimateLineCostType,
              quantity: row['quantity'] ?? row['Quantity'] ?? row['qty'] ? parseFloat(row['quantity'] ?? row['Quantity'] ?? row['qty']) : undefined,
              unit: row['unit'] ?? row['Unit'] ?? undefined,
              unitCost: row['unitCost'] ?? row['unit_cost'] ?? row['UnitCost'] ? parseFloat(row['unitCost'] ?? row['unit_cost'] ?? row['UnitCost']) : undefined,
              amount: row['amount'] ?? row['Amount'] ? parseFloat(row['amount'] ?? row['Amount']) : undefined,
              markupPct: row['markupPct'] ?? row['markup_pct'] ?? row['MarkupPct'] ? parseFloat(row['markupPct'] ?? row['markup_pct'] ?? row['MarkupPct']) : undefined,
              costCodeId: row['costCodeId'] ?? row['cost_code_id'] ?? row['CostCodeId'] ?? undefined,
              isAlternate: row['isAlternate'] === 'true' || row['is_alternate'] === 'true',
              isAllowance: row['isAllowance'] === 'true' || row['is_allowance'] === 'true',
              alternateGroup: row['alternateGroup'] ?? row['alternate_group'] ?? undefined,
            })).filter((r) => r.description);

            if (rows.length === 0) {
              showMsg(wrapper, 'No valid rows found in CSV.', true);
              return;
            }

            const svc = getEstimatingService();
            const imported = await svc.importEstimateLines(estimateId, rows);
            showMsg(wrapper, `Imported ${imported.length} line(s).`, false);
            reRender();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to import lines.';
            showMsg(wrapper, message, true);
          }
        },
        error: (err) => {
          showMsg(wrapper, `CSV parse error: ${err.message}`, true);
        },
      });
    });
    fileInput.click();
  });
  bar.appendChild(importBtn);

  // Export CSV
  const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Export CSV');
  exportBtn.addEventListener('click', () => {
    if (lines.length === 0) {
      showMsg(wrapper, 'No lines to export.', true);
      return;
    }

    const headers = ['description', 'costType', 'quantity', 'unit', 'unitCost', 'amount', 'markupPct', 'markupAmount', 'totalPrice', 'isAssembly', 'assemblyName', 'isAlternate', 'isAllowance', 'alternateGroup', 'sortOrder'];
    const csvRows = [headers.join(',')];
    for (const line of lines) {
      const values = [
        `"${line.description.replace(/"/g, '""')}"`,
        line.costType,
        String(line.quantity),
        `"${(line.unit ?? '').replace(/"/g, '""')}"`,
        String(line.unitCost),
        String(line.amount),
        String(line.markupPct),
        String(line.markupAmount),
        String(line.totalPrice),
        String(line.isAssembly),
        `"${(line.assemblyName ?? '').replace(/"/g, '""')}"`,
        String(line.isAlternate),
        String(line.isAllowance),
        `"${(line.alternateGroup ?? '').replace(/"/g, '""')}"`,
        String(line.sortOrder),
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estimate-lines-${estimateId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg(wrapper, 'CSV exported.', false);
  });
  bar.appendChild(exportBtn);

  // Apply Overall Markup
  const markupBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Apply Overall Markup');
  markupBtn.addEventListener('click', async () => {
    const input = prompt('Enter markup percentage to apply to all lines:');
    if (input === null) return;
    const pct = parseFloat(input);
    if (isNaN(pct)) {
      showMsg(wrapper, 'Invalid percentage value.', true);
      return;
    }
    try {
      const svc = getEstimatingService();
      await svc.applyOverallMarkup(estimateId, pct);
      await svc.recalculateEstimateTotals(estimateId);
      showMsg(wrapper, `Applied ${fmtPct(pct)} markup to all lines.`, false);
      reRender();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply markup.';
      showMsg(wrapper, message, true);
    }
  });
  bar.appendChild(markupBtn);

  return bar;
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadData(estimateId: string): Promise<{
  estimate: { id: string; name: string; totalCost: number; totalMarkup: number; totalPrice: number; marginPct: number };
  lines: LineRow[];
}> {
  const svc = getEstimatingService();
  const estimate = await svc.getEstimate(estimateId);
  if (!estimate) {
    throw new Error(`Estimate not found: ${estimateId}`);
  }

  const rawLines = await svc.getEstimateLines(estimateId);
  const lines: LineRow[] = rawLines.map((l) => ({
    id: l.id,
    description: l.description,
    costType: l.costType,
    quantity: l.quantity,
    unit: l.unit ?? '',
    unitCost: l.unitCost,
    amount: l.amount,
    markupPct: l.markupPct,
    markupAmount: l.markupAmount,
    totalPrice: l.totalPrice,
    isAssembly: l.isAssembly,
    assemblyName: l.assemblyName ?? '',
    isAlternate: l.isAlternate,
    isAllowance: l.isAllowance,
    parentId: l.parentId ?? '',
    sortOrder: l.sortOrder,
    alternateGroup: l.alternateGroup ?? '',
  }));

  return {
    estimate: {
      id: estimate.id,
      name: estimate.name,
      totalCost: estimate.totalCost,
      totalMarkup: estimate.totalMarkup,
      totalPrice: estimate.totalPrice,
      marginPct: estimate.marginPct,
    },
    lines,
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const estimateId = getEstimateIdFromHash();
    if (!estimateId) {
      showMsg(wrapper, 'No estimate ID found in URL.', true);
      container.appendChild(wrapper);
      return;
    }

    // State for inline editing
    let editingLineId: string | null = null;

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Estimate Line Items'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Estimate') as HTMLAnchorElement;
    backLink.href = `#/estimating/${estimateId}`;
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const contentArea = el('div');
    wrapper.appendChild(contentArea);
    container.appendChild(wrapper);

    const doRender = () => {
      loadData(estimateId)
        .then(({ estimate, lines }) => {
          contentArea.innerHTML = '';
          contentArea.appendChild(buildSummaryCards(lines, estimate));
          contentArea.appendChild(buildToolbar(estimateId, lines, wrapper, doRender));
          contentArea.appendChild(
            buildLinesTable(
              lines,
              estimateId,
              wrapper,
              doRender,
              editingLineId,
              (id) => {
                editingLineId = id;
                doRender();
              },
            ),
          );
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load estimate lines.';
          showMsg(wrapper, message, true);
        });
    };

    // Initial load
    doRender();
  },
};

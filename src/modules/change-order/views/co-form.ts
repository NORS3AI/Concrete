/**
 * Change Order create/edit form view.
 * Full CO details with line items (cost breakdown), markup, schedule extension.
 * Wired to ChangeOrderService for live data.
 */

import { getChangeOrderService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'internal', label: 'Internal' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'executed', label: 'Executed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'voided', label: 'Voided' },
];

const COST_TYPE_OPTIONS = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  executed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  voided: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Form Builder Helpers
// ---------------------------------------------------------------------------

function buildField(label: string, inputEl: HTMLElement, colSpan?: number): HTMLElement {
  const group = el('div', colSpan === 2 ? 'col-span-2' : '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: { value: string; label: string }[]): HTMLSelectElement {
  const select = el('select', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  select.name = name;
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

function textareaInput(name: string, rows: number): HTMLTextAreaElement {
  const ta = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLTextAreaElement;
  ta.name = name;
  ta.rows = rows;
  return ta;
}

// ---------------------------------------------------------------------------
// Line Items Table
// ---------------------------------------------------------------------------

interface COLineItem {
  id: string;
  lineNumber: number;
  costType: string;
  description: string;
  quantity: number;
  unitCost: number;
  amount: number;
  markupPct: number;
  markup: number;
  totalWithMarkup: number;
}

function buildLineItemsTable(
  lineItems: COLineItem[],
  onRemove: (lineId: string) => void,
): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Cost Breakdown'));

  const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Cost Type', 'Description', 'Qty', 'Unit Cost', 'Amount', 'Markup %', 'Markup', 'Total', 'Actions']) {
    const align = ['Qty', 'Unit Cost', 'Amount', 'Markup %', 'Markup', 'Total'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lineItems.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add cost items.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (let i = 0; i < lineItems.length; i++) {
    const line = lineItems[i];
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(i + 1)));
    tr.appendChild(el('td', 'py-2 px-3', line.costType));
    tr.appendChild(el('td', 'py-2 px-3', line.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', `${line.markupPct}%`));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(line.markup)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.totalWithMarkup)));
    const tdActions = el('td', 'py-2 px-3');
    const removeBtn = el('button', 'text-red-400 hover:text-red-300 text-sm', 'Remove');
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => onRemove(line.id));
    tdActions.appendChild(removeBtn);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

function buildTotals(lineItems: COLineItem[]): HTMLElement {
  const subtotal = lineItems.reduce((sum, l) => sum + l.amount, 0);
  const totalMarkup = lineItems.reduce((sum, l) => sum + l.markup, 0);
  const grandTotal = lineItems.reduce((sum, l) => sum + l.totalWithMarkup, 0);

  const section = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mt-4');
  const grid = el('div', 'grid grid-cols-3 gap-4 text-sm');

  const buildTotal = (label: string, value: string): HTMLElement => {
    const group = el('div', 'text-right');
    group.appendChild(el('div', 'text-[var(--text-muted)]', label));
    group.appendChild(el('div', 'font-mono font-medium text-[var(--text)]', value));
    return group;
  };

  grid.appendChild(buildTotal('Subtotal', fmtCurrency(subtotal)));
  grid.appendChild(buildTotal('Total Markup', fmtCurrency(totalMarkup)));
  grid.appendChild(buildTotal('Grand Total', fmtCurrency(grandTotal)));
  section.appendChild(grid);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getChangeOrderService();

    // Parse CO ID from hash
    const match = location.hash.match(/#\/change-orders\/([^/]+)/);
    const rawId = match?.[1] ?? null;
    const editId = rawId && rawId !== 'new' ? rawId : null;
    const isEdit = editId !== null;

    // Load existing CO data if editing
    let coData: {
      id: string;
      number: string;
      title: string;
      type: string;
      status: string;
      jobId: string;
      requestId: string;
      effectiveDate: string;
      scheduleExtensionDays: number;
      description: string;
      scopeDescription: string;
      entityId: string;
      amount: number;
      approvedAmount: number;
    } | null = null;

    if (isEdit) {
      const co = svc.getChangeOrder(editId);
      if (!co) {
        showMsg(wrapper, `Change order not found: ${editId}`, true);
        return;
      }
      coData = {
        id: co.id as string,
        number: co.number,
        title: co.title,
        type: co.type,
        status: co.status,
        jobId: co.jobId ?? '',
        requestId: co.requestId ?? '',
        effectiveDate: co.effectiveDate ?? '',
        scheduleExtensionDays: co.scheduleExtensionDays ?? 0,
        description: co.description ?? '',
        scopeDescription: co.scopeDescription ?? '',
        entityId: co.entityId ?? '',
        amount: co.amount ?? 0,
        approvedAmount: co.approvedAmount ?? 0,
      };
    }

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]',
      isEdit ? `Change Order - ${coData!.number}` : 'New Change Order'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Change Orders') as HTMLAnchorElement;
    backLink.href = '#/change-orders/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: CO Header
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Change Order Details'));
    const headerGrid = el('div', 'grid grid-cols-2 gap-4');

    const coNumberInput = textInput('number', 'CO-001');
    if (coData) coNumberInput.value = coData.number;
    headerGrid.appendChild(buildField('CO Number', coNumberInput));

    const titleInput = textInput('title', 'Change order title');
    if (coData) titleInput.value = coData.title;
    headerGrid.appendChild(buildField('Title', titleInput));

    const typeSelect = selectInput('type', TYPE_OPTIONS);
    if (coData) typeSelect.value = coData.type;
    headerGrid.appendChild(buildField('Type', typeSelect));

    // Status display (read-only when editing)
    if (isEdit && coData) {
      const statusDiv = el('div', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] cursor-default');
      const statusLabel = coData.status.replace(/_/g, ' ');
      const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[coData.status] ?? STATUS_BADGE.draft}`,
        statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
      statusDiv.appendChild(statusBadge);
      headerGrid.appendChild(buildField('Status', statusDiv));
    } else {
      const statusDiv = el('div', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] cursor-default', 'Draft');
      headerGrid.appendChild(buildField('Status', statusDiv));
    }

    const jobIdInput = textInput('jobId', 'Select job');
    if (coData) jobIdInput.value = coData.jobId;
    headerGrid.appendChild(buildField('Job', jobIdInput));

    const effectiveDateInput = dateInput('effectiveDate');
    if (coData) effectiveDateInput.value = coData.effectiveDate;
    headerGrid.appendChild(buildField('Effective Date', effectiveDateInput));

    const scheduleExtInput = numberInput('scheduleExtensionDays', '0');
    if (coData) scheduleExtInput.value = String(coData.scheduleExtensionDays);
    headerGrid.appendChild(buildField('Schedule Extension (Days)', scheduleExtInput));

    const requestIdInput = textInput('requestId', 'Link to PCO (optional)');
    if (coData) requestIdInput.value = coData.requestId;
    headerGrid.appendChild(buildField('Request (PCO)', requestIdInput));

    form.appendChild(headerGrid);

    // Section: Description/Scope
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Scope'));

    const descriptionInput = textareaInput('description', 3);
    if (coData) descriptionInput.value = coData.description;
    form.appendChild(buildField('Description', descriptionInput, 2));

    const scopeDescInput = textareaInput('scopeDescription', 3);
    if (coData) scopeDescInput.value = coData.scopeDescription;
    form.appendChild(buildField('Scope Description', scopeDescInput, 2));

    // Section: Line Items (editing only)
    const linesSection = el('div', 'space-y-3');
    const linesTableContainer = el('div');
    const totalsContainer = el('div');

    if (isEdit && coData) {
      // Load and render lines
      const loadAndRenderLines = () => {
        const lines = svc.getLines(coData!.id);
        const lineItems: COLineItem[] = lines.map((line, idx) => ({
          id: line.id as string,
          lineNumber: idx + 1,
          costType: line.costType,
          description: line.description ?? '',
          quantity: line.quantity,
          unitCost: line.unitCost,
          amount: line.amount,
          markupPct: line.markupPct ?? 0,
          markup: line.markup ?? 0,
          totalWithMarkup: line.totalWithMarkup ?? line.amount,
        }));

        linesTableContainer.innerHTML = '';
        linesTableContainer.appendChild(buildLineItemsTable(lineItems, handleRemoveLine));

        totalsContainer.innerHTML = '';
        totalsContainer.appendChild(buildTotals(lineItems));
      };

      const handleRemoveLine = (lineId: string) => {
        try {
          svc.removeLine(lineId);
          loadAndRenderLines();
          showMsg(wrapper, 'Line item removed.', false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to remove line';
          showMsg(wrapper, message, true);
        }
      };

      linesSection.appendChild(linesTableContainer);

      // Add Line form
      const addLineForm = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mt-3');
      addLineForm.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Line Item'));
      const addGrid = el('div', 'grid grid-cols-6 gap-3');

      const lineCostTypeSelect = selectInput('lineCostType', COST_TYPE_OPTIONS);
      addGrid.appendChild(buildField('Cost Type', lineCostTypeSelect));

      const lineDescInput = textInput('lineDesc', 'Description');
      addGrid.appendChild(buildField('Description', lineDescInput));

      const lineQtyInput = numberInput('lineQty', '1');
      lineQtyInput.min = '0';
      addGrid.appendChild(buildField('Quantity', lineQtyInput));

      const lineUnitCostInput = numberInput('lineUnitCost', '0.00');
      addGrid.appendChild(buildField('Unit Cost', lineUnitCostInput));

      const lineMarkupPctInput = numberInput('lineMarkupPct', '0');
      addGrid.appendChild(buildField('Markup %', lineMarkupPctInput));

      const addLineBtnWrap = el('div', 'flex items-end');
      const addLineBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line');
      addLineBtn.type = 'button';
      addLineBtn.addEventListener('click', () => {
        const costType = lineCostTypeSelect.value;
        const desc = lineDescInput.value.trim();
        const qty = parseFloat(lineQtyInput.value) || 0;
        const unitCost = parseFloat(lineUnitCostInput.value) || 0;
        const markupPct = parseFloat(lineMarkupPctInput.value) || 0;

        if (qty <= 0) {
          showMsg(wrapper, 'Quantity must be greater than zero.', true);
          return;
        }

        try {
          svc.addLine({
            changeOrderId: coData!.id,
            costType: costType as any,
            description: desc || undefined,
            quantity: qty,
            unitCost,
            markupPct: markupPct || undefined,
          });

          // Clear form
          lineDescInput.value = '';
          lineQtyInput.value = '';
          lineUnitCostInput.value = '';
          lineMarkupPctInput.value = '';

          loadAndRenderLines();
          showMsg(wrapper, 'Line item added.', false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add line';
          showMsg(wrapper, message, true);
        }
      });
      addLineBtnWrap.appendChild(addLineBtn);
      addGrid.appendChild(addLineBtnWrap);

      addLineForm.appendChild(addGrid);
      linesSection.appendChild(addLineForm);
      linesSection.appendChild(totalsContainer);

      // Initial load
      loadAndRenderLines();
    } else {
      // New CO: show empty line items placeholder
      const emptyLines: COLineItem[] = [];
      linesSection.appendChild(buildLineItemsTable(emptyLines, () => {}));
      linesSection.appendChild(buildTotals(emptyLines));
    }

    form.appendChild(linesSection);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const status = coData?.status ?? 'draft';

    // Save button
    if (status === 'draft' || !isEdit) {
      const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', () => {
        try {
          const formData = {
            number: coNumberInput.value.trim(),
            title: titleInput.value.trim(),
            type: typeSelect.value,
            jobId: jobIdInput.value.trim() || undefined,
            requestId: requestIdInput.value.trim() || undefined,
            effectiveDate: effectiveDateInput.value || undefined,
            scheduleExtensionDays: parseInt(scheduleExtInput.value, 10) || 0,
            description: descriptionInput.value.trim() || undefined,
            scopeDescription: scopeDescInput.value.trim() || undefined,
            entityId: undefined as string | undefined,
          };

          if (!formData.number) {
            showMsg(wrapper, 'CO Number is required.', true);
            return;
          }
          if (!formData.title) {
            showMsg(wrapper, 'Title is required.', true);
            return;
          }

          if (isEdit) {
            svc.updateChangeOrder(coData!.id, formData);
            showMsg(wrapper, 'Change order updated.', false);
          } else {
            const created = svc.createChangeOrder({
              ...formData,
              jobId: formData.jobId ?? '',
            });
            window.location.hash = `#/change-orders/${created.id}`;
            showMsg(wrapper, 'Change order created.', false);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save change order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(saveBtn);
    }

    // Submit for Approval (draft, editing only)
    if (isEdit && status === 'draft') {
      const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Submit for Approval');
      submitBtn.type = 'button';
      submitBtn.addEventListener('click', () => {
        try {
          svc.submitForApproval(coData!.id);
          showMsg(wrapper, 'Change order submitted for approval.', false);
          setTimeout(() => { window.location.hash = '#/change-orders/list'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to submit for approval';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(submitBtn);
    }

    // Execute button (approved only)
    if (isEdit && status === 'approved') {
      const executeBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:opacity-90', 'Execute');
      executeBtn.type = 'button';
      executeBtn.addEventListener('click', () => {
        try {
          svc.executeChangeOrder(coData!.id);
          showMsg(wrapper, 'Change order executed.', false);
          setTimeout(() => { window.location.hash = '#/change-orders/list'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to execute change order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(executeBtn);
    }

    // Void button (not already voided or executed)
    if (isEdit && status !== 'voided' && status !== 'executed') {
      const voidBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Void');
      voidBtn.type = 'button';
      voidBtn.addEventListener('click', () => {
        if (!confirm('Void this change order? This action cannot be undone.')) return;
        const reason = prompt('Reason for voiding (optional):');
        try {
          svc.voidChangeOrder(coData!.id, reason ?? undefined);
          showMsg(wrapper, 'Change order voided.', false);
          setTimeout(() => { window.location.hash = '#/change-orders/list'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to void change order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(voidBtn);
    }

    // Cost Impact link (editing only)
    if (isEdit) {
      const costImpactLink = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white', 'Cost Impact') as HTMLAnchorElement;
      costImpactLink.href = `#/change-orders/${coData!.id}/cost-impact`;
      btnRow.appendChild(costImpactLink);
    }

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/change-orders/list';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

/**
 * Purchase Order create/edit form view.
 * Full PO details with line items, job/cost code distribution, and approval actions.
 * Wired to POService for live data.
 */

import { getPOService } from '../service-accessor';

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

function getIdFromHash(pattern: RegExp): string | null {
  const match = window.location.hash.match(pattern);
  if (match && match[1] !== 'new') return match[1];
  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'blanket', label: 'Blanket' },
  { value: 'service', label: 'Service' },
];

const COST_TYPE_OPTIONS = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
  { value: 'overhead', label: 'Overhead' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial_receipt: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Form Input Builders
// ---------------------------------------------------------------------------

const INPUT_CLS = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

function buildField(label: string, inputEl: HTMLElement, colSpan?: number): HTMLElement {
  const group = el('div', colSpan === 2 ? 'col-span-2' : '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', INPUT_CLS) as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', INPUT_CLS) as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', INPUT_CLS) as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: { value: string; label: string }[]): HTMLSelectElement {
  const select = el('select', INPUT_CLS) as HTMLSelectElement;
  select.name = name;
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

function textareaInput(name: string, rows: number): HTMLTextAreaElement {
  const ta = el('textarea', INPUT_CLS) as HTMLTextAreaElement;
  ta.name = name;
  ta.rows = rows;
  return ta;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getPOService();
    const editId = getIdFromHash(/\/po\/([^/]+)/);
    const isEdit = editId !== null;

    // Load existing PO data if editing
    let poData: {
      id: string;
      poNumber: string;
      type: string;
      status: string;
      vendorId: string;
      jobId: string;
      entityId: string;
      issuedDate: string;
      expectedDate: string;
      terms: string;
      shipTo: string;
      description: string;
      amount: number;
      taxAmount: number;
      shippingAmount: number;
      totalAmount: number;
      approvedBy: string;
      approvedAt: string;
    } | null = null;

    if (isEdit) {
      const po = await svc.getPurchaseOrder(editId);
      if (!po) {
        showMsg(wrapper, `Purchase order not found: ${editId}`, true);
        return;
      }
      poData = {
        id: po.id as string,
        poNumber: po.poNumber,
        type: po.type,
        status: po.status,
        vendorId: po.vendorId,
        jobId: po.jobId ?? '',
        entityId: po.entityId ?? '',
        issuedDate: po.issuedDate ?? '',
        expectedDate: po.expectedDate ?? '',
        terms: po.terms ?? '',
        shipTo: po.shipTo ?? '',
        description: po.description ?? '',
        amount: po.amount,
        taxAmount: po.taxAmount,
        shippingAmount: po.shippingAmount,
        totalAmount: po.totalAmount,
        approvedBy: po.approvedBy ?? '',
        approvedAt: po.approvedAt ?? '',
      };
    }

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Purchase Order' : 'New Purchase Order'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Purchase Orders') as HTMLAnchorElement;
    backLink.href = '#/po/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // ---- Section: PO Header ----
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'PO Header'));
    const headerGrid = el('div', 'grid grid-cols-3 gap-4');

    const poNumberInput = textInput('poNumber', 'PO-0001');
    if (poData) poNumberInput.value = poData.poNumber;
    headerGrid.appendChild(buildField('PO Number', poNumberInput));

    const typeSelect = selectInput('type', TYPE_OPTIONS);
    if (poData) typeSelect.value = poData.type;
    headerGrid.appendChild(buildField('Type', typeSelect));

    // Status display (read-only when editing)
    if (isEdit && poData) {
      const statusDiv = el('div', INPUT_CLS + ' cursor-default');
      const statusLabel = poData.status.replace(/_/g, ' ');
      const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[poData.status] ?? STATUS_BADGE.draft}`,
        statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1));
      statusDiv.appendChild(statusBadge);
      headerGrid.appendChild(buildField('Status', statusDiv));
    } else {
      const statusDiv = el('div', INPUT_CLS + ' cursor-default', 'Draft');
      headerGrid.appendChild(buildField('Status', statusDiv));
    }

    const vendorIdInput = textInput('vendorId', 'Vendor ID');
    if (poData) vendorIdInput.value = poData.vendorId;
    headerGrid.appendChild(buildField('Vendor ID', vendorIdInput));

    const jobIdInput = textInput('jobId', 'Job ID');
    if (poData) jobIdInput.value = poData.jobId;
    headerGrid.appendChild(buildField('Job ID', jobIdInput));

    const entityIdInput = textInput('entityId', 'Entity ID');
    if (poData) entityIdInput.value = poData.entityId;
    headerGrid.appendChild(buildField('Entity ID', entityIdInput));

    const issuedDateInput = dateInput('issuedDate');
    if (poData) issuedDateInput.value = poData.issuedDate;
    headerGrid.appendChild(buildField('Issued Date', issuedDateInput));

    const expectedDateInput = dateInput('expectedDate');
    if (poData) expectedDateInput.value = poData.expectedDate;
    headerGrid.appendChild(buildField('Expected Date', expectedDateInput));

    const termsInput = textInput('terms', 'Net 30');
    if (poData) termsInput.value = poData.terms;
    headerGrid.appendChild(buildField('Terms', termsInput));

    form.appendChild(headerGrid);

    // ---- Section: Details ----
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Details'));
    const detailGrid = el('div', 'grid grid-cols-2 gap-4');

    const shipToInput = textareaInput('shipTo', 2);
    if (poData) shipToInput.value = poData.shipTo;
    detailGrid.appendChild(buildField('Ship To', shipToInput));

    const descriptionInput = textareaInput('description', 2);
    if (poData) descriptionInput.value = poData.description;
    detailGrid.appendChild(buildField('Description', descriptionInput));

    form.appendChild(detailGrid);

    // ---- Section: Financial ----
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial'));
    const finGrid = el('div', 'grid grid-cols-4 gap-4');

    const amountDisplay = el('div', INPUT_CLS + ' cursor-default font-mono', fmtCurrency(poData?.amount ?? 0));
    amountDisplay.setAttribute('data-field', 'amount');
    finGrid.appendChild(buildField('Amount (from lines)', amountDisplay));

    const taxInput = numberInput('taxAmount', '0.00');
    if (poData) taxInput.value = String(poData.taxAmount);
    finGrid.appendChild(buildField('Tax', taxInput));

    const shippingInput = numberInput('shippingAmount', '0.00');
    if (poData) shippingInput.value = String(poData.shippingAmount);
    finGrid.appendChild(buildField('Shipping', shippingInput));

    const totalDisplay = el('div', INPUT_CLS + ' cursor-default font-mono font-medium', fmtCurrency(poData?.totalAmount ?? 0));
    totalDisplay.setAttribute('data-field', 'total');
    finGrid.appendChild(buildField('Total', totalDisplay));

    form.appendChild(finGrid);

    // Recalculate total when tax/shipping change
    const recalcTotal = () => {
      const amount = parseFloat(amountDisplay.textContent?.replace(/[^0-9.-]/g, '') ?? '0') || 0;
      const tax = parseFloat(taxInput.value) || 0;
      const shipping = parseFloat(shippingInput.value) || 0;
      totalDisplay.textContent = fmtCurrency(amount + tax + shipping);
    };
    taxInput.addEventListener('input', recalcTotal);
    shippingInput.addEventListener('input', recalcTotal);

    // ---- Section: Line Items (editing only) ----
    const linesSection = el('div', 'space-y-3');
    const linesTableContainer = el('div');

    if (isEdit && poData) {
      linesSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Line Items'));

      // Load and render lines
      const loadAndRenderLines = async () => {
        const lines = await svc.getPOLines(poData!.id);
        linesTableContainer.innerHTML = '';

        const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of ['#', 'Description', 'Cost Type', 'Qty', 'Unit Cost', 'Amount', 'Received Qty', 'Invoiced Qty', 'Actions']) {
          const align = ['Qty', 'Unit Cost', 'Amount', 'Received Qty', 'Invoiced Qty'].includes(col)
            ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (lines.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add PO line items.');
          td.setAttribute('colspan', '9');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const line of lines) {
          const tr = el('tr', 'border-b border-[var(--border)]');
          tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(line.lineNumber)));
          tr.appendChild(el('td', 'py-2 px-3', line.description));
          tr.appendChild(el('td', 'py-2 px-3', line.costType ?? ''));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(line.quantity)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitCost)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.amount)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', String(line.receivedQuantity)));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', String(line.invoicedQuantity)));

          const tdActions = el('td', 'py-2 px-3');
          const removeBtn = el('button', 'text-red-400 hover:text-red-300 text-sm', 'Delete');
          removeBtn.type = 'button';
          removeBtn.addEventListener('click', async () => {
            try {
              await svc.deletePOLine(line.id as string);
              // Reload PO to get updated amount
              const updatedPO = await svc.getPurchaseOrder(poData!.id);
              if (updatedPO) {
                poData!.amount = updatedPO.amount;
                poData!.totalAmount = updatedPO.totalAmount;
                amountDisplay.textContent = fmtCurrency(updatedPO.amount);
                totalDisplay.textContent = fmtCurrency(updatedPO.totalAmount);
              }
              await loadAndRenderLines();
              showMsg(wrapper, 'Line item deleted.', false);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete line';
              showMsg(wrapper, message, true);
            }
          });
          tdActions.appendChild(removeBtn);
          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        linesTableContainer.appendChild(wrap);
      };

      linesSection.appendChild(linesTableContainer);

      // Add Line form
      const addLineForm = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mt-3');
      addLineForm.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Line Item'));
      const addGrid = el('div', 'grid grid-cols-5 gap-3');

      const lineDescInput = textInput('lineDesc', 'Description');
      addGrid.appendChild(buildField('Description', lineDescInput));

      const lineCostTypeSelect = selectInput('lineCostType', COST_TYPE_OPTIONS);
      addGrid.appendChild(buildField('Cost Type', lineCostTypeSelect));

      const lineQtyInput = numberInput('lineQty', '1');
      lineQtyInput.min = '0';
      addGrid.appendChild(buildField('Quantity', lineQtyInput));

      const lineUnitCostInput = numberInput('lineUnitCost', '0.00');
      addGrid.appendChild(buildField('Unit Cost', lineUnitCostInput));

      const addLineBtnWrap = el('div', 'flex items-end');
      const addLineBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line');
      addLineBtn.type = 'button';
      addLineBtn.addEventListener('click', async () => {
        const desc = lineDescInput.value.trim();
        const costType = lineCostTypeSelect.value;
        const qty = parseFloat(lineQtyInput.value) || 0;
        const unitCost = parseFloat(lineUnitCostInput.value) || 0;

        if (!desc) {
          showMsg(wrapper, 'Line description is required.', true);
          return;
        }
        if (qty <= 0) {
          showMsg(wrapper, 'Quantity must be greater than zero.', true);
          return;
        }

        try {
          await svc.addPOLine({
            purchaseOrderId: poData!.id,
            description: desc,
            costType: costType as 'labor' | 'material' | 'subcontract' | 'equipment' | 'other' | 'overhead',
            quantity: qty,
            unitCost,
          });

          // Reload PO to get updated amount
          const updatedPO = await svc.getPurchaseOrder(poData!.id);
          if (updatedPO) {
            poData!.amount = updatedPO.amount;
            poData!.totalAmount = updatedPO.totalAmount;
            amountDisplay.textContent = fmtCurrency(updatedPO.amount);
            totalDisplay.textContent = fmtCurrency(updatedPO.totalAmount);
          }

          // Clear form
          lineDescInput.value = '';
          lineQtyInput.value = '';
          lineUnitCostInput.value = '';

          await loadAndRenderLines();
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

      // Initial load
      await loadAndRenderLines();
    }

    form.appendChild(linesSection);

    // ---- Section: Approval (editing only) ----
    if (isEdit && poData) {
      form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Approval'));
      const approvalGrid = el('div', 'grid grid-cols-2 gap-4');

      const approvedByDisplay = el('div', INPUT_CLS + ' cursor-default', poData.approvedBy || 'N/A');
      approvalGrid.appendChild(buildField('Approved By', approvedByDisplay));

      const approvedAtDisplay = el('div', INPUT_CLS + ' cursor-default', poData.approvedAt || 'N/A');
      approvalGrid.appendChild(buildField('Approved At', approvedAtDisplay));

      form.appendChild(approvalGrid);
    }

    // ---- Action Buttons ----
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const status = poData?.status ?? 'draft';

    if (status === 'draft') {
      // Save button
      const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save PO');
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', async () => {
        try {
          const formData = {
            poNumber: poNumberInput.value.trim(),
            type: typeSelect.value as 'standard' | 'blanket' | 'service',
            vendorId: vendorIdInput.value.trim(),
            jobId: jobIdInput.value.trim() || undefined,
            entityId: entityIdInput.value.trim() || undefined,
            issuedDate: issuedDateInput.value || undefined,
            expectedDate: expectedDateInput.value || undefined,
            terms: termsInput.value.trim() || undefined,
            shipTo: shipToInput.value.trim() || undefined,
            description: descriptionInput.value.trim() || undefined,
            taxAmount: parseFloat(taxInput.value) || 0,
            shippingAmount: parseFloat(shippingInput.value) || 0,
          };

          if (!formData.poNumber) {
            showMsg(wrapper, 'PO Number is required.', true);
            return;
          }
          if (!formData.vendorId) {
            showMsg(wrapper, 'Vendor ID is required.', true);
            return;
          }

          if (isEdit) {
            await svc.updatePurchaseOrder(poData!.id, formData);
            showMsg(wrapper, 'Purchase order updated.', false);
          } else {
            const created = await svc.createPurchaseOrder({
              ...formData,
              amount: 0,
            });
            window.location.hash = `#/po/${created.id}`;
            showMsg(wrapper, 'Purchase order created.', false);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save purchase order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(saveBtn);

      // Submit for Approval (editing only)
      if (isEdit) {
        const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:opacity-90', 'Submit for Approval');
        submitBtn.type = 'button';
        submitBtn.addEventListener('click', async () => {
          try {
            await svc.submitForApproval(poData!.id);
            showMsg(wrapper, 'Purchase order submitted for approval.', false);
            setTimeout(() => { window.location.hash = '#/po/list'; }, 1000);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to submit for approval';
            showMsg(wrapper, message, true);
          }
        });
        btnRow.appendChild(submitBtn);

        // Delete
        const deleteBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Delete');
        deleteBtn.type = 'button';
        deleteBtn.addEventListener('click', async () => {
          if (!confirm(`Delete purchase order ${poData!.poNumber}? This action cannot be undone.`)) return;
          try {
            await svc.deletePurchaseOrder(poData!.id);
            showMsg(wrapper, 'Purchase order deleted.', false);
            setTimeout(() => { window.location.hash = '#/po/list'; }, 1000);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete purchase order';
            showMsg(wrapper, message, true);
          }
        });
        btnRow.appendChild(deleteBtn);
      }
    }

    if (status === 'pending_approval') {
      // Approve
      const approveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Approve');
      approveBtn.type = 'button';
      approveBtn.addEventListener('click', async () => {
        const approvedBy = prompt('Enter approver name:');
        if (!approvedBy) return;
        try {
          await svc.approvePurchaseOrder(poData!.id, approvedBy);
          showMsg(wrapper, 'Purchase order approved.', false);
          setTimeout(() => { window.location.hash = '#/po/list'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to approve purchase order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(approveBtn);

      // Cancel PO
      const cancelPOBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Cancel PO');
      cancelPOBtn.type = 'button';
      cancelPOBtn.addEventListener('click', async () => {
        if (!confirm('Cancel this purchase order?')) return;
        try {
          await svc.cancelPurchaseOrder(poData!.id);
          showMsg(wrapper, 'Purchase order cancelled.', false);
          setTimeout(() => { window.location.hash = '#/po/list'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to cancel purchase order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(cancelPOBtn);
    }

    if (status === 'approved') {
      // Close PO
      const closeBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-gray-600 text-white hover:opacity-90', 'Close PO');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', async () => {
        if (!confirm('Close this purchase order?')) return;
        try {
          await svc.closePurchaseOrder(poData!.id);
          showMsg(wrapper, 'Purchase order closed.', false);
          setTimeout(() => { window.location.hash = '#/po/list'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to close purchase order';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(closeBtn);
    }

    // Back button (always)
    const backBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    backBtn.href = '#/po/list';
    btnRow.appendChild(backBtn);

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

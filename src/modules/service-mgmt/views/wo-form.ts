/**
 * Work Order create/edit form view.
 * Full work order details with type, customer, equipment, priority,
 * pricing type, and line items.
 * Integrates with ServiceMgmtService for CRUD operations.
 */

import { getServiceMgmtService } from '../service-accessor';

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

function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const colors: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  const toast = el('div', `fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-white text-sm shadow-lg ${colors[type]}`);
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'on_demand', label: 'On Demand' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'callback', label: 'Callback' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

const PRICING_OPTIONS = [
  { value: 'tm', label: 'Time & Material' },
  { value: 'flat_rate', label: 'Flat Rate' },
];

const LINE_TYPE_OPTIONS = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Form Builder
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
// Line Items
// ---------------------------------------------------------------------------

interface WOLineRow {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  partNumber: string;
}

function buildLineItemsTable(
  lines: WOLineRow[],
  onRemove: (lineId: string) => void,
): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Line Items'));

  const wrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Type', 'Description', 'Part #', 'Qty', 'Unit Price', 'Amount', 'Actions']) {
    const align = ['Qty', 'Unit Price', 'Amount'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (lines.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-6 px-3 text-center text-[var(--text-muted)]', 'No line items. Click "Add Line" to add labor, materials, or other charges.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const line of lines) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3', line.type));
    tr.appendChild(el('td', 'py-2 px-3', line.description));
    tr.appendChild(el('td', 'py-2 px-3 font-mono', line.partNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-right', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitPrice)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-medium', fmtCurrency(line.amount)));
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

function buildTotals(laborTotal: number, materialTotal: number, grandTotal: number): HTMLElement {
  const section = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mt-4');
  const grid = el('div', 'grid grid-cols-3 gap-4 text-sm');

  const buildTotal = (label: string, value: string): HTMLElement => {
    const group = el('div', 'text-right');
    group.appendChild(el('div', 'text-[var(--text-muted)]', label));
    group.appendChild(el('div', 'font-mono font-medium text-[var(--text)]', value));
    return group;
  };

  grid.appendChild(buildTotal('Labor Total', fmtCurrency(laborTotal)));
  grid.appendChild(buildTotal('Material Total', fmtCurrency(materialTotal)));
  grid.appendChild(buildTotal('Grand Total', fmtCurrency(grandTotal)));
  section.appendChild(grid);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // Parse WO ID from hash
    const match = location.hash.match(/#\/service\/work-orders\/(.+)/);
    const woId = match?.[1];
    const isNew = !woId || woId === 'new';

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isNew ? 'New Work Order' : 'Edit Work Order'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Work Orders') as HTMLAnchorElement;
    backLink.href = '#/service/work-orders';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Work Order Header
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Work Order Details'));
    const headerGrid = el('div', 'grid grid-cols-2 gap-4');

    const numberInputEl = textInput('number', 'Auto-generated');
    headerGrid.appendChild(buildField('WO Number', numberInputEl));

    const customerInput = textInput('customerId', 'Customer ID');
    headerGrid.appendChild(buildField('Customer', customerInput));

    const typeSelect = selectInput('type', TYPE_OPTIONS);
    headerGrid.appendChild(buildField('Type', typeSelect));

    const statusSelect = selectInput('status', STATUS_OPTIONS);
    headerGrid.appendChild(buildField('Status', statusSelect));

    const prioritySelect = selectInput('priority', PRIORITY_OPTIONS);
    headerGrid.appendChild(buildField('Priority', prioritySelect));

    const pricingSelect = selectInput('pricingType', PRICING_OPTIONS);
    headerGrid.appendChild(buildField('Pricing Type', pricingSelect));

    const scheduledDateInput = dateInput('scheduledDate');
    headerGrid.appendChild(buildField('Scheduled Date', scheduledDateInput));

    const timeSlotInput = textInput('scheduledTimeSlot', 'e.g., 8:00 AM - 12:00 PM');
    headerGrid.appendChild(buildField('Time Slot', timeSlotInput));

    const assignedToInput = textInput('assignedTo', 'Technician ID');
    headerGrid.appendChild(buildField('Assigned To', assignedToInput));

    const equipmentInput = textInput('customerEquipmentId', 'Equipment ID');
    headerGrid.appendChild(buildField('Equipment', equipmentInput));

    const flatRateInput = numberInput('flatRateAmount', '0.00');
    headerGrid.appendChild(buildField('Flat Rate Amount', flatRateInput));

    const agreementInput = textInput('agreementId', 'Agreement ID');
    headerGrid.appendChild(buildField('Agreement', agreementInput));

    form.appendChild(headerGrid);

    // Section: Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Problem & Resolution'));

    const problemTa = textareaInput('problemDescription', 3);
    form.appendChild(buildField('Problem Description', problemTa, 2));

    const resolutionTa = textareaInput('resolution', 3);
    form.appendChild(buildField('Resolution', resolutionTa, 2));

    // Section: Line Items -- container that will be rebuilt
    const lineItemsContainer = el('div');
    form.appendChild(lineItemsContainer);

    // Section: Totals -- container that will be rebuilt
    const totalsContainer = el('div');
    form.appendChild(totalsContainer);

    // Current line items state (mutable, refreshed from service)
    let currentLines: WOLineRow[] = [];

    const refreshLineItems = async () => {
      if (isNew) return;
      try {
        const svc = getServiceMgmtService();
        const rawLines = await svc.getWorkOrderLines(woId!);
        currentLines = rawLines.map(l => ({
          id: l.id,
          type: l.type,
          description: l.description ?? '',
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
          partNumber: l.partNumber ?? '',
        }));
      } catch {
        currentLines = [];
      }
      renderLineItems();
    };

    const renderLineItems = () => {
      lineItemsContainer.innerHTML = '';
      const lineTable = buildLineItemsTable(currentLines, async (lineId: string) => {
        if (!confirm('Remove this line item?')) return;
        try {
          const svc = getServiceMgmtService();
          await svc.removeWorkOrderLine(lineId);
          showMsg('Line item removed.', 'success');
          await refreshLineItems();
          await refreshTotals();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          showMsg(`Remove failed: ${errMsg}`, 'error');
        }
      });

      // Add Line button
      const addLineBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]', 'Add Line');
      addLineBtn.type = 'button';
      addLineBtn.addEventListener('click', async () => {
        if (isNew) {
          showMsg('Save the work order first before adding line items.', 'info');
          return;
        }

        // Prompt for line item details
        const lineTypeInput = prompt('Line type (labor / material / other):');
        if (!lineTypeInput) return;
        const validLineTypes = ['labor', 'material', 'other'];
        const lineType = lineTypeInput.toLowerCase().trim();
        if (!validLineTypes.includes(lineType)) {
          showMsg('Invalid line type. Use: labor, material, or other.', 'error');
          return;
        }

        const lineDesc = prompt('Description:') ?? '';
        const qtyStr = prompt('Quantity:');
        if (!qtyStr) return;
        const qty = parseFloat(qtyStr);
        if (isNaN(qty) || qty <= 0) {
          showMsg('Invalid quantity.', 'error');
          return;
        }

        const priceStr = prompt('Unit Price:');
        if (!priceStr) return;
        const unitPrice = parseFloat(priceStr);
        if (isNaN(unitPrice)) {
          showMsg('Invalid unit price.', 'error');
          return;
        }

        const partNum = prompt('Part Number (leave empty to skip):') ?? '';

        try {
          const svc = getServiceMgmtService();
          await svc.addWorkOrderLine({
            workOrderId: woId!,
            type: lineType as 'labor' | 'material' | 'other',
            description: lineDesc || undefined,
            quantity: qty,
            unitPrice,
            partNumber: partNum || undefined,
          });
          showMsg('Line item added.', 'success');
          await refreshLineItems();
          await refreshTotals();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          showMsg(`Add line failed: ${errMsg}`, 'error');
        }
      });

      lineTable.appendChild(addLineBtn);
      lineItemsContainer.appendChild(lineTable);
    };

    const refreshTotals = async () => {
      totalsContainer.innerHTML = '';
      if (isNew) {
        totalsContainer.appendChild(buildTotals(0, 0, 0));
        return;
      }
      try {
        const svc = getServiceMgmtService();
        const wo = await svc.getWorkOrder(woId!);
        if (wo) {
          totalsContainer.appendChild(buildTotals(wo.laborTotal, wo.materialTotal, wo.totalAmount));
        } else {
          totalsContainer.appendChild(buildTotals(0, 0, 0));
        }
      } catch {
        totalsContainer.appendChild(buildTotals(0, 0, 0));
      }
    };

    // Initial render of empty line items + totals
    renderLineItems();
    totalsContainer.appendChild(buildTotals(0, 0, 0));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Work Order');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      try {
        const svc = getServiceMgmtService();
        const formData = {
          customerId: customerInput.value.trim(),
          number: numberInputEl.value.trim(),
          type: typeSelect.value as 'scheduled' | 'on_demand' | 'emergency' | 'callback',
          priority: prioritySelect.value as 'low' | 'medium' | 'high' | 'emergency',
          description: problemTa.value.trim() || undefined,
          assignedTo: assignedToInput.value.trim() || undefined,
          scheduledDate: scheduledDateInput.value || undefined,
          scheduledTimeSlot: timeSlotInput.value.trim() || undefined,
          customerEquipmentId: equipmentInput.value.trim() || undefined,
          problemDescription: problemTa.value.trim() || undefined,
          pricingType: pricingSelect.value as 'tm' | 'flat_rate',
          flatRateAmount: parseFloat(flatRateInput.value) || undefined,
          agreementId: agreementInput.value.trim() || undefined,
        };

        if (!formData.customerId) {
          showMsg('Customer is required.', 'error');
          return;
        }
        if (!formData.number) {
          showMsg('WO Number is required.', 'error');
          return;
        }

        if (isNew) {
          const created = await svc.createWorkOrder(formData);
          showMsg('Work order created successfully.', 'success');
          location.hash = `#/service/work-orders/${created.id}`;
        } else {
          await svc.updateWorkOrder(woId!, {
            ...formData,
            status: statusSelect.value as 'open' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'invoiced' | 'cancelled',
            resolution: resolutionTa.value.trim() || undefined,
          });
          showMsg('Work order updated successfully.', 'success');
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        showMsg(`Save failed: ${errMsg}`, 'error');
      }
    });
    btnRow.appendChild(saveBtn);

    // Complete / Cancel buttons (only for existing WOs)
    if (!isNew) {
      const completeBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Complete');
      completeBtn.type = 'button';
      completeBtn.addEventListener('click', async () => {
        const resolution = prompt('Resolution notes (optional):') ?? undefined;
        try {
          const svc = getServiceMgmtService();
          await svc.completeWorkOrder(woId!, resolution);
          showMsg('Work order completed.', 'success');
          location.hash = '#/service/work-orders';
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          showMsg(`Complete failed: ${errMsg}`, 'error');
        }
      });
      btnRow.appendChild(completeBtn);

      const cancelWoBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Cancel WO');
      cancelWoBtn.type = 'button';
      cancelWoBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this work order?')) return;
        try {
          const svc = getServiceMgmtService();
          await svc.cancelWorkOrder(woId!);
          showMsg('Work order cancelled.', 'success');
          location.hash = '#/service/work-orders';
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          showMsg(`Cancel failed: ${errMsg}`, 'error');
        }
      });
      btnRow.appendChild(cancelWoBtn);
    }

    const backBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    backBtn.href = '#/service/work-orders';
    btnRow.appendChild(backBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // If editing, load existing work order data and line items
    if (!isNew) {
      const loadingEl = el('div', 'text-center py-4 text-[var(--text-muted)]', 'Loading work order...');
      card.insertBefore(loadingEl, form);

      const svc = getServiceMgmtService();

      Promise.all([
        svc.getWorkOrder(woId!),
        svc.getWorkOrderLines(woId!),
      ]).then(([wo, rawLines]) => {
        loadingEl.remove();

        if (!wo) {
          showMsg('Work order not found.', 'error');
          location.hash = '#/service/work-orders';
          return;
        }

        // Populate form fields
        numberInputEl.value = wo.number;
        customerInput.value = wo.customerId;
        typeSelect.value = wo.type;
        statusSelect.value = wo.status;
        prioritySelect.value = wo.priority;
        pricingSelect.value = wo.pricingType;
        scheduledDateInput.value = wo.scheduledDate ?? '';
        timeSlotInput.value = wo.scheduledTimeSlot ?? '';
        assignedToInput.value = wo.assignedTo ?? '';
        equipmentInput.value = wo.customerEquipmentId ?? '';
        flatRateInput.value = String(wo.flatRateAmount);
        agreementInput.value = wo.agreementId ?? '';
        problemTa.value = wo.problemDescription ?? '';
        resolutionTa.value = wo.resolution ?? '';

        // Populate line items
        currentLines = rawLines.map(l => ({
          id: l.id,
          type: l.type,
          description: l.description ?? '',
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
          partNumber: l.partNumber ?? '',
        }));
        renderLineItems();

        // Update totals
        totalsContainer.innerHTML = '';
        totalsContainer.appendChild(buildTotals(wo.laborTotal, wo.materialTotal, wo.totalAmount));
      }).catch((err: unknown) => {
        loadingEl.remove();
        const errMsg = err instanceof Error ? err.message : String(err);
        showMsg(`Failed to load work order: ${errMsg}`, 'error');
      });
    }
  },
};

/**
 * Subcontract create/edit form view.
 * Full subcontract details with all fields for creating or editing a subcontract.
 * Wired to SubService for load, create, and update operations.
 */

import { getSubService } from '../service-accessor';

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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'complete', label: 'Complete' },
  { value: 'closed', label: 'Closed' },
  { value: 'terminated', label: 'Terminated' },
];

// ---------------------------------------------------------------------------
// Form Input Builders
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
  colSpan?: number,
): HTMLElement {
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

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
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
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getSubService();
    const editId = getIdFromHash(/\/sub\/contracts\/([^/]+)/);
    const isEdit = editId !== null;

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Subcontract' : 'New Subcontract'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Subcontracts') as HTMLAnchorElement;
    backLink.href = '#/sub/contracts';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Build all form inputs
    const numberField = textInput('number', 'e.g. SC-001');
    const statusField = selectInput('status', STATUS_OPTIONS);
    const vendorIdField = textInput('vendorId', 'Vendor ID');
    const jobIdField = textInput('jobId', 'Job ID');
    const descriptionField = textInput('description', 'Brief description');
    const entityIdField = textInput('entityId', 'Entity ID');
    const scopeField = textareaInput('scope', 4);
    const contractAmountField = numberInput('contractAmount', '0.00');
    const retentionPctField = numberInput('retentionPct', '10');
    const startDateField = dateInput('startDate');
    const endDateField = dateInput('endDate');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Subcontract Number', numberField));
    genGrid.appendChild(buildField('Status', statusField));
    genGrid.appendChild(buildField('Subcontractor (Vendor)', vendorIdField));
    genGrid.appendChild(buildField('Job', jobIdField));
    genGrid.appendChild(buildField('Entity', entityIdField));
    genGrid.appendChild(buildField('Description', descriptionField, 2));
    form.appendChild(genGrid);

    // Section: Scope of Work
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Scope of Work'));
    form.appendChild(buildField('Scope', scopeField, 2));

    // Section: Financial
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial'));
    const finGrid = el('div', 'grid grid-cols-2 gap-4');
    finGrid.appendChild(buildField('Original Contract Amount', contractAmountField));
    finGrid.appendChild(buildField('Retention %', retentionPctField));
    form.appendChild(finGrid);

    // Section: Computed summary (read-only, only when editing)
    let summaryGrid: HTMLElement | null = null;
    const readOnly = (label: string, value: string): HTMLElement => {
      const div = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
      div.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
      div.appendChild(el('div', 'text-sm font-mono font-medium text-[var(--text)]', value));
      return div;
    };

    if (isEdit) {
      summaryGrid = el('div', 'grid grid-cols-3 gap-4 mt-4');
      // Populated below after loading data
      form.appendChild(summaryGrid);
    }

    // Section: Schedule
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Schedule'));
    const schedGrid = el('div', 'grid grid-cols-2 gap-4');
    schedGrid.appendChild(buildField('Start Date', startDateField));
    schedGrid.appendChild(buildField('End Date', endDateField));
    form.appendChild(schedGrid);

    // If editing, load existing data and populate fields
    if (isEdit && editId) {
      const existing = await svc.getSubcontract(editId);
      if (!existing) {
        showMsg(wrapper, `Subcontract not found: ${editId}`, true);
      } else {
        numberField.value = existing.number;
        statusField.value = existing.status;
        vendorIdField.value = existing.vendorId;
        jobIdField.value = existing.jobId;
        descriptionField.value = existing.description ?? '';
        entityIdField.value = existing.entityId ?? '';
        scopeField.value = existing.scope ?? '';
        contractAmountField.value = existing.contractAmount.toString();
        retentionPctField.value = existing.retentionPct.toString();
        startDateField.value = existing.startDate ?? '';
        endDateField.value = existing.endDate ?? '';

        // Populate read-only summary
        if (summaryGrid) {
          summaryGrid.innerHTML = '';
          summaryGrid.appendChild(readOnly('Approved COs', fmtCurrency(existing.approvedChangeOrders)));
          summaryGrid.appendChild(readOnly('Revised Amount', fmtCurrency(existing.revisedAmount)));
          summaryGrid.appendChild(readOnly('Billed to Date', fmtCurrency(existing.billedToDate)));
          summaryGrid.appendChild(readOnly('Paid to Date', fmtCurrency(existing.paidToDate)));
          summaryGrid.appendChild(readOnly('Retainage Held', fmtCurrency(existing.retainageHeld)));
          const remaining = existing.revisedAmount - existing.billedToDate;
          summaryGrid.appendChild(readOnly('Remaining', fmtCurrency(remaining)));
        }
      }
    }

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Subcontract');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      try {
        const data = {
          number: numberField.value.trim(),
          vendorId: vendorIdField.value.trim(),
          jobId: jobIdField.value.trim(),
          description: descriptionField.value.trim(),
          scope: scopeField.value.trim(),
          contractAmount: parseFloat(contractAmountField.value) || 0,
          retentionPct: parseFloat(retentionPctField.value) || 10,
          startDate: startDateField.value || undefined,
          endDate: endDateField.value || undefined,
          entityId: entityIdField.value.trim() || undefined,
        };

        if (!data.number) {
          showMsg(wrapper, 'Subcontract number is required.', true);
          return;
        }
        if (!data.vendorId) {
          showMsg(wrapper, 'Vendor ID is required.', true);
          return;
        }
        if (!data.jobId) {
          showMsg(wrapper, 'Job ID is required.', true);
          return;
        }

        if (isEdit && editId) {
          const statusValue = statusField.value as 'draft' | 'active' | 'complete' | 'closed' | 'terminated';
          await svc.updateSubcontract(editId, {
            ...data,
            status: statusValue,
          });
          showMsg(wrapper, 'Subcontract updated successfully.', false);
        } else {
          await svc.createSubcontract(data);
          showMsg(wrapper, 'Subcontract created successfully.', false);
          setTimeout(() => {
            window.location.hash = '#/sub/contracts';
          }, 1000);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save subcontract';
        showMsg(wrapper, message, true);
      }
    });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/sub/contracts';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load subcontract form';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

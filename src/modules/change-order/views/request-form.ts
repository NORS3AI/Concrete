/**
 * Change Order Request (PCO/COR) create/edit form view.
 * Form for creating or editing a potential change order / change order request.
 * Wired to ChangeOrderService for live data.
 */

import { getChangeOrderService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'internal', label: 'Internal' },
  { value: 'field', label: 'Field' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

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
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getChangeOrderService();

    // Parse request ID from hash
    const match = location.hash.match(/#\/change-orders\/requests\/(.+)/);
    const rawId = match?.[1] ?? null;
    const editId = rawId && rawId !== 'new' ? rawId : null;
    const isEdit = editId !== null;

    // Load existing request data if editing
    let reqData: {
      id: string;
      number: string;
      title: string;
      source: string;
      status: string;
      requestedBy: string;
      requestDate: string;
      jobId: string;
      entityId: string;
      description: string;
      estimatedAmount: number;
      scheduleImpactDays: number;
    } | null = null;

    if (isEdit) {
      const req = svc.getRequest(editId);
      if (!req) {
        showMsg(wrapper, `Change order request not found: ${editId}`, true);
        return;
      }
      reqData = {
        id: req.id as string,
        number: req.number,
        title: req.title,
        source: req.source,
        status: req.status,
        requestedBy: req.requestedBy ?? '',
        requestDate: req.requestDate ?? '',
        jobId: req.jobId ?? '',
        entityId: req.entityId ?? '',
        description: req.description ?? '',
        estimatedAmount: req.estimatedAmount ?? 0,
        scheduleImpactDays: req.scheduleImpactDays ?? 0,
      };
    }

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]',
      isEdit ? `Change Order Request - ${reqData!.number}` : 'New Change Order Request'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Requests') as HTMLAnchorElement;
    backLink.href = '#/change-orders/requests';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Request Details
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Request Details'));
    const detailsGrid = el('div', 'grid grid-cols-2 gap-4');

    const numberInputEl = textInput('number', 'PCO-001');
    if (reqData) numberInputEl.value = reqData.number;
    detailsGrid.appendChild(buildField('Request Number', numberInputEl));

    const titleInput = textInput('title', 'Change order request title');
    if (reqData) titleInput.value = reqData.title;
    detailsGrid.appendChild(buildField('Title', titleInput));

    const sourceSelect = selectInput('source', SOURCE_OPTIONS);
    if (reqData) sourceSelect.value = reqData.source;
    detailsGrid.appendChild(buildField('Source', sourceSelect));

    // Status display (read-only when editing)
    if (isEdit && reqData) {
      const statusDiv = el('div', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] cursor-default');
      const statusLabel = reqData.status.charAt(0).toUpperCase() + reqData.status.slice(1);
      statusDiv.textContent = statusLabel;
      detailsGrid.appendChild(buildField('Status', statusDiv));
    } else {
      const statusDiv = el('div', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] cursor-default', 'Draft');
      detailsGrid.appendChild(buildField('Status', statusDiv));
    }

    const requestedByInput = textInput('requestedBy', 'Name');
    if (reqData) requestedByInput.value = reqData.requestedBy;
    detailsGrid.appendChild(buildField('Requested By', requestedByInput));

    const requestDateInput = dateInput('requestDate');
    if (reqData) requestDateInput.value = reqData.requestDate;
    detailsGrid.appendChild(buildField('Request Date', requestDateInput));

    const jobIdInput = textInput('jobId', 'Select job');
    if (reqData) jobIdInput.value = reqData.jobId;
    detailsGrid.appendChild(buildField('Job', jobIdInput));

    const entityIdInput = textInput('entityId', 'Select entity');
    if (reqData) entityIdInput.value = reqData.entityId;
    detailsGrid.appendChild(buildField('Entity', entityIdInput));

    form.appendChild(detailsGrid);

    // Section: Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Description'));
    const descriptionInput = textareaInput('description', 4);
    if (reqData) descriptionInput.value = reqData.description;
    form.appendChild(buildField('Description', descriptionInput, 2));

    // Section: Impact Estimate
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Impact Estimate'));
    const impactGrid = el('div', 'grid grid-cols-2 gap-4');

    const estimatedAmountInput = numberInput('estimatedAmount', '0.00');
    if (reqData) estimatedAmountInput.value = String(reqData.estimatedAmount);
    impactGrid.appendChild(buildField('Estimated Amount', estimatedAmountInput));

    const scheduleImpactInput = numberInput('scheduleImpactDays', '0');
    if (reqData) scheduleImpactInput.value = String(reqData.scheduleImpactDays);
    impactGrid.appendChild(buildField('Schedule Impact (Days)', scheduleImpactInput));

    form.appendChild(impactGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const status = reqData?.status ?? 'draft';

    // Save button (always shown for draft/pending)
    if (status === 'draft' || status === 'pending' || !isEdit) {
      const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Request');
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', async () => {
        try {
          const formData = {
            number: numberInputEl.value.trim(),
            title: titleInput.value.trim(),
            source: sourceSelect.value,
            requestedBy: requestedByInput.value.trim() || undefined,
            requestDate: requestDateInput.value || undefined,
            jobId: jobIdInput.value.trim() || undefined,
            entityId: entityIdInput.value.trim() || undefined,
            description: descriptionInput.value.trim() || undefined,
            estimatedAmount: parseFloat(estimatedAmountInput.value) || 0,
            scheduleImpactDays: parseInt(scheduleImpactInput.value, 10) || 0,
          };

          if (!formData.number) {
            showMsg(wrapper, 'Request number is required.', true);
            return;
          }
          if (!formData.title) {
            showMsg(wrapper, 'Title is required.', true);
            return;
          }

          if (isEdit) {
            svc.updateRequest(reqData!.id, formData);
            showMsg(wrapper, 'Request updated successfully.', false);
          } else {
            const created = svc.createRequest({
              ...formData,
              jobId: formData.jobId ?? '',
            });
            window.location.hash = `#/change-orders/requests/${created.id}`;
            showMsg(wrapper, 'Request created successfully.', false);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save request';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(saveBtn);
    }

    // Submit for Review (editing draft only)
    if (isEdit && status === 'draft') {
      const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Submit for Review');
      submitBtn.type = 'button';
      submitBtn.addEventListener('click', async () => {
        try {
          svc.submitRequest(reqData!.id);
          showMsg(wrapper, 'Request submitted for review.', false);
          setTimeout(() => { window.location.hash = '#/change-orders/requests'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to submit request';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(submitBtn);
    }

    // Withdraw button (for pending/draft requests that exist)
    if (isEdit && (status === 'draft' || status === 'pending')) {
      const withdrawBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Withdraw');
      withdrawBtn.type = 'button';
      withdrawBtn.addEventListener('click', async () => {
        const reason = prompt('Reason for withdrawal (optional):');
        try {
          svc.withdrawRequest(reqData!.id, reason ?? undefined);
          showMsg(wrapper, 'Request withdrawn.', false);
          setTimeout(() => { window.location.hash = '#/change-orders/requests'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to withdraw request';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(withdrawBtn);
    }

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/change-orders/requests';
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

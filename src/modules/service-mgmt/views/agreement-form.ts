/**
 * Service Agreement create/edit form view.
 * Full agreement details with customer, type, SLA, billing, and covered equipment.
 * Integrates with ServiceMgmtService for CRUD operations.
 */

import { getServiceMgmtService } from '../service-accessor';

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
  { value: 'full_service', label: 'Full Service' },
  { value: 'preventive', label: 'Preventive Only' },
  { value: 'on_call', label: 'On Call' },
  { value: 'warranty', label: 'Warranty' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // Parse ID from hash
    const match = location.hash.match(/#\/service\/agreements\/(.+)/);
    const agreementId = match?.[1];
    const isNew = !agreementId || agreementId === 'new';

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isNew ? 'New Service Agreement' : 'Edit Service Agreement'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Agreements') as HTMLAnchorElement;
    backLink.href = '#/service/agreements';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Agreement Details
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Agreement Details'));
    const detailsGrid = el('div', 'grid grid-cols-2 gap-4');

    const nameInput = textInput('name', 'Enter agreement name');
    detailsGrid.appendChild(buildField('Agreement Name', nameInput));

    const customerInput = textInput('customerId', 'Customer ID');
    detailsGrid.appendChild(buildField('Customer', customerInput));

    const typeSelect = selectInput('type', TYPE_OPTIONS);
    detailsGrid.appendChild(buildField('Type', typeSelect));

    const statusSelect = selectInput('status', STATUS_OPTIONS);
    detailsGrid.appendChild(buildField('Status', statusSelect));

    const startDateInput = dateInput('startDate');
    detailsGrid.appendChild(buildField('Start Date', startDateInput));

    const endDateInput = dateInput('endDate');
    detailsGrid.appendChild(buildField('End Date', endDateInput));

    const renewalDateInput = dateInput('renewalDate');
    detailsGrid.appendChild(buildField('Renewal Date', renewalDateInput));

    const slaInput = textInput('responseTimeSla', 'e.g., 4 hours');
    detailsGrid.appendChild(buildField('Response Time SLA', slaInput));

    form.appendChild(detailsGrid);

    // Section: Billing
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Billing'));
    const billingGrid = el('div', 'grid grid-cols-2 gap-4');

    const amountInput = numberInput('recurringAmount', '0.00');
    billingGrid.appendChild(buildField('Recurring Amount', amountInput));

    const billingSelect = selectInput('billingFrequency', BILLING_OPTIONS);
    billingGrid.appendChild(buildField('Billing Frequency', billingSelect));

    form.appendChild(billingGrid);

    // Section: Coverage & Terms
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Coverage & Terms'));

    const equipmentTa = textareaInput('coveredEquipment', 3);
    form.appendChild(buildField('Covered Equipment', equipmentTa, 2));

    const termsTa = textareaInput('terms', 3);
    form.appendChild(buildField('Terms', termsTa, 2));

    const descriptionTa = textareaInput('description', 3);
    form.appendChild(buildField('Description', descriptionTa, 2));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Agreement');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      try {
        const svc = getServiceMgmtService();
        const formData = {
          customerId: customerInput.value.trim(),
          name: nameInput.value.trim(),
          type: typeSelect.value as 'full_service' | 'preventive' | 'on_call' | 'warranty',
          description: descriptionTa.value.trim() || undefined,
          startDate: startDateInput.value,
          endDate: endDateInput.value || undefined,
          renewalDate: renewalDateInput.value || undefined,
          recurringAmount: parseFloat(amountInput.value) || 0,
          billingFrequency: billingSelect.value as 'monthly' | 'quarterly' | 'annually' | undefined,
          terms: termsTa.value.trim() || undefined,
          coveredEquipment: equipmentTa.value.trim() || undefined,
          responseTimeSla: slaInput.value.trim() || undefined,
        };

        if (!formData.customerId) {
          showMsg('Customer is required.', 'error');
          return;
        }
        if (!formData.name) {
          showMsg('Agreement name is required.', 'error');
          return;
        }
        if (!formData.startDate) {
          showMsg('Start date is required.', 'error');
          return;
        }

        if (isNew) {
          await svc.createAgreement(formData);
          showMsg('Agreement created successfully.', 'success');
        } else {
          await svc.updateAgreement(agreementId!, {
            ...formData,
            status: statusSelect.value as 'active' | 'pending' | 'expired' | 'cancelled',
          });
          showMsg('Agreement updated successfully.', 'success');
        }

        location.hash = '#/service/agreements';
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        showMsg(`Save failed: ${errMsg}`, 'error');
      }
    });
    btnRow.appendChild(saveBtn);

    // Renew button (only visible for existing agreements)
    if (!isNew) {
      const renewBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Renew');
      renewBtn.type = 'button';
      renewBtn.addEventListener('click', async () => {
        try {
          const svc = getServiceMgmtService();

          const newStartDate = prompt('New start date (YYYY-MM-DD):');
          if (!newStartDate) return;

          const newEndDate = prompt('New end date (YYYY-MM-DD):');
          if (!newEndDate) return;

          const newRenewalDate = prompt('New renewal date (YYYY-MM-DD, leave empty to skip):') || undefined;

          const newAmountStr = prompt('New recurring amount (leave empty to keep current):');
          const newAmount = newAmountStr ? parseFloat(newAmountStr) : undefined;

          await svc.renewAgreement(agreementId!, newStartDate, newEndDate, newRenewalDate);

          if (newAmount !== undefined && !isNaN(newAmount)) {
            await svc.updateAgreement(agreementId!, { recurringAmount: newAmount });
          }

          showMsg('Agreement renewed successfully.', 'success');
          location.hash = '#/service/agreements';
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          showMsg(`Renew failed: ${errMsg}`, 'error');
        }
      });
      btnRow.appendChild(renewBtn);

      // Cancel Agreement button (for active/pending agreements)
      const cancelAgreementBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Cancel Agreement');
      cancelAgreementBtn.type = 'button';
      cancelAgreementBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this agreement?')) return;
        try {
          const svc = getServiceMgmtService();
          await svc.cancelAgreement(agreementId!);
          showMsg('Agreement cancelled.', 'success');
          location.hash = '#/service/agreements';
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          showMsg(`Cancel failed: ${errMsg}`, 'error');
        }
      });
      btnRow.appendChild(cancelAgreementBtn);
    }

    const backBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    backBtn.href = '#/service/agreements';
    btnRow.appendChild(backBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // If editing, load existing agreement data
    if (!isNew) {
      const loadingEl = el('div', 'text-center py-4 text-[var(--text-muted)]', 'Loading agreement...');
      card.insertBefore(loadingEl, form);

      const svc = getServiceMgmtService();
      svc.getAgreement(agreementId!).then((agreement) => {
        loadingEl.remove();

        if (!agreement) {
          showMsg('Agreement not found.', 'error');
          location.hash = '#/service/agreements';
          return;
        }

        // Populate form fields
        nameInput.value = agreement.name;
        customerInput.value = agreement.customerId;
        typeSelect.value = agreement.type;
        statusSelect.value = agreement.status;
        startDateInput.value = agreement.startDate;
        endDateInput.value = agreement.endDate ?? '';
        renewalDateInput.value = agreement.renewalDate ?? '';
        slaInput.value = agreement.responseTimeSla ?? '';
        amountInput.value = String(agreement.recurringAmount);
        billingSelect.value = agreement.billingFrequency ?? 'monthly';
        equipmentTa.value = agreement.coveredEquipment ?? '';
        termsTa.value = agreement.terms ?? '';
        descriptionTa.value = agreement.description ?? '';
      }).catch((err: unknown) => {
        loadingEl.remove();
        const errMsg = err instanceof Error ? err.message : String(err);
        showMsg(`Failed to load agreement: ${errMsg}`, 'error');
      });
    }
  },
};

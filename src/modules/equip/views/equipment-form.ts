/**
 * Equipment create/edit form view.
 * Full equipment details with all fields for creating or editing equipment.
 * Includes rate table management when editing.
 * Wired to EquipService for CRUD operations.
 */

import { getEquipService } from '../service-accessor';

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

const CATEGORY_OPTIONS = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rented', label: 'Rented' },
  { value: 'idle', label: 'Idle' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disposed', label: 'Disposed' },
];

const DEPRECIATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'straight_line', label: 'Straight Line' },
  { value: 'macrs', label: 'MACRS' },
  { value: 'declining_balance', label: 'Declining Balance' },
];

const METER_UNIT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'hours', label: 'Hours' },
  { value: 'miles', label: 'Miles' },
];

// ---------------------------------------------------------------------------
// Form Builder Helpers
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

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const editId = getIdFromHash(/equipment\/(.+)/);
    const isEdit = editId !== null;

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Equipment' : 'New Equipment'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Equipment') as HTMLAnchorElement;
    backLink.href = '#/equipment';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Form card
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // --- Section: General Information ---
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');

    const fEquipmentNumber = textInput('equipmentNumber', 'e.g. EQ-001');
    const fDescription = textInput('description', 'Equipment description');
    const fYear = numberInput('year', 'e.g. 2024');
    const fMake = textInput('make', 'Manufacturer');
    const fModel = textInput('model', 'Model name');
    const fSerialNumber = textInput('serialNumber', 'Serial number');
    const fVin = textInput('vin', 'Vehicle identification number');
    const fLicensePlate = textInput('licensePlate', 'License plate');
    const fCategory = selectInput('category', CATEGORY_OPTIONS);
    const fStatus = selectInput('status', STATUS_OPTIONS);

    genGrid.appendChild(buildField('Equipment Number', fEquipmentNumber));
    genGrid.appendChild(buildField('Description', fDescription));
    genGrid.appendChild(buildField('Category', fCategory));
    genGrid.appendChild(buildField('Status', fStatus));
    genGrid.appendChild(buildField('Year', fYear));
    genGrid.appendChild(buildField('Make', fMake));
    genGrid.appendChild(buildField('Model', fModel));
    genGrid.appendChild(buildField('Serial Number', fSerialNumber));
    genGrid.appendChild(buildField('VIN', fVin));
    genGrid.appendChild(buildField('License Plate', fLicensePlate));
    form.appendChild(genGrid);

    // --- Section: Financial Information ---
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial Information'));
    const finGrid = el('div', 'grid grid-cols-2 gap-4');

    const fPurchaseDate = dateInput('purchaseDate');
    const fPurchasePrice = numberInput('purchasePrice', '0.00');
    const fCurrentValue = numberInput('currentValue', '0.00');
    const fSalvageValue = numberInput('salvageValue', '0.00');
    const fUsefulLifeMonths = numberInput('usefulLifeMonths', '60');
    const fDepreciationMethod = selectInput('depreciationMethod', DEPRECIATION_OPTIONS);

    finGrid.appendChild(buildField('Purchase Date', fPurchaseDate));
    finGrid.appendChild(buildField('Purchase Price', fPurchasePrice));
    finGrid.appendChild(buildField('Current Value', fCurrentValue));
    finGrid.appendChild(buildField('Salvage Value', fSalvageValue));
    finGrid.appendChild(buildField('Useful Life (Months)', fUsefulLifeMonths));
    finGrid.appendChild(buildField('Depreciation Method', fDepreciationMethod));
    form.appendChild(finGrid);

    // --- Section: Meter & Location ---
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Meter & Location'));
    const meterGrid = el('div', 'grid grid-cols-2 gap-4');

    const fMeterReading = numberInput('meterReading', '0');
    const fMeterUnit = selectInput('meterUnit', METER_UNIT_OPTIONS);
    const fLocationDescription = textareaInput('locationDescription', 2);

    meterGrid.appendChild(buildField('Meter Reading', fMeterReading));
    meterGrid.appendChild(buildField('Meter Unit', fMeterUnit));
    meterGrid.appendChild(buildField('Location Description', fLocationDescription, 2));
    form.appendChild(meterGrid);

    // --- Section: Assignment ---
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Assignment'));
    const assignGrid = el('div', 'grid grid-cols-2 gap-4');

    const fAssignedJobId = textInput('assignedJobId', 'Job ID');
    const fEntityId = textInput('entityId', 'Entity ID');

    assignGrid.appendChild(buildField('Assigned Job', fAssignedJobId));
    assignGrid.appendChild(buildField('Entity', fEntityId));
    form.appendChild(assignGrid);

    // --- Action buttons ---
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Equipment');
    saveBtn.type = 'button';
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/equipment';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);

    // Rate tables section (only shown in edit mode)
    const rateSection = el('div', 'mt-6');
    wrapper.appendChild(rateSection);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Helper to collect form data
    // -----------------------------------------------------------------------

    function collectFormData(): Record<string, unknown> {
      const data: Record<string, unknown> = {
        equipmentNumber: fEquipmentNumber.value.trim(),
        description: fDescription.value.trim(),
        category: fCategory.value,
        status: fStatus.value,
      };
      if (fYear.value) data.year = parseInt(fYear.value, 10);
      if (fMake.value.trim()) data.make = fMake.value.trim();
      if (fModel.value.trim()) data.model = fModel.value.trim();
      if (fSerialNumber.value.trim()) data.serialNumber = fSerialNumber.value.trim();
      if (fVin.value.trim()) data.vin = fVin.value.trim();
      if (fLicensePlate.value.trim()) data.licensePlate = fLicensePlate.value.trim();
      if (fEntityId.value.trim()) data.entityId = fEntityId.value.trim();
      if (fPurchaseDate.value) data.purchaseDate = fPurchaseDate.value;
      if (fPurchasePrice.value) data.purchasePrice = parseFloat(fPurchasePrice.value);
      if (fCurrentValue.value) data.currentValue = parseFloat(fCurrentValue.value);
      if (fSalvageValue.value) data.salvageValue = parseFloat(fSalvageValue.value);
      if (fUsefulLifeMonths.value) data.usefulLifeMonths = parseInt(fUsefulLifeMonths.value, 10);
      if (fDepreciationMethod.value) data.depreciationMethod = fDepreciationMethod.value;
      if (fAssignedJobId.value.trim()) data.assignedJobId = fAssignedJobId.value.trim();
      if (fMeterReading.value) data.meterReading = parseFloat(fMeterReading.value);
      if (fMeterUnit.value) data.meterUnit = fMeterUnit.value;
      if (fLocationDescription.value.trim()) data.locationDescription = fLocationDescription.value.trim();
      return data;
    }

    // -----------------------------------------------------------------------
    // Helper to populate form from existing data
    // -----------------------------------------------------------------------

    function populateForm(eq: Record<string, unknown>): void {
      fEquipmentNumber.value = (eq.equipmentNumber as string) ?? '';
      fDescription.value = (eq.description as string) ?? '';
      fCategory.value = (eq.category as string) ?? 'owned';
      fStatus.value = (eq.status as string) ?? 'active';
      fYear.value = eq.year != null ? String(eq.year) : '';
      fMake.value = (eq.make as string) ?? '';
      fModel.value = (eq.model as string) ?? '';
      fSerialNumber.value = (eq.serialNumber as string) ?? '';
      fVin.value = (eq.vin as string) ?? '';
      fLicensePlate.value = (eq.licensePlate as string) ?? '';
      fEntityId.value = (eq.entityId as string) ?? '';
      fPurchaseDate.value = (eq.purchaseDate as string) ?? '';
      fPurchasePrice.value = eq.purchasePrice != null ? String(eq.purchasePrice) : '';
      fCurrentValue.value = eq.currentValue != null ? String(eq.currentValue) : '';
      fSalvageValue.value = eq.salvageValue != null ? String(eq.salvageValue) : '';
      fUsefulLifeMonths.value = eq.usefulLifeMonths != null ? String(eq.usefulLifeMonths) : '';
      fDepreciationMethod.value = (eq.depreciationMethod as string) ?? '';
      fAssignedJobId.value = (eq.assignedJobId as string) ?? '';
      fMeterReading.value = eq.meterReading != null ? String(eq.meterReading) : '';
      fMeterUnit.value = (eq.meterUnit as string) ?? '';
      fLocationDescription.value = (eq.locationDescription as string) ?? '';
    }

    // -----------------------------------------------------------------------
    // Rate tables rendering (edit mode only)
    // -----------------------------------------------------------------------

    async function loadRateTables(equipmentId: string): Promise<void> {
      try {
        const svc = getEquipService();
        const rates = await svc.getRateTables(equipmentId);

        rateSection.innerHTML = '';
        const rateCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
        rateCard.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Rate Tables'));

        // Inline add form
        const addForm = el('div', 'grid grid-cols-4 gap-3 mb-4 p-4 bg-[var(--surface)] rounded-md border border-[var(--border)]');
        const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

        const rtEffectiveDate = el('input', inputCls) as HTMLInputElement;
        rtEffectiveDate.type = 'date';
        rtEffectiveDate.placeholder = 'Effective Date';
        addForm.appendChild(buildField('Effective Date', rtEffectiveDate));

        const rtHourlyRate = el('input', inputCls) as HTMLInputElement;
        rtHourlyRate.type = 'number';
        rtHourlyRate.step = '0.01';
        rtHourlyRate.placeholder = '0.00';
        addForm.appendChild(buildField('Hourly Rate', rtHourlyRate));

        const rtDailyRate = el('input', inputCls) as HTMLInputElement;
        rtDailyRate.type = 'number';
        rtDailyRate.step = '0.01';
        rtDailyRate.placeholder = '0.00';
        addForm.appendChild(buildField('Daily Rate', rtDailyRate));

        const rtWeeklyRate = el('input', inputCls) as HTMLInputElement;
        rtWeeklyRate.type = 'number';
        rtWeeklyRate.step = '0.01';
        rtWeeklyRate.placeholder = '0.00';
        addForm.appendChild(buildField('Weekly Rate', rtWeeklyRate));

        const rtMonthlyRate = el('input', inputCls) as HTMLInputElement;
        rtMonthlyRate.type = 'number';
        rtMonthlyRate.step = '0.01';
        rtMonthlyRate.placeholder = '0.00';
        addForm.appendChild(buildField('Monthly Rate', rtMonthlyRate));

        const rtFhwaRate = el('input', inputCls) as HTMLInputElement;
        rtFhwaRate.type = 'number';
        rtFhwaRate.step = '0.01';
        rtFhwaRate.placeholder = '0.00';
        addForm.appendChild(buildField('FHWA Rate', rtFhwaRate));

        const operatorGroup = el('div');
        const rtOperatorIncluded = el('input') as HTMLInputElement;
        rtOperatorIncluded.type = 'checkbox';
        rtOperatorIncluded.className = 'mr-2';
        const opLabel = el('label', 'text-sm text-[var(--text)]', 'Operator Included');
        opLabel.prepend(rtOperatorIncluded);
        operatorGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', '\u00A0'));
        operatorGroup.appendChild(opLabel);
        addForm.appendChild(operatorGroup);

        const rtNotes = el('input', inputCls) as HTMLInputElement;
        rtNotes.type = 'text';
        rtNotes.placeholder = 'Notes';
        addForm.appendChild(buildField('Notes', rtNotes));

        const addBtnWrap = el('div', 'col-span-4');
        const addRateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Rate');
        addRateBtn.type = 'button';
        addRateBtn.addEventListener('click', () => {
          void (async () => {
            try {
              if (!rtEffectiveDate.value) {
                showMsg(wrapper, 'Effective date is required.', true);
                return;
              }
              const rateData: Record<string, unknown> = {
                equipmentId,
                effectiveDate: rtEffectiveDate.value,
                operatorIncluded: rtOperatorIncluded.checked,
              };
              if (rtHourlyRate.value) rateData.hourlyRate = parseFloat(rtHourlyRate.value);
              if (rtDailyRate.value) rateData.dailyRate = parseFloat(rtDailyRate.value);
              if (rtWeeklyRate.value) rateData.weeklyRate = parseFloat(rtWeeklyRate.value);
              if (rtMonthlyRate.value) rateData.monthlyRate = parseFloat(rtMonthlyRate.value);
              if (rtFhwaRate.value) rateData.fhwaRate = parseFloat(rtFhwaRate.value);
              if (rtNotes.value.trim()) rateData.notes = rtNotes.value.trim();

              await svc.createRateTable(rateData as Parameters<typeof svc.createRateTable>[0]);
              showMsg(wrapper, 'Rate table entry added.', false);
              await loadRateTables(equipmentId);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to add rate table entry';
              showMsg(wrapper, message, true);
            }
          })();
        });
        addBtnWrap.appendChild(addRateBtn);
        addForm.appendChild(addBtnWrap);

        rateCard.appendChild(addForm);

        // Existing rate tables list
        if (rates.length > 0) {
          const tableWrap = el('div', 'overflow-hidden rounded-md border border-[var(--border)]');
          const table = el('table', 'w-full text-sm');

          const thead = el('thead');
          const headRow = el('tr', 'border-b border-[var(--border)]');
          for (const col of ['Effective Date', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'FHWA', 'Operator Incl.', 'Notes']) {
            headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
          }
          thead.appendChild(headRow);
          table.appendChild(thead);

          const tbody = el('tbody');
          for (const rate of rates) {
            const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', rate.effectiveDate));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', rate.hourlyRate != null ? fmtCurrency(rate.hourlyRate) : ''));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', rate.dailyRate != null ? fmtCurrency(rate.dailyRate) : ''));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', rate.weeklyRate != null ? fmtCurrency(rate.weeklyRate) : ''));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', rate.monthlyRate != null ? fmtCurrency(rate.monthlyRate) : ''));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', rate.fhwaRate != null ? fmtCurrency(rate.fhwaRate) : ''));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', rate.operatorIncluded ? 'Yes' : 'No'));
            tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', rate.notes ?? ''));

            tbody.appendChild(tr);
          }

          table.appendChild(tbody);
          tableWrap.appendChild(table);
          rateCard.appendChild(tableWrap);
        } else {
          rateCard.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No rate tables defined yet.'));
        }

        rateSection.appendChild(rateCard);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load rate tables';
        showMsg(wrapper, message, true);
      }
    }

    // -----------------------------------------------------------------------
    // Save handler
    // -----------------------------------------------------------------------

    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getEquipService();
          const data = collectFormData();

          if (!data.equipmentNumber) {
            showMsg(wrapper, 'Equipment Number is required.', true);
            return;
          }
          if (!data.description) {
            showMsg(wrapper, 'Description is required.', true);
            return;
          }

          if (isEdit && editId) {
            await svc.updateEquipment(editId, data as Parameters<typeof svc.updateEquipment>[1]);
            showMsg(wrapper, 'Equipment updated successfully.', false);
          } else {
            const created = await svc.createEquipment(data as Parameters<typeof svc.createEquipment>[0]);
            showMsg(wrapper, 'Equipment created successfully.', false);
            // Navigate to edit mode for the new equipment
            window.location.hash = `#/equipment/${created.id}`;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save equipment';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // -----------------------------------------------------------------------
    // Load existing data if editing
    // -----------------------------------------------------------------------

    if (isEdit && editId) {
      void (async () => {
        try {
          const svc = getEquipService();
          const equipment = await svc.getEquipment(editId);
          if (!equipment) {
            showMsg(wrapper, 'Equipment not found.', true);
            return;
          }
          populateForm(equipment as unknown as Record<string, unknown>);
          await loadRateTables(editId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load equipment';
          showMsg(wrapper, message, true);
        }
      })();
    }
  },
};

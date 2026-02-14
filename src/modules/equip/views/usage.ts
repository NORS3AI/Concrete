/**
 * Equipment Usage Log view.
 * Displays equipment usage records with filtering by equipment, job, and date range.
 * Supports logging new usage and posting usage records to jobs.
 * Wired to EquipService for data and posting operations.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSTED_OPTIONS = [
  { value: '', label: 'All Records' },
  { value: 'true', label: 'Posted' },
  { value: 'false', label: 'Unposted' },
];

const POSTED_BADGE: Record<string, string> = {
  true: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  false: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // In-memory equipment ID -> number cache
    const equipCache = new Map<string, string>();

    // Track selected unposted IDs for bulk posting
    const selectedIds = new Set<string>();

    // Header row
    const headerRow = el('div', 'flex items-center gap-3 justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Usage'));
    const headerBtns = el('div', 'flex items-center gap-3');

    const logUsageBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Log Usage');
    headerBtns.appendChild(logUsageBtn);

    const postSelectedBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Post Selected');
    headerBtns.appendChild(postSelectedBtn);

    headerRow.appendChild(headerBtns);
    wrapper.appendChild(headerRow);

    // -----------------------------------------------------------------------
    // Inline Log Usage form (hidden by default)
    // -----------------------------------------------------------------------

    const logForm = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4 hidden');
    logForm.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Log New Usage'));

    const logGrid = el('div', 'grid grid-cols-4 gap-3');
    const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    // Equipment select (populated async)
    const logEquipSelect = el('select', inputCls) as HTMLSelectElement;
    logEquipSelect.appendChild(el('option', '', 'Select equipment...') as HTMLOptionElement);

    const logEquipGroup = el('div');
    logEquipGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Equipment'));
    logEquipGroup.appendChild(logEquipSelect);
    logGrid.appendChild(logEquipGroup);

    const logJobId = el('input', inputCls) as HTMLInputElement;
    logJobId.type = 'text';
    logJobId.placeholder = 'Job ID';
    const logJobGroup = el('div');
    logJobGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Job ID'));
    logJobGroup.appendChild(logJobId);
    logGrid.appendChild(logJobGroup);

    const logCostCode = el('input', inputCls) as HTMLInputElement;
    logCostCode.type = 'text';
    logCostCode.placeholder = 'Cost Code';
    const logCostGroup = el('div');
    logCostGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Cost Code'));
    logCostGroup.appendChild(logCostCode);
    logGrid.appendChild(logCostGroup);

    const logDate = el('input', inputCls) as HTMLInputElement;
    logDate.type = 'date';
    logDate.value = new Date().toISOString().split('T')[0];
    const logDateGroup = el('div');
    logDateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date'));
    logDateGroup.appendChild(logDate);
    logGrid.appendChild(logDateGroup);

    const logHours = el('input', inputCls) as HTMLInputElement;
    logHours.type = 'number';
    logHours.step = '0.01';
    logHours.placeholder = '0';
    const logHoursGroup = el('div');
    logHoursGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Hours'));
    logHoursGroup.appendChild(logHours);
    logGrid.appendChild(logHoursGroup);

    const logDays = el('input', inputCls) as HTMLInputElement;
    logDays.type = 'number';
    logDays.step = '0.01';
    logDays.placeholder = '0';
    const logDaysGroup = el('div');
    logDaysGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Days'));
    logDaysGroup.appendChild(logDays);
    logGrid.appendChild(logDaysGroup);

    const logRate = el('input', inputCls) as HTMLInputElement;
    logRate.type = 'number';
    logRate.step = '0.01';
    logRate.placeholder = '0.00';
    const logRateGroup = el('div');
    logRateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Rate'));
    logRateGroup.appendChild(logRate);
    logGrid.appendChild(logRateGroup);

    const logAmount = el('input', inputCls) as HTMLInputElement;
    logAmount.type = 'number';
    logAmount.step = '0.01';
    logAmount.placeholder = 'Auto-calculated';
    const logAmountGroup = el('div');
    logAmountGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Amount (optional)'));
    logAmountGroup.appendChild(logAmount);
    logGrid.appendChild(logAmountGroup);

    const logOperatorId = el('input', inputCls) as HTMLInputElement;
    logOperatorId.type = 'text';
    logOperatorId.placeholder = 'Operator ID';
    const logOperatorGroup = el('div');
    logOperatorGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Operator'));
    logOperatorGroup.appendChild(logOperatorId);
    logGrid.appendChild(logOperatorGroup);

    const logDescription = el('input', inputCls) as HTMLInputElement;
    logDescription.type = 'text';
    logDescription.placeholder = 'Description';
    const logDescGroup = el('div');
    logDescGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    logDescGroup.appendChild(logDescription);
    logGrid.appendChild(logDescGroup);

    logForm.appendChild(logGrid);

    const logBtnRow = el('div', 'flex items-center gap-3 mt-3');
    const saveLogBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveLogBtn.type = 'button';
    logBtnRow.appendChild(saveLogBtn);
    const cancelLogBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel');
    cancelLogBtn.type = 'button';
    logBtnRow.appendChild(cancelLogBtn);
    logForm.appendChild(logBtnRow);

    wrapper.appendChild(logForm);

    // Toggle log form visibility
    logUsageBtn.addEventListener('click', () => {
      logForm.classList.toggle('hidden');
    });
    cancelLogBtn.addEventListener('click', () => {
      logForm.classList.add('hidden');
    });

    // -----------------------------------------------------------------------
    // Filter bar
    // -----------------------------------------------------------------------

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const equipFilterSelect = el('select', inputCls) as HTMLSelectElement;
    const allEquipOpt = el('option', '', 'All Equipment') as HTMLOptionElement;
    allEquipOpt.value = '';
    equipFilterSelect.appendChild(allEquipOpt);
    filterBar.appendChild(equipFilterSelect);

    const postedSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of POSTED_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      postedSelect.appendChild(o);
    }
    filterBar.appendChild(postedSelect);

    const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
    filterBar.appendChild(fromLabel);
    const fromDate = el('input', inputCls) as HTMLInputElement;
    fromDate.type = 'date';
    filterBar.appendChild(fromDate);

    const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
    filterBar.appendChild(toLabel);
    const toDate = el('input', inputCls) as HTMLInputElement;
    toDate.type = 'date';
    filterBar.appendChild(toDate);

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search usage records...';
    filterBar.appendChild(searchInput);

    wrapper.appendChild(filterBar);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Resolve equipment ID -> number
    // -----------------------------------------------------------------------

    function resolveEquipNumber(equipmentId: string): string {
      return equipCache.get(equipmentId) ?? equipmentId;
    }

    // -----------------------------------------------------------------------
    // Load equipment list (for selects and cache)
    // -----------------------------------------------------------------------

    async function loadEquipmentOptions(): Promise<void> {
      try {
        const svc = getEquipService();
        const equipList = await svc.getEquipmentList();

        equipCache.clear();
        for (const eq of equipList) {
          equipCache.set(eq.id, eq.equipmentNumber);
        }

        // Populate filter select
        while (equipFilterSelect.options.length > 1) {
          equipFilterSelect.remove(1);
        }
        for (const eq of equipList) {
          const o = el('option', '', `${eq.equipmentNumber} - ${eq.description}`) as HTMLOptionElement;
          o.value = eq.id;
          equipFilterSelect.appendChild(o);
        }

        // Populate log form select
        while (logEquipSelect.options.length > 1) {
          logEquipSelect.remove(1);
        }
        for (const eq of equipList) {
          const o = el('option', '', `${eq.equipmentNumber} - ${eq.description}`) as HTMLOptionElement;
          o.value = eq.id;
          logEquipSelect.appendChild(o);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load equipment list';
        showMsg(wrapper, message, true);
      }
    }

    // -----------------------------------------------------------------------
    // Load and render usage records
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const svc = getEquipService();
        selectedIds.clear();

        // Build service-level filters
        const filters: {
          equipmentId?: string;
          posted?: boolean;
          dateFrom?: string;
          dateTo?: string;
        } = {};

        if (equipFilterSelect.value) {
          filters.equipmentId = equipFilterSelect.value;
        }
        if (postedSelect.value === 'true') {
          filters.posted = true;
        } else if (postedSelect.value === 'false') {
          filters.posted = false;
        }
        if (fromDate.value) {
          filters.dateFrom = fromDate.value;
        }
        if (toDate.value) {
          filters.dateTo = toDate.value;
        }

        let records = await svc.getUsageRecords(filters);

        // Client-side search filter
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          records = records.filter((r) => {
            const searchable = [
              resolveEquipNumber(r.equipmentId),
              r.jobId ?? '',
              r.operatorId ?? '',
              r.description ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(query);
          });
        }

        // Build the table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Table header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['', 'Equip #', 'Job ID', 'Date', 'Hours', 'Days', 'Rate', 'Amount', 'Operator', 'Posted']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (records.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No usage records found. Log equipment usage to get started.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const record of records) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

          // Checkbox for post selection (only for unposted)
          const tdCheck = el('td', 'px-4 py-3 text-sm');
          if (!record.posted) {
            const checkbox = el('input') as HTMLInputElement;
            checkbox.type = 'checkbox';
            checkbox.addEventListener('change', () => {
              if (checkbox.checked) {
                selectedIds.add(record.id);
              } else {
                selectedIds.delete(record.id);
              }
            });
            tdCheck.appendChild(checkbox);
          }
          tr.appendChild(tdCheck);

          // Equip #
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', resolveEquipNumber(record.equipmentId)));

          // Job ID
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', record.jobId ?? ''));

          // Date
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', record.date));

          // Hours
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', record.hours ? String(record.hours) : ''));

          // Days
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', record.days ? String(record.days) : ''));

          // Rate
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', record.rate != null ? fmtCurrency(record.rate) : ''));

          // Amount
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono font-medium', fmtCurrency(record.amount)));

          // Operator
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', record.operatorId ?? ''));

          // Posted badge
          const tdPosted = el('td', 'px-4 py-3 text-sm');
          const postedBadge = el('span',
            `px-2 py-1 rounded-full text-xs font-medium ${POSTED_BADGE[String(record.posted)] ?? POSTED_BADGE.false}`,
            record.posted ? 'Yes' : 'No');
          tdPosted.appendChild(postedBadge);
          tr.appendChild(tdPosted);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load usage records';
        showMsg(wrapper, message, true);
      }
    }

    // -----------------------------------------------------------------------
    // Post Selected handler
    // -----------------------------------------------------------------------

    postSelectedBtn.addEventListener('click', () => {
      if (selectedIds.size === 0) {
        showMsg(wrapper, 'No records selected for posting.', true);
        return;
      }
      void (async () => {
        try {
          const svc = getEquipService();
          const ids = Array.from(selectedIds);
          const posted = await svc.postUsage(ids);
          showMsg(wrapper, `${posted.length} usage record(s) posted successfully.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to post usage records';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // -----------------------------------------------------------------------
    // Save log usage handler
    // -----------------------------------------------------------------------

    saveLogBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getEquipService();

          const equipmentId = logEquipSelect.value;
          if (!equipmentId) {
            showMsg(wrapper, 'Please select equipment.', true);
            return;
          }
          if (!logDate.value) {
            showMsg(wrapper, 'Date is required.', true);
            return;
          }

          const data: Record<string, unknown> = {
            equipmentId,
            date: logDate.value,
          };
          if (logJobId.value.trim()) data.jobId = logJobId.value.trim();
          if (logCostCode.value.trim()) data.costCodeId = logCostCode.value.trim();
          if (logHours.value) data.hours = parseFloat(logHours.value);
          if (logDays.value) data.days = parseFloat(logDays.value);
          if (logRate.value) data.rate = parseFloat(logRate.value);
          if (logAmount.value) data.amount = parseFloat(logAmount.value);
          if (logOperatorId.value.trim()) data.operatorId = logOperatorId.value.trim();
          if (logDescription.value.trim()) data.description = logDescription.value.trim();

          await svc.logUsage(data as Parameters<typeof svc.logUsage>[0]);
          showMsg(wrapper, 'Usage record logged successfully.', false);

          // Reset log form fields
          logEquipSelect.value = '';
          logJobId.value = '';
          logCostCode.value = '';
          logDate.value = new Date().toISOString().split('T')[0];
          logHours.value = '';
          logDays.value = '';
          logRate.value = '';
          logAmount.value = '';
          logOperatorId.value = '';
          logDescription.value = '';
          logForm.classList.add('hidden');

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to log usage';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // -----------------------------------------------------------------------
    // Wire up filter events
    // -----------------------------------------------------------------------

    equipFilterSelect.addEventListener('change', () => void loadAndRender());
    postedSelect.addEventListener('change', () => void loadAndRender());
    fromDate.addEventListener('change', () => void loadAndRender());
    toDate.addEventListener('change', () => void loadAndRender());
    searchInput.addEventListener('input', () => void loadAndRender());

    // -----------------------------------------------------------------------
    // Initial load
    // -----------------------------------------------------------------------

    void (async () => {
      try {
        await loadEquipmentOptions();
        await loadAndRender();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to initialize usage view';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

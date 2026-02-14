/**
 * Equipment Fuel Logs view.
 * Displays fuel consumption records with filtering by equipment and date range.
 * Wired to EquipService for data persistence.
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // Equipment map for resolving IDs to numbers
    let equipMap: Map<string, string> = new Map();

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(
      el('h1', 'text-2xl font-bold text-[var(--text)]', 'Fuel Logs'),
    );
    const newBtn = el('button', btnCls, 'Log Fuel');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Inline Form (hidden by default) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Log Fuel Entry'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

    // Equipment select
    const equipGroup = el('div');
    equipGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Equipment'));
    const equipSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    equipGroup.appendChild(equipSelect);
    formGrid.appendChild(equipGroup);

    // Date
    const dateGroup = el('div');
    dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date'));
    const dateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    dateInput.type = 'date';
    dateGroup.appendChild(dateInput);
    formGrid.appendChild(dateGroup);

    // Gallons
    const galGroup = el('div');
    galGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Gallons'));
    const galInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    galInput.type = 'number';
    galInput.step = '0.1';
    galInput.placeholder = '0.0';
    galGroup.appendChild(galInput);
    formGrid.appendChild(galGroup);

    // Cost Per Gallon
    const cpgGroup = el('div');
    cpgGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Cost Per Gallon'));
    const cpgInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    cpgInput.type = 'number';
    cpgInput.step = '0.01';
    cpgInput.placeholder = '0.00';
    cpgGroup.appendChild(cpgInput);
    formGrid.appendChild(cpgGroup);

    // Total Cost (optional)
    const totalGroup = el('div');
    totalGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Total Cost (optional)'));
    const totalInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    totalInput.type = 'number';
    totalInput.step = '0.01';
    totalInput.placeholder = 'Auto-calculated';
    totalGroup.appendChild(totalInput);
    formGrid.appendChild(totalGroup);

    // Meter Reading
    const meterGroup = el('div');
    meterGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Meter Reading'));
    const meterInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    meterInput.type = 'number';
    meterInput.placeholder = 'Current meter';
    meterGroup.appendChild(meterInput);
    formGrid.appendChild(meterGroup);

    // Location
    const locGroup = el('div');
    locGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Location'));
    const locInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    locInput.type = 'text';
    locInput.placeholder = 'Fueling location';
    locGroup.appendChild(locInput);
    formGrid.appendChild(locGroup);

    // Vendor Name
    const vendorGroup = el('div');
    vendorGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Vendor Name'));
    const vendorInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    vendorInput.type = 'text';
    vendorInput.placeholder = 'Vendor name';
    vendorGroup.appendChild(vendorInput);
    formGrid.appendChild(vendorGroup);

    formWrap.appendChild(formGrid);

    // Form buttons
    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]',
      'Cancel',
    );
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    // Toggle form
    newBtn.addEventListener('click', () => {
      formWrap.classList.toggle('hidden');
    });
    cancelBtn.addEventListener('click', () => {
      formWrap.classList.add('hidden');
    });

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const filterEquipSelect = el('select', inputCls) as HTMLSelectElement;
    bar.appendChild(filterEquipSelect);

    const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
    bar.appendChild(fromLabel);
    const fromDate = el('input', inputCls) as HTMLInputElement;
    fromDate.type = 'date';
    bar.appendChild(fromDate);

    const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
    bar.appendChild(toLabel);
    const toDate = el('input', inputCls) as HTMLInputElement;
    toDate.type = 'date';
    bar.appendChild(toDate);

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search fuel logs...';
    bar.appendChild(searchInput);

    wrapper.appendChild(bar);

    // ---- Summary Cards Container ----
    const summaryContainer = el('div', 'mb-4');
    wrapper.appendChild(summaryContainer);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Data Loading & Rendering ----

    async function loadEquipment(): Promise<void> {
      const svc = getEquipService();
      const list = await svc.getEquipmentList();
      equipMap = new Map(list.map((e) => [e.id, e.equipmentNumber]));

      // Populate form equipment select
      equipSelect.innerHTML = '';
      const placeholder = el('option', '', 'Select equipment') as HTMLOptionElement;
      placeholder.value = '';
      equipSelect.appendChild(placeholder);
      for (const e of list) {
        const o = el('option', '', `${e.equipmentNumber} - ${e.description}`) as HTMLOptionElement;
        o.value = e.id;
        equipSelect.appendChild(o);
      }

      // Populate filter equipment select
      filterEquipSelect.innerHTML = '';
      const allOpt = el('option', '', 'All Equipment') as HTMLOptionElement;
      allOpt.value = '';
      filterEquipSelect.appendChild(allOpt);
      for (const e of list) {
        const o = el('option', '', `${e.equipmentNumber} - ${e.description}`) as HTMLOptionElement;
        o.value = e.id;
        filterEquipSelect.appendChild(o);
      }
    }

    function resolveEquipNum(equipmentId: string): string {
      return equipMap.get(equipmentId) ?? equipmentId;
    }

    async function loadTable(): Promise<void> {
      const svc = getEquipService();

      const filters: { equipmentId?: string; dateFrom?: string; dateTo?: string } = {};
      if (filterEquipSelect.value) {
        filters.equipmentId = filterEquipSelect.value;
      }
      if (fromDate.value) {
        filters.dateFrom = fromDate.value;
      }
      if (toDate.value) {
        filters.dateTo = toDate.value;
      }

      let records = await svc.getFuelLogs(filters);

      // Apply text search
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        records = records.filter((r) => {
          const equipNum = resolveEquipNum(r.equipmentId).toLowerCase();
          const loc = (r.locationDescription ?? '').toLowerCase();
          const vendor = (r.vendorName ?? '').toLowerCase();
          return equipNum.includes(search) || loc.includes(search) || vendor.includes(search);
        });
      }

      renderSummary(records);
      renderTable(records);
    }

    function renderSummary(
      records: Array<{ gallons: number; totalCost: number }>,
    ): void {
      summaryContainer.innerHTML = '';

      const totalGallons = records.reduce((sum, r) => sum + r.gallons, 0);
      const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
      const avgCostPerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;

      const grid = el('div', 'grid grid-cols-3 gap-4');

      const card1 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
      card1.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Gallons'));
      card1.appendChild(
        el(
          'div',
          'text-xl font-bold text-[var(--text)] mt-1',
          totalGallons.toLocaleString('en-US', { maximumFractionDigits: 1 }),
        ),
      );
      grid.appendChild(card1);

      const card2 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
      card2.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Fuel Cost'));
      card2.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(totalCost)));
      grid.appendChild(card2);

      const card3 = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
      card3.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Avg Cost/Gallon'));
      card3.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1', fmtCurrency(avgCostPerGallon)));
      grid.appendChild(card3);

      summaryContainer.appendChild(grid);
    }

    function renderTable(
      records: Array<{
        equipmentId: string;
        date: string;
        gallons: number;
        costPerGallon?: number;
        totalCost: number;
        meterReading?: number;
        locationDescription?: string;
        vendorName?: string;
      }>,
    ): void {
      tableContainer.innerHTML = '';

      const wrap = el(
        'div',
        'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden',
      );
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of [
        'Equip #', 'Date', 'Gallons', 'Cost/Gal', 'Total Cost', 'Meter Reading', 'Location', 'Vendor',
      ]) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');

      if (records.length === 0) {
        const tr = el('tr');
        const td = el(
          'td',
          'px-4 py-8 text-center text-sm text-[var(--text-muted)]',
          'No fuel logs found. Log a fuel entry to get started.',
        );
        td.setAttribute('colspan', '8');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of records) {
        const tr = el('tr', trCls);

        // Equip #
        tr.appendChild(el('td', tdCls + ' font-mono', resolveEquipNum(row.equipmentId)));

        // Date
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.date));

        // Gallons
        tr.appendChild(el('td', tdCls + ' font-mono text-right', row.gallons.toFixed(1)));

        // Cost/Gal
        tr.appendChild(
          el('td', tdCls + ' font-mono text-right', row.costPerGallon ? fmtCurrency(row.costPerGallon) : ''),
        );

        // Total Cost
        tr.appendChild(el('td', tdCls + ' font-mono font-medium text-right', fmtCurrency(row.totalCost)));

        // Meter Reading
        tr.appendChild(
          el('td', tdCls + ' font-mono text-[var(--text-muted)]', row.meterReading ? String(row.meterReading) : ''),
        );

        // Location
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.locationDescription ?? ''));

        // Vendor
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', row.vendorName ?? ''));

        tbody.appendChild(tr);
      }

      // Summary row
      if (records.length > 0) {
        const totalGallons = records.reduce((sum, r) => sum + r.gallons, 0);
        const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);

        const sumTr = el('tr', 'border-t-2 border-[var(--border)] bg-[var(--surface)]');
        sumTr.appendChild(el('td', tdCls + ' font-semibold', 'Totals'));
        sumTr.appendChild(el('td', tdCls)); // Date
        sumTr.appendChild(
          el('td', tdCls + ' font-mono font-semibold text-right', totalGallons.toFixed(1)),
        );
        sumTr.appendChild(el('td', tdCls)); // Cost/Gal
        sumTr.appendChild(
          el('td', tdCls + ' font-mono font-semibold text-right', fmtCurrency(totalCost)),
        );
        sumTr.appendChild(el('td', tdCls)); // Meter
        sumTr.appendChild(el('td', tdCls)); // Location
        sumTr.appendChild(el('td', tdCls)); // Vendor
        tbody.appendChild(sumTr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Save New Fuel Log ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getEquipService();

          if (!equipSelect.value) {
            showMsg(wrapper, 'Please select equipment.', true);
            return;
          }
          if (!dateInput.value) {
            showMsg(wrapper, 'Please enter a date.', true);
            return;
          }
          if (!galInput.value || parseFloat(galInput.value) <= 0) {
            showMsg(wrapper, 'Please enter a valid gallons amount.', true);
            return;
          }

          await svc.logFuel({
            equipmentId: equipSelect.value,
            date: dateInput.value,
            gallons: parseFloat(galInput.value),
            costPerGallon: cpgInput.value ? parseFloat(cpgInput.value) : undefined,
            totalCost: totalInput.value ? parseFloat(totalInput.value) : undefined,
            meterReading: meterInput.value ? parseFloat(meterInput.value) : undefined,
            locationDescription: locInput.value || undefined,
            vendorName: vendorInput.value || undefined,
          });

          showMsg(wrapper, 'Fuel log entry saved successfully.', false);
          formWrap.classList.add('hidden');

          // Reset form
          equipSelect.value = '';
          dateInput.value = '';
          galInput.value = '';
          cpgInput.value = '';
          totalInput.value = '';
          meterInput.value = '';
          locInput.value = '';
          vendorInput.value = '';

          await loadTable();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save fuel log entry.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    filterEquipSelect.addEventListener('change', () => {
      void loadTable();
    });
    fromDate.addEventListener('change', () => {
      void loadTable();
    });
    toDate.addEventListener('change', () => {
      void loadTable();
    });
    searchInput.addEventListener('input', () => {
      void loadTable();
    });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadEquipment();
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load fuel logs.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

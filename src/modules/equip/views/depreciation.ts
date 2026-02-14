/**
 * Equipment Depreciation view.
 * Displays depreciation schedule and history by equipment, with calculate
 * functionality. Wired to EquipService for live data.
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

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight Line',
  macrs: 'MACRS',
  declining_balance: 'Declining Balance',
};

const METHOD_BADGE: Record<string, string> = {
  straight_line: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  macrs: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  declining_balance: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipOption {
  id: string;
  equipmentNumber: string;
  description: string;
  depreciationMethod?: string;
  purchasePrice?: number;
  currentValue?: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
}

interface DeprecRow {
  equipmentId: string;
  periodStart: string;
  periodEnd: string;
  method: string;
  beginningValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  endingValue: number;
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function buildKpiCards(equip: EquipOption | null, records: DeprecRow[]): HTMLElement {
  const grid = el('div', 'grid grid-cols-2 md:grid-cols-6 gap-4 mb-6');

  const totalDepreciated = records.reduce((s, r) => s + r.depreciationAmount, 0);

  const items: { label: string; value: string; badgeCls?: string }[] = [
    { label: 'Equipment', value: equip ? equip.equipmentNumber : '--' },
    {
      label: 'Method',
      value: equip?.depreciationMethod ? (METHOD_LABELS[equip.depreciationMethod] ?? equip.depreciationMethod) : '--',
      badgeCls: equip?.depreciationMethod ? METHOD_BADGE[equip.depreciationMethod] : undefined,
    },
    { label: 'Purchase Price', value: equip?.purchasePrice != null ? fmtCurrency(equip.purchasePrice) : '--' },
    { label: 'Current Value', value: equip?.currentValue != null ? fmtCurrency(equip.currentValue) : '--' },
    { label: 'Salvage Value', value: equip?.salvageValue != null ? fmtCurrency(equip.salvageValue) : '--' },
    { label: 'Total Depreciated', value: records.length > 0 ? fmtCurrency(totalDepreciated) : '--' },
  ];

  for (const item of items) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', item.label));
    if (item.badgeCls) {
      const badge = el('span', `inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${item.badgeCls}`, item.value);
      card.appendChild(badge);
    } else {
      card.appendChild(el('div', 'text-2xl font-bold text-[var(--text)] mt-1', item.value));
    }
    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Depreciation Schedule Table
// ---------------------------------------------------------------------------

function buildTable(records: DeprecRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'border-b border-[var(--border)]');
  const cols = ['Period', 'Method', 'Beginning Value', 'Depreciation', 'Accumulated', 'Ending Value'];
  for (const col of cols) {
    const align = ['Beginning Value', 'Depreciation', 'Accumulated', 'Ending Value'].includes(col)
      ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
      : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (records.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No depreciation records found. Select equipment and calculate depreciation.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of records) {
    const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]');

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', `${row.periodStart} - ${row.periodEnd}`));

    const tdMethod = el('td', 'px-4 py-3');
    const methodBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${METHOD_BADGE[row.method] ?? METHOD_BADGE.straight_line}`,
      METHOD_LABELS[row.method] ?? row.method,
    );
    tdMethod.appendChild(methodBadge);
    tr.appendChild(tdMethod);

    tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', fmtCurrency(row.beginningValue)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-red-400', fmtCurrency(row.depreciationAmount)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.accumulatedDepreciation)));
    tr.appendChild(el('td', 'px-4 py-3 text-sm text-right font-mono font-medium text-[var(--text)]', fmtCurrency(row.endingValue)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Equipment Selector + Calculate Section
// ---------------------------------------------------------------------------

function buildControlSection(
  equipOptions: EquipOption[],
  onEquipChange: (equipId: string) => void,
  onCalculate: (equipId: string, periodStart: string, periodEnd: string) => void,
): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Row 1: Equipment selector
  const row1 = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  row1.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Equipment:'));

  const equipSelect = el('select', `${inputCls} min-w-[280px]`) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select equipment...') as HTMLOptionElement;
  defaultOpt.value = '';
  equipSelect.appendChild(defaultOpt);

  for (const opt of equipOptions) {
    const o = el('option', '', `${opt.equipmentNumber} - ${opt.description}`) as HTMLOptionElement;
    o.value = opt.id;
    equipSelect.appendChild(o);
  }
  row1.appendChild(equipSelect);
  section.appendChild(row1);

  // Row 2: Calculate section
  const row2 = el('div', 'flex flex-wrap items-center gap-3');
  row2.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Period Start:'));

  const periodStart = el('input', inputCls) as HTMLInputElement;
  periodStart.type = 'date';
  row2.appendChild(periodStart);

  row2.appendChild(el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Period End:'));
  const periodEnd = el('input', inputCls) as HTMLInputElement;
  periodEnd.type = 'date';
  row2.appendChild(periodEnd);

  const calcBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Calculate Depreciation');
  calcBtn.addEventListener('click', () => {
    const equipId = equipSelect.value;
    if (!equipId) return;
    onCalculate(equipId, periodStart.value, periodEnd.value);
  });
  row2.appendChild(calcBtn);
  section.appendChild(row2);

  // Set default period dates (current month)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  periodStart.value = `${y}-${m}-01`;
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  periodEnd.value = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

  // Equipment change handler
  equipSelect.addEventListener('change', () => {
    onEquipChange(equipSelect.value);
  });

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Equipment Depreciation'));
    wrapper.appendChild(headerRow);

    // State
    let selectedEquip: EquipOption | null = null;
    let depreciationRecords: DeprecRow[] = [];

    // Containers
    const controlContainer = el('div', '');
    const kpiContainer = el('div', '');
    const tableContainer = el('div', '');

    wrapper.appendChild(controlContainer);
    wrapper.appendChild(kpiContainer);
    wrapper.appendChild(tableContainer);

    // Render KPIs + table
    function renderData(): void {
      kpiContainer.innerHTML = '';
      kpiContainer.appendChild(buildKpiCards(selectedEquip, depreciationRecords));

      tableContainer.innerHTML = '';
      tableContainer.appendChild(buildTable(depreciationRecords));
    }

    // Load records for selected equipment
    async function loadRecords(equipId: string): Promise<void> {
      if (!equipId) {
        selectedEquip = null;
        depreciationRecords = [];
        renderData();
        return;
      }

      try {
        const svc = getEquipService();
        const equip = await svc.getEquipment(equipId);
        if (!equip) {
          showMsg(wrapper, 'Equipment not found.', true);
          return;
        }

        selectedEquip = {
          id: equip.id,
          equipmentNumber: equip.equipmentNumber,
          description: equip.description,
          depreciationMethod: equip.depreciationMethod,
          purchasePrice: equip.purchasePrice,
          currentValue: equip.currentValue,
          salvageValue: equip.salvageValue,
          usefulLifeMonths: equip.usefulLifeMonths,
        };

        const records = await svc.getDepreciationRecords(equipId);
        depreciationRecords = records.map((r) => ({
          equipmentId: r.equipmentId,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          method: r.method,
          beginningValue: r.beginningValue,
          depreciationAmount: r.depreciationAmount,
          accumulatedDepreciation: r.accumulatedDepreciation,
          endingValue: r.endingValue,
        }));

        renderData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load depreciation records';
        showMsg(wrapper, message, true);
      }
    }

    // Calculate depreciation
    async function calculateDepr(equipId: string, periodStart: string, periodEnd: string): Promise<void> {
      if (!equipId) {
        showMsg(wrapper, 'Please select equipment first.', true);
        return;
      }
      if (!periodStart || !periodEnd) {
        showMsg(wrapper, 'Please select both period start and end dates.', true);
        return;
      }

      try {
        const svc = getEquipService();
        const result = await svc.calculateDepreciation(equipId, periodStart, periodEnd);

        showMsg(
          wrapper,
          `Depreciation calculated: ${fmtCurrency(result.depreciationAmount)} for period ${periodStart} to ${periodEnd}`,
          false,
        );

        // Reload records and equipment data to reflect updated currentValue
        await loadRecords(equipId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to calculate depreciation';
        showMsg(wrapper, message, true);
      }
    }

    // Load equipment list and build controls
    void (async () => {
      try {
        const svc = getEquipService();
        const equipList = await svc.getEquipmentList();

        const equipOptions: EquipOption[] = equipList.map((e) => ({
          id: e.id,
          equipmentNumber: e.equipmentNumber,
          description: e.description,
          depreciationMethod: e.depreciationMethod,
          purchasePrice: e.purchasePrice,
          currentValue: e.currentValue,
          salvageValue: e.salvageValue,
          usefulLifeMonths: e.usefulLifeMonths,
        }));

        controlContainer.innerHTML = '';
        controlContainer.appendChild(
          buildControlSection(
            equipOptions,
            (equipId) => void loadRecords(equipId),
            (equipId, ps, pe) => void calculateDepr(equipId, ps, pe),
          ),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load equipment list';
        showMsg(wrapper, message, true);
      }
    })();

    // Initial empty render
    renderData();

    container.appendChild(wrapper);
  },
};

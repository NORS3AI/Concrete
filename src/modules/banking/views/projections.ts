/**
 * Cash Flow Projections view.
 * Shows cash flow forecast and projection records with summary cards.
 * Wired to BankingService for CRUD operations.
 */

import { getBankingService } from '../service-accessor';

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

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Cash Flow Projections'));
    const addBtn = el('button', btnCls, 'Add Projection');
    addBtn.type = 'button';
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const inflowCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    inflowCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Inflows'));
    const inflowValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    inflowCard.appendChild(inflowValue);
    summaryRow.appendChild(inflowCard);

    const outflowCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    outflowCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Outflows'));
    const outflowValue = el('div', 'text-2xl font-bold text-red-400', '--');
    outflowCard.appendChild(outflowValue);
    summaryRow.appendChild(outflowCard);

    const netCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    netCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Net Cash Flow'));
    const netValue = el('div', 'text-2xl font-bold text-[var(--accent)]', '--');
    netCard.appendChild(netValue);
    summaryRow.appendChild(netCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Projection'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

    const typeGroup = el('div');
    typeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Type'));
    const typeSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    for (const [val, label] of [['inflow', 'Inflow'], ['outflow', 'Outflow']]) {
      const o = el('option', '', label) as HTMLOptionElement;
      o.value = val;
      typeSelect.appendChild(o);
    }
    typeGroup.appendChild(typeSelect);
    formGrid.appendChild(typeGroup);

    const descGroup = el('div');
    descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    const descInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    descInput.type = 'text';
    descInput.placeholder = 'Projection description';
    descGroup.appendChild(descInput);
    formGrid.appendChild(descGroup);

    const amtGroup = el('div');
    amtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Amount'));
    const amtInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    amtInput.type = 'number';
    amtInput.step = '0.01';
    amtInput.placeholder = '0.00';
    amtGroup.appendChild(amtInput);
    formGrid.appendChild(amtGroup);

    const dateGroup = el('div');
    dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Expected Date'));
    const dateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    dateInput.type = 'date';
    dateGroup.appendChild(dateInput);
    formGrid.appendChild(dateGroup);

    const probGroup = el('div');
    probGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Probability (%)'));
    const probInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    probInput.type = 'number';
    probInput.min = '0';
    probInput.max = '100';
    probInput.placeholder = '100';
    probGroup.appendChild(probInput);
    formGrid.appendChild(probGroup);

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
    saveBtn.type = 'button';
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    cancelBtn.type = 'button';
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    addBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Forecast Table Container ----
    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Forecast (Next 90 Days)'));
    const forecastContainer = el('div', 'mb-6');
    wrapper.appendChild(forecastContainer);

    // ---- Projections Table Container ----
    wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Projection Records'));
    const projectionsContainer = el('div');
    wrapper.appendChild(projectionsContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(target: HTMLElement, text: string): void {
      target.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', text));
      target.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading(forecastContainer, 'Loading forecast...');
      showLoading(projectionsContainer, 'Loading projections...');
      try {
        const svc = getBankingService();
        const [forecast, projections] = await Promise.all([
          svc.getCashFlowForecast(90),
          svc.listProjections(),
        ]);

        // Compute summary from forecast
        let totalInflows = 0;
        let totalOutflows = 0;
        for (const f of forecast) {
          totalInflows += f.inflows;
          totalOutflows += f.outflows;
        }
        const netFlow = totalInflows - totalOutflows;

        inflowValue.textContent = fmtCurrency(totalInflows);
        outflowValue.textContent = fmtCurrency(totalOutflows);
        netValue.textContent = fmtCurrency(netFlow);
        netValue.className = netFlow >= 0 ? 'text-2xl font-bold text-emerald-400' : 'text-2xl font-bold text-red-400';

        // ---- Forecast Table ----
        const fWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const fTable = el('table', 'w-full text-sm');

        const fThead = el('thead');
        const fHeadRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Date', 'Inflows', 'Outflows', 'Net Flow', 'Projected Balance']) {
          const align = col === 'Date'
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right';
          fHeadRow.appendChild(el('th', align, col));
        }
        fThead.appendChild(fHeadRow);
        fTable.appendChild(fThead);

        const fTbody = el('tbody');
        if (forecast.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No forecast data available. Add projections to generate a forecast.');
          td.setAttribute('colspan', '5');
          tr.appendChild(td);
          fTbody.appendChild(tr);
        }

        for (const row of forecast) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', row.date));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right text-emerald-400', fmtCurrency(row.inflows)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right text-red-400', fmtCurrency(row.outflows)));

          const netCls = row.netFlow >= 0
            ? 'px-4 py-3 text-sm font-mono text-right text-emerald-400'
            : 'px-4 py-3 text-sm font-mono text-right text-red-400';
          tr.appendChild(el('td', netCls, fmtCurrency(row.netFlow)));

          const balCls = row.projectedBalance >= 0
            ? 'px-4 py-3 text-sm font-mono text-right font-medium text-emerald-400'
            : 'px-4 py-3 text-sm font-mono text-right font-medium text-red-400';
          tr.appendChild(el('td', balCls, fmtCurrency(row.projectedBalance)));

          fTbody.appendChild(tr);
        }

        fTable.appendChild(fTbody);
        fWrap.appendChild(fTable);

        forecastContainer.innerHTML = '';
        forecastContainer.appendChild(fWrap);

        // ---- Projections Table ----
        const pWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const pTable = el('table', 'w-full text-sm');

        const pThead = el('thead');
        const pHeadRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Type', 'Description', 'Amount', 'Expected Date', 'Probability']) {
          const align = ['Amount', 'Probability'].includes(col)
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          pHeadRow.appendChild(el('th', align, col));
        }
        pThead.appendChild(pHeadRow);
        pTable.appendChild(pThead);

        const pTbody = el('tbody');
        if (projections.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No projections found. Add a projection to get started.');
          td.setAttribute('colspan', '5');
          tr.appendChild(td);
          pTbody.appendChild(tr);
        }

        for (const proj of projections) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          const typeBadgeCls = proj.type === 'inflow'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20';
          const tdType = el('td', 'px-4 py-3 text-sm');
          tdType.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${typeBadgeCls}`, proj.type.charAt(0).toUpperCase() + proj.type.slice(1)));
          tr.appendChild(tdType);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', proj.description));

          const amtCls = proj.type === 'inflow'
            ? 'px-4 py-3 text-sm font-mono text-right text-emerald-400'
            : 'px-4 py-3 text-sm font-mono text-right text-red-400';
          tr.appendChild(el('td', amtCls, fmtCurrency(proj.amount)));

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', proj.expectedDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right text-[var(--text-muted)]', `${proj.probability ?? 100}%`));

          pTbody.appendChild(tr);
        }

        pTable.appendChild(pTbody);
        pWrap.appendChild(pTable);

        projectionsContainer.innerHTML = '';
        projectionsContainer.appendChild(pWrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load projections';
        forecastContainer.innerHTML = '';
        projectionsContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBankingService();

          if (!descInput.value.trim()) {
            showMsg(wrapper, 'Description is required.', true);
            return;
          }
          if (!dateInput.value) {
            showMsg(wrapper, 'Expected date is required.', true);
            return;
          }

          await svc.addProjection({
            type: typeSelect.value as any,
            description: descInput.value.trim(),
            amount: parseFloat(amtInput.value) || 0,
            expectedDate: dateInput.value,
            probability: parseInt(probInput.value, 10) || 100,
          });

          showMsg(wrapper, 'Projection added successfully.', false);
          formWrap.classList.add('hidden');
          descInput.value = '';
          amtInput.value = '';
          dateInput.value = '';
          probInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add projection';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    void loadAndRender();
  },
};

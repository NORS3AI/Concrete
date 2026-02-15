/**
 * Bonding Capacity Analysis view.
 * Shows per-surety capacity utilization with summary cards, color-coded
 * utilization percentages, and CSV export.
 * Wired to BondingService.getBondingAnalysis().
 */

import { getBondingService } from '../service-accessor';

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

    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bonding Capacity Analysis'));
    const exportBtn = el('button', btnCls, 'Export CSV');
    exportBtn.type = 'button';
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalSuretiesCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalSuretiesCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Sureties'));
    const totalSuretiesValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalSuretiesCard.appendChild(totalSuretiesValue);
    summaryRow.appendChild(totalSuretiesCard);

    const totalExposureCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalExposureCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Exposure'));
    const totalExposureValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    totalExposureCard.appendChild(totalExposureValue);
    summaryRow.appendChild(totalExposureCard);

    const availableCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    availableCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Available Capacity'));
    const availableValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    availableCard.appendChild(availableValue);
    summaryRow.appendChild(availableCard);

    wrapper.appendChild(summaryRow);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading analysis...'));
      tableContainer.appendChild(loader);
    }

    // Store analysis data for export
    let analysisData: Awaited<ReturnType<typeof getBondingService extends () => infer S ? S extends { getBondingAnalysis(): infer R } ? () => R : never : never>> = [];

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();
        const items = await svc.getBondingAnalysis();
        analysisData = items;

        // Update summaries
        const totalExposure = items.reduce((sum, i) => sum + i.totalExposure, 0);
        const totalAvailable = items.reduce((sum, i) => sum + i.availableCapacity, 0);
        totalSuretiesValue.textContent = String(items.length);
        totalExposureValue.textContent = fmtCurrency(totalExposure);
        availableValue.textContent = fmtCurrency(totalAvailable);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Surety', 'Single Limit', 'Aggregate Limit', 'Active Bonds', 'Exposure', 'Available', 'Utilization %']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No active sureties found. Add sureties and issue bonds to see capacity analysis.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.suretyName));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.singleLimit)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.aggregateLimit)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.activeBonds)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.totalExposure)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.availableCapacity)));

          // Utilization with color coding
          const tdUtil = el('td', 'px-4 py-3 text-sm');
          let utilColor = 'text-emerald-400';
          if (item.utilizationPct >= 80) utilColor = 'text-red-400';
          else if (item.utilizationPct >= 50) utilColor = 'text-amber-400';
          const utilSpan = el('span', `font-mono font-medium ${utilColor}`, `${item.utilizationPct.toFixed(1)}%`);
          tdUtil.appendChild(utilSpan);

          // Progress bar
          const barContainer = el('div', 'w-full bg-[var(--surface)] rounded-full h-1.5 mt-1');
          const bar = el('div', 'h-1.5 rounded-full');
          let barColor = 'bg-emerald-500';
          if (item.utilizationPct >= 80) barColor = 'bg-red-500';
          else if (item.utilizationPct >= 50) barColor = 'bg-amber-500';
          bar.className += ` ${barColor}`;
          bar.style.width = `${Math.min(item.utilizationPct, 100)}%`;
          barContainer.appendChild(bar);
          tdUtil.appendChild(barContainer);

          tr.appendChild(tdUtil);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load bonding analysis';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Export Handler ----
    exportBtn.addEventListener('click', () => {
      try {
        if (analysisData.length === 0) {
          showMsg(wrapper, 'No data to export.', true);
          return;
        }

        const headers = ['Surety', 'Single Limit', 'Aggregate Limit', 'Active Bonds', 'Exposure', 'Available', 'Utilization %'];
        const rows = analysisData.map((item) => [
          item.suretyName,
          item.singleLimit.toString(),
          item.aggregateLimit.toString(),
          item.activeBonds.toString(),
          item.totalExposure.toString(),
          item.availableCapacity.toString(),
          item.utilizationPct.toFixed(1),
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bonding-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        showMsg(wrapper, 'Analysis exported successfully.', false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to export analysis';
        showMsg(wrapper, message, true);
      }
    });

    // ---- Initial Load ----
    void loadAndRender();
  },
};

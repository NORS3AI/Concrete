/**
 * Service Profitability Analysis view.
 * Shows profitability by agreement and overall, with revenue vs cost breakdown.
 * Integrates with ServiceMgmtService for data.
 */

import { getServiceMgmtService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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
  const toast = el('div', `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity duration-300 ${
    type === 'success' ? 'bg-emerald-600 text-white' :
    type === 'error' ? 'bg-red-600 text-white' :
    'bg-blue-600 text-white'
  }`);
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  setTimeout(() => { toast.remove(); }, 3000);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfitabilityRow {
  agreementId: string;
  agreementName: string;
  revenue: number;
  laborCost: number;
  materialCost: number;
  profit: number;
  margin: number;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(overall: ProfitabilityRow | null): HTMLElement {
  const row = el('div', 'grid grid-cols-5 gap-4 mb-6');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  const data = overall ?? { revenue: 0, laborCost: 0, materialCost: 0, profit: 0, margin: 0 };
  row.appendChild(buildCard('Total Revenue', fmtCurrency(data.revenue), 'text-[var(--accent)]'));
  row.appendChild(buildCard('Labor Cost', fmtCurrency(data.laborCost)));
  row.appendChild(buildCard('Material Cost', fmtCurrency(data.materialCost)));
  row.appendChild(buildCard('Profit', fmtCurrency(data.profit), data.profit >= 0 ? 'text-emerald-400' : 'text-red-400'));
  row.appendChild(buildCard('Margin', fmtPct(data.margin), data.margin >= 0 ? 'text-emerald-400' : 'text-red-400'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(rows: ProfitabilityRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Agreement', 'Revenue', 'Labor Cost', 'Material Cost', 'Profit', 'Margin']) {
    const align = col !== 'Agreement' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No profitability data available. Complete work orders to see analysis.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdName = el('td', 'py-2 px-3');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.agreementName) as HTMLAnchorElement;
    link.href = `#/service/agreements/${row.agreementId}`;
    tdName.appendChild(link);
    tr.appendChild(tdName);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.revenue)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.laborCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', fmtCurrency(row.materialCost)));

    const profitCls = row.profit >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono font-medium ${profitCls}`, fmtCurrency(row.profit)));

    const marginCls = row.margin >= 0 ? 'text-emerald-400' : 'text-red-400';
    tr.appendChild(el('td', `py-2 px-3 text-right font-mono ${marginCls}`, fmtPct(row.margin)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // Loading indicator
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading profitability data...');
    wrapper.appendChild(loading);
    container.appendChild(wrapper);

    // Async data loading and UI build
    (async () => {
      const svc = getServiceMgmtService();
      let overallTotals: ProfitabilityRow | null = null;
      let agreementRows: ProfitabilityRow[] = [];

      try {
        // Load overall profitability (no agreementId = all)
        const overall = await svc.getServiceProfitability();
        overallTotals = {
          agreementId: '',
          agreementName: 'Overall',
          revenue: overall.revenue,
          laborCost: overall.laborCost,
          materialCost: overall.materialCost,
          profit: overall.profit,
          margin: overall.margin,
        };

        // Load all agreements so we can get per-agreement profitability
        const agreements = await svc.listAgreements();
        const rows: ProfitabilityRow[] = [];

        for (const agreement of agreements) {
          const agId = (agreement as any).id as string;
          const profitData = await svc.getServiceProfitability(agId);
          rows.push({
            agreementId: agId,
            agreementName: profitData.agreementName ?? agreement.name ?? agId,
            revenue: profitData.revenue,
            laborCost: profitData.laborCost,
            materialCost: profitData.materialCost,
            profit: profitData.profit,
            margin: profitData.margin,
          });
        }

        agreementRows = rows;
      } catch (err) {
        wrapper.innerHTML = '';
        wrapper.appendChild(el('div', 'py-12 text-center text-red-400', `Failed to load profitability data: ${err}`));
        return;
      }

      // --- Export handler ---
      const handleExport = () => {
        const headers = ['Agreement', 'Revenue', 'Labor Cost', 'Material Cost', 'Profit', 'Margin'];
        const csvRows = [headers.join(',')];

        for (const row of agreementRows) {
          csvRows.push([
            `"${row.agreementName}"`,
            row.revenue.toFixed(2),
            row.laborCost.toFixed(2),
            row.materialCost.toFixed(2),
            row.profit.toFixed(2),
            row.margin.toFixed(1),
          ].join(','));
        }

        // Add overall totals row
        if (overallTotals) {
          csvRows.push([
            '"Overall Total"',
            overallTotals.revenue.toFixed(2),
            overallTotals.laborCost.toFixed(2),
            overallTotals.materialCost.toFixed(2),
            overallTotals.profit.toFixed(2),
            overallTotals.margin.toFixed(1),
          ].join(','));
        }

        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-profitability-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('Profitability report exported.', 'success');
      };

      // --- Build UI ---
      wrapper.innerHTML = '';

      const headerRow = el('div', 'flex items-center justify-between mb-4');
      headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Service Profitability'));
      const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export Report');
      exportBtn.type = 'button';
      exportBtn.addEventListener('click', handleExport);
      headerRow.appendChild(exportBtn);
      wrapper.appendChild(headerRow);

      wrapper.appendChild(buildSummaryCards(overallTotals));

      wrapper.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'By Agreement'));
      wrapper.appendChild(buildTable(agreementRows));
    })();
  },
};

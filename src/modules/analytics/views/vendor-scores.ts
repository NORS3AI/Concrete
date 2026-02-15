/**
 * Vendor Scoring view.
 * Shows vendor name, quality/delivery/price/communication scores, overall score,
 * total orders, on-time %, defect rate. Sort by overall score.
 */

import { getAnalyticsService } from '../service-accessor';

const svc = () => getAnalyticsService();

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const showMsg = (c: HTMLElement, msg: string, ok = true) => {
  const d = el('div', `p-3 rounded mb-4 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`, msg);
  c.prepend(d);
  setTimeout(() => d.remove(), 3000);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 6) return 'text-amber-600';
  return 'text-red-600';
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'p-6 max-w-7xl mx-auto');

    // Header
    const header = el('div', 'flex items-center justify-between mb-6');
    const titleRow = el('div', 'flex items-center gap-3');
    titleRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Vendor Scoring'));
    const badge = el('span', 'px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleRow.appendChild(badge);
    header.appendChild(titleRow);
    wrapper.appendChild(header);

    // Loading
    const loadingEl = el('div', 'text-center py-12 text-[var(--text-muted)]', 'Loading vendor scores...');
    wrapper.appendChild(loadingEl);

    // Table container
    const tableContainer = el('div', '');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    function buildTable(vendors: any[]): HTMLElement {
      // Sort by overall score descending
      const sorted = [...vendors].sort((a, b) => b.overallScore - a.overallScore);

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      const cols = ['Vendor', 'Quality', 'Delivery', 'Price', 'Communication', 'Overall', 'Total Orders', 'On-Time %', 'Defect Rate', 'Last Updated'];
      for (const col of cols) {
        const thCls = ['Quality', 'Delivery', 'Price', 'Communication', 'Overall', 'Total Orders', 'On-Time %', 'Defect Rate'].includes(col)
          ? 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
          : 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-left';
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (sorted.length === 0) {
        const tr = el('tr');
        const td = el('td', 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', 'No vendor scores found.');
        td.setAttribute('colspan', String(cols.length));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const v of sorted) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', v.vendorName || v.vendorId));
        tr.appendChild(el('td', `px-4 py-3 text-sm text-right font-mono ${scoreColor(v.qualityScore)}`, v.qualityScore.toFixed(1)));
        tr.appendChild(el('td', `px-4 py-3 text-sm text-right font-mono ${scoreColor(v.deliveryScore)}`, v.deliveryScore.toFixed(1)));
        tr.appendChild(el('td', `px-4 py-3 text-sm text-right font-mono ${scoreColor(v.priceScore)}`, v.priceScore.toFixed(1)));
        tr.appendChild(el('td', `px-4 py-3 text-sm text-right font-mono ${scoreColor(v.communicationScore)}`, v.communicationScore.toFixed(1)));

        const overallTd = el('td', 'px-4 py-3 text-sm text-right');
        const overallBadge = el('span', `px-2 py-0.5 text-xs font-bold rounded ${scoreColor(v.overallScore)} ${v.overallScore >= 8 ? 'bg-emerald-50' : v.overallScore >= 6 ? 'bg-amber-50' : 'bg-red-50'}`, v.overallScore.toFixed(1));
        overallTd.appendChild(overallBadge);
        tr.appendChild(overallTd);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] text-right font-mono', String(v.totalOrders)));

        const otCls = v.onTimeDeliveryPct >= 95
          ? 'px-4 py-3 text-sm text-right font-mono text-emerald-600'
          : v.onTimeDeliveryPct >= 85
            ? 'px-4 py-3 text-sm text-right font-mono text-amber-600'
            : 'px-4 py-3 text-sm text-right font-mono text-red-600';
        tr.appendChild(el('td', otCls, fmtPct(v.onTimeDeliveryPct)));

        const defectCls = v.defectRate <= 2
          ? 'px-4 py-3 text-sm text-right font-mono text-emerald-600'
          : v.defectRate <= 5
            ? 'px-4 py-3 text-sm text-right font-mono text-amber-600'
            : 'px-4 py-3 text-sm text-right font-mono text-red-600';
        tr.appendChild(el('td', defectCls, fmtPct(v.defectRate)));

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', v.lastUpdated || '-'));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    async function loadData(): Promise<void> {
      try {
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        const vendors = await svc().listVendorScores();
        badge.textContent = String(vendors.length);
        loadingEl.style.display = 'none';
        tableContainer.appendChild(buildTable(vendors));
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load vendor scores', false);
        tableContainer.appendChild(buildTable([]));
      }
    }

    void loadData();
  },
};

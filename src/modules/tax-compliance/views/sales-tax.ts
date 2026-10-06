/**
 * Sales & Use Tax view.
 * Jurisdiction-based sales and use tax tracking with filing status management.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { FilingStatus } from '../tax-compliance-service';

const svc = () => getTaxComplianceService();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
}

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const old = container.querySelector('[data-msg]'); if (old) old.remove();
  const cls = ok ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const m = el('div', cls, text); m.setAttribute('data-msg', '1'); container.prepend(m); setTimeout(() => m.remove(), 4000);
}

const fmtCurrency = (v: number): string => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtPct = (v: number): string => `${(v * 100).toFixed(3)}%`;

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_review: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  filed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sales & Use Tax'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filters
    let currentTaxType = '';
    let currentStatus = '';
    let currentYear = String(new Date().getFullYear());

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const taxTypeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Types' }, { v: 'sales', l: 'Sales Tax' }, { v: 'use', l: 'Use Tax' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; taxTypeSelect.appendChild(o);
    }
    filterBar.appendChild(taxTypeSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'draft', l: 'Draft' }, { v: 'filed', l: 'Filed' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const yearInput = el('input', inputCls) as HTMLInputElement;
    yearInput.type = 'number'; yearInput.placeholder = 'Year'; yearInput.value = currentYear;
    filterBar.appendChild(yearInput);

    const fire = () => { currentTaxType = taxTypeSelect.value; currentStatus = statusSelect.value; currentYear = yearInput.value; void loadAndRender(); };
    taxTypeSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire); yearInput.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading sales & use tax records...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { taxType?: 'sales' | 'use'; status?: FilingStatus; year?: number } = {};
        if (currentTaxType) filters.taxType = currentTaxType as 'sales' | 'use';
        if (currentStatus) filters.status = currentStatus as FilingStatus;
        const yr = parseInt(currentYear, 10); if (yr) filters.year = yr;

        const items = await svc().listSalesTaxRecords(filters);
        countBadge.textContent = String(items.length);

        const totalTaxable = items.reduce((s, r) => s + r.taxableAmount, 0);
        const totalDue = items.reduce((s, r) => s + r.taxDue, 0);
        const totalPaid = items.reduce((s, r) => s + r.taxPaid, 0);
        const jurisdictions = new Set(items.map(r => r.jurisdiction)).size;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Taxable Amount', fmtCurrency(totalTaxable)], ['Tax Due', fmtCurrency(totalDue)], ['Tax Paid', fmtCurrency(totalPaid)], ['Jurisdictions', String(jurisdictions)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Jurisdiction', 'Type', 'State', 'Period', 'Taxable', 'Exempt', 'Rate', 'Tax Due', 'Paid', 'Status', 'Due Date']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No sales/use tax records found.'); td.setAttribute('colspan', '11'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const r of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', r.jurisdiction));
          const tdType = el('td', 'px-4 py-3');
          tdType.appendChild(el('span', r.taxType === 'sales' ? 'px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20', r.taxType === 'sales' ? 'Sales' : 'Use'));
          tr.appendChild(tdType);
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.state));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.period));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.taxableAmount)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.exemptAmount)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtPct(r.taxRate)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.taxDue)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.taxPaid)));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? STATUS_BADGE.draft}`, r.status.replace('_', ' ')));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.dueDate || '\u2014'));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load records', false); }
    }

    void loadAndRender();
  },
};

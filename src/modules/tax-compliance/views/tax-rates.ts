/**
 * Tax Rates view.
 * Tax rate management with auto-update via integration or manual import.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { TaxType, JurisdictionLevel } from '../tax-compliance-service';

const svc = () => getTaxComplianceService();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
}

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const old = container.querySelector('[data-msg]'); if (old) old.remove();
  const cls = ok ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const m = el('div', cls, text); m.setAttribute('data-msg', '1'); container.prepend(m); setTimeout(() => m.remove(), 4000);
}

const fmtPct = (v: number): string => `${(v * 100).toFixed(4)}%`;
const fmtCurrency = (v: number): string => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SOURCE_BADGE: Record<string, string> = {
  manual: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  import: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  api: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  scheduled: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const LEVEL_BADGE: Record<string, string> = {
  federal: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  state: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  local: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tax Rates'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);

    const importBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Import Rates');
    importBtn.addEventListener('click', () => showMsg(wrapper, 'Import dialog would open here. Use CSV or connect to tax rate API.'));
    headerRow.appendChild(importBtn);
    wrapper.appendChild(headerRow);

    // Summary
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filters
    let currentLevel = '';
    let currentTaxType = '';

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const levelSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Levels' }, { v: 'federal', l: 'Federal' }, { v: 'state', l: 'State' }, { v: 'local', l: 'Local' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; levelSelect.appendChild(o);
    }
    filterBar.appendChild(levelSelect);

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Types' }, { v: 'income', l: 'Income' }, { v: 'fica_ss', l: 'FICA SS' }, { v: 'fica_med', l: 'FICA Med' }, { v: 'futa', l: 'FUTA' }, { v: 'suta', l: 'SUTA' }, { v: 'sales', l: 'Sales' }, { v: 'use', l: 'Use' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

    const fire = () => { currentLevel = levelSelect.value; currentTaxType = typeSelect.value; void loadAndRender(); };
    levelSelect.addEventListener('change', fire); typeSelect.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading tax rates...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { jurisdictionLevel?: JurisdictionLevel; taxType?: TaxType; activeOnly?: boolean } = { activeOnly: true };
        if (currentLevel) filters.jurisdictionLevel = currentLevel as JurisdictionLevel;
        if (currentTaxType) filters.taxType = currentTaxType as TaxType;

        const items = await svc().listTaxRates(filters);
        countBadge.textContent = String(items.length);

        const federal = items.filter(r => r.jurisdictionLevel === 'federal').length;
        const state = items.filter(r => r.jurisdictionLevel === 'state').length;
        const local = items.filter(r => r.jurisdictionLevel === 'local').length;
        const sources = new Set(items.map(r => r.source)).size;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Federal Rates', String(federal)], ['State Rates', String(state)], ['Local Rates', String(local)], ['Sources', String(sources)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Jurisdiction', 'Level', 'Tax Type', 'Rate', 'Wage Base', 'Effective', 'Expiration', 'Source', 'Last Updated']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No tax rates found.'); td.setAttribute('colspan', '9'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const r of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', r.jurisdiction));

          const tdL = el('td', 'px-4 py-3');
          tdL.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE[r.jurisdictionLevel] ?? LEVEL_BADGE.state}`, r.jurisdictionLevel));
          tr.appendChild(tdL);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.taxType.replace(/_/g, ' ')));
          tr.appendChild(el('td', 'px-4 py-3 font-mono font-medium', fmtPct(r.rate)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', r.wageBase ? fmtCurrency(r.wageBase) : '\u2014'));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.effectiveDate));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.expirationDate || '\u2014'));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${SOURCE_BADGE[r.source] ?? SOURCE_BADGE.manual}`, r.source));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 text-xs text-[var(--text-muted)]', fmtDateTime(r.lastUpdated)));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load rates', false); }
    }

    void loadAndRender();
  },
};

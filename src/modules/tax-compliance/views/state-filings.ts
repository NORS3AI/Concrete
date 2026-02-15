/**
 * State Filings view.
 * State payroll tax filing management for all 50 states with filtering,
 * status badges, and filing actions.
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

const STATES = ['', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_review: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  filed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  amended: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'State Tax Filings'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New State Filing');
    newBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const year = parseInt(currentYear, 10) || new Date().getFullYear();
          const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
          await svc().createStateFiling({ filingId: `st-${Date.now()}`, state: 'CA', formName: 'DE 9', year, quarter, period: `Q${quarter} ${year}`, stateEIN: '', totalWages: 0, totalStateTax: 0, totalSUTA: 0, employeeCount: 0, dueDate: '', preparedBy: 'current_user' });
          showMsg(wrapper, 'State filing created.'); void loadAndRender();
        } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
      })();
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filters
    let currentState = '';
    let currentStatus = '';
    let currentYear = String(new Date().getFullYear());

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const stateSelect = el('select', inputCls) as HTMLSelectElement;
    for (const st of STATES) { const o = el('option', '', st || 'All States') as HTMLOptionElement; o.value = st; stateSelect.appendChild(o); }
    filterBar.appendChild(stateSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'draft', l: 'Draft' }, { v: 'filed', l: 'Filed' }, { v: 'pending_review', l: 'Pending Review' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const yearInput = el('input', inputCls) as HTMLInputElement;
    yearInput.type = 'number'; yearInput.placeholder = 'Year'; yearInput.min = '2020'; yearInput.max = '2030'; yearInput.value = currentYear;
    filterBar.appendChild(yearInput);

    const fire = () => { currentState = stateSelect.value; currentStatus = statusSelect.value; currentYear = yearInput.value; void loadAndRender(); };
    stateSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire); yearInput.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading state filings...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { state?: string; status?: FilingStatus; year?: number } = {};
        if (currentState) filters.state = currentState;
        if (currentStatus) filters.status = currentStatus as FilingStatus;
        const yr = parseInt(currentYear, 10); if (yr) filters.year = yr;

        const items = await svc().listStateFilings(filters);
        countBadge.textContent = String(items.length);

        const totalWages = items.reduce((s, f) => s + f.totalWages, 0);
        const totalTax = items.reduce((s, f) => s + f.totalStateTax + f.totalSUTA, 0);
        const filed = items.filter(f => f.status === 'filed').length;
        const uniqueStates = new Set(items.map(f => f.state)).size;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Total Wages', fmtCurrency(totalWages)], ['Total State Tax', fmtCurrency(totalTax)], ['Filed', String(filed)], ['States', String(uniqueStates)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['State', 'Form', 'Period', 'Status', 'Wages', 'State Tax', 'SUTA', 'Employees', 'Due Date', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No state filings found.'); td.setAttribute('colspan', '10'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const f of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', f.state));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', f.formName));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', f.period));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[f.status] ?? STATUS_BADGE.draft}`, f.status.replace('_', ' ')));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(f.totalWages)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(f.totalStateTax)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(f.totalSUTA)));
          tr.appendChild(el('td', 'px-4 py-3 text-center text-[var(--text-muted)]', String(f.employeeCount)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', f.dueDate || '\u2014'));

          const tdA = el('td', 'px-4 py-3');
          if (f.status === 'draft' || f.status === 'approved') {
            const btn = el('button', 'text-emerald-400 hover:underline text-sm', 'File');
            btn.addEventListener('click', () => {
              void (async () => {
                try { await svc().fileStateFiling(f.id, `CONF-${Date.now()}`, 'current_user'); showMsg(wrapper, `${f.state} filing filed.`); void loadAndRender(); }
                catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
              })();
            });
            tdA.appendChild(btn);
          }
          tr.appendChild(tdA);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load state filings', false); }
    }

    void loadAndRender();
  },
};

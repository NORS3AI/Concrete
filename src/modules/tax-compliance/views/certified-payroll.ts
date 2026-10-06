/**
 * Certified Payroll view.
 * State-specific certified payroll formats (beyond federal WH-347) with
 * certification workflow and submission tracking.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { CertifiedPayrollStatus } from '../tax-compliance-service';

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

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  certified: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  submitted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATES = ['', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Certified Payroll'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
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
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'draft', l: 'Draft' }, { v: 'certified', l: 'Certified' }, { v: 'submitted', l: 'Submitted' }, { v: 'accepted', l: 'Accepted' }, { v: 'rejected', l: 'Rejected' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const yearInput = el('input', inputCls) as HTMLInputElement;
    yearInput.type = 'number'; yearInput.placeholder = 'Year'; yearInput.value = currentYear;
    filterBar.appendChild(yearInput);

    const fire = () => { currentState = stateSelect.value; currentStatus = statusSelect.value; currentYear = yearInput.value; void loadAndRender(); };
    stateSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire); yearInput.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading certified payrolls...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { state?: string; status?: CertifiedPayrollStatus; year?: number } = {};
        if (currentState) filters.state = currentState;
        if (currentStatus) filters.status = currentStatus as CertifiedPayrollStatus;
        const yr = parseInt(currentYear, 10); if (yr) filters.year = yr;

        const items = await svc().listCertifiedPayrolls(filters);
        countBadge.textContent = String(items.length);

        const totalWorkers = items.reduce((s, r) => s + r.totalWorkers, 0);
        const totalGross = items.reduce((s, r) => s + r.totalGross, 0);
        const certified = items.filter(r => r.status === 'certified' || r.status === 'submitted' || r.status === 'accepted').length;
        const statesUsed = new Set(items.map(r => r.state)).size;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Total Workers', String(totalWorkers)], ['Total Gross', fmtCurrency(totalGross)], ['Certified', String(certified)], ['States', String(statesUsed)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Project', 'State', 'Format', 'Week Ending', 'Contractor', 'Status', 'Workers', 'Hours', 'Gross', 'Deductions', 'Net', 'Certified By', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No certified payroll reports found.'); td.setAttribute('colspan', '13'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const r of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', r.projectName));
          tr.appendChild(el('td', 'px-4 py-3', r.state));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.format));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.weekEnding));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.contractorName));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? STATUS_BADGE.draft}`, r.status));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 text-center', String(r.totalWorkers)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', r.totalHours.toLocaleString()));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.totalGross)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.totalDeductions)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.totalNet)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.certifiedBy || '\u2014'));

          const tdA = el('td', 'px-4 py-3');
          if (r.status === 'draft') {
            const btn = el('button', 'text-blue-400 hover:underline text-sm', 'Certify');
            btn.addEventListener('click', () => {
              void (async () => {
                try { await svc().certifyPayroll(r.id, 'current_user'); showMsg(wrapper, 'Payroll certified.'); void loadAndRender(); }
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
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load reports', false); }
    }

    void loadAndRender();
  },
};

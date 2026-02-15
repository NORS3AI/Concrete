/**
 * Federal Filings view.
 * Management of federal payroll tax forms (941, 940, W-2, W-3) with
 * status tracking, filing actions, and summary cards.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { FederalFormType, FilingStatus } from '../tax-compliance-service';

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

const FORM_OPTIONS = [
  { value: '', label: 'All Forms' },
  { value: '941', label: 'Form 941' },
  { value: '940', label: 'Form 940' },
  { value: 'w2', label: 'W-2' },
  { value: 'w3', label: 'W-3' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'filed', label: 'Filed' },
  { value: 'amended', label: 'Amended' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_review: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  filed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  amended: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const FORM_LABEL: Record<string, string> = { '941': 'Form 941', '940': 'Form 940', w2: 'W-2', w3: 'W-3' };

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Federal Tax Filings'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Filing');
    newBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const year = parseInt(currentYear, 10) || new Date().getFullYear();
          const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
          await svc().createFederalFiling({ filingId: `fed-${Date.now()}`, formType: '941', year, quarter, period: `Q${quarter} ${year}`, ein: '', totalWages: 0, totalFederalTax: 0, totalFicaSS: 0, totalFicaMed: 0, totalFUTA: 0, employeeCount: 0, dueDate: '', preparedBy: 'current_user' });
          showMsg(wrapper, 'Federal filing created.'); void loadAndRender();
        } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to create filing', false); }
      })();
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary cards
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filter bar
    let currentFormType = '';
    let currentStatus = '';
    let currentYear = String(new Date().getFullYear());

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const formSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of FORM_OPTIONS) { const o = el('option', '', opt.label) as HTMLOptionElement; o.value = opt.value; formSelect.appendChild(o); }
    filterBar.appendChild(formSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) { const o = el('option', '', opt.label) as HTMLOptionElement; o.value = opt.value; statusSelect.appendChild(o); }
    filterBar.appendChild(statusSelect);

    const yearInput = el('input', inputCls) as HTMLInputElement;
    yearInput.type = 'number'; yearInput.placeholder = 'Year'; yearInput.min = '2020'; yearInput.max = '2030'; yearInput.value = currentYear;
    filterBar.appendChild(yearInput);

    const fire = () => { currentFormType = formSelect.value; currentStatus = statusSelect.value; currentYear = yearInput.value; void loadAndRender(); };
    formSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire); yearInput.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    // Table
    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading federal filings...'));
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { formType?: FederalFormType; status?: FilingStatus; year?: number } = {};
        if (currentFormType) filters.formType = currentFormType as FederalFormType;
        if (currentStatus) filters.status = currentStatus as FilingStatus;
        const yr = parseInt(currentYear, 10); if (yr) filters.year = yr;

        const items = await svc().listFederalFilings(filters);
        countBadge.textContent = String(items.length);

        // Summary
        const totalWages = items.reduce((s, f) => s + f.totalWages, 0);
        const totalTax = items.reduce((s, f) => s + f.totalFederalTax + f.totalFicaSS + f.totalFicaMed + f.totalFUTA, 0);
        const filedCount = items.filter(f => f.status === 'filed').length;
        const draftCount = items.filter(f => f.status === 'draft').length;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Total Wages', fmtCurrency(totalWages)], ['Total Tax', fmtCurrency(totalTax)], ['Filed', String(filedCount)], ['Drafts', String(draftCount)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        // Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Form', 'Period', 'Status', 'EIN', 'Wages', 'Fed Tax', 'FICA SS', 'FICA Med', 'FUTA', 'Employees', 'Due Date', 'Actions']) {
          const align = ['Wages', 'Fed Tax', 'FICA SS', 'FICA Med', 'FUTA'].includes(col) ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right' : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No federal filings found.'); td.setAttribute('colspan', '12'); tr.appendChild(td); tbody.appendChild(tr);
        }
        for (const f of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', FORM_LABEL[f.formType] ?? f.formType));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', f.period));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[f.status] ?? STATUS_BADGE.draft}`, f.status.replace('_', ' ')));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 font-mono text-[var(--text-muted)] text-xs', f.ein || '\u2014'));
          tr.appendChild(el('td', 'px-4 py-3 text-right font-mono', fmtCurrency(f.totalWages)));
          tr.appendChild(el('td', 'px-4 py-3 text-right font-mono', fmtCurrency(f.totalFederalTax)));
          tr.appendChild(el('td', 'px-4 py-3 text-right font-mono', fmtCurrency(f.totalFicaSS)));
          tr.appendChild(el('td', 'px-4 py-3 text-right font-mono', fmtCurrency(f.totalFicaMed)));
          tr.appendChild(el('td', 'px-4 py-3 text-right font-mono', fmtCurrency(f.totalFUTA)));
          tr.appendChild(el('td', 'px-4 py-3 text-center text-[var(--text-muted)]', String(f.employeeCount)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', f.dueDate || '\u2014'));

          const tdA = el('td', 'px-4 py-3');
          const actWrap = el('div', 'flex items-center gap-3');
          if (f.status === 'draft' || f.status === 'approved') {
            const fileBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'File');
            fileBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().fileFederalFiling(f.id, `CONF-${Date.now()}`, 'current_user');
                  showMsg(wrapper, `${FORM_LABEL[f.formType]} filed successfully.`); void loadAndRender();
                } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to file', false); }
              })();
            });
            actWrap.appendChild(fileBtn);
          }
          tdA.appendChild(actWrap); tr.appendChild(tdA);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load filings', false); }
    }

    void loadAndRender();
  },
};

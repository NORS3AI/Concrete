/**
 * Form 1099 view.
 * 1099 generation, review, e-filing, and correction tracking.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { Form1099Type, Form1099Status } from '../tax-compliance-service';

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

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'NEC', label: '1099-NEC' },
  { value: 'MISC', label: '1099-MISC' },
  { value: 'INT', label: '1099-INT' },
  { value: 'DIV', label: '1099-DIV' },
  { value: 'R', label: '1099-R' },
  { value: 'S', label: '1099-S' },
  { value: 'K1', label: 'K-1' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  generated: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  reviewed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  filed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  corrected: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', '1099 Forms'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate 1099');
    newBtn.addEventListener('click', () => {
      void (async () => {
        try {
          await svc().createForm1099({ formId: `1099-${Date.now()}`, type: 'NEC', year: new Date().getFullYear(), payerEIN: '', payerName: '', recipientTIN: '', recipientName: 'New Recipient', recipientAddress: '', recipientCity: '', recipientState: '', recipientZip: '', amount: 0, federalTaxWithheld: 0, stateTaxWithheld: 0, stateIncome: 0, state: '', corrected: false });
          showMsg(wrapper, '1099 form created.'); void loadAndRender();
        } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
      })();
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filters
    let currentType = '';
    let currentStatus = '';
    let currentYear = String(new Date().getFullYear());

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) { const o = el('option', '', opt.label) as HTMLOptionElement; o.value = opt.value; typeSelect.appendChild(o); }
    filterBar.appendChild(typeSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'draft', l: 'Draft' }, { v: 'generated', l: 'Generated' }, { v: 'reviewed', l: 'Reviewed' }, { v: 'filed', l: 'Filed' }, { v: 'corrected', l: 'Corrected' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const yearInput = el('input', inputCls) as HTMLInputElement;
    yearInput.type = 'number'; yearInput.placeholder = 'Year'; yearInput.value = currentYear;
    filterBar.appendChild(yearInput);

    const fire = () => { currentType = typeSelect.value; currentStatus = statusSelect.value; currentYear = yearInput.value; void loadAndRender(); };
    typeSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire); yearInput.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading 1099 forms...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { type?: Form1099Type; status?: Form1099Status; year?: number } = {};
        if (currentType) filters.type = currentType as Form1099Type;
        if (currentStatus) filters.status = currentStatus as Form1099Status;
        const yr = parseInt(currentYear, 10); if (yr) filters.year = yr;

        const items = await svc().listForm1099s(filters);
        countBadge.textContent = String(items.length);

        const totalAmount = items.reduce((s, f) => s + f.amount, 0);
        const totalWithheld = items.reduce((s, f) => s + f.federalTaxWithheld + f.stateTaxWithheld, 0);
        const filed = items.filter(f => f.status === 'filed').length;
        const corrections = items.filter(f => f.corrected).length;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Total Payments', fmtCurrency(totalAmount)], ['Total Withheld', fmtCurrency(totalWithheld)], ['Filed', String(filed)], ['Corrections', String(corrections)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Type', 'Recipient', 'TIN', 'State', 'Amount', 'Fed W/H', 'State W/H', 'Status', 'Corrected', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No 1099 forms found.'); td.setAttribute('colspan', '10'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const f of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', `1099-${f.type}`));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', f.recipientName));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs text-[var(--text-muted)]', f.recipientTIN ? `***-**-${f.recipientTIN.slice(-4)}` : '\u2014'));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', f.state || '\u2014'));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(f.amount)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(f.federalTaxWithheld)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(f.stateTaxWithheld)));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[f.status] ?? STATUS_BADGE.draft}`, f.status));
          tr.appendChild(tdS);

          const tdC = el('td', 'px-4 py-3');
          tdC.appendChild(el('span', f.corrected ? 'text-amber-400 text-xs' : 'text-[var(--text-muted)] text-xs', f.corrected ? 'Yes' : 'No'));
          tr.appendChild(tdC);

          const tdA = el('td', 'px-4 py-3');
          const actWrap = el('div', 'flex items-center gap-3');
          if (f.status !== 'filed') {
            const fileBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'E-File');
            fileBtn.addEventListener('click', () => {
              void (async () => {
                try { await svc().fileForm1099(f.id, 'current_user'); showMsg(wrapper, `1099-${f.type} for ${f.recipientName} filed.`); void loadAndRender(); }
                catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
              })();
            });
            actWrap.appendChild(fileBtn);
          }
          tdA.appendChild(actWrap); tr.appendChild(tdA);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load 1099s', false); }
    }

    void loadAndRender();
  },
};

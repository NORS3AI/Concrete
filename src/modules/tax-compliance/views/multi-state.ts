/**
 * Multi-State Withholding view.
 * Mobile workforce withholding tracking and reciprocity agreement management.
 */

import { getTaxComplianceService } from '../service-accessor';

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

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Multi-State Withholding'));
    wrapper.appendChild(headerRow);

    // Tabs for withholding records vs reciprocity agreements
    const tabBar = el('div', 'flex gap-2 mb-6 border-b border-[var(--border)]');
    const tabWithholding = el('button', 'px-4 py-2 text-sm font-medium border-b-2 border-[var(--accent)] text-[var(--accent)]', 'Withholding Records');
    const tabReciprocity = el('button', 'px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]', 'Reciprocity Agreements');
    tabBar.appendChild(tabWithholding);
    tabBar.appendChild(tabReciprocity);
    wrapper.appendChild(tabBar);

    const contentArea = el('div');
    wrapper.appendChild(contentArea);
    container.appendChild(wrapper);

    let activeTab = 'withholding';

    function setTab(tab: string): void {
      activeTab = tab;
      tabWithholding.className = tab === 'withholding' ? 'px-4 py-2 text-sm font-medium border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]';
      tabReciprocity.className = tab === 'reciprocity' ? 'px-4 py-2 text-sm font-medium border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]';
      void loadContent();
    }

    tabWithholding.addEventListener('click', () => setTab('withholding'));
    tabReciprocity.addEventListener('click', () => setTab('reciprocity'));

    async function loadContent(): Promise<void> {
      contentArea.innerHTML = '';
      if (activeTab === 'withholding') {
        await renderWithholding();
      } else {
        await renderReciprocity();
      }
    }

    async function renderWithholding(): Promise<void> {
      try {
        const items = await svc().listMultiStateRecords();

        const summaryGrid = el('div', 'grid grid-cols-3 gap-4 mb-6');
        const totalWages = items.reduce((s, r) => s + r.wagesEarned, 0);
        const reciprocityCount = items.filter(r => r.reciprocityApplies).length;
        const uniqueStates = new Set(items.map(r => r.workState)).size;

        for (const [label, value] of [['Total Multi-State Wages', fmtCurrency(totalWages)], ['Reciprocity Applied', String(reciprocityCount)], ['Work States', String(uniqueStates)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryGrid.appendChild(card);
        }
        contentArea.appendChild(summaryGrid);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Employee', 'Resident State', 'Work State', 'Year', 'Quarter', 'Wages', 'Resident W/H', 'Work State W/H', 'Credit', 'Reciprocity']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No multi-state withholding records found.'); td.setAttribute('colspan', '10'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const r of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', r.employeeName));
          tr.appendChild(el('td', 'px-4 py-3', r.residentState));
          tr.appendChild(el('td', 'px-4 py-3', r.workState));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', String(r.year)));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', `Q${r.quarter}`));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.wagesEarned)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.residentWithholding)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.workStateWithholding)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(r.creditApplied)));

          const tdR = el('td', 'px-4 py-3');
          const badge = r.reciprocityApplies
            ? el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes')
            : el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', 'No');
          tdR.appendChild(badge); tr.appendChild(tdR);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        contentArea.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load records', false); }
    }

    async function renderReciprocity(): Promise<void> {
      try {
        const items = await svc().listReciprocityAgreements();

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Home State', 'Work State', 'Effective Date', 'Expiration', 'Exemption Type', 'Form Required', 'Active']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No reciprocity agreements found.'); td.setAttribute('colspan', '7'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const a of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', a.homeState));
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', a.workState));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', a.effectiveDate));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', a.expirationDate || '\u2014'));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', a.exemptionType));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', a.formRequired));
          const tdA = el('td', 'px-4 py-3');
          const badge = a.active
            ? el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Active')
            : el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', 'Inactive');
          tdA.appendChild(badge); tr.appendChild(tdA);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        contentArea.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load agreements', false); }
    }

    void loadContent();
  },
};

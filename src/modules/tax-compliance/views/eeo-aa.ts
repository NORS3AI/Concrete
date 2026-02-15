/**
 * EEO/AA Compliance view.
 * Equal Employment Opportunity and Affirmative Action compliance reporting.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { ComplianceReportStatus } from '../tax-compliance-service';

const svc = () => getTaxComplianceService();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
}

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const old = container.querySelector('[data-msg]'); if (old) old.remove();
  const cls = ok ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const m = el('div', cls, text); m.setAttribute('data-msg', '1'); container.prepend(m); setTimeout(() => m.remove(), 4000);
}

const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'EEO/AA Compliance'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Report');
    newBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const year = new Date().getFullYear();
          await svc().createEEOAAReport({ reportId: `eeo-${Date.now()}`, reportType: 'EEO-1', year, period: `Annual ${year}`, totalEmployees: 0, minorityCount: 0, femaleCount: 0, veteranCount: 0, disabledCount: 0, minorityPct: 0, femalePct: 0, goalMet: false, dueDate: `${year}-09-30`, preparedBy: 'current_user' });
          showMsg(wrapper, 'EEO/AA report created.'); void loadAndRender();
        } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
      })();
    });
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Summary
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filters
    let currentStatus = '';
    let currentYear = String(new Date().getFullYear());

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'draft', l: 'Draft' }, { v: 'submitted', l: 'Submitted' }, { v: 'accepted', l: 'Accepted' }, { v: 'rejected', l: 'Rejected' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const yearInput = el('input', inputCls) as HTMLInputElement;
    yearInput.type = 'number'; yearInput.placeholder = 'Year'; yearInput.value = currentYear;
    filterBar.appendChild(yearInput);

    const fire = () => { currentStatus = statusSelect.value; currentYear = yearInput.value; void loadAndRender(); };
    statusSelect.addEventListener('change', fire); yearInput.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading EEO/AA reports...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { year?: number; status?: ComplianceReportStatus } = {};
        if (currentStatus) filters.status = currentStatus as ComplianceReportStatus;
        const yr = parseInt(currentYear, 10); if (yr) filters.year = yr;

        const items = await svc().listEEOAAReports(filters);
        countBadge.textContent = String(items.length);

        const totalEmployees = items.reduce((s, r) => s + r.totalEmployees, 0);
        const avgMinority = items.length > 0 ? items.reduce((s, r) => s + r.minorityPct, 0) / items.length : 0;
        const avgFemale = items.length > 0 ? items.reduce((s, r) => s + r.femalePct, 0) / items.length : 0;
        const goalsMet = items.filter(r => r.goalMet).length;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Total Employees', String(totalEmployees)], ['Avg Minority %', fmtPct(avgMinority)], ['Avg Female %', fmtPct(avgFemale)], ['Goals Met', `${goalsMet}/${items.length}`]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Report Type', 'Period', 'Project', 'Status', 'Employees', 'Minority %', 'Female %', 'Veterans', 'Disabled', 'Goal Met', 'Due Date', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No EEO/AA reports found.'); td.setAttribute('colspan', '12'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const r of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', r.reportType));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.period));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.projectName || 'Company-wide'));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? STATUS_BADGE.draft}`, r.status));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 text-center', String(r.totalEmployees)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtPct(r.minorityPct)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtPct(r.femalePct)));
          tr.appendChild(el('td', 'px-4 py-3 text-center', String(r.veteranCount)));
          tr.appendChild(el('td', 'px-4 py-3 text-center', String(r.disabledCount)));

          const tdG = el('td', 'px-4 py-3');
          tdG.appendChild(el('span', r.goalMet ? 'text-emerald-400 text-xs font-medium' : 'text-red-400 text-xs font-medium', r.goalMet ? 'Yes' : 'No'));
          tr.appendChild(tdG);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', r.dueDate));

          const tdA = el('td', 'px-4 py-3');
          if (r.status === 'draft') {
            const btn = el('button', 'text-blue-400 hover:underline text-sm', 'Submit');
            btn.addEventListener('click', () => {
              void (async () => {
                try { await svc().submitEEOAAReport(r.id, 'current_user'); showMsg(wrapper, 'Report submitted.'); void loadAndRender(); }
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

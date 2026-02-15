/**
 * OCIP/CCIP view.
 * Owner and Contractor Controlled Insurance Program enrollment and reporting.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { InsuranceProgramType, InsuranceProgramStatus } from '../tax-compliance-service';

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
const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;

const STATUS_BADGE: Record<string, string> = {
  enrolled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  audit: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  OCIP: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  CCIP: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'OCIP / CCIP Programs'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary
    const summaryContainer = el('div', 'grid grid-cols-4 gap-4 mb-6');
    wrapper.appendChild(summaryContainer);

    // Filters
    let currentType = '';
    let currentStatus = '';

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Types' }, { v: 'OCIP', l: 'OCIP' }, { v: 'CCIP', l: 'CCIP' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'active', l: 'Active' }, { v: 'enrolled', l: 'Enrolled' }, { v: 'pending', l: 'Pending' }, { v: 'closed', l: 'Closed' }, { v: 'audit', l: 'Audit' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const fire = () => { currentType = typeSelect.value; currentStatus = statusSelect.value; void loadAndRender(); };
    typeSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading OCIP/CCIP programs...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { programType?: InsuranceProgramType; status?: InsuranceProgramStatus } = {};
        if (currentType) filters.programType = currentType as InsuranceProgramType;
        if (currentStatus) filters.status = currentStatus as InsuranceProgramStatus;

        const items = await svc().listOCIPCCIP(filters);
        countBadge.textContent = String(items.length);

        const totalPremium = items.reduce((s, p) => s + p.totalPremium, 0);
        const totalClaims = items.reduce((s, p) => s + p.totalClaims, 0);
        const totalContractors = items.reduce((s, p) => s + p.enrolledContractors, 0);
        const avgLoss = items.length > 0 ? items.reduce((s, p) => s + p.lossRatio, 0) / items.length : 0;

        summaryContainer.innerHTML = '';
        for (const [label, value] of [['Total Premium', fmtCurrency(totalPremium)], ['Total Claims', fmtCurrency(totalClaims)], ['Enrolled Contractors', String(totalContractors)], ['Avg Loss Ratio', fmtPct(avgLoss)]]) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', 'text-lg font-semibold text-[var(--text)]', value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Type', 'Project', 'Carrier', 'Policy #', 'Status', 'Effective', 'Expiration', 'Contractors', 'Premium', 'Claims', 'Loss Ratio']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No OCIP/CCIP programs found.'); td.setAttribute('colspan', '11'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const p of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          const tdType = el('td', 'px-4 py-3');
          tdType.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[p.programType] ?? TYPE_BADGE.OCIP}`, p.programType));
          tr.appendChild(tdType);
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', p.projectName));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', p.carrier));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs', p.policyNumber));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`, p.status));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', p.effectiveDate));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', p.expirationDate));
          tr.appendChild(el('td', 'px-4 py-3 text-center', String(p.enrolledContractors)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(p.totalPremium)));
          tr.appendChild(el('td', 'px-4 py-3 font-mono', fmtCurrency(p.totalClaims)));

          const lrColor = p.lossRatio > 0.8 ? 'text-red-400' : p.lossRatio > 0.5 ? 'text-amber-400' : 'text-emerald-400';
          tr.appendChild(el('td', `px-4 py-3 font-mono ${lrColor}`, fmtPct(p.lossRatio)));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load programs', false); }
    }

    void loadAndRender();
  },
};

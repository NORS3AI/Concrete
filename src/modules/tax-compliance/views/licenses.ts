/**
 * Licenses view.
 * State contractor license tracking with expiration alerts and status management.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { LicenseStatus } from '../tax-compliance-service';

const svc = () => getTaxComplianceService();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
}

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const old = container.querySelector('[data-msg]'); if (old) old.remove();
  const cls = ok ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const m = el('div', cls, text); m.setAttribute('data-msg', '1'); container.prepend(m); setTimeout(() => m.remove(), 4000);
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATES = ['', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Contractor Licenses'));
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

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const stateSelect = el('select', inputCls) as HTMLSelectElement;
    for (const st of STATES) { const o = el('option', '', st || 'All States') as HTMLOptionElement; o.value = st; stateSelect.appendChild(o); }
    filterBar.appendChild(stateSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of [{ v: '', l: 'All Statuses' }, { v: 'active', l: 'Active' }, { v: 'expiring_soon', l: 'Expiring Soon' }, { v: 'expired', l: 'Expired' }, { v: 'pending', l: 'Pending' }, { v: 'suspended', l: 'Suspended' }]) {
      const o = el('option', '', opt.l) as HTMLOptionElement; o.value = opt.v; statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const fire = () => { currentState = stateSelect.value; currentStatus = statusSelect.value; void loadAndRender(); };
    stateSelect.addEventListener('change', fire); statusSelect.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading licenses...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { state?: string; status?: LicenseStatus } = {};
        if (currentState) filters.state = currentState;
        if (currentStatus) filters.status = currentStatus as LicenseStatus;

        const items = await svc().listLicenses(filters);
        countBadge.textContent = String(items.length);

        const active = items.filter(l => l.status === 'active').length;
        const expiring = items.filter(l => l.status === 'expiring_soon').length;
        const expired = items.filter(l => l.status === 'expired').length;
        const states = new Set(items.map(l => l.state)).size;

        summaryContainer.innerHTML = '';
        for (const [label, value, color] of [['Active', String(active), 'text-emerald-400'], ['Expiring Soon', String(expiring), 'text-amber-400'], ['Expired', String(expired), 'text-red-400'], ['States', String(states), 'text-[var(--text)]']] as const) {
          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
          card.appendChild(el('div', `text-lg font-semibold ${color}`, value));
          summaryContainer.appendChild(card);
        }

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Entity', 'State', 'License #', 'Type', 'Classification', 'Issue Date', 'Expiration', 'Status', 'Bond Req', 'Insurance']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No licenses found.'); td.setAttribute('colspan', '10'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const l of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', l.entityName));
          tr.appendChild(el('td', 'px-4 py-3', l.state));
          tr.appendChild(el('td', 'px-4 py-3 font-mono text-xs', l.licenseNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', l.licenseType));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', l.classification));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', l.issueDate));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', l.expirationDate));

          const tdS = el('td', 'px-4 py-3');
          tdS.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[l.status] ?? STATUS_BADGE.pending}`, l.status.replace('_', ' ')));
          tr.appendChild(tdS);

          tr.appendChild(el('td', 'px-4 py-3 text-center', l.bondRequired ? 'Yes' : 'No'));
          tr.appendChild(el('td', 'px-4 py-3 text-center', l.insuranceRequired ? 'Yes' : 'No'));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load licenses', false); }
    }

    void loadAndRender();
  },
};

/**
 * Audit Trail view.
 * Complete audit log of all tax-relevant transactions with filtering by
 * entity type, action, user, and date range.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { AuditAction } from '../tax-compliance-service';

const svc = () => getTaxComplianceService();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
}

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const old = container.querySelector('[data-msg]'); if (old) old.remove();
  const cls = ok ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const m = el('div', cls, text); m.setAttribute('data-msg', '1'); container.prepend(m); setTimeout(() => m.remove(), 4000);
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  update: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  delete: 'bg-red-500/10 text-red-400 border border-red-500/20',
  file: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  approve: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  reject: 'bg-red-500/10 text-red-400 border border-red-500/20',
  generate: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  import: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  export: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const ENTITY_TYPES = ['', 'federal_filing', 'state_filing', '1099', 'sales_tax', 'license', 'ocip_ccip', 'eeoaa_report', 'prevailing_wage', 'certified_payroll', 'tax_rates', 'year_end'];
const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'file', 'approve', 'reject', 'generate', 'import', 'export'];

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tax Audit Trail'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Filters
    let currentEntityType = '';
    let currentAction = '';

    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const entitySelect = el('select', inputCls) as HTMLSelectElement;
    for (const et of ENTITY_TYPES) {
      const o = el('option', '', et ? et.replace(/_/g, ' ') : 'All Entity Types') as HTMLOptionElement;
      o.value = et; entitySelect.appendChild(o);
    }
    filterBar.appendChild(entitySelect);

    const actionSelect = el('select', inputCls) as HTMLSelectElement;
    const actionOpt = el('option', '', 'All Actions') as HTMLOptionElement; actionOpt.value = ''; actionSelect.appendChild(actionOpt);
    for (const a of ACTIONS) { const o = el('option', '', a) as HTMLOptionElement; o.value = a; actionSelect.appendChild(o); }
    filterBar.appendChild(actionSelect);

    const fire = () => { currentEntityType = entitySelect.value; currentAction = actionSelect.value; void loadAndRender(); };
    entitySelect.addEventListener('change', fire); actionSelect.addEventListener('change', fire);
    wrapper.appendChild(filterBar);

    const tableContainer = el('div');
    tableContainer.appendChild(el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading audit trail...'));
    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    async function loadAndRender(): Promise<void> {
      try {
        const filters: { entityType?: string; action?: AuditAction } = {};
        if (currentEntityType) filters.entityType = currentEntityType;
        if (currentAction) filters.action = currentAction as AuditAction;

        const items = await svc().listAuditEntries(filters);
        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');
        const thead = el('thead'); const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Timestamp', 'User', 'Action', 'Entity Type', 'Description']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow); table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) { const tr = el('tr'); const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No audit entries found.'); td.setAttribute('colspan', '5'); tr.appendChild(td); tbody.appendChild(tr); }

        for (const entry of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'px-4 py-3 text-xs font-mono text-[var(--text-muted)]', fmtDateTime(entry.timestamp)));
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)]', entry.userName));

          const tdA = el('td', 'px-4 py-3');
          tdA.appendChild(el('span', `px-2 py-0.5 rounded text-xs font-medium ${ACTION_BADGE[entry.action] ?? ACTION_BADGE.update}`, entry.action));
          tr.appendChild(tdA);

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', entry.entityType.replace(/_/g, ' ')));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)] max-w-md truncate', entry.entityDescription));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody); wrap.appendChild(table);
        tableContainer.innerHTML = ''; tableContainer.appendChild(wrap);
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load audit trail', false); }
    }

    void loadAndRender();
  },
};

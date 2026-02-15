/**
 * Policy Expiration Alerts view.
 * Shows policies approaching expiration with color-coded urgency,
 * summary cards for alert categories, and refresh functionality.
 * Wired to BondingService.getPolicyAlerts().
 */

import { getBondingService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 5000);
}

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
  general_liability: 'General Liability',
  auto: 'Auto',
  umbrella: 'Umbrella',
  workers_comp: 'Workers Comp',
  builders_risk: 'Builders Risk',
  professional: 'Professional',
  pollution: 'Pollution',
  cyber: 'Cyber',
  other: 'Other',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Policy Expiration Alerts'));
    const refreshBtn = el('button', btnCls, 'Refresh');
    refreshBtn.type = 'button';
    headerRow.appendChild(refreshBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-4 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Alerts'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const expiredCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    expiredCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Expired'));
    const expiredValue = el('div', 'text-2xl font-bold text-red-400', '--');
    expiredCard.appendChild(expiredValue);
    summaryRow.appendChild(expiredCard);

    const under30Card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    under30Card.appendChild(el('div', 'text-sm text-[var(--text-muted)]', '< 30 Days'));
    const under30Value = el('div', 'text-2xl font-bold text-amber-400', '--');
    under30Card.appendChild(under30Value);
    summaryRow.appendChild(under30Card);

    const under90Card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    under90Card.appendChild(el('div', 'text-sm text-[var(--text-muted)]', '< 90 Days'));
    const under90Value = el('div', 'text-2xl font-bold text-blue-400', '--');
    under90Card.appendChild(under90Value);
    summaryRow.appendChild(under90Card);

    wrapper.appendChild(summaryRow);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading alerts...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();
        const items = await svc.getPolicyAlerts(180);

        // Update summary
        const expiredCount = items.filter((a) => a.daysUntilExpiry < 0).length;
        const under30Count = items.filter((a) => a.daysUntilExpiry >= 0 && a.daysUntilExpiry < 30).length;
        const under90Count = items.filter((a) => a.daysUntilExpiry >= 0 && a.daysUntilExpiry < 90).length;
        totalValue.textContent = String(items.length);
        expiredValue.textContent = String(expiredCount);
        under30Value.textContent = String(under30Count);
        under90Value.textContent = String(under90Count);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Policy #', 'Type', 'Carrier', 'Expiration', 'Days Until Expiry', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No policy alerts within the next 180 days. All policies are current.');
          td.setAttribute('colspan', '6');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.policyNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.type] ?? item.type));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.carrier));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.expirationDate));

          // Days Until Expiry with color coding
          const tdDays = el('td', 'px-4 py-3 text-sm');
          let daysColor = 'text-blue-400';
          if (item.daysUntilExpiry < 0) daysColor = 'text-red-400';
          else if (item.daysUntilExpiry < 30) daysColor = 'text-amber-400';
          const daysText = item.daysUntilExpiry < 0
            ? `${Math.abs(item.daysUntilExpiry)} days ago`
            : `${item.daysUntilExpiry} days`;
          tdDays.appendChild(el('span', `font-mono font-medium ${daysColor}`, daysText));
          tr.appendChild(tdDays);

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.active;
          const label = STATUS_LABEL[item.status] ?? item.status;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, label));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load policy alerts';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Refresh Handler ----
    refreshBtn.addEventListener('click', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};

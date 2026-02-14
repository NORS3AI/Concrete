/**
 * Cash Position Dashboard view.
 * Shows total cash balance across all accounts with per-account breakdown.
 * Wired to BankingService for data loading.
 */

import { getBankingService } from '../service-accessor';

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
  checking: 'Checking',
  savings: 'Savings',
  money_market: 'Money Market',
  credit_card: 'Credit Card',
  line_of_credit: 'Line of Credit',
  trust: 'Trust',
  petty_cash: 'Petty Cash',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Cash Position Dashboard'));
    const refreshBtn = el('button', btnCls, 'Refresh');
    refreshBtn.type = 'button';
    headerRow.appendChild(refreshBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Card ----
    const summaryRow = el('div', 'grid grid-cols-1 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', 'Total Cash Balance'));
    const totalValue = el('div', 'text-3xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    wrapper.appendChild(summaryRow);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading cash position...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBankingService();
        const position = await svc.getCashPosition();

        // Update summary
        const balCls = position.totalBalance >= 0 ? 'text-3xl font-bold text-emerald-400' : 'text-3xl font-bold text-red-400';
        totalValue.className = balCls;
        totalValue.textContent = fmtCurrency(position.totalBalance);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Account Name', 'Type', 'Balance']) {
          const align = col === 'Balance'
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (position.byAccount.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No active accounts found. Create a bank account to see your cash position.');
          td.setAttribute('colspan', '3');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const acct of position.byAccount) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', acct.name));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', TYPE_LABEL[acct.type] ?? acct.type));

          const balanceCls = acct.balance >= 0
            ? 'px-4 py-3 text-sm font-mono text-right text-emerald-400'
            : 'px-4 py-3 text-sm font-mono text-right text-red-400';
          tr.appendChild(el('td', balanceCls, fmtCurrency(acct.balance)));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load cash position';
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

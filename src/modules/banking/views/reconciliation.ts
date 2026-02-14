/**
 * Bank Reconciliation view.
 * List of reconciliations with summary cards, account filter, and complete action.
 * Wired to BankingService for CRUD operations.
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

const STATUS_BADGE: Record<string, string> = {
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  approved: 'Approved',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bank Reconciliation'));
    const newBtn = el('button', btnCls, 'New Reconciliation');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Reconciliations'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const inProgressCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    inProgressCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'In Progress'));
    const inProgressValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    inProgressCard.appendChild(inProgressValue);
    summaryRow.appendChild(inProgressCard);

    const completedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    completedCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Completed'));
    const completedValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    completedCard.appendChild(completedValue);
    summaryRow.appendChild(completedCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Reconciliation'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

    const acctGroup = el('div');
    acctGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Account'));
    const acctFormSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    const defaultAcctOpt = el('option', '', 'Select Account') as HTMLOptionElement;
    defaultAcctOpt.value = '';
    acctFormSelect.appendChild(defaultAcctOpt);
    acctGroup.appendChild(acctFormSelect);
    formGrid.appendChild(acctGroup);

    const stmtDateGroup = el('div');
    stmtDateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Statement Date'));
    const stmtDateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    stmtDateInput.type = 'date';
    stmtDateGroup.appendChild(stmtDateInput);
    formGrid.appendChild(stmtDateGroup);

    const stmtBalGroup = el('div');
    stmtBalGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Statement Balance'));
    const stmtBalInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    stmtBalInput.type = 'number';
    stmtBalInput.step = '0.01';
    stmtBalInput.placeholder = '0.00';
    stmtBalGroup.appendChild(stmtBalInput);
    formGrid.appendChild(stmtBalGroup);

    const bookBalGroup = el('div');
    bookBalGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Book Balance'));
    const bookBalInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    bookBalInput.type = 'number';
    bookBalInput.step = '0.01';
    bookBalInput.placeholder = '0.00';
    bookBalGroup.appendChild(bookBalInput);
    formGrid.appendChild(bookBalGroup);

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
    saveBtn.type = 'button';
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    cancelBtn.type = 'button';
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    newBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Account Filter ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const accountFilter = el('select', inputCls) as HTMLSelectElement;
    const allAcctOpt = el('option', '', 'All Accounts') as HTMLOptionElement;
    allAcctOpt.value = '';
    accountFilter.appendChild(allAcctOpt);
    filterBar.appendChild(accountFilter);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading reconciliations...'));
      tableContainer.appendChild(loader);
    }

    // ---- Load Accounts ----
    async function loadAccounts(): Promise<void> {
      try {
        const svc = getBankingService();
        const accounts = await svc.listAccounts({ status: 'active' as any });
        for (const acct of accounts) {
          const label = `${acct.name} (${acct.accountNumber})`;
          const o1 = el('option', '', label) as HTMLOptionElement;
          o1.value = (acct as any).id;
          accountFilter.appendChild(o1);

          const o2 = el('option', '', label) as HTMLOptionElement;
          o2.value = (acct as any).id;
          o2.setAttribute('data-name', acct.name);
          acctFormSelect.appendChild(o2);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load accounts';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBankingService();

        const accountId = accountFilter.value || undefined;
        const items = await svc.listReconciliations(accountId);

        // Update summary
        const allItems = await svc.listReconciliations();
        const inProgressCount = allItems.filter((r) => r.status === 'in_progress').length;
        const completedCount = allItems.filter((r) => r.status === 'completed' || r.status === 'approved').length;
        totalValue.textContent = String(allItems.length);
        inProgressValue.textContent = String(inProgressCount);
        completedValue.textContent = String(completedCount);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        const cols = ['Account', 'Statement Date', 'Statement Bal', 'Book Bal', 'Difference', 'Outstanding Deposits', 'Outstanding Checks', 'Status', 'Actions'];
        for (const col of cols) {
          const isNum = ['Statement Bal', 'Book Bal', 'Difference', 'Outstanding Deposits', 'Outstanding Checks'].includes(col);
          const align = isNum
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No reconciliations found. Start a new reconciliation to get started.');
          td.setAttribute('colspan', String(cols.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', item.accountName || item.accountId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.statementDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.statementBalance)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.bookBalance)));

          const diffCls = item.difference === 0
            ? 'px-4 py-3 text-sm font-mono text-right text-emerald-400'
            : 'px-4 py-3 text-sm font-mono text-right text-red-400';
          tr.appendChild(el('td', diffCls, fmtCurrency(item.difference)));

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.outstandingDeposits)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.outstandingChecks)));

          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.in_progress;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'in_progress') {
            const completeBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Complete');
            completeBtn.type = 'button';
            completeBtn.addEventListener('click', () => {
              const user = prompt('Reconciled by (your name):');
              if (!user || !user.trim()) return;
              void (async () => {
                try {
                  const svc = getBankingService();
                  await svc.completeReconciliation((item as any).id, user.trim());
                  showMsg(wrapper, 'Reconciliation completed successfully.', false);
                  await loadAndRender();
                } catch (actionErr: unknown) {
                  const msg = actionErr instanceof Error ? actionErr.message : 'Failed to complete reconciliation';
                  showMsg(wrapper, msg, true);
                }
              })();
            });
            tdActions.appendChild(completeBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', item.reconciledBy ? `By: ${item.reconciledBy}` : '--'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load reconciliations';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBankingService();

          if (!acctFormSelect.value) {
            showMsg(wrapper, 'Please select an account.', true);
            return;
          }
          if (!stmtDateInput.value) {
            showMsg(wrapper, 'Statement date is required.', true);
            return;
          }

          const selectedOption = acctFormSelect.selectedOptions[0];
          const accountName = selectedOption?.getAttribute('data-name') ?? '';

          await svc.createReconciliation({
            accountId: acctFormSelect.value,
            accountName,
            statementDate: stmtDateInput.value,
            statementBalance: parseFloat(stmtBalInput.value) || 0,
            bookBalance: parseFloat(bookBalInput.value) || 0,
          });

          showMsg(wrapper, 'Reconciliation created successfully.', false);
          formWrap.classList.add('hidden');
          stmtDateInput.value = '';
          stmtBalInput.value = '';
          bookBalInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create reconciliation';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    accountFilter.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAccounts().then(() => loadAndRender());
  },
};

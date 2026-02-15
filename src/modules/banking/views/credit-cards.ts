/**
 * Credit Card Transactions view.
 * Account selector with CC transactions table, status filter, code and approve actions.
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'coded', label: 'Coded' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  coded: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  posted: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  coded: 'Coded',
  approved: 'Approved',
  posted: 'Posted',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Credit Card Transactions'));
    const importBtn = el('button', btnCls, 'Import Transaction');
    importBtn.type = 'button';
    headerRow.appendChild(importBtn);
    wrapper.appendChild(headerRow);

    // ---- Import Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Import Credit Card Transaction'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const txnDateGroup = el('div');
    txnDateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Transaction Date'));
    const txnDateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    txnDateInput.type = 'date';
    txnDateGroup.appendChild(txnDateInput);
    formGrid.appendChild(txnDateGroup);

    const descGroup = el('div');
    descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    const descInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    descInput.type = 'text';
    descInput.placeholder = 'Transaction description';
    descGroup.appendChild(descInput);
    formGrid.appendChild(descGroup);

    const amtGroup = el('div');
    amtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Amount'));
    const amtInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    amtInput.type = 'number';
    amtInput.step = '0.01';
    amtInput.placeholder = '0.00';
    amtGroup.appendChild(amtInput);
    formGrid.appendChild(amtGroup);

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

    importBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Account Selector + Status Filter ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const accountSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'Select Account') as HTMLOptionElement;
    defaultOpt.value = '';
    accountSelect.appendChild(defaultOpt);
    filterBar.appendChild(accountSelect);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading transactions...'));
      tableContainer.appendChild(loader);
    }

    function showPlaceholder(): void {
      tableContainer.innerHTML = '';
      const ph = el('div', 'flex items-center justify-center py-12');
      ph.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Select a credit card account to view transactions.'));
      tableContainer.appendChild(ph);
    }

    // ---- Load Accounts ----
    async function loadAccounts(): Promise<void> {
      try {
        const svc = getBankingService();
        const accounts = await svc.listAccounts({ type: 'credit_card' as any });
        for (const acct of accounts) {
          const o = el('option', '', `${acct.name} (${acct.accountNumber})`) as HTMLOptionElement;
          o.value = (acct as any).id;
          accountSelect.appendChild(o);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load accounts';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      const accountId = accountSelect.value;
      if (!accountId) {
        showPlaceholder();
        return;
      }

      showLoading();
      try {
        const svc = getBankingService();

        const filters: { status?: any } = {};
        if (statusSelect.value) filters.status = statusSelect.value;

        const items = await svc.listCCTransactions(accountId, filters);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        const cols = ['Date', 'Description', 'Amount', 'Category', 'GL Account', 'Job', 'Status', 'Actions'];
        for (const col of cols) {
          const align = col === 'Amount'
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No transactions found for this account.');
          td.setAttribute('colspan', String(cols.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.transactionDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.description));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.amount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.category ?? '--'));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-[var(--text-muted)]', item.glAccountId ?? '--'));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.jobId ?? '--'));

          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          const tdActions = el('td', 'px-4 py-3 text-sm');

          if (item.status === 'pending') {
            const codeBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Code');
            codeBtn.type = 'button';
            codeBtn.addEventListener('click', () => {
              const glAccount = prompt('Enter GL Account ID:');
              if (!glAccount || !glAccount.trim()) return;
              const jobId = prompt('Enter Job ID (optional):');
              void (async () => {
                try {
                  const svc = getBankingService();
                  await svc.codeCCTransaction(
                    (item as any).id,
                    glAccount.trim(),
                    jobId?.trim() || undefined,
                  );
                  showMsg(wrapper, 'Transaction coded successfully.', false);
                  await loadAndRender();
                } catch (actionErr: unknown) {
                  const msg = actionErr instanceof Error ? actionErr.message : 'Failed to code transaction';
                  showMsg(wrapper, msg, true);
                }
              })();
            });
            tdActions.appendChild(codeBtn);
          }

          if (item.status === 'coded') {
            const approveBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Approve');
            approveBtn.type = 'button';
            approveBtn.addEventListener('click', () => {
              const approver = prompt('Approved by (your name):');
              if (!approver || !approver.trim()) return;
              void (async () => {
                try {
                  const svc = getBankingService();
                  await svc.approveCCTransaction((item as any).id, approver.trim());
                  showMsg(wrapper, 'Transaction approved successfully.', false);
                  await loadAndRender();
                } catch (actionErr: unknown) {
                  const msg = actionErr instanceof Error ? actionErr.message : 'Failed to approve transaction';
                  showMsg(wrapper, msg, true);
                }
              })();
            });
            tdActions.appendChild(approveBtn);
          }

          if (item.status !== 'pending' && item.status !== 'coded') {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '--'));
          }

          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load transactions';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBankingService();
          const accountId = accountSelect.value;

          if (!accountId) {
            showMsg(wrapper, 'Please select an account first.', true);
            return;
          }
          if (!txnDateInput.value) {
            showMsg(wrapper, 'Transaction date is required.', true);
            return;
          }
          if (!descInput.value.trim()) {
            showMsg(wrapper, 'Description is required.', true);
            return;
          }

          await svc.importCCTransaction({
            accountId,
            transactionDate: txnDateInput.value,
            description: descInput.value.trim(),
            amount: parseFloat(amtInput.value) || 0,
          });

          showMsg(wrapper, 'Transaction imported successfully.', false);
          formWrap.classList.add('hidden');
          txnDateInput.value = '';
          descInput.value = '';
          amtInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to import transaction';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    accountSelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAccounts();
    showPlaceholder();
  },
};

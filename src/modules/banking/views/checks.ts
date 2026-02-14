/**
 * Check Register view.
 * List of checks with account/status filters, void and reissue actions.
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
  { value: 'issued', label: 'Issued' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'voided', label: 'Voided' },
  { value: 'stale', label: 'Stale' },
  { value: 'reissued', label: 'Reissued' },
];

const STATUS_BADGE: Record<string, string> = {
  issued: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  cleared: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  voided: 'bg-red-500/10 text-red-400 border border-red-500/20',
  stale: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  reissued: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  issued: 'Issued',
  cleared: 'Cleared',
  voided: 'Voided',
  stale: 'Stale',
  reissued: 'Reissued',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Check Register'));
    const issueBtn = el('button', btnCls, 'Issue Check');
    issueBtn.type = 'button';
    headerRow.appendChild(issueBtn);
    wrapper.appendChild(headerRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Issue New Check'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const acctGroup = el('div');
    acctGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Account'));
    const acctFormSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    const defaultAcctOpt = el('option', '', 'Select Account') as HTMLOptionElement;
    defaultAcctOpt.value = '';
    acctFormSelect.appendChild(defaultAcctOpt);
    acctGroup.appendChild(acctFormSelect);
    formGrid.appendChild(acctGroup);

    const checkNumGroup = el('div');
    checkNumGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Check Number'));
    const checkNumInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    checkNumInput.type = 'text';
    checkNumInput.placeholder = 'Check number';
    checkNumGroup.appendChild(checkNumInput);
    formGrid.appendChild(checkNumGroup);

    const payeeGroup = el('div');
    payeeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Payee'));
    const payeeInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    payeeInput.type = 'text';
    payeeInput.placeholder = 'Payee name';
    payeeGroup.appendChild(payeeInput);
    formGrid.appendChild(payeeGroup);

    const amtGroup = el('div');
    amtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Amount'));
    const amtInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    amtInput.type = 'number';
    amtInput.step = '0.01';
    amtInput.placeholder = '0.00';
    amtGroup.appendChild(amtInput);
    formGrid.appendChild(amtGroup);

    const dateGroup = el('div');
    dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Issue Date'));
    const dateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    dateInput.type = 'date';
    dateGroup.appendChild(dateInput);
    formGrid.appendChild(dateGroup);

    const memoGroup = el('div');
    memoGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Memo'));
    const memoInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    memoInput.type = 'text';
    memoInput.placeholder = 'Memo (optional)';
    memoGroup.appendChild(memoInput);
    formGrid.appendChild(memoGroup);

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

    issueBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Filter Bar ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const accountFilter = el('select', inputCls) as HTMLSelectElement;
    const allAcctOpt = el('option', '', 'All Accounts') as HTMLOptionElement;
    allAcctOpt.value = '';
    accountFilter.appendChild(allAcctOpt);
    filterBar.appendChild(accountFilter);

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
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading checks...'));
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
        const filters: { status?: any } = {};
        if (statusSelect.value) filters.status = statusSelect.value;

        const items = await svc.listChecks(accountId, filters);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        const cols = ['Check #', 'Account', 'Payee', 'Amount', 'Issue Date', 'Cleared Date', 'Status', 'Actions'];
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
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No checks found. Issue your first check to get started.');
          td.setAttribute('colspan', String(cols.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-[var(--accent)]', item.checkNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.accountId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.payee));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.amount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.issueDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.clearedDate ?? '--'));

          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.issued;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'issued') {
            const voidBtn = el('button', 'text-red-400 hover:underline text-sm mr-2', 'Void');
            voidBtn.type = 'button';
            voidBtn.addEventListener('click', () => {
              if (!confirm(`Void check #${item.checkNumber}?`)) return;
              void (async () => {
                try {
                  const svc = getBankingService();
                  await svc.voidCheck((item as any).id);
                  showMsg(wrapper, `Check #${item.checkNumber} voided successfully.`, false);
                  await loadAndRender();
                } catch (actionErr: unknown) {
                  const msg = actionErr instanceof Error ? actionErr.message : 'Failed to void check';
                  showMsg(wrapper, msg, true);
                }
              })();
            });
            tdActions.appendChild(voidBtn);

            const reissueBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Reissue');
            reissueBtn.type = 'button';
            reissueBtn.addEventListener('click', () => {
              const newNum = prompt('Enter new check number for reissue:');
              if (!newNum || !newNum.trim()) return;
              void (async () => {
                try {
                  const svc = getBankingService();
                  await svc.reissueCheck((item as any).id, newNum.trim());
                  showMsg(wrapper, `Check #${item.checkNumber} reissued as #${newNum.trim()}.`, false);
                  await loadAndRender();
                } catch (actionErr: unknown) {
                  const msg = actionErr instanceof Error ? actionErr.message : 'Failed to reissue check';
                  showMsg(wrapper, msg, true);
                }
              })();
            });
            tdActions.appendChild(reissueBtn);
          } else {
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
        const message = err instanceof Error ? err.message : 'Failed to load checks';
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
          if (!checkNumInput.value.trim()) {
            showMsg(wrapper, 'Check number is required.', true);
            return;
          }
          if (!payeeInput.value.trim()) {
            showMsg(wrapper, 'Payee is required.', true);
            return;
          }

          await svc.issueCheck({
            accountId: acctFormSelect.value,
            checkNumber: checkNumInput.value.trim(),
            payee: payeeInput.value.trim(),
            amount: parseFloat(amtInput.value) || 0,
            issueDate: dateInput.value || undefined,
            memo: memoInput.value.trim() || undefined,
          });

          showMsg(wrapper, 'Check issued successfully.', false);
          formWrap.classList.add('hidden');
          checkNumInput.value = '';
          payeeInput.value = '';
          amtInput.value = '';
          dateInput.value = '';
          memoInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to issue check';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    accountFilter.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAccounts();
    void loadAndRender();
  },
};

/**
 * Petty Cash view.
 * List of petty cash funds with click-to-expand detail transactions.
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Petty Cash'));
    const newFundBtn = el('button', btnCls, 'New Fund');
    newFundBtn.type = 'button';
    headerRow.appendChild(newFundBtn);
    wrapper.appendChild(headerRow);

    // ---- New Fund Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Petty Cash Fund'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

    const custodianGroup = el('div');
    custodianGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Custodian'));
    const custodianInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    custodianInput.type = 'text';
    custodianInput.placeholder = 'Custodian name';
    custodianGroup.appendChild(custodianInput);
    formGrid.appendChild(custodianGroup);

    const fundAmtGroup = el('div');
    fundAmtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Fund Amount'));
    const fundAmtInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    fundAmtInput.type = 'number';
    fundAmtInput.step = '0.01';
    fundAmtInput.placeholder = '0.00';
    fundAmtGroup.appendChild(fundAmtInput);
    formGrid.appendChild(fundAmtGroup);

    const locationGroup = el('div');
    locationGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Location'));
    const locationInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    locationInput.type = 'text';
    locationInput.placeholder = 'Location (optional)';
    locationGroup.appendChild(locationInput);
    formGrid.appendChild(locationGroup);

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveFundBtn = el('button', btnCls, 'Save');
    saveFundBtn.type = 'button';
    const cancelFundBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    cancelFundBtn.type = 'button';
    formBtnRow.appendChild(saveFundBtn);
    formBtnRow.appendChild(cancelFundBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    newFundBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelFundBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Funds Table Container ----
    const fundsContainer = el('div', 'mb-6');
    wrapper.appendChild(fundsContainer);

    // ---- Detail Section ----
    const detailSection = el('div', 'hidden');
    const detailHeader = el('div', 'flex items-center justify-between mb-3');
    const detailTitle = el('h2', 'text-lg font-semibold text-[var(--text)]', 'Fund Transactions');
    detailHeader.appendChild(detailTitle);
    const expenseBtn = el('button', btnCls, 'Record Expense');
    expenseBtn.type = 'button';
    detailHeader.appendChild(expenseBtn);
    detailSection.appendChild(detailHeader);

    // ---- Expense Form (hidden) ----
    const expenseFormWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    expenseFormWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Record Expense'));

    const expenseGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

    const expDescGroup = el('div');
    expDescGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    const expDescInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    expDescInput.type = 'text';
    expDescInput.placeholder = 'Expense description';
    expDescGroup.appendChild(expDescInput);
    expenseGrid.appendChild(expDescGroup);

    const expAmtGroup = el('div');
    expAmtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Amount'));
    const expAmtInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    expAmtInput.type = 'number';
    expAmtInput.step = '0.01';
    expAmtInput.placeholder = '0.00';
    expAmtGroup.appendChild(expAmtInput);
    expenseGrid.appendChild(expAmtGroup);

    const expCatGroup = el('div');
    expCatGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Category'));
    const expCatInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    expCatInput.type = 'text';
    expCatInput.placeholder = 'Category (optional)';
    expCatGroup.appendChild(expCatInput);
    expenseGrid.appendChild(expCatGroup);

    const expReceiptGroup = el('div', 'flex items-center gap-2 pt-6');
    const expReceiptCheckbox = el('input', '') as HTMLInputElement;
    expReceiptCheckbox.type = 'checkbox';
    expReceiptCheckbox.id = 'pc-receipt';
    expReceiptGroup.appendChild(expReceiptCheckbox);
    expReceiptGroup.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'Receipt'));
    expenseGrid.appendChild(expReceiptGroup);

    expenseFormWrap.appendChild(expenseGrid);

    const expFormBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveExpBtn = el('button', btnCls, 'Save Expense');
    saveExpBtn.type = 'button';
    const cancelExpBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    cancelExpBtn.type = 'button';
    expFormBtnRow.appendChild(saveExpBtn);
    expFormBtnRow.appendChild(cancelExpBtn);
    expenseFormWrap.appendChild(expFormBtnRow);
    detailSection.appendChild(expenseFormWrap);

    expenseBtn.addEventListener('click', () => expenseFormWrap.classList.toggle('hidden'));
    cancelExpBtn.addEventListener('click', () => expenseFormWrap.classList.add('hidden'));

    const detailTableContainer = el('div');
    detailSection.appendChild(detailTableContainer);

    wrapper.appendChild(detailSection);

    container.appendChild(wrapper);

    // Track selected fund
    let selectedFundId: string | null = null;

    // ---- Loading Indicator ----
    function showLoading(target: HTMLElement, text: string): void {
      target.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', text));
      target.appendChild(loader);
    }

    // ---- Load Funds ----
    async function loadFunds(): Promise<void> {
      showLoading(fundsContainer, 'Loading petty cash funds...');
      try {
        const svc = getBankingService();
        const funds = await svc.listPettyCashFunds();

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Custodian', 'Fund Amount', 'Current Balance', 'Location', 'Active']) {
          const isNum = ['Fund Amount', 'Current Balance'].includes(col);
          const align = isNum
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (funds.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No petty cash funds found. Create a new fund to get started.');
          td.setAttribute('colspan', '5');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const fund of funds) {
          const isSelected = selectedFundId === (fund as any).id;
          const rowCls = isSelected
            ? 'border-t border-[var(--border)] bg-[var(--accent)]/5 cursor-pointer transition-colors'
            : 'border-t border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer transition-colors';
          const tr = el('tr', rowCls);

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', fund.custodian));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(fund.fundAmount)));

          const balCls = fund.currentBalance >= 0
            ? 'px-4 py-3 text-sm font-mono text-right text-emerald-400'
            : 'px-4 py-3 text-sm font-mono text-right text-red-400';
          tr.appendChild(el('td', balCls, fmtCurrency(fund.currentBalance)));

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', fund.location ?? '--'));

          const tdActive = el('td', 'px-4 py-3 text-sm');
          if (fund.active) {
            tdActive.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Active'));
          } else {
            tdActive.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'Inactive'));
          }
          tr.appendChild(tdActive);

          tr.addEventListener('click', () => {
            selectedFundId = (fund as any).id;
            detailTitle.textContent = `Transactions - ${fund.custodian}`;
            detailSection.classList.remove('hidden');
            void loadTransactions();
            void loadFunds(); // re-render to update selected state
          });

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        fundsContainer.innerHTML = '';
        fundsContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load petty cash funds';
        fundsContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Load Transactions ----
    async function loadTransactions(): Promise<void> {
      if (!selectedFundId) return;

      showLoading(detailTableContainer, 'Loading transactions...');
      try {
        const svc = getBankingService();
        const txns = await svc.listPettyCashTransactions(selectedFundId);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Date', 'Description', 'Amount', 'Category', 'Receipt', 'Approved By']) {
          const align = col === 'Amount'
            ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right'
            : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (txns.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No transactions found for this fund.');
          td.setAttribute('colspan', '6');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const txn of txns) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', txn.date));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', txn.description));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right text-red-400', fmtCurrency(txn.amount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', txn.category ?? '--'));

          const tdReceipt = el('td', 'px-4 py-3 text-sm');
          if (txn.receipt) {
            tdReceipt.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'));
          } else {
            tdReceipt.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', 'No'));
          }
          tr.appendChild(tdReceipt);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', txn.approvedBy ?? '--'));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        detailTableContainer.innerHTML = '';
        detailTableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load transactions';
        detailTableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Fund Handler ----
    saveFundBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBankingService();

          if (!custodianInput.value.trim()) {
            showMsg(wrapper, 'Custodian name is required.', true);
            return;
          }
          if (!fundAmtInput.value || parseFloat(fundAmtInput.value) <= 0) {
            showMsg(wrapper, 'Fund amount must be greater than zero.', true);
            return;
          }

          await svc.createPettyCashFund({
            custodian: custodianInput.value.trim(),
            fundAmount: parseFloat(fundAmtInput.value),
            location: locationInput.value.trim() || undefined,
          });

          showMsg(wrapper, 'Petty cash fund created successfully.', false);
          formWrap.classList.add('hidden');
          custodianInput.value = '';
          fundAmtInput.value = '';
          locationInput.value = '';

          await loadFunds();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create petty cash fund';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Save Expense Handler ----
    saveExpBtn.addEventListener('click', () => {
      void (async () => {
        try {
          if (!selectedFundId) {
            showMsg(wrapper, 'Please select a fund first.', true);
            return;
          }

          const svc = getBankingService();

          if (!expDescInput.value.trim()) {
            showMsg(wrapper, 'Expense description is required.', true);
            return;
          }
          if (!expAmtInput.value || parseFloat(expAmtInput.value) <= 0) {
            showMsg(wrapper, 'Amount must be greater than zero.', true);
            return;
          }

          await svc.recordPettyCashExpense({
            pettyCashId: selectedFundId,
            description: expDescInput.value.trim(),
            amount: parseFloat(expAmtInput.value),
            category: expCatInput.value.trim() || undefined,
            receipt: expReceiptCheckbox.checked,
          });

          showMsg(wrapper, 'Expense recorded successfully.', false);
          expenseFormWrap.classList.add('hidden');
          expDescInput.value = '';
          expAmtInput.value = '';
          expCatInput.value = '';
          expReceiptCheckbox.checked = false;

          await Promise.all([loadFunds(), loadTransactions()]);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to record expense';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    void loadFunds();
  },
};

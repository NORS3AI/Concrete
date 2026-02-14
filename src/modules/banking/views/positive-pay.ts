/**
 * Positive Pay view.
 * Account selector with positive pay records table, add record form, and export batch action.
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
    const btnSecondary =
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Positive Pay'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const addBtn = el('button', btnCls, 'Add Record');
    addBtn.type = 'button';
    btnGroup.appendChild(addBtn);
    const exportBtn = el('button', btnSecondary, 'Export Batch');
    exportBtn.type = 'button';
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Positive Pay Record'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const checkGroup = el('div');
    checkGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Check #'));
    const checkInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    checkInput.type = 'text';
    checkInput.placeholder = 'Check number';
    checkGroup.appendChild(checkInput);
    formGrid.appendChild(checkGroup);

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

    const voidGroup = el('div', 'flex items-center gap-2 pt-6');
    const voidCheckbox = el('input', '') as HTMLInputElement;
    voidCheckbox.type = 'checkbox';
    voidCheckbox.id = 'pp-void-flag';
    voidGroup.appendChild(voidCheckbox);
    voidGroup.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'Void Flag'));
    formGrid.appendChild(voidGroup);

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
    saveBtn.type = 'button';
    const cancelBtn = el('button', btnSecondary, 'Cancel');
    cancelBtn.type = 'button';
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    addBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Account Selector ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const accountSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'Select Account') as HTMLOptionElement;
    defaultOpt.value = '';
    accountSelect.appendChild(defaultOpt);
    filterBar.appendChild(accountSelect);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading positive pay records...'));
      tableContainer.appendChild(loader);
    }

    function showPlaceholder(): void {
      tableContainer.innerHTML = '';
      const ph = el('div', 'flex items-center justify-center py-12');
      ph.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Select an account to view positive pay records.'));
      tableContainer.appendChild(ph);
    }

    // ---- Load Accounts ----
    async function loadAccounts(): Promise<void> {
      try {
        const svc = getBankingService();
        const accounts = await svc.listAccounts({ status: 'active' as any });
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
        const items = await svc.listPositivePay(accountId);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Check #', 'Payee', 'Amount', 'Issue Date', 'Void Flag', 'Exported', 'Export Date']) {
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
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No positive pay records found for this account.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-[var(--text)]', item.checkNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.payee));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.amount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.issueDate));

          const tdVoid = el('td', 'px-4 py-3 text-sm');
          if (item.voidFlag) {
            tdVoid.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'Void'));
          } else {
            tdVoid.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'No'));
          }
          tr.appendChild(tdVoid);

          const tdExported = el('td', 'px-4 py-3 text-sm');
          if (item.exported) {
            tdExported.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'));
          } else {
            tdExported.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', 'No'));
          }
          tr.appendChild(tdExported);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.exportDate ?? '--'));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load positive pay records';
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
          if (!checkInput.value.trim()) {
            showMsg(wrapper, 'Check number is required.', true);
            return;
          }
          if (!payeeInput.value.trim()) {
            showMsg(wrapper, 'Payee is required.', true);
            return;
          }

          await svc.addPositivePayRecord({
            accountId,
            checkNumber: checkInput.value.trim(),
            payee: payeeInput.value.trim(),
            amount: parseFloat(amtInput.value) || 0,
            issueDate: dateInput.value || new Date().toISOString().split('T')[0],
            voidFlag: voidCheckbox.checked,
          });

          showMsg(wrapper, 'Positive pay record added successfully.', false);
          formWrap.classList.add('hidden');
          checkInput.value = '';
          payeeInput.value = '';
          amtInput.value = '';
          dateInput.value = '';
          voidCheckbox.checked = false;

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add positive pay record';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Export Batch Handler ----
    exportBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const accountId = accountSelect.value;
          if (!accountId) {
            showMsg(wrapper, 'Please select an account first.', true);
            return;
          }

          const svc = getBankingService();
          const exported = await svc.exportPositivePay(accountId);

          if (exported.length === 0) {
            showMsg(wrapper, 'No unexported records found for this account.', true);
            return;
          }

          showMsg(wrapper, `Exported ${exported.length} positive pay record(s) successfully.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to export positive pay batch';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    accountSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAccounts();
    showPlaceholder();
  },
};

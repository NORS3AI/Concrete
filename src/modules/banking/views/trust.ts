/**
 * Trust Accounts view.
 * List of trust accounts with summary cards, compliance badges, and update balance action.
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Trust Accounts'));
    const newBtn = el('button', btnCls, 'New Trust');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Accounts'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const compliantCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    compliantCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Compliant'));
    const compliantValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    compliantCard.appendChild(compliantValue);
    summaryRow.appendChild(compliantCard);

    const nonCompliantCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    nonCompliantCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Non-Compliant'));
    const nonCompliantValue = el('div', 'text-2xl font-bold text-red-400', '--');
    nonCompliantCard.appendChild(nonCompliantValue);
    summaryRow.appendChild(nonCompliantCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Trust Account'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const acctIdGroup = el('div');
    acctIdGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Bank Account'));
    const acctFormSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    const defaultAcctOpt = el('option', '', 'Select Account') as HTMLOptionElement;
    defaultAcctOpt.value = '';
    acctFormSelect.appendChild(defaultAcctOpt);
    acctIdGroup.appendChild(acctFormSelect);
    formGrid.appendChild(acctIdGroup);

    const ownerGroup = el('div');
    ownerGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Owner Name'));
    const ownerInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    ownerInput.type = 'text';
    ownerInput.placeholder = 'Owner / client name';
    ownerGroup.appendChild(ownerInput);
    formGrid.appendChild(ownerGroup);

    const projNameGroup = el('div');
    projNameGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Project Name'));
    const projNameInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    projNameInput.type = 'text';
    projNameInput.placeholder = 'Project name (optional)';
    projNameGroup.appendChild(projNameInput);
    formGrid.appendChild(projNameGroup);

    const reqBalGroup = el('div');
    reqBalGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Required Balance'));
    const reqBalInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    reqBalInput.type = 'number';
    reqBalInput.step = '0.01';
    reqBalInput.placeholder = '0.00';
    reqBalGroup.appendChild(reqBalInput);
    formGrid.appendChild(reqBalGroup);

    const notesGroup = el('div', 'md:col-span-2');
    notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Notes'));
    const notesInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    notesInput.type = 'text';
    notesInput.placeholder = 'Notes (optional)';
    notesGroup.appendChild(notesInput);
    formGrid.appendChild(notesGroup);

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

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading Indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading trust accounts...'));
      tableContainer.appendChild(loader);
    }

    // ---- Load Accounts for Form ----
    async function loadAccounts(): Promise<void> {
      try {
        const svc = getBankingService();
        const accounts = await svc.listAccounts({ type: 'trust' as any });
        for (const acct of accounts) {
          const o = el('option', '', `${acct.name} (${acct.accountNumber})`) as HTMLOptionElement;
          o.value = (acct as any).id;
          acctFormSelect.appendChild(o);
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
        const items = await svc.listTrustAccounts();

        // Update summary
        const compliantCount = items.filter((t) => t.compliant).length;
        const nonCompliantCount = items.filter((t) => !t.compliant).length;
        totalValue.textContent = String(items.length);
        compliantValue.textContent = String(compliantCount);
        nonCompliantValue.textContent = String(nonCompliantCount);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        const cols = ['Owner', 'Project', 'Balance', 'Required', 'Compliant', 'Last Activity', 'Actions'];
        for (const col of cols) {
          const isNum = ['Balance', 'Required'].includes(col);
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
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No trust accounts found. Create your first trust account to get started.');
          td.setAttribute('colspan', String(cols.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', item.ownerName));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.projectName ?? '--'));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.balance)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.requiredBalance)));

          const tdCompliant = el('td', 'px-4 py-3 text-sm');
          if (item.compliant) {
            tdCompliant.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'));
          } else {
            tdCompliant.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'No'));
          }
          tr.appendChild(tdCompliant);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.lastActivityDate ?? '--'));

          const tdActions = el('td', 'px-4 py-3 text-sm');
          const updateBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Update Balance');
          updateBtn.type = 'button';
          updateBtn.addEventListener('click', () => {
            const newBalance = prompt(`Enter new balance for ${item.ownerName}:`, String(item.balance));
            if (newBalance === null) return;
            const parsed = parseFloat(newBalance);
            if (isNaN(parsed)) {
              showMsg(wrapper, 'Invalid balance amount.', true);
              return;
            }
            void (async () => {
              try {
                const svc = getBankingService();
                await svc.updateTrustBalance((item as any).id, parsed);
                showMsg(wrapper, `Trust account balance updated for ${item.ownerName}.`, false);
                await loadAndRender();
              } catch (actionErr: unknown) {
                const msg = actionErr instanceof Error ? actionErr.message : 'Failed to update balance';
                showMsg(wrapper, msg, true);
              }
            })();
          });
          tdActions.appendChild(updateBtn);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load trust accounts';
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
            showMsg(wrapper, 'Please select a bank account.', true);
            return;
          }
          if (!ownerInput.value.trim()) {
            showMsg(wrapper, 'Owner name is required.', true);
            return;
          }

          await svc.createTrustAccount({
            accountId: acctFormSelect.value,
            ownerName: ownerInput.value.trim(),
            projectName: projNameInput.value.trim() || undefined,
            requiredBalance: parseFloat(reqBalInput.value) || 0,
            notes: notesInput.value.trim() || undefined,
          });

          showMsg(wrapper, 'Trust account created successfully.', false);
          formWrap.classList.add('hidden');
          ownerInput.value = '';
          projNameInput.value = '';
          reqBalInput.value = '';
          notesInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create trust account';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    void loadAccounts();
    void loadAndRender();
  },
};

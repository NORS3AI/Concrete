/**
 * Bank Accounts view.
 * Filterable list of bank accounts with summary cards, search, type/status filters.
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

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'line_of_credit', label: 'Line of Credit' },
  { value: 'trust', label: 'Trust' },
  { value: 'petty_cash', label: 'Petty Cash' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  closed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

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

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bank Accounts'));
    const newBtn = el('button', btnCls, 'New Account');
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

    const activeCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    activeCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Active'));
    const activeValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    activeCard.appendChild(activeValue);
    summaryRow.appendChild(activeCard);

    const balanceCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    balanceCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Balance'));
    const balanceValue = el('div', 'text-2xl font-bold text-[var(--accent)]', '--');
    balanceCard.appendChild(balanceValue);
    summaryRow.appendChild(balanceCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Bank Account'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const nameGroup = el('div');
    nameGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Account Name'));
    const nameInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    nameInput.type = 'text';
    nameInput.placeholder = 'Account name';
    nameGroup.appendChild(nameInput);
    formGrid.appendChild(nameGroup);

    const acctNumGroup = el('div');
    acctNumGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Account Number'));
    const acctNumInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    acctNumInput.type = 'text';
    acctNumInput.placeholder = 'Account number';
    acctNumGroup.appendChild(acctNumInput);
    formGrid.appendChild(acctNumGroup);

    const bankGroup = el('div');
    bankGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Bank Name'));
    const bankInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    bankInput.type = 'text';
    bankInput.placeholder = 'Bank name';
    bankGroup.appendChild(bankInput);
    formGrid.appendChild(bankGroup);

    const typeGroup = el('div');
    typeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Type'));
    const typeFormSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS.slice(1)) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeFormSelect.appendChild(o);
    }
    typeGroup.appendChild(typeFormSelect);
    formGrid.appendChild(typeGroup);

    const balGroup = el('div');
    balGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Opening Balance'));
    const balInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    balInput.type = 'number';
    balInput.placeholder = '0.00';
    balGroup.appendChild(balInput);
    formGrid.appendChild(balGroup);

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

    // ---- Filter Bar ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search accounts...';
    filterBar.appendChild(searchInput);

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

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
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading accounts...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBankingService();

        const filters: { type?: any; status?: any; search?: string } = {};
        if (typeSelect.value) filters.type = typeSelect.value;
        if (statusSelect.value) filters.status = statusSelect.value;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listAccounts(filters);

        // Update summary
        const allItems = await svc.listAccounts();
        const activeCount = allItems.filter((a) => a.status === 'active').length;
        const totalBal = allItems.reduce((sum, a) => sum + a.currentBalance, 0);
        totalValue.textContent = String(allItems.length);
        activeValue.textContent = String(activeCount);
        balanceValue.textContent = fmtCurrency(totalBal);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Name', 'Account #', 'Bank', 'Type', 'Status', 'Balance', 'Last Reconciled']) {
          const align = col === 'Balance' ? 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 text-right' : 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
          headRow.appendChild(el('th', align, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No accounts found. Create your first bank account to get started.');
          td.setAttribute('colspan', '7');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-medium text-[var(--text)]', item.name));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-[var(--text)]', item.accountNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.bankName));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', TYPE_LABEL[item.type] ?? item.type));

          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badge = el(
            'span',
            `px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? STATUS_BADGE.active}`,
            item.status.charAt(0).toUpperCase() + item.status.slice(1),
          );
          tdStatus.appendChild(badge);
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.currentBalance)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.lastReconciledDate ?? 'Never'));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load accounts';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBankingService();

          if (!nameInput.value.trim()) {
            showMsg(wrapper, 'Account name is required.', true);
            return;
          }
          if (!acctNumInput.value.trim()) {
            showMsg(wrapper, 'Account number is required.', true);
            return;
          }
          if (!bankInput.value.trim()) {
            showMsg(wrapper, 'Bank name is required.', true);
            return;
          }

          await svc.createAccount({
            name: nameInput.value.trim(),
            accountNumber: acctNumInput.value.trim(),
            bankName: bankInput.value.trim(),
            type: typeFormSelect.value as any,
            currentBalance: parseFloat(balInput.value) || 0,
          });

          showMsg(wrapper, 'Bank account created successfully.', false);
          formWrap.classList.add('hidden');
          nameInput.value = '';
          acctNumInput.value = '';
          bankInput.value = '';
          balInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create account';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    typeSelect.addEventListener('change', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};

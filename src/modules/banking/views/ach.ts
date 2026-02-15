/**
 * ACH Batches view.
 * List of ACH batches with summary cards, submit action, and new batch form.
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
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  processed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  processed: 'Processed',
  rejected: 'Rejected',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'ACH Batches'));
    const newBtn = el('button', btnCls, 'New Batch');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Batches'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const pendingCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    pendingCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Pending'));
    const pendingValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    pendingCard.appendChild(pendingValue);
    summaryRow.appendChild(pendingCard);

    const submittedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    submittedCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Submitted'));
    const submittedValue = el('div', 'text-2xl font-bold text-blue-400', '--');
    submittedCard.appendChild(submittedValue);
    summaryRow.appendChild(submittedCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New ACH Batch'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const batchNumGroup = el('div');
    batchNumGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Batch Number'));
    const batchNumInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    batchNumInput.type = 'text';
    batchNumInput.placeholder = 'Batch number';
    batchNumGroup.appendChild(batchNumInput);
    formGrid.appendChild(batchNumGroup);

    const acctGroup = el('div');
    acctGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Account'));
    const acctFormSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    const defaultAcctOpt = el('option', '', 'Select Account') as HTMLOptionElement;
    defaultAcctOpt.value = '';
    acctFormSelect.appendChild(defaultAcctOpt);
    acctGroup.appendChild(acctFormSelect);
    formGrid.appendChild(acctGroup);

    const descGroup = el('div');
    descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
    const descInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    descInput.type = 'text';
    descInput.placeholder = 'Batch description';
    descGroup.appendChild(descInput);
    formGrid.appendChild(descGroup);

    const amtGroup = el('div');
    amtGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Total Amount'));
    const amtInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    amtInput.type = 'number';
    amtInput.step = '0.01';
    amtInput.placeholder = '0.00';
    amtGroup.appendChild(amtInput);
    formGrid.appendChild(amtGroup);

    const countGroup = el('div');
    countGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Entry Count'));
    const countInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    countInput.type = 'number';
    countInput.placeholder = '0';
    countGroup.appendChild(countInput);
    formGrid.appendChild(countGroup);

    const effDateGroup = el('div');
    effDateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Effective Date'));
    const effDateInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    effDateInput.type = 'date';
    effDateGroup.appendChild(effDateInput);
    formGrid.appendChild(effDateGroup);

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
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading ACH batches...'));
      tableContainer.appendChild(loader);
    }

    // ---- Load Accounts ----
    async function loadAccounts(): Promise<void> {
      try {
        const svc = getBankingService();
        const accounts = await svc.listAccounts({ status: 'active' as any });
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
        const items = await svc.listACHBatches();

        // Update summary
        const pendingCount = items.filter((b) => b.status === 'pending').length;
        const submittedCount = items.filter((b) => b.status === 'submitted').length;
        totalValue.textContent = String(items.length);
        pendingValue.textContent = String(pendingCount);
        submittedValue.textContent = String(submittedCount);

        // Build table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        const cols = ['Batch #', 'Account', 'Description', 'Amount', 'Entries', 'Effective Date', 'Status', 'Actions'];
        for (const col of cols) {
          const isNum = ['Amount', 'Entries'].includes(col);
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
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No ACH batches found. Create your first batch to get started.');
          td.setAttribute('colspan', String(cols.length));
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-[var(--accent)]', item.batchNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.accountId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.description));
          tr.appendChild(el('td', 'px-4 py-3 text-sm font-mono text-right', fmtCurrency(item.totalAmount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-right', String(item.entryCount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.effectiveDate));

          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'pending') {
            const submitBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Submit');
            submitBtn.type = 'button';
            submitBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  const svc = getBankingService();
                  await svc.submitACHBatch((item as any).id);
                  showMsg(wrapper, `ACH batch ${item.batchNumber} submitted successfully.`, false);
                  await loadAndRender();
                } catch (actionErr: unknown) {
                  const msg = actionErr instanceof Error ? actionErr.message : 'Failed to submit ACH batch';
                  showMsg(wrapper, msg, true);
                }
              })();
            });
            tdActions.appendChild(submitBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', item.submittedDate ? `Submitted: ${item.submittedDate}` : '--'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load ACH batches';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBankingService();

          if (!batchNumInput.value.trim()) {
            showMsg(wrapper, 'Batch number is required.', true);
            return;
          }
          if (!acctFormSelect.value) {
            showMsg(wrapper, 'Please select an account.', true);
            return;
          }
          if (!descInput.value.trim()) {
            showMsg(wrapper, 'Description is required.', true);
            return;
          }

          await svc.createACHBatch({
            batchNumber: batchNumInput.value.trim(),
            accountId: acctFormSelect.value,
            description: descInput.value.trim(),
            totalAmount: parseFloat(amtInput.value) || 0,
            entryCount: parseInt(countInput.value, 10) || 0,
            effectiveDate: effDateInput.value || new Date().toISOString().split('T')[0],
          });

          showMsg(wrapper, 'ACH batch created successfully.', false);
          formWrap.classList.add('hidden');
          batchNumInput.value = '';
          descInput.value = '';
          amtInput.value = '';
          countInput.value = '';
          effDateInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create ACH batch';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    void loadAccounts();
    void loadAndRender();
  },
};

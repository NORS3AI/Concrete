/**
 * Certificate of Insurance Tracking view.
 * Filterable list of COI records with summary cards, search/status filter,
 * revoke action for issued COIs, and issue COI form.
 * Wired to BondingService for data and operations.
 */

import { getBondingService } from '../service-accessor';
import type { COIStatus } from '../bonding-service';

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
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
];

const STATUS_BADGE: Record<string, string> = {
  issued: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  revoked: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  issued: 'Issued',
  pending: 'Pending',
  expired: 'Expired',
  revoked: 'Revoked',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Certificate of Insurance Tracking'));
    const newBtn = el('button', btnCls, 'Issue COI');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Certificates'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const issuedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    issuedCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Issued'));
    const issuedValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    issuedCard.appendChild(issuedValue);
    summaryRow.appendChild(issuedCard);

    const expiredCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    expiredCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Expired'));
    const expiredValue = el('div', 'text-2xl font-bold text-red-400', '--');
    expiredCard.appendChild(expiredValue);
    summaryRow.appendChild(expiredCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Issue Certificate of Insurance'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const formFields: { label: string; key: string; type: string; placeholder: string }[] = [
      { label: 'Certificate Number', key: 'certificateNumber', type: 'text', placeholder: 'COI-001' },
      { label: 'Issued To', key: 'issuedTo', type: 'text', placeholder: 'Company name' },
      { label: 'Holder Name', key: 'holderName', type: 'text', placeholder: 'Certificate holder' },
      { label: 'Holder Address', key: 'holderAddress', type: 'text', placeholder: 'Address' },
      { label: 'Expiration Date', key: 'expirationDate', type: 'date', placeholder: '' },
      { label: 'Project Name', key: 'projectName', type: 'text', placeholder: 'Project name' },
      { label: 'Project ID', key: 'projectId', type: 'text', placeholder: 'Project ID' },
      { label: 'Policy IDs', key: 'policyIds', type: 'text', placeholder: 'Comma-separated policy IDs' },
    ];

    const formInputs: Record<string, HTMLInputElement> = {};

    for (const field of formFields) {
      const group = el('div');
      group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', field.label));
      const input = el('input', inputCls + ' w-full') as HTMLInputElement;
      input.type = field.type;
      input.placeholder = field.placeholder;
      group.appendChild(input);
      formInputs[field.key] = input;
      formGrid.appendChild(group);
    }

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Issue Certificate');
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
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
    searchInput.placeholder = 'Search certificates...';
    filterBar.appendChild(searchInput);

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

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading certificates...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const filters: { status?: COIStatus; search?: string } = {};
        if (statusSelect.value) filters.status = statusSelect.value as COIStatus;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listCOIs(filters);

        // Update summary from unfiltered list
        const allItems = await svc.listCOIs();
        const issuedCount = allItems.filter((c) => c.status === 'issued').length;
        const expiredCount = allItems.filter((c) => c.status === 'expired').length;
        totalValue.textContent = String(allItems.length);
        issuedValue.textContent = String(issuedCount);
        expiredValue.textContent = String(expiredCount);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Cert #', 'Issued To', 'Holder', 'Issued Date', 'Expiration', 'Project', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No certificates found.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.certificateNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.issuedTo));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.holderName));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.issuedDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.expirationDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.projectName ?? ''));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.issued;
          const label = STATUS_LABEL[item.status] ?? item.status;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, label));
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'issued') {
            const revokeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Revoke');
            revokeBtn.addEventListener('click', () => {
              if (!confirm(`Revoke certificate "${item.certificateNumber}"?`)) return;
              void (async () => {
                try {
                  await svc.revokeCOI((item as any).id);
                  showMsg(wrapper, `Certificate "${item.certificateNumber}" revoked.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to revoke certificate';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            tdActions.appendChild(revokeBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-sm', '--'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load certificates';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const certificateNumber = formInputs.certificateNumber.value.trim();
          const issuedTo = formInputs.issuedTo.value.trim();
          const holderName = formInputs.holderName.value.trim();
          const expirationDate = formInputs.expirationDate.value;

          if (!certificateNumber) { showMsg(wrapper, 'Certificate number is required.', true); return; }
          if (!issuedTo) { showMsg(wrapper, 'Issued To is required.', true); return; }
          if (!holderName) { showMsg(wrapper, 'Holder name is required.', true); return; }
          if (!expirationDate) { showMsg(wrapper, 'Expiration date is required.', true); return; }

          await svc.issueCOI({
            certificateNumber,
            issuedTo,
            holderName,
            holderAddress: formInputs.holderAddress.value.trim() || undefined,
            expirationDate,
            projectName: formInputs.projectName.value.trim() || undefined,
            projectId: formInputs.projectId.value.trim() || undefined,
            policyIds: formInputs.policyIds.value.trim() || undefined,
          });

          showMsg(wrapper, 'Certificate issued successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            formInputs[key].value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to issue certificate';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};

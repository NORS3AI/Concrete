/**
 * Insurance Claims view.
 * Filterable list of insurance claims with summary cards, search/status/type filters,
 * close action for open/investigating claims, and file claim form.
 * Wired to BondingService for data and operations.
 */

import { getBondingService } from '../service-accessor';
import type { ClaimStatus, PolicyType } from '../bonding-service';

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
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'settled', label: 'Settled' },
  { value: 'denied', label: 'Denied' },
  { value: 'closed', label: 'Closed' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'general_liability', label: 'General Liability' },
  { value: 'auto', label: 'Auto' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'workers_comp', label: 'Workers Comp' },
  { value: 'builders_risk', label: 'Builders Risk' },
  { value: 'professional', label: 'Professional' },
  { value: 'pollution', label: 'Pollution' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  investigating: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  settled: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  denied: 'bg-red-500/10 text-red-400 border border-red-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  investigating: 'Investigating',
  settled: 'Settled',
  denied: 'Denied',
  closed: 'Closed',
};

const TYPE_LABEL: Record<string, string> = {
  general_liability: 'General Liability',
  auto: 'Auto',
  umbrella: 'Umbrella',
  workers_comp: 'Workers Comp',
  builders_risk: 'Builders Risk',
  professional: 'Professional',
  pollution: 'Pollution',
  cyber: 'Cyber',
  other: 'Other',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Insurance Claims'));
    const newBtn = el('button', btnCls, 'File Claim');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-5 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Claims'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const openCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    openCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Open'));
    const openValue = el('div', 'text-2xl font-bold text-blue-400', '--');
    openCard.appendChild(openValue);
    summaryRow.appendChild(openCard);

    const investCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    investCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Investigating'));
    const investValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    investCard.appendChild(investValue);
    summaryRow.appendChild(investCard);

    const paidCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    paidCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Paid'));
    const paidValue = el('div', 'text-2xl font-bold text-red-400', '--');
    paidCard.appendChild(paidValue);
    summaryRow.appendChild(paidCard);

    const reservedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    reservedCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Reserved'));
    const reservedValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    reservedCard.appendChild(reservedValue);
    summaryRow.appendChild(reservedCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'File Insurance Claim'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const formFieldDefs: { label: string; key: string; type: string; placeholder: string; options?: { value: string; label: string }[] }[] = [
      { label: 'Claim Number', key: 'claimNumber', type: 'text', placeholder: 'CLM-001' },
      { label: 'Policy Number', key: 'policyNumber', type: 'text', placeholder: 'Policy #' },
      { label: 'Type', key: 'type', type: 'select', placeholder: '', options: TYPE_OPTIONS.filter((o) => o.value !== '') },
      { label: 'Date of Loss', key: 'dateOfLoss', type: 'date', placeholder: '' },
      { label: 'Description', key: 'description', type: 'text', placeholder: 'Describe the incident' },
      { label: 'Claimant', key: 'claimant', type: 'text', placeholder: 'Claimant name' },
      { label: 'Job ID', key: 'jobId', type: 'text', placeholder: 'Job ID' },
      { label: 'Job Name', key: 'jobName', type: 'text', placeholder: 'Job name' },
      { label: 'Reserve Amount', key: 'reserveAmount', type: 'number', placeholder: '0.00' },
    ];

    const formInputs: Record<string, HTMLInputElement | HTMLSelectElement> = {};

    for (const field of formFieldDefs) {
      const group = el('div');
      group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', field.label));
      if (field.type === 'select' && field.options) {
        const select = el('select', inputCls + ' w-full') as HTMLSelectElement;
        for (const opt of field.options) {
          const o = el('option', '', opt.label) as HTMLOptionElement;
          o.value = opt.value;
          select.appendChild(o);
        }
        group.appendChild(select);
        formInputs[field.key] = select;
      } else {
        const input = el('input', inputCls + ' w-full') as HTMLInputElement;
        input.type = field.type;
        input.placeholder = field.placeholder;
        group.appendChild(input);
        formInputs[field.key] = input;
      }
      formGrid.appendChild(group);
    }

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'File Claim');
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
    searchInput.placeholder = 'Search claims...';
    filterBar.appendChild(searchInput);

    const statusSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeSelect.appendChild(o);
    }
    filterBar.appendChild(typeSelect);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading claims...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const filters: { status?: ClaimStatus; type?: PolicyType; search?: string } = {};
        if (statusSelect.value) filters.status = statusSelect.value as ClaimStatus;
        if (typeSelect.value) filters.type = typeSelect.value as PolicyType;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listClaims(filters);

        // Update summary from unfiltered list
        const allItems = await svc.listClaims();
        const openCount = allItems.filter((c) => c.status === 'open').length;
        const investigatingCount = allItems.filter((c) => c.status === 'investigating').length;
        const totalPaid = allItems.reduce((sum, c) => sum + c.paidAmount, 0);
        const totalReserved = allItems.reduce((sum, c) => sum + c.reserveAmount, 0);
        totalValue.textContent = String(allItems.length);
        openValue.textContent = String(openCount);
        investValue.textContent = String(investigatingCount);
        paidValue.textContent = fmtCurrency(totalPaid);
        reservedValue.textContent = fmtCurrency(totalReserved);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Claim #', 'Policy #', 'Type', 'Date of Loss', 'Reported', 'Claimant', 'Job', 'Paid', 'Reserve', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No claims found.');
          td.setAttribute('colspan', '11');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.claimNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.policyNumber ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.type] ?? item.type));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.dateOfLoss));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.reportedDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.claimant ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.jobName ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.paidAmount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.reserveAmount)));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.open;
          const label = STATUS_LABEL[item.status] ?? item.status;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, label));
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'open' || item.status === 'investigating') {
            const closeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Close');
            closeBtn.addEventListener('click', () => {
              if (!confirm(`Close claim "${item.claimNumber}"?`)) return;
              void (async () => {
                try {
                  await svc.closeClaim((item as any).id);
                  showMsg(wrapper, `Claim "${item.claimNumber}" closed.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to close claim';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            tdActions.appendChild(closeBtn);
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
        const message = err instanceof Error ? err.message : 'Failed to load claims';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const claimNumber = (formInputs.claimNumber as HTMLInputElement).value.trim();
          const dateOfLoss = (formInputs.dateOfLoss as HTMLInputElement).value;
          const description = (formInputs.description as HTMLInputElement).value.trim();

          if (!claimNumber) { showMsg(wrapper, 'Claim number is required.', true); return; }
          if (!dateOfLoss) { showMsg(wrapper, 'Date of loss is required.', true); return; }
          if (!description) { showMsg(wrapper, 'Description is required.', true); return; }

          await svc.fileClaim({
            claimNumber,
            policyNumber: (formInputs.policyNumber as HTMLInputElement).value.trim() || undefined,
            type: (formInputs.type as HTMLSelectElement).value as PolicyType,
            dateOfLoss,
            description,
            claimant: (formInputs.claimant as HTMLInputElement).value.trim() || undefined,
            jobId: (formInputs.jobId as HTMLInputElement).value.trim() || undefined,
            jobName: (formInputs.jobName as HTMLInputElement).value.trim() || undefined,
            reserveAmount: parseFloat((formInputs.reserveAmount as HTMLInputElement).value) || 0,
          });

          showMsg(wrapper, 'Claim filed successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            const inp = formInputs[key];
            if (inp instanceof HTMLInputElement) inp.value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to file claim';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());
    typeSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};

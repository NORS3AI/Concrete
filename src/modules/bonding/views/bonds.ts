/**
 * Bond Log view.
 * Filterable table of bonds with summary cards, type/status/search filters,
 * release action, and new bond creation form.
 * Wired to BondingService for data and operations.
 */

import { getBondingService } from '../service-accessor';
import type { BondType, BondStatus } from '../bonding-service';

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
  { value: 'bid', label: 'Bid' },
  { value: 'performance', label: 'Performance' },
  { value: 'payment', label: 'Payment' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'subdivision', label: 'Subdivision' },
  { value: 'supply', label: 'Supply' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'released', label: 'Released' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  released: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  claimed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  bid: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  performance: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  payment: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  maintenance: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  subdivision: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  supply: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  other: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Bond Log'));
    const newBtn = el('button', btnCls, 'New Bond');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Bonds'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const activeCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    activeCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Active'));
    const activeValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    activeCard.appendChild(activeValue);
    summaryRow.appendChild(activeCard);

    const releasedCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    releasedCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Released'));
    const releasedValue = el('div', 'text-2xl font-bold text-blue-400', '--');
    releasedCard.appendChild(releasedValue);
    summaryRow.appendChild(releasedCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Issue New Bond'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const fields: { label: string; key: string; type: string; placeholder: string; options?: { value: string; label: string }[] }[] = [
      { label: 'Bond Number', key: 'bondNumber', type: 'text', placeholder: 'B-001' },
      { label: 'Type', key: 'type', type: 'select', placeholder: '', options: TYPE_OPTIONS.filter((o) => o.value !== '') },
      { label: 'Surety ID', key: 'suretyId', type: 'text', placeholder: 'Surety ID' },
      { label: 'Surety Name', key: 'suretyName', type: 'text', placeholder: 'Surety company name' },
      { label: 'Job ID', key: 'jobId', type: 'text', placeholder: 'Job ID' },
      { label: 'Job Name', key: 'jobName', type: 'text', placeholder: 'Job name' },
      { label: 'Principal', key: 'principal', type: 'text', placeholder: 'Principal name' },
      { label: 'Obligee', key: 'obligee', type: 'text', placeholder: 'Obligee name' },
      { label: 'Amount', key: 'amount', type: 'number', placeholder: '0.00' },
      { label: 'Premium', key: 'premium', type: 'number', placeholder: '0.00' },
      { label: 'Effective Date', key: 'effectiveDate', type: 'date', placeholder: '' },
      { label: 'Expiration Date', key: 'expirationDate', type: 'date', placeholder: '' },
    ];

    const formInputs: Record<string, HTMLInputElement | HTMLSelectElement> = {};

    for (const field of fields) {
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
    const saveBtn = el('button', btnCls, 'Issue Bond');
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
    searchInput.placeholder = 'Search bonds...';
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
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading bonds...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const filters: { type?: BondType; status?: BondStatus; search?: string } = {};
        if (typeSelect.value) filters.type = typeSelect.value as BondType;
        if (statusSelect.value) filters.status = statusSelect.value as BondStatus;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listBonds(filters);

        // Update summary from unfiltered list
        const allItems = await svc.listBonds();
        const activeCount = allItems.filter((b) => b.status === 'active').length;
        const releasedCount = allItems.filter((b) => b.status === 'released').length;
        totalValue.textContent = String(allItems.length);
        activeValue.textContent = String(activeCount);
        releasedValue.textContent = String(releasedCount);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Bond #', 'Type', 'Status', 'Surety', 'Job', 'Principal', 'Obligee', 'Amount', 'Premium', 'Effective', 'Expiration', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No bonds found.');
          td.setAttribute('colspan', '12');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.bondNumber));

          // Type badge
          const tdType = el('td', 'px-4 py-3 text-sm');
          const typeBadge = TYPE_BADGE[item.type] ?? TYPE_BADGE.other;
          tdType.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${typeBadge}`, item.type.charAt(0).toUpperCase() + item.type.slice(1)));
          tr.appendChild(tdType);

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusBadge = STATUS_BADGE[item.status] ?? STATUS_BADGE.active;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`, item.status.charAt(0).toUpperCase() + item.status.slice(1)));
          tr.appendChild(tdStatus);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.suretyName ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.jobName ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.principal));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.obligee));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.amount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.premium)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.effectiveDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.expirationDate ?? ''));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.status === 'active') {
            const releaseBtn = el('button', 'text-blue-400 hover:underline text-sm', 'Release');
            releaseBtn.addEventListener('click', () => {
              if (!confirm(`Release bond "${item.bondNumber}"?`)) return;
              void (async () => {
                try {
                  await svc.releaseBond((item as any).id);
                  showMsg(wrapper, `Bond "${item.bondNumber}" released.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to release bond';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            tdActions.appendChild(releaseBtn);
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
        const message = err instanceof Error ? err.message : 'Failed to load bonds';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const bondNumber = (formInputs.bondNumber as HTMLInputElement).value.trim();
          const principal = (formInputs.principal as HTMLInputElement).value.trim();
          const obligee = (formInputs.obligee as HTMLInputElement).value.trim();

          if (!bondNumber) { showMsg(wrapper, 'Bond number is required.', true); return; }
          if (!principal) { showMsg(wrapper, 'Principal is required.', true); return; }
          if (!obligee) { showMsg(wrapper, 'Obligee is required.', true); return; }

          await svc.issueBond({
            bondNumber,
            type: (formInputs.type as HTMLSelectElement).value as BondType,
            suretyId: (formInputs.suretyId as HTMLInputElement).value.trim(),
            suretyName: (formInputs.suretyName as HTMLInputElement).value.trim() || undefined,
            jobId: (formInputs.jobId as HTMLInputElement).value.trim(),
            jobName: (formInputs.jobName as HTMLInputElement).value.trim() || undefined,
            principal,
            obligee,
            amount: parseFloat((formInputs.amount as HTMLInputElement).value) || 0,
            premium: parseFloat((formInputs.premium as HTMLInputElement).value) || 0,
            effectiveDate: (formInputs.effectiveDate as HTMLInputElement).value,
            expirationDate: (formInputs.expirationDate as HTMLInputElement).value || undefined,
          });

          showMsg(wrapper, 'Bond issued successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            const inp = formInputs[key];
            if (inp instanceof HTMLInputElement) inp.value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to issue bond';
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

/**
 * Insurance Policies view.
 * Filterable list of policies with summary cards, type/status/search filters,
 * and new policy creation form with currency formatting.
 * Wired to BondingService for data and operations.
 */

import { getBondingService } from '../service-accessor';
import type { PolicyType, PolicyStatus } from '../bonding-service';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  cancelled: 'Cancelled',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Insurance Policies'));
    const newBtn = el('button', btnCls, 'New Policy');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Policies'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const activeCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    activeCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Active'));
    const activeValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    activeCard.appendChild(activeValue);
    summaryRow.appendChild(activeCard);

    const expSoonCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    expSoonCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Expiring Soon'));
    const expSoonValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    expSoonCard.appendChild(expSoonValue);
    summaryRow.appendChild(expSoonCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Insurance Policy'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const formFields: { label: string; key: string; type: string; placeholder: string; options?: { value: string; label: string }[] }[] = [
      { label: 'Policy Number', key: 'policyNumber', type: 'text', placeholder: 'POL-001' },
      { label: 'Type', key: 'type', type: 'select', placeholder: '', options: TYPE_OPTIONS.filter((o) => o.value !== '') },
      { label: 'Carrier', key: 'carrier', type: 'text', placeholder: 'Insurance carrier' },
      { label: 'Agent Name', key: 'agentName', type: 'text', placeholder: 'Agent name' },
      { label: 'Effective Date', key: 'effectiveDate', type: 'date', placeholder: '' },
      { label: 'Expiration Date', key: 'expirationDate', type: 'date', placeholder: '' },
      { label: 'Premium Amount', key: 'premiumAmount', type: 'number', placeholder: '0.00' },
      { label: 'Coverage Limit', key: 'coverageLimit', type: 'number', placeholder: '0.00' },
      { label: 'Deductible', key: 'deductible', type: 'number', placeholder: '0.00' },
    ];

    const formInputs: Record<string, HTMLInputElement | HTMLSelectElement> = {};

    for (const field of formFields) {
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
    const saveBtn = el('button', btnCls, 'Create Policy');
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
    searchInput.placeholder = 'Search policies...';
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

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading policies...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const filters: { type?: PolicyType; status?: PolicyStatus; search?: string } = {};
        if (typeSelect.value) filters.type = typeSelect.value as PolicyType;
        if (statusSelect.value) filters.status = statusSelect.value as PolicyStatus;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listPolicies(filters);

        // Update summary from unfiltered list
        const allItems = await svc.listPolicies();
        const activeCount = allItems.filter((p) => p.status === 'active').length;
        const expSoonCount = allItems.filter((p) => p.status === 'expiring_soon').length;
        totalValue.textContent = String(allItems.length);
        activeValue.textContent = String(activeCount);
        expSoonValue.textContent = String(expSoonCount);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Policy #', 'Type', 'Carrier', 'Agent', 'Effective', 'Expiration', 'Premium', 'Coverage Limit', 'Deductible', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No policies found.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.policyNumber));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.type] ?? item.type));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.carrier));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.agentName ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.effectiveDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.expirationDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.premiumAmount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.coverageLimit)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.deductible)));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.active;
          const label = STATUS_LABEL[item.status] ?? item.status;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, label));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load policies';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const policyNumber = (formInputs.policyNumber as HTMLInputElement).value.trim();
          const carrier = (formInputs.carrier as HTMLInputElement).value.trim();
          const effectiveDate = (formInputs.effectiveDate as HTMLInputElement).value;
          const expirationDate = (formInputs.expirationDate as HTMLInputElement).value;

          if (!policyNumber) { showMsg(wrapper, 'Policy number is required.', true); return; }
          if (!carrier) { showMsg(wrapper, 'Carrier is required.', true); return; }
          if (!effectiveDate) { showMsg(wrapper, 'Effective date is required.', true); return; }
          if (!expirationDate) { showMsg(wrapper, 'Expiration date is required.', true); return; }

          await svc.createPolicy({
            policyNumber,
            type: (formInputs.type as HTMLSelectElement).value as PolicyType,
            carrier,
            agentName: (formInputs.agentName as HTMLInputElement).value.trim() || undefined,
            effectiveDate,
            expirationDate,
            premiumAmount: parseFloat((formInputs.premiumAmount as HTMLInputElement).value) || 0,
            coverageLimit: parseFloat((formInputs.coverageLimit as HTMLInputElement).value) || 0,
            deductible: parseFloat((formInputs.deductible as HTMLInputElement).value) || 0,
          });

          showMsg(wrapper, 'Policy created successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            const inp = formInputs[key];
            if (inp instanceof HTMLInputElement) inp.value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create policy';
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

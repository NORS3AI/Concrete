/**
 * Surety Companies view.
 * Filterable list of surety companies with summary cards, search, and status filter.
 * Wired to BondingService for CRUD operations.
 */

import { getBondingService } from '../service-accessor';

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
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-red-500/10 text-red-400 border border-red-500/20',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Surety Companies'));
    const newBtn = el('button', btnCls, 'New Surety');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-2 gap-4 mb-6');
    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Sureties'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const activeCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    activeCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Active'));
    const activeValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    activeCard.appendChild(activeValue);
    summaryRow.appendChild(activeCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Surety Company'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const nameGroup = el('div');
    nameGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Company Name'));
    const nameInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    nameInput.type = 'text';
    nameInput.placeholder = 'Surety company name';
    nameGroup.appendChild(nameInput);
    formGrid.appendChild(nameGroup);

    const agentGroup = el('div');
    agentGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Agent Name'));
    const agentInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    agentInput.type = 'text';
    agentInput.placeholder = 'Agent name';
    agentGroup.appendChild(agentInput);
    formGrid.appendChild(agentGroup);

    const emailGroup = el('div');
    emailGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Email'));
    const emailInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    emailInput.type = 'email';
    emailInput.placeholder = 'agent@example.com';
    emailGroup.appendChild(emailInput);
    formGrid.appendChild(emailGroup);

    const phoneGroup = el('div');
    phoneGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Phone'));
    const phoneInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    phoneInput.type = 'tel';
    phoneInput.placeholder = '(555) 123-4567';
    phoneGroup.appendChild(phoneInput);
    formGrid.appendChild(phoneGroup);

    const singleLimitGroup = el('div');
    singleLimitGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Single Job Limit'));
    const singleLimitInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    singleLimitInput.type = 'number';
    singleLimitInput.placeholder = '0.00';
    singleLimitGroup.appendChild(singleLimitInput);
    formGrid.appendChild(singleLimitGroup);

    const aggLimitGroup = el('div');
    aggLimitGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Aggregate Limit'));
    const aggLimitInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    aggLimitInput.type = 'number';
    aggLimitInput.placeholder = '0.00';
    aggLimitGroup.appendChild(aggLimitInput);
    formGrid.appendChild(aggLimitGroup);

    formWrap.appendChild(formGrid);

    const formBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const saveBtn = el('button', btnCls, 'Save');
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
    searchInput.placeholder = 'Search sureties...';
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

    // ---- Loading indicator ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading sureties...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const filters: { active?: boolean; search?: string } = {};
        if (statusSelect.value === 'active') filters.active = true;
        if (statusSelect.value === 'inactive') filters.active = false;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listSureties(filters);

        // Update summary
        const allItems = await svc.listSureties();
        const activeCount = allItems.filter((s) => s.active).length;
        totalValue.textContent = String(allItems.length);
        activeValue.textContent = String(activeCount);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Name', 'Agent', 'Email', 'Phone', 'Single Limit', 'Aggregate Limit', 'Exposure', 'Available', 'Rating', 'Status']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No surety companies found. Add your first surety to get started.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.name));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.agentName));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.agentEmail ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.agentPhone ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.singleJobLimit)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.aggregateLimit)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.currentExposure)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.availableCapacity)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.rating ?? ''));

          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusLabel = item.active ? 'Active' : 'Inactive';
          const badgeCls = item.active ? STATUS_BADGE.active : STATUS_BADGE.inactive;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, statusLabel));
          tr.appendChild(tdStatus);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load surety companies';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          if (!nameInput.value.trim()) {
            showMsg(wrapper, 'Company name is required.', true);
            return;
          }
          if (!agentInput.value.trim()) {
            showMsg(wrapper, 'Agent name is required.', true);
            return;
          }

          await svc.createSurety({
            name: nameInput.value.trim(),
            agentName: agentInput.value.trim(),
            agentEmail: emailInput.value.trim() || undefined,
            agentPhone: phoneInput.value.trim() || undefined,
            singleJobLimit: parseFloat(singleLimitInput.value) || 0,
            aggregateLimit: parseFloat(aggLimitInput.value) || 0,
          });

          showMsg(wrapper, 'Surety company created successfully.', false);
          formWrap.classList.add('hidden');
          nameInput.value = '';
          agentInput.value = '';
          emailInput.value = '';
          phoneInput.value = '';
          singleLimitInput.value = '';
          aggLimitInput.value = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create surety company';
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

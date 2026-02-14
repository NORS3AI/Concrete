/**
 * OCIP/CCIP Programs view.
 * Filterable list of wrap-up insurance programs with summary cards,
 * search/status filter, new program form, and deactivate action.
 * Wired to BondingService for data and operations.
 */

import { getBondingService } from '../service-accessor';
import type { WrapUpType } from '../bonding-service';

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

const TYPE_OPTIONS: { value: WrapUpType; label: string }[] = [
  { value: 'ocip', label: 'OCIP' },
  { value: 'ccip', label: 'CCIP' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  ocip: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  ccip: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'OCIP/CCIP Programs'));
    const newBtn = el('button', btnCls, 'New Program');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-4 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Programs'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const activeCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    activeCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Active'));
    const activeValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    activeCard.appendChild(activeValue);
    summaryRow.appendChild(activeCard);

    const ocipCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    ocipCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'OCIP'));
    const ocipValue = el('div', 'text-2xl font-bold text-blue-400', '--');
    ocipCard.appendChild(ocipValue);
    summaryRow.appendChild(ocipCard);

    const ccipCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    ccipCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'CCIP'));
    const ccipValue = el('div', 'text-2xl font-bold text-purple-400', '--');
    ccipCard.appendChild(ccipValue);
    summaryRow.appendChild(ccipCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Wrap-Up Program'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const formFieldDefs: { label: string; key: string; type: string; placeholder: string; options?: { value: string; label: string }[] }[] = [
      { label: 'Program Name', key: 'name', type: 'text', placeholder: 'Program name' },
      { label: 'Type', key: 'type', type: 'select', placeholder: '', options: TYPE_OPTIONS },
      { label: 'Job ID', key: 'jobId', type: 'text', placeholder: 'Job ID' },
      { label: 'Job Name', key: 'jobName', type: 'text', placeholder: 'Job name' },
      { label: 'Carrier', key: 'carrier', type: 'text', placeholder: 'Insurance carrier' },
      { label: 'Start Date', key: 'startDate', type: 'date', placeholder: '' },
      { label: 'End Date', key: 'endDate', type: 'date', placeholder: '' },
      { label: 'Total Premium', key: 'totalPremium', type: 'number', placeholder: '0.00' },
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
    const saveBtn = el('button', btnCls, 'Create Program');
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
    searchInput.placeholder = 'Search programs...';
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
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading programs...'));
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

        const items = await svc.listWrapUps(filters);

        // Update summary from unfiltered list
        const allItems = await svc.listWrapUps();
        const activeCount = allItems.filter((w) => w.active).length;
        const ocipCount = allItems.filter((w) => w.type === 'ocip').length;
        const ccipCount = allItems.filter((w) => w.type === 'ccip').length;
        totalValue.textContent = String(allItems.length);
        activeValue.textContent = String(activeCount);
        ocipValue.textContent = String(ocipCount);
        ccipValue.textContent = String(ccipCount);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Name', 'Type', 'Job', 'Carrier', 'Start Date', 'End Date', 'Enrolled Subs', 'Total Premium', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No wrap-up programs found.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.name));

          // Type badge
          const tdType = el('td', 'px-4 py-3 text-sm');
          const typeBadge = TYPE_BADGE[item.type] ?? TYPE_BADGE.ocip;
          tdType.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${typeBadge}`, item.type.toUpperCase()));
          tr.appendChild(tdType);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.jobName ?? item.jobId));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.carrier));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.startDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.endDate ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.enrolledSubs)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.totalPremium)));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3 text-sm');
          const statusLabel = item.active ? 'Active' : 'Inactive';
          const badgeCls = item.active ? STATUS_BADGE.active : STATUS_BADGE.inactive;
          tdStatus.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`, statusLabel));
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          if (item.active) {
            const deactivateBtn = el('button', 'text-red-400 hover:underline text-sm', 'Deactivate');
            deactivateBtn.addEventListener('click', () => {
              if (!confirm(`Deactivate program "${item.name}"?`)) return;
              void (async () => {
                try {
                  await svc.updateWrapUp((item as any).id, { active: false });
                  showMsg(wrapper, `Program "${item.name}" deactivated.`, false);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to deactivate program';
                  showMsg(wrapper, message, true);
                }
              })();
            });
            tdActions.appendChild(deactivateBtn);
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
        const message = err instanceof Error ? err.message : 'Failed to load wrap-up programs';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const name = (formInputs.name as HTMLInputElement).value.trim();
          const carrier = (formInputs.carrier as HTMLInputElement).value.trim();
          const jobId = (formInputs.jobId as HTMLInputElement).value.trim();
          const startDate = (formInputs.startDate as HTMLInputElement).value;

          if (!name) { showMsg(wrapper, 'Program name is required.', true); return; }
          if (!carrier) { showMsg(wrapper, 'Carrier is required.', true); return; }
          if (!jobId) { showMsg(wrapper, 'Job ID is required.', true); return; }
          if (!startDate) { showMsg(wrapper, 'Start date is required.', true); return; }

          await svc.createWrapUp({
            name,
            type: (formInputs.type as HTMLSelectElement).value as WrapUpType,
            jobId,
            jobName: (formInputs.jobName as HTMLInputElement).value.trim() || undefined,
            carrier,
            startDate,
            endDate: (formInputs.endDate as HTMLInputElement).value || undefined,
            totalPremium: parseFloat((formInputs.totalPremium as HTMLInputElement).value) || 0,
          });

          showMsg(wrapper, 'Wrap-up program created successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            const inp = formInputs[key];
            if (inp instanceof HTMLInputElement) inp.value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create wrap-up program';
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

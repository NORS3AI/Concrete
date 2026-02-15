/**
 * Insurance Cost Allocation view.
 * Shows job insurance cost allocations with summary cards, job ID filter input,
 * allocate cost form, export functionality, and currency formatting.
 * Wired to BondingService for data and operations.
 */

import { getBondingService } from '../service-accessor';
import type { PolicyType } from '../bonding-service';

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

const POLICY_TYPE_OPTIONS: { value: PolicyType; label: string }[] = [
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Insurance Cost Allocation'));
    const btnGroup = el('div', 'flex items-center gap-3');
    const exportBtn = el('button', btnCls, 'Export');
    exportBtn.type = 'button';
    btnGroup.appendChild(exportBtn);
    const allocateBtn = el('button', btnCls, 'Allocate Cost');
    allocateBtn.type = 'button';
    btnGroup.appendChild(allocateBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-2 gap-4 mb-6');

    const totalAllocCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalAllocCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Allocations'));
    const totalAllocValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalAllocCard.appendChild(totalAllocValue);
    summaryRow.appendChild(totalAllocCard);

    const totalCostCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCostCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Cost'));
    const totalCostValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    totalCostCard.appendChild(totalCostValue);
    summaryRow.appendChild(totalCostCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Allocate Insurance Cost'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const formFieldDefs: { label: string; key: string; type: string; placeholder: string; options?: { value: string; label: string }[] }[] = [
      { label: 'Job ID', key: 'jobId', type: 'text', placeholder: 'Job ID' },
      { label: 'Job Name', key: 'jobName', type: 'text', placeholder: 'Job name' },
      { label: 'Policy Type', key: 'policyType', type: 'select', placeholder: '', options: POLICY_TYPE_OPTIONS },
      { label: 'Amount', key: 'allocatedAmount', type: 'number', placeholder: '0.00' },
      { label: 'Period', key: 'period', type: 'text', placeholder: 'e.g. 2025-Q1' },
      { label: 'Method', key: 'method', type: 'text', placeholder: 'e.g. payroll, revenue, sqft' },
      { label: 'Notes', key: 'notes', type: 'text', placeholder: 'Optional notes' },
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
    const saveBtn = el('button', btnCls, 'Allocate');
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    allocateBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Filter Bar ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const jobFilterInput = el('input', inputCls) as HTMLInputElement;
    jobFilterInput.type = 'text';
    jobFilterInput.placeholder = 'Filter by Job ID...';
    filterBar.appendChild(jobFilterInput);

    const filterBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Apply Filter');
    filterBar.appendChild(filterBtn);

    const clearBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]', 'Clear');
    filterBar.appendChild(clearBtn);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // Store loaded data for export
    let currentData: Awaited<ReturnType<ReturnType<typeof getBondingService>['listJobCosts']>> = [];

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading cost allocations...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const jobId = jobFilterInput.value.trim() || undefined;
        const items = await svc.listJobCosts(jobId);
        currentData = items;

        // Update summary
        const totalCost = items.reduce((sum, i) => sum + i.allocatedAmount, 0);
        totalAllocValue.textContent = String(items.length);
        totalCostValue.textContent = fmtCurrency(totalCost);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Job', 'Policy Type', 'Amount', 'Period', 'Method', 'Notes']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No cost allocations found. Allocate insurance costs to jobs to get started.');
          td.setAttribute('colspan', '6');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          const jobDisplay = item.jobName ? `${item.jobName} (${item.jobId})` : item.jobId;
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', jobDisplay));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.policyType] ?? item.policyType));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.allocatedAmount)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.period));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.method));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', item.notes ?? ''));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load job cost allocations';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const jobId = (formInputs.jobId as HTMLInputElement).value.trim();
          const period = (formInputs.period as HTMLInputElement).value.trim();
          const method = (formInputs.method as HTMLInputElement).value.trim();
          const amount = parseFloat((formInputs.allocatedAmount as HTMLInputElement).value);

          if (!jobId) { showMsg(wrapper, 'Job ID is required.', true); return; }
          if (!period) { showMsg(wrapper, 'Period is required.', true); return; }
          if (!method) { showMsg(wrapper, 'Allocation method is required.', true); return; }
          if (isNaN(amount) || amount <= 0) { showMsg(wrapper, 'Valid amount is required.', true); return; }

          await svc.allocateCost({
            jobId,
            jobName: (formInputs.jobName as HTMLInputElement).value.trim() || undefined,
            policyType: (formInputs.policyType as HTMLSelectElement).value as PolicyType,
            allocatedAmount: amount,
            period,
            method,
            notes: (formInputs.notes as HTMLInputElement).value.trim() || undefined,
          });

          showMsg(wrapper, 'Cost allocated successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            const inp = formInputs[key];
            if (inp instanceof HTMLInputElement) inp.value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to allocate cost';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Export Handler ----
    exportBtn.addEventListener('click', () => {
      try {
        if (currentData.length === 0) {
          showMsg(wrapper, 'No data to export.', true);
          return;
        }

        const headers = ['Job ID', 'Job Name', 'Policy Type', 'Amount', 'Period', 'Method', 'Notes'];
        const rows = currentData.map((item) => [
          item.jobId,
          item.jobName ?? '',
          TYPE_LABEL[item.policyType] ?? item.policyType,
          item.allocatedAmount.toString(),
          item.period,
          item.method,
          item.notes ?? '',
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `job-insurance-costs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        showMsg(wrapper, 'Cost allocations exported successfully.', false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to export cost allocations';
        showMsg(wrapper, message, true);
      }
    });

    // ---- Filter Handlers ----
    filterBtn.addEventListener('click', () => void loadAndRender());
    clearBtn.addEventListener('click', () => {
      jobFilterInput.value = '';
      void loadAndRender();
    });
    jobFilterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void loadAndRender();
    });

    // ---- Initial Load ----
    void loadAndRender();
  },
};

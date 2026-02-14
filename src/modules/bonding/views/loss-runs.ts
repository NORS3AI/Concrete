/**
 * Loss Run Tracking view.
 * Shows loss run records with summary cards for totals, add loss run form,
 * and currency-formatted table.
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Loss Run Tracking'));
    const addBtn = el('button', btnCls, 'Add Loss Run');
    addBtn.type = 'button';
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalRunsCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalRunsCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Runs'));
    const totalRunsValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalRunsCard.appendChild(totalRunsValue);
    summaryRow.appendChild(totalRunsCard);

    const totalClaimsCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalClaimsCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Claims'));
    const totalClaimsValue = el('div', 'text-2xl font-bold text-amber-400', '--');
    totalClaimsCard.appendChild(totalClaimsValue);
    summaryRow.appendChild(totalClaimsCard);

    const totalIncurredCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalIncurredCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Incurred'));
    const totalIncurredValue = el('div', 'text-2xl font-bold text-red-400', '--');
    totalIncurredCard.appendChild(totalIncurredValue);
    summaryRow.appendChild(totalIncurredCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Add Loss Run'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const formFieldDefs: { label: string; key: string; type: string; placeholder: string; options?: { value: string; label: string }[] }[] = [
      { label: 'Carrier', key: 'carrier', type: 'text', placeholder: 'Insurance carrier' },
      { label: 'Policy Type', key: 'policyType', type: 'select', placeholder: '', options: POLICY_TYPE_OPTIONS },
      { label: 'Period Start', key: 'periodStart', type: 'date', placeholder: '' },
      { label: 'Period End', key: 'periodEnd', type: 'date', placeholder: '' },
      { label: 'Total Claims', key: 'totalClaims', type: 'number', placeholder: '0' },
      { label: 'Total Paid', key: 'totalPaid', type: 'number', placeholder: '0.00' },
      { label: 'Total Reserved', key: 'totalReserved', type: 'number', placeholder: '0.00' },
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
    const saveBtn = el('button', btnCls, 'Add Loss Run');
    const cancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    formBtnRow.appendChild(saveBtn);
    formBtnRow.appendChild(cancelBtn);
    formWrap.appendChild(formBtnRow);
    wrapper.appendChild(formWrap);

    addBtn.addEventListener('click', () => formWrap.classList.toggle('hidden'));
    cancelBtn.addEventListener('click', () => formWrap.classList.add('hidden'));

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading loss runs...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();
        const items = await svc.listLossRuns();

        // Update summary
        const totalClaims = items.reduce((sum, i) => sum + i.totalClaims, 0);
        const totalIncurred = items.reduce((sum, i) => sum + i.totalIncurred, 0);
        totalRunsValue.textContent = String(items.length);
        totalClaimsValue.textContent = String(totalClaims);
        totalIncurredValue.textContent = fmtCurrency(totalIncurred);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Carrier', 'Policy Type', 'Period Start', 'Period End', 'Claims', 'Paid', 'Reserved', 'Incurred', 'Requested', 'Received']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No loss runs found. Add your first loss run to get started.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.carrier));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', TYPE_LABEL[item.policyType] ?? item.policyType));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.periodStart));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.periodEnd));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(item.totalClaims)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.totalPaid)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.totalReserved)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', fmtCurrency(item.totalIncurred)));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.requestedDate));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.receivedDate ?? ''));

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load loss runs';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const carrier = (formInputs.carrier as HTMLInputElement).value.trim();
          const periodStart = (formInputs.periodStart as HTMLInputElement).value;
          const periodEnd = (formInputs.periodEnd as HTMLInputElement).value;

          if (!carrier) { showMsg(wrapper, 'Carrier is required.', true); return; }
          if (!periodStart) { showMsg(wrapper, 'Period start is required.', true); return; }
          if (!periodEnd) { showMsg(wrapper, 'Period end is required.', true); return; }

          await svc.addLossRun({
            carrier,
            policyType: (formInputs.policyType as HTMLSelectElement).value as PolicyType,
            periodStart,
            periodEnd,
            totalClaims: parseInt((formInputs.totalClaims as HTMLInputElement).value, 10) || 0,
            totalPaid: parseFloat((formInputs.totalPaid as HTMLInputElement).value) || 0,
            totalReserved: parseFloat((formInputs.totalReserved as HTMLInputElement).value) || 0,
          });

          showMsg(wrapper, 'Loss run added successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            const inp = formInputs[key];
            if (inp instanceof HTMLInputElement) inp.value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add loss run';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    void loadAndRender();
  },
};

/**
 * Subcontractor Insurance Compliance view.
 * Filterable list of subcontractor insurance records with compliance badges,
 * summary cards, search/compliance filter, add sub form, and update action.
 * Wired to BondingService for data and operations.
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

const COMPLIANCE_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'non-compliant', label: 'Non-Compliant' },
];

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontractor Insurance Compliance'));
    const addBtn = el('button', btnCls, 'Add Sub');
    addBtn.type = 'button';
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Cards ----
    const summaryRow = el('div', 'grid grid-cols-3 gap-4 mb-6');

    const totalCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    totalCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Total Subs'));
    const totalValue = el('div', 'text-2xl font-bold text-[var(--text)]', '--');
    totalCard.appendChild(totalValue);
    summaryRow.appendChild(totalCard);

    const compliantCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    compliantCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Compliant'));
    const compliantValue = el('div', 'text-2xl font-bold text-emerald-400', '--');
    compliantCard.appendChild(compliantValue);
    summaryRow.appendChild(compliantCard);

    const nonCompliantCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    nonCompliantCard.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Non-Compliant'));
    const nonCompliantValue = el('div', 'text-2xl font-bold text-red-400', '--');
    nonCompliantCard.appendChild(nonCompliantValue);
    summaryRow.appendChild(nonCompliantCard);

    wrapper.appendChild(summaryRow);

    // ---- Inline Form (hidden) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Add Subcontractor Insurance'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

    const formFields: { label: string; key: string; type: string; placeholder: string }[] = [
      { label: 'Subcontractor ID', key: 'subcontractorId', type: 'text', placeholder: 'SUB-001' },
      { label: 'Subcontractor Name', key: 'subcontractorName', type: 'text', placeholder: 'Company name' },
      { label: 'GL Policy Number', key: 'glPolicyNumber', type: 'text', placeholder: 'GL policy #' },
      { label: 'GL Expiration', key: 'glExpiration', type: 'date', placeholder: '' },
      { label: 'WC Policy Number', key: 'wcPolicyNumber', type: 'text', placeholder: 'WC policy #' },
      { label: 'WC Expiration', key: 'wcExpiration', type: 'date', placeholder: '' },
      { label: 'Auto Expiration', key: 'autoExpiration', type: 'date', placeholder: '' },
      { label: 'Umbrella Expiration', key: 'umbrellaExpiration', type: 'date', placeholder: '' },
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
    const saveBtn = el('button', btnCls, 'Add Subcontractor');
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

    // ---- Update Form (hidden) ----
    const updateWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    const updateTitle = el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Update Subcontractor Insurance');
    updateWrap.appendChild(updateTitle);

    const updateGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    const updateFields: { label: string; key: string; type: string; placeholder: string }[] = [
      { label: 'GL Policy Number', key: 'u_glPolicyNumber', type: 'text', placeholder: 'GL policy #' },
      { label: 'GL Expiration', key: 'u_glExpiration', type: 'date', placeholder: '' },
      { label: 'WC Policy Number', key: 'u_wcPolicyNumber', type: 'text', placeholder: 'WC policy #' },
      { label: 'WC Expiration', key: 'u_wcExpiration', type: 'date', placeholder: '' },
      { label: 'Auto Expiration', key: 'u_autoExpiration', type: 'date', placeholder: '' },
      { label: 'Umbrella Expiration', key: 'u_umbrellaExpiration', type: 'date', placeholder: '' },
    ];

    const updateInputs: Record<string, HTMLInputElement> = {};

    for (const field of updateFields) {
      const group = el('div');
      group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', field.label));
      const input = el('input', inputCls + ' w-full') as HTMLInputElement;
      input.type = field.type;
      input.placeholder = field.placeholder;
      group.appendChild(input);
      updateInputs[field.key] = input;
      updateGrid.appendChild(group);
    }

    updateWrap.appendChild(updateGrid);

    let updateTargetId = '';
    const updateBtnRow = el('div', 'flex items-center gap-3 mt-4');
    const updateSaveBtn = el('button', btnCls, 'Save Changes');
    const updateCancelBtn = el(
      'button',
      'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]',
      'Cancel',
    );
    updateBtnRow.appendChild(updateSaveBtn);
    updateBtnRow.appendChild(updateCancelBtn);
    updateWrap.appendChild(updateBtnRow);
    wrapper.appendChild(updateWrap);

    updateCancelBtn.addEventListener('click', () => {
      updateWrap.classList.add('hidden');
      updateTargetId = '';
    });

    // ---- Filter Bar ----
    const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search subcontractors...';
    filterBar.appendChild(searchInput);

    const complianceSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of COMPLIANCE_FILTER_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      complianceSelect.appendChild(o);
    }
    filterBar.appendChild(complianceSelect);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Loading ----
    function showLoading(): void {
      tableContainer.innerHTML = '';
      const loader = el('div', 'flex items-center justify-center py-12');
      loader.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading subcontractor compliance...'));
      tableContainer.appendChild(loader);
    }

    // ---- Data Loading ----
    async function loadAndRender(): Promise<void> {
      showLoading();
      try {
        const svc = getBondingService();

        const filters: { compliant?: boolean; search?: string } = {};
        if (complianceSelect.value === 'compliant') filters.compliant = true;
        if (complianceSelect.value === 'non-compliant') filters.compliant = false;
        if (searchInput.value.trim()) filters.search = searchInput.value.trim();

        const items = await svc.listSubInsurance(filters);

        // Update summary from unfiltered list
        const allItems = await svc.listSubInsurance();
        const compliantCount = allItems.filter((s) => s.compliant).length;
        const nonCompliantCount = allItems.filter((s) => !s.compliant).length;
        totalValue.textContent = String(allItems.length);
        compliantValue.textContent = String(compliantCount);
        nonCompliantValue.textContent = String(nonCompliantCount);

        // Build Table
        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['Sub Name', 'GL Policy', 'GL Exp', 'WC Policy', 'WC Exp', 'Auto Exp', 'Umbrella Exp', 'Compliant', 'Last Verified', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No subcontractor insurance records found.');
          td.setAttribute('colspan', '10');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-medium', item.subcontractorName));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.glPolicyNumber ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.glExpiration ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', item.wcPolicyNumber ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.wcExpiration ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.autoExpiration ?? ''));
          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.umbrellaExpiration ?? ''));

          // Compliant badge
          const tdCompliant = el('td', 'px-4 py-3 text-sm');
          if (item.compliant) {
            tdCompliant.appendChild(
              el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'),
            );
          } else {
            tdCompliant.appendChild(
              el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'No'),
            );
          }
          tr.appendChild(tdCompliant);

          tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', item.lastVerifiedDate ?? ''));

          // Actions
          const tdActions = el('td', 'px-4 py-3 text-sm');
          const updateBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Update');
          updateBtn.addEventListener('click', () => {
            updateTargetId = (item as any).id;
            updateTitle.textContent = `Update: ${item.subcontractorName}`;
            updateInputs.u_glPolicyNumber.value = item.glPolicyNumber ?? '';
            updateInputs.u_glExpiration.value = item.glExpiration ?? '';
            updateInputs.u_wcPolicyNumber.value = item.wcPolicyNumber ?? '';
            updateInputs.u_wcExpiration.value = item.wcExpiration ?? '';
            updateInputs.u_autoExpiration.value = item.autoExpiration ?? '';
            updateInputs.u_umbrellaExpiration.value = item.umbrellaExpiration ?? '';
            updateWrap.classList.remove('hidden');
          });
          tdActions.appendChild(updateBtn);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);

        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load subcontractor compliance';
        tableContainer.innerHTML = '';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Save New Sub Handler ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getBondingService();

          const subcontractorId = formInputs.subcontractorId.value.trim();
          const subcontractorName = formInputs.subcontractorName.value.trim();

          if (!subcontractorId) { showMsg(wrapper, 'Subcontractor ID is required.', true); return; }
          if (!subcontractorName) { showMsg(wrapper, 'Subcontractor name is required.', true); return; }

          await svc.addSubInsurance({
            subcontractorId,
            subcontractorName,
            glPolicyNumber: formInputs.glPolicyNumber.value.trim() || undefined,
            glExpiration: formInputs.glExpiration.value || undefined,
            wcPolicyNumber: formInputs.wcPolicyNumber.value.trim() || undefined,
            wcExpiration: formInputs.wcExpiration.value || undefined,
            autoExpiration: formInputs.autoExpiration.value || undefined,
            umbrellaExpiration: formInputs.umbrellaExpiration.value || undefined,
          });

          showMsg(wrapper, 'Subcontractor insurance added successfully.', false);
          formWrap.classList.add('hidden');
          for (const key of Object.keys(formInputs)) {
            formInputs[key].value = '';
          }

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add subcontractor insurance';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Update Save Handler ----
    updateSaveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          if (!updateTargetId) return;
          const svc = getBondingService();

          await svc.updateSubInsurance(updateTargetId, {
            glPolicyNumber: updateInputs.u_glPolicyNumber.value.trim() || undefined,
            glExpiration: updateInputs.u_glExpiration.value || undefined,
            wcPolicyNumber: updateInputs.u_wcPolicyNumber.value.trim() || undefined,
            wcExpiration: updateInputs.u_wcExpiration.value || undefined,
            autoExpiration: updateInputs.u_autoExpiration.value || undefined,
            umbrellaExpiration: updateInputs.u_umbrellaExpiration.value || undefined,
            lastVerifiedDate: new Date().toISOString().split('T')[0],
          });

          showMsg(wrapper, 'Subcontractor insurance updated successfully.', false);
          updateWrap.classList.add('hidden');
          updateTargetId = '';

          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to update subcontractor insurance';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    complianceSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};

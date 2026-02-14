/**
 * Compliance Matrix view.
 * Visual matrix showing compliance status for each subcontractor
 * across all compliance types (insurance, license, bond, OSHA, E-Verify).
 * Includes insurance certificate expiration alerts. Wired to SubService.
 */

import { getSubService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPLIANCE_TYPES = [
  { key: 'insuranceGl', label: 'GL' },
  { key: 'insuranceAuto', label: 'Auto' },
  { key: 'insuranceUmbrella', label: 'Umbrella' },
  { key: 'insuranceWc', label: 'WC' },
  { key: 'license', label: 'License' },
  { key: 'bond', label: 'Bond' },
  { key: 'osha', label: 'OSHA' },
  { key: 'everify', label: 'E-Verify' },
];

const COMPLIANCE_TYPE_OPTIONS = [
  { value: 'insurance_gl', label: 'GL Insurance' },
  { value: 'insurance_auto', label: 'Auto Insurance' },
  { value: 'insurance_umbrella', label: 'Umbrella Insurance' },
  { value: 'insurance_wc', label: 'Workers Comp' },
  { value: 'license', label: 'License' },
  { value: 'bond', label: 'Bond' },
  { value: 'osha', label: 'OSHA' },
  { value: 'everify', label: 'E-Verify' },
];

const COMPLIANCE_STATUS_OPTIONS = [
  { value: 'valid', label: 'Valid' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'missing', label: 'Missing' },
];

const STATUS_COLORS: Record<string, string> = {
  valid: 'bg-emerald-500',
  expired: 'bg-red-500',
  pending: 'bg-amber-500',
  missing: 'bg-zinc-600',
};

const STATUS_TEXT: Record<string, string> = {
  valid: 'Valid',
  expired: 'Expired',
  pending: 'Pending',
  missing: 'Missing',
};

const OVERALL_BADGE: Record<string, string> = {
  compliant: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  non_compliant: 'bg-red-500/10 text-red-400 border border-red-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const OVERALL_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-Compliant',
  partial: 'Partial',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Compliance Matrix'));
    const addBtn = el('button', btnCls, 'Add Compliance Record');
    addBtn.type = 'button';
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // ---- Expiration Alerts Section ----
    const alertsContainer = el('div');
    wrapper.appendChild(alertsContainer);

    // ---- Inline Form (hidden by default) ----
    const formWrap = el(
      'div',
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4 hidden',
    );
    formWrap.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Add Compliance Record'));

    const formGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

    // Vendor ID
    const vendorGroup = el('div');
    vendorGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Vendor ID'));
    const vendorInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    vendorInput.type = 'text';
    vendorInput.placeholder = 'Vendor ID';
    vendorGroup.appendChild(vendorInput);
    formGrid.appendChild(vendorGroup);

    // Type
    const typeGroup = el('div');
    typeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Type'));
    const typeSelect = el('select', inputCls + ' w-full') as HTMLSelectElement;
    for (const opt of COMPLIANCE_TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeSelect.appendChild(o);
    }
    typeGroup.appendChild(typeSelect);
    formGrid.appendChild(typeGroup);

    // Status
    const statusGroup = el('div');
    statusGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Status'));
    const statusInput = el('select', inputCls + ' w-full') as HTMLSelectElement;
    for (const opt of COMPLIANCE_STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusInput.appendChild(o);
    }
    statusGroup.appendChild(statusInput);
    formGrid.appendChild(statusGroup);

    // Expiration Date
    const expGroup = el('div');
    expGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Expiration Date'));
    const expInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    expInput.type = 'date';
    expGroup.appendChild(expInput);
    formGrid.appendChild(expGroup);

    // Document ID
    const docGroup = el('div');
    docGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Document ID'));
    const docInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    docInput.type = 'text';
    docInput.placeholder = 'Optional document reference';
    docGroup.appendChild(docInput);
    formGrid.appendChild(docGroup);

    // Notes
    const notesGroup = el('div');
    notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Notes'));
    const notesInput = el('input', inputCls + ' w-full') as HTMLInputElement;
    notesInput.type = 'text';
    notesInput.placeholder = 'Optional notes';
    notesGroup.appendChild(notesInput);
    formGrid.appendChild(notesGroup);

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

    // Toggle form
    addBtn.addEventListener('click', () => {
      formWrap.classList.toggle('hidden');
    });
    cancelBtn.addEventListener('click', () => {
      formWrap.classList.add('hidden');
    });

    // ---- Legend ----
    const legend = el('div', 'flex items-center gap-4 mb-4');
    legend.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Legend:'));
    const legendEntries: { color: string; label: string }[] = [
      { color: 'bg-emerald-500', label: 'Valid' },
      { color: 'bg-amber-500', label: 'Pending' },
      { color: 'bg-red-500', label: 'Expired' },
      { color: 'bg-zinc-600', label: 'Missing' },
    ];
    for (const entry of legendEntries) {
      const item = el('div', 'flex items-center gap-1');
      item.appendChild(el('div', `w-3 h-3 rounded-full ${entry.color}`));
      item.appendChild(el('span', 'text-xs text-[var(--text-muted)]', entry.label));
      legend.appendChild(item);
    }
    wrapper.appendChild(legend);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const searchInput = el('input', inputCls) as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search vendors...';
    bar.appendChild(searchInput);
    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Detail Container (for vendor compliance records) ----
    const detailContainer = el('div');
    wrapper.appendChild(detailContainer);

    container.appendChild(wrapper);

    // ---- Build Compliance Dot ----
    function buildComplianceCell(status: string): HTMLElement {
      const td = el('td', 'py-2 px-3 text-center');
      const dot = el('div', `w-4 h-4 rounded-full mx-auto ${STATUS_COLORS[status] ?? STATUS_COLORS.missing}`);
      dot.title = STATUS_TEXT[status] ?? 'Unknown';
      td.appendChild(dot);
      return td;
    }

    // ---- Render Expiring Alerts ----
    function renderAlerts(
      expiring: Array<{ vendorId: string; type: string; expirationDate?: string }>,
    ): void {
      alertsContainer.innerHTML = '';

      if (expiring.length === 0) return;

      const section = el('div', 'bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6');
      section.appendChild(
        el('h3', 'text-sm font-semibold text-amber-400 mb-2',
          `Expiring Soon (${expiring.length} item${expiring.length !== 1 ? 's' : ''} within 30 days)`),
      );

      const list = el('div', 'space-y-1');
      for (const item of expiring) {
        const typeLabel = COMPLIANCE_TYPE_OPTIONS.find((t) => t.value === item.type)?.label ?? item.type;
        const row = el('div', 'text-sm text-[var(--text-muted)]',
          `${item.vendorId} - ${typeLabel} expires ${item.expirationDate ?? 'N/A'}`);
        list.appendChild(row);
      }
      section.appendChild(list);
      alertsContainer.appendChild(section);
    }

    // ---- Render Matrix Table ----
    function renderTable(
      rows: Array<{
        vendorId: string;
        vendorName: string;
        insuranceGl: string;
        insuranceAuto: string;
        insuranceUmbrella: string;
        insuranceWc: string;
        license: string;
        bond: string;
        osha: string;
        everify: string;
        overallStatus: string;
      }>,
    ): void {
      tableContainer.innerHTML = '';

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Vendor'));
      for (const ct of COMPLIANCE_TYPES) {
        headRow.appendChild(el('th', 'py-2 px-3 font-medium text-center', ct.label));
      }
      headRow.appendChild(el('th', 'py-2 px-3 font-medium text-center', 'Overall'));
      headRow.appendChild(el('th', 'py-2 px-3 font-medium', 'Actions'));
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (rows.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No compliance records found. Add compliance tracking for your subcontractors.');
        td.setAttribute('colspan', (COMPLIANCE_TYPES.length + 3).toString());
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of rows) {
        const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

        tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.vendorName));

        const rowData = row as unknown as Record<string, unknown>;
        for (const ct of COMPLIANCE_TYPES) {
          tr.appendChild(buildComplianceCell(rowData[ct.key] as string));
        }

        const tdOverall = el('td', 'py-2 px-3 text-center');
        const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${OVERALL_BADGE[row.overallStatus] ?? OVERALL_BADGE.non_compliant}`,
          OVERALL_LABEL[row.overallStatus] ?? 'Unknown');
        tdOverall.appendChild(badge);
        tr.appendChild(tdOverall);

        const tdActions = el('td', 'py-2 px-3');
        const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Update');
        editBtn.type = 'button';
        editBtn.addEventListener('click', () => {
          void handleShowDetail(row.vendorId, row.vendorName);
        });
        tdActions.appendChild(editBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Show Vendor Detail Compliance Records ----
    async function handleShowDetail(vendorId: string, vendorName: string): Promise<void> {
      void (async () => {
        try {
          const svc = getSubService();
          const records = await svc.getCompliances({ vendorId });

          detailContainer.innerHTML = '';

          const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mt-4');
          const header = el('div', 'flex items-center justify-between mb-3');
          header.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', `Compliance Records: ${vendorName}`));
          const closeBtn = el('button', 'text-[var(--text-muted)] hover:text-[var(--text)] text-sm', 'Close');
          closeBtn.addEventListener('click', () => {
            detailContainer.innerHTML = '';
          });
          header.appendChild(closeBtn);
          section.appendChild(header);

          if (records.length === 0) {
            section.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No individual compliance records found for this vendor.'));
          } else {
            const table = el('table', 'w-full text-sm');
            const thead = el('thead');
            const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
            for (const col of ['Type', 'Status', 'Expiration', 'Document ID', 'Notes']) {
              headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
            }
            thead.appendChild(headRow);
            table.appendChild(thead);

            const tbody = el('tbody');
            for (const rec of records) {
              const tr = el('tr', 'border-b border-[var(--border)]');
              const typeLabel = COMPLIANCE_TYPE_OPTIONS.find((t) => t.value === rec.type)?.label ?? rec.type;
              tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', typeLabel));

              const tdStatus = el('td', 'py-2 px-3');
              const statusDot = el('div', 'flex items-center gap-2');
              statusDot.appendChild(el('div', `w-3 h-3 rounded-full ${STATUS_COLORS[rec.status] ?? STATUS_COLORS.missing}`));
              statusDot.appendChild(el('span', 'text-sm', STATUS_TEXT[rec.status] ?? 'Unknown'));
              tdStatus.appendChild(statusDot);
              tr.appendChild(tdStatus);

              tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rec.expirationDate ?? '-'));
              tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rec.documentId ?? '-'));
              tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rec.notes ?? '-'));
              tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            section.appendChild(table);
          }

          detailContainer.appendChild(section);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load vendor compliance details.';
          showMsg(wrapper, message, true);
        }
      })();
    }

    // ---- Data Loading ----
    async function loadData(): Promise<void> {
      const svc = getSubService();

      // Load expiring alerts
      const expiring = await svc.getExpiringCompliances(30);
      renderAlerts(expiring);

      // Load matrix
      let matrixRows = await svc.getComplianceMatrix();

      // Client-side search by vendor
      const search = searchInput.value.toLowerCase().trim();
      if (search) {
        matrixRows = matrixRows.filter(
          (r) => r.vendorName.toLowerCase().includes(search) || r.vendorId.toLowerCase().includes(search),
        );
      }

      renderTable(matrixRows);
    }

    // ---- Save New Compliance Record ----
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getSubService();

          if (!vendorInput.value.trim()) {
            showMsg(wrapper, 'Vendor ID is required.', true);
            return;
          }

          await svc.createCompliance({
            vendorId: vendorInput.value.trim(),
            type: typeSelect.value as Parameters<typeof svc.createCompliance>[0]['type'],
            status: statusInput.value as Parameters<typeof svc.createCompliance>[0]['status'],
            expirationDate: expInput.value || undefined,
            documentId: docInput.value.trim() || undefined,
            notes: notesInput.value.trim() || undefined,
          });

          showMsg(wrapper, 'Compliance record created successfully.', false);
          formWrap.classList.add('hidden');

          // Reset form
          vendorInput.value = '';
          typeSelect.value = 'insurance_gl';
          statusInput.value = 'valid';
          expInput.value = '';
          docInput.value = '';
          notesInput.value = '';

          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create compliance record.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => {
      void loadData();
    });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load compliance data.';
        showMsg(wrapper, message, true);
      }
    })();
  },
};

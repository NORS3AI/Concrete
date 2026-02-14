/**
 * Export Wizard view.
 * Configure and execute data exports with collection selection,
 * column selection, filters, and format options (CSV, JSON, PDF, TSV, API).
 */

import { getImportExportService } from '../service-accessor';

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
// Types
// ---------------------------------------------------------------------------

type ExportFormat = 'csv' | 'json' | 'pdf' | 'tsv' | 'api';

interface ExportState {
  selectedCollection: string;
  selectedFormat: ExportFormat;
  selectedColumns: string[];
  filters: {
    dateFrom: string;
    dateTo: string;
    entityId: string;
    jobId: string;
  };
  delimiter: string;
  letterhead: {
    companyName: string;
    address: string;
    phone: string;
    email: string;
  };
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string; description: string }[] = [
  { value: 'csv', label: 'CSV', icon: '\u{1F4C4}', description: 'Standard spreadsheet format compatible with Excel, Google Sheets' },
  { value: 'tsv', label: 'TSV', icon: '\u{1F4CB}', description: 'Tab-delimited format for data interchange' },
  { value: 'json', label: 'JSON', icon: '\u{1F4C1}', description: 'Structured data format preserving all field types' },
  { value: 'pdf', label: 'PDF', icon: '\u{1F4D1}', description: 'Formatted report with company letterhead for printing' },
  { value: 'api', label: 'API', icon: '\u{1F310}', description: 'Paginated JSON with metadata for API integration' },
];

const COLLECTION_OPTIONS: { value: string; label: string; fields: string[] }[] = [
  { value: 'gl/account', label: 'GL Accounts', fields: ['id', 'number', 'name', 'type', 'balance', 'parentId'] },
  { value: 'gl/journal', label: 'GL Journal Entries', fields: ['id', 'date', 'description', 'debit', 'credit', 'accountId', 'entityId'] },
  { value: 'job/job', label: 'Jobs', fields: ['id', 'jobNumber', 'name', 'status', 'contractAmount', 'billedToDate', 'costToDate'] },
  { value: 'job/costCode', label: 'Job Cost Codes', fields: ['id', 'code', 'name', 'jobId', 'budgetAmount', 'actualAmount'] },
  { value: 'ap/vendor', label: 'AP Vendors', fields: ['id', 'name', 'code', 'taxId', 'vendorType', 'status', 'phone', 'email'] },
  { value: 'ap/bill', label: 'AP Bills', fields: ['id', 'vendorId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'status'] },
  { value: 'ar/customer', label: 'AR Customers', fields: ['id', 'name', 'code', 'status', 'creditLimit', 'balance'] },
  { value: 'ar/invoice', label: 'AR Invoices', fields: ['id', 'customerId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'status'] },
  { value: 'entity/entity', label: 'Entities', fields: ['id', 'name', 'entityType', 'taxId', 'status'] },
  { value: 'payroll/employee', label: 'Payroll Employees', fields: ['id', 'firstName', 'lastName', 'employeeId', 'status', 'hireDate', 'payRate'] },
  { value: 'doc/document', label: 'Documents', fields: ['id', 'name', 'type', 'entityId', 'jobId', 'createdAt'] },
];

const DELIMITER_OPTIONS = [
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
  { value: ';', label: 'Semicolon (;)' },
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const state: ExportState = {
      selectedCollection: '',
      selectedFormat: 'csv',
      selectedColumns: [],
      filters: { dateFrom: '', dateTo: '', entityId: '', jobId: '' },
      delimiter: ',',
      letterhead: { companyName: '', address: '', phone: '', email: '' },
      page: 1,
      pageSize: 50,
    };

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Export Data'));
    wrapper.appendChild(headerRow);

    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

    // ----- Collection selector -----
    const collectionCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
    collectionCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Select Collection'));
    const collectionSelect = el('select', inputCls) as HTMLSelectElement;
    const defaultOpt = el('option', '', 'Choose a data type to export...') as HTMLOptionElement;
    defaultOpt.value = '';
    collectionSelect.appendChild(defaultOpt);
    for (const opt of COLLECTION_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      collectionSelect.appendChild(o);
    }
    collectionCard.appendChild(collectionSelect);
    wrapper.appendChild(collectionCard);

    // ----- Dynamic content area -----
    const dynamicArea = el('div');
    wrapper.appendChild(dynamicArea);

    // ----- Result area -----
    const resultArea = el('div');
    wrapper.appendChild(resultArea);

    // ----- Recent exports area -----
    const recentArea = el('div');
    wrapper.appendChild(recentArea);

    // ----- Rebuild dynamic area -----
    const rebuildDynamic = () => {
      dynamicArea.innerHTML = '';

      if (!state.selectedCollection) return;

      const collectionDef = COLLECTION_OPTIONS.find(c => c.value === state.selectedCollection);
      const fields = collectionDef?.fields ?? [];

      // Initialize selected columns if empty
      if (state.selectedColumns.length === 0 && fields.length > 0) {
        state.selectedColumns = [...fields];
      }

      // Format cards
      dynamicArea.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-3', 'Export Format'));
      const formatGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6');
      for (const format of FORMAT_OPTIONS) {
        const isSelected = format.value === state.selectedFormat;
        const cardCls = isSelected
          ? 'bg-[var(--surface-raised)] border-2 border-[var(--accent)] rounded-lg p-4 cursor-pointer transition-all'
          : 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 cursor-pointer hover:border-[var(--accent)] transition-all';
        const card = el('div', cardCls);
        const titleRow = el('div', 'flex items-center gap-2 mb-2');
        titleRow.appendChild(el('span', 'text-lg', format.icon));
        titleRow.appendChild(el('span', 'font-medium text-[var(--text)]', format.label));
        card.appendChild(titleRow);
        card.appendChild(el('p', 'text-xs text-[var(--text-muted)]', format.description));
        if (isSelected) {
          const selectedBadge = el('div', 'mt-2');
          selectedBadge.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', 'Selected'));
          card.appendChild(selectedBadge);
        }
        card.addEventListener('click', () => {
          state.selectedFormat = format.value;
          rebuildDynamic();
        });
        formatGrid.appendChild(card);
      }
      dynamicArea.appendChild(formatGrid);

      // Column selection
      const colCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
      colCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Column Selection'));
      colCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Choose which columns to include in the export. Click to toggle.'));

      const allSelected = state.selectedColumns.length === fields.length;
      const selectAllRow = el('div', 'flex items-center gap-2 mb-3');
      const selectAllCb = el('input') as HTMLInputElement;
      selectAllCb.type = 'checkbox';
      selectAllCb.checked = allSelected;
      selectAllCb.className = 'rounded border-[var(--border)]';
      selectAllCb.addEventListener('change', () => {
        if (selectAllCb.checked) {
          state.selectedColumns = [...fields];
        } else {
          state.selectedColumns = [];
        }
        rebuildDynamic();
      });
      selectAllRow.appendChild(selectAllCb);
      selectAllRow.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', allSelected ? 'Deselect All' : 'Select All'));
      colCard.appendChild(selectAllRow);

      const fieldGrid = el('div', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2');
      for (const field of fields) {
        const fieldRow = el('label', 'flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--surface)] cursor-pointer');
        const cb = el('input') as HTMLInputElement;
        cb.type = 'checkbox';
        cb.checked = state.selectedColumns.includes(field);
        cb.className = 'rounded border-[var(--border)]';
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!state.selectedColumns.includes(field)) {
              state.selectedColumns.push(field);
            }
          } else {
            state.selectedColumns = state.selectedColumns.filter(c => c !== field);
          }
        });
        fieldRow.appendChild(cb);
        fieldRow.appendChild(el('span', 'text-sm text-[var(--text)]', field));
        fieldGrid.appendChild(fieldRow);
      }
      colCard.appendChild(fieldGrid);
      dynamicArea.appendChild(colCard);

      // Filter panel
      const filterCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
      filterCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Filters'));
      filterCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Optionally filter exported data by date range, entity, or job.'));

      const filterGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4');

      const dateFromGroup = el('div');
      dateFromGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date From'));
      const dateFromInput = el('input', inputCls) as HTMLInputElement;
      dateFromInput.type = 'date';
      dateFromInput.value = state.filters.dateFrom;
      dateFromInput.addEventListener('change', () => { state.filters.dateFrom = dateFromInput.value; });
      dateFromGroup.appendChild(dateFromInput);
      filterGrid.appendChild(dateFromGroup);

      const dateToGroup = el('div');
      dateToGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date To'));
      const dateToInput = el('input', inputCls) as HTMLInputElement;
      dateToInput.type = 'date';
      dateToInput.value = state.filters.dateTo;
      dateToInput.addEventListener('change', () => { state.filters.dateTo = dateToInput.value; });
      dateToGroup.appendChild(dateToInput);
      filterGrid.appendChild(dateToGroup);

      const entityGroup = el('div');
      entityGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Entity ID'));
      const entityInput = el('input', inputCls) as HTMLInputElement;
      entityInput.type = 'text';
      entityInput.placeholder = 'Filter by entity ID...';
      entityInput.value = state.filters.entityId;
      entityInput.addEventListener('input', () => { state.filters.entityId = entityInput.value; });
      entityGroup.appendChild(entityInput);
      filterGrid.appendChild(entityGroup);

      const jobGroup = el('div');
      jobGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Job ID'));
      const jobInput = el('input', inputCls) as HTMLInputElement;
      jobInput.type = 'text';
      jobInput.placeholder = 'Filter by job ID...';
      jobInput.value = state.filters.jobId;
      jobInput.addEventListener('input', () => { state.filters.jobId = jobInput.value; });
      jobGroup.appendChild(jobInput);
      filterGrid.appendChild(jobGroup);

      filterCard.appendChild(filterGrid);
      dynamicArea.appendChild(filterCard);

      // Delimiter section (csv/tsv only)
      if (state.selectedFormat === 'csv' || state.selectedFormat === 'tsv') {
        const delimiterCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
        delimiterCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'Delimiter'));
        const delimGrid = el('div', 'flex gap-3');
        for (const delim of DELIMITER_OPTIONS) {
          const isActive = state.delimiter === delim.value;
          const btnCls = isActive
            ? 'px-4 py-2 rounded-md text-sm border transition-colors bg-[var(--accent)] text-white border-[var(--accent)]'
            : 'px-4 py-2 rounded-md text-sm border transition-colors bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]';
          const btn = el('button', btnCls, delim.label);
          btn.addEventListener('click', () => {
            state.delimiter = delim.value;
            rebuildDynamic();
          });
          delimGrid.appendChild(btn);
        }
        delimiterCard.appendChild(delimGrid);
        dynamicArea.appendChild(delimiterCard);
      }

      // PDF Letterhead section (pdf only)
      if (state.selectedFormat === 'pdf') {
        const letterheadCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
        letterheadCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'PDF Letterhead'));
        letterheadCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Configure the letterhead for PDF report exports.'));

        const lhGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 gap-4');

        const companyGroup = el('div');
        companyGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Company Name'));
        const companyInput = el('input', inputCls) as HTMLInputElement;
        companyInput.type = 'text';
        companyInput.placeholder = 'Acme Construction Inc.';
        companyInput.value = state.letterhead.companyName;
        companyInput.addEventListener('input', () => { state.letterhead.companyName = companyInput.value; });
        companyGroup.appendChild(companyInput);
        lhGrid.appendChild(companyGroup);

        const addressGroup = el('div');
        addressGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Address'));
        const addressInput = el('input', inputCls) as HTMLInputElement;
        addressInput.type = 'text';
        addressInput.placeholder = '123 Main St, City, ST 12345';
        addressInput.value = state.letterhead.address;
        addressInput.addEventListener('input', () => { state.letterhead.address = addressInput.value; });
        addressGroup.appendChild(addressInput);
        lhGrid.appendChild(addressGroup);

        const phoneGroup = el('div');
        phoneGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Phone'));
        const phoneInput = el('input', inputCls) as HTMLInputElement;
        phoneInput.type = 'tel';
        phoneInput.placeholder = '(555) 555-0100';
        phoneInput.value = state.letterhead.phone;
        phoneInput.addEventListener('input', () => { state.letterhead.phone = phoneInput.value; });
        phoneGroup.appendChild(phoneInput);
        lhGrid.appendChild(phoneGroup);

        const emailGroup = el('div');
        emailGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Email'));
        const emailInput = el('input', inputCls) as HTMLInputElement;
        emailInput.type = 'email';
        emailInput.placeholder = 'info@acmeconstruction.com';
        emailInput.value = state.letterhead.email;
        emailInput.addEventListener('input', () => { state.letterhead.email = emailInput.value; });
        emailGroup.appendChild(emailInput);
        lhGrid.appendChild(emailGroup);

        letterheadCard.appendChild(lhGrid);
        dynamicArea.appendChild(letterheadCard);
      }

      // API Pagination section (api only)
      if (state.selectedFormat === 'api') {
        const apiCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
        apiCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'API Pagination'));
        const apiGrid = el('div', 'grid grid-cols-2 gap-4');

        const pageGroup = el('div');
        pageGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Page'));
        const pageInput = el('input', inputCls) as HTMLInputElement;
        pageInput.type = 'number';
        pageInput.value = String(state.page);
        pageInput.min = '1';
        pageInput.addEventListener('input', () => { state.page = parseInt(pageInput.value, 10) || 1; });
        pageGroup.appendChild(pageInput);
        apiGrid.appendChild(pageGroup);

        const pageSizeGroup = el('div');
        pageSizeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Page Size'));
        const pageSizeInput = el('input', inputCls) as HTMLInputElement;
        pageSizeInput.type = 'number';
        pageSizeInput.value = String(state.pageSize);
        pageSizeInput.min = '1';
        pageSizeInput.max = '1000';
        pageSizeInput.addEventListener('input', () => { state.pageSize = parseInt(pageSizeInput.value, 10) || 50; });
        pageSizeGroup.appendChild(pageSizeInput);
        apiGrid.appendChild(pageSizeGroup);

        apiCard.appendChild(apiGrid);
        dynamicArea.appendChild(apiCard);
      }

      // Export button
      const actions = el('div', 'flex justify-end gap-3 mt-4 mb-6');
      const exportBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Export Data');
      exportBtn.addEventListener('click', async () => {
        if (!state.selectedCollection) {
          showMsg(wrapper, 'Please select a collection to export.', true);
          return;
        }
        if (state.selectedColumns.length === 0) {
          showMsg(wrapper, 'Please select at least one column to export.', true);
          return;
        }

        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';

        try {
          const svc = getImportExportService();

          const filters: Record<string, unknown> = {};
          if (state.filters.dateFrom) filters.dateFrom = state.filters.dateFrom;
          if (state.filters.dateTo) filters.dateTo = state.filters.dateTo;
          if (state.filters.entityId) filters.entityId = state.filters.entityId;
          if (state.filters.jobId) filters.jobId = state.filters.jobId;

          const options: {
            format: ExportFormat;
            filters?: Record<string, unknown>;
            columns?: string[];
            name?: string;
            delimiter?: string;
            page?: number;
            pageSize?: number;
            letterhead?: { companyName?: string; address?: string; phone?: string; email?: string };
          } = {
            format: state.selectedFormat,
            columns: state.selectedColumns,
            name: `Export ${COLLECTION_OPTIONS.find(c => c.value === state.selectedCollection)?.label ?? state.selectedCollection}`,
          };

          if (Object.keys(filters).length > 0) {
            options.filters = filters;
          }

          if ((state.selectedFormat === 'csv' || state.selectedFormat === 'tsv') && state.delimiter) {
            options.delimiter = state.delimiter;
          }

          if (state.selectedFormat === 'pdf') {
            const lh = state.letterhead;
            if (lh.companyName || lh.address || lh.phone || lh.email) {
              options.letterhead = {};
              if (lh.companyName) options.letterhead.companyName = lh.companyName;
              if (lh.address) options.letterhead.address = lh.address;
              if (lh.phone) options.letterhead.phone = lh.phone;
              if (lh.email) options.letterhead.email = lh.email;
            }
          }

          if (state.selectedFormat === 'api') {
            options.page = state.page;
            options.pageSize = state.pageSize;
          }

          const result = await svc.exportCollection(state.selectedCollection, options);

          // Handle result based on format
          if (state.selectedFormat === 'csv' || state.selectedFormat === 'tsv' || state.selectedFormat === 'json') {
            const ext = state.selectedFormat === 'json' ? 'json' : state.selectedFormat === 'tsv' ? 'tsv' : 'csv';
            const mimeType = state.selectedFormat === 'json' ? 'application/json' : 'text/plain';
            const blob = new Blob([result.data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.selectedCollection.replace('/', '-')}-export.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showMsg(wrapper, `Export complete: ${result.recordCount} records (${formatFileSize(result.fileSize)})`, false);
          } else if (state.selectedFormat === 'pdf') {
            showMsg(wrapper, `PDF exported (simulated): ${result.recordCount} records (${formatFileSize(result.fileSize)})`, false);
          } else if (state.selectedFormat === 'api') {
            // Show API JSON result in a panel
            resultArea.innerHTML = '';
            const resultCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
            resultCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-2', 'API Export Result'));
            const resultInfo = el('div', 'flex gap-4 mb-3');
            resultInfo.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Records: ${result.recordCount}`));
            resultInfo.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Size: ${formatFileSize(result.fileSize)}`));
            resultCard.appendChild(resultInfo);
            const pre = el('pre', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-xs text-[var(--text)] overflow-auto max-h-96');
            pre.textContent = result.data;
            resultCard.appendChild(pre);
            resultArea.appendChild(resultCard);
            showMsg(wrapper, `API export complete: ${result.recordCount} records`, false);
          }

          // Refresh recent exports
          loadRecentExports();
        } catch (err) {
          showMsg(wrapper, `Export failed: ${err instanceof Error ? err.message : String(err)}`, true);
        } finally {
          exportBtn.disabled = false;
          exportBtn.textContent = 'Export Data';
        }
      });
      actions.appendChild(exportBtn);
      dynamicArea.appendChild(actions);
    };

    // ----- Load recent exports -----
    const loadRecentExports = async () => {
      recentArea.innerHTML = '';

      try {
        const svc = getImportExportService();
        const jobs = await svc.getExportJobs();

        if (jobs.length === 0) return;

        const recentCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden mt-6');
        recentCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] p-4 pb-2', 'Recent Exports'));

        const table = el('table', 'w-full text-sm');
        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of ['Name', 'Format', 'Collection', 'Status', 'Records', 'Size', 'Date']) {
          headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        for (const job of jobs) {
          const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', job.name || '--'));
          tr.appendChild(el('td', 'py-2 px-3', (job.format || '').toUpperCase()));

          const collTd = el('td', 'py-2 px-3 font-mono text-xs text-[var(--text-muted)]');
          collTd.textContent = job.collection || '--';
          tr.appendChild(collTd);

          const statusCls: Record<string, string> = {
            pending: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
            processing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
          };
          const statusTd = el('td', 'py-2 px-3');
          const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls[job.status] ?? statusCls.pending}`, job.status);
          statusTd.appendChild(badge);
          tr.appendChild(statusTd);

          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', job.fileSize !== undefined ? String(Math.round((job.fileSize ?? 0) / 1024)) + ' records' : '--'));
          tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-[var(--text-muted)]', job.fileSize ? formatFileSize(job.fileSize) : '--'));
          tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', job.startedAt ? new Date(job.startedAt).toLocaleDateString() : '--'));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        recentCard.appendChild(table);
        recentArea.appendChild(recentCard);
      } catch {
        // Silently fail if service not available yet
      }
    };

    // ----- Collection change handler -----
    collectionSelect.addEventListener('change', () => {
      state.selectedCollection = collectionSelect.value;
      const collectionDef = COLLECTION_OPTIONS.find(c => c.value === state.selectedCollection);
      state.selectedColumns = collectionDef ? [...collectionDef.fields] : [];
      resultArea.innerHTML = '';
      rebuildDynamic();
    });

    // Initial render
    rebuildDynamic();
    loadRecentExports();

    container.appendChild(wrapper);
  },
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

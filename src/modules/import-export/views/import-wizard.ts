/**
 * Import Wizard view.
 * Step-by-step import flow: select file -> detect format -> field mapping ->
 * validate -> preview -> commit.
 *
 * Fully wired to ImportExportService for all batch lifecycle operations.
 */

import { getImportExportService } from '../service-accessor';
import type {
  SourceFormat,
  MergeStrategy,
  FormatDetectionResult,
  ValidationRule,
  FieldTransform,
} from '../import-export-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
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

const STEPS = [
  { id: 'upload', label: '1. Upload File' },
  { id: 'format', label: '2. Detect Format' },
  { id: 'mapping', label: '3. Field Mapping' },
  { id: 'validate', label: '4. Validate' },
  { id: 'preview', label: '5. Preview' },
  { id: 'commit', label: '6. Import' },
];

const FORMAT_OPTIONS: { value: SourceFormat; label: string }[] = [
  { value: 'csv', label: 'CSV (Comma-Separated)' },
  { value: 'tsv', label: 'TSV (Tab-Separated)' },
  { value: 'json', label: 'JSON' },
  { value: 'iif', label: 'IIF (Intuit Interchange Format)' },
  { value: 'qb', label: 'QuickBooks Desktop/Online' },
  { value: 'sage', label: 'Sage 100/300' },
  { value: 'foundation', label: 'Foundation Software' },
  { value: 'fixed', label: 'Fixed-Width' },
];

const MERGE_STRATEGY_OPTIONS: { value: MergeStrategy; label: string }[] = [
  { value: 'append', label: 'Append - Add all as new records' },
  { value: 'skip', label: 'Skip - Skip existing matches' },
  { value: 'overwrite', label: 'Overwrite - Replace existing matches' },
  { value: 'manual', label: 'Manual - Review conflicts individually' },
];

const COLLECTION_OPTIONS = [
  { value: '', label: 'Auto-detect from headers' },
  { value: 'gl/account', label: 'GL Accounts' },
  { value: 'gl/journal', label: 'GL Journal Entries' },
  { value: 'job/job', label: 'Jobs' },
  { value: 'job/costCode', label: 'Job Cost Codes' },
  { value: 'ap/vendor', label: 'AP Vendors' },
  { value: 'ap/bill', label: 'AP Bills' },
  { value: 'ar/customer', label: 'AR Customers' },
  { value: 'ar/invoice', label: 'AR Invoices' },
  { value: 'entity/entity', label: 'Entities' },
  { value: 'payroll/employee', label: 'Payroll Employees' },
];

const TARGET_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  'gl/account': ['id', 'accountNumber', 'name', 'accountType', 'normalBalance', 'description', 'parentId'],
  'gl/journal': ['id', 'date', 'referenceNumber', 'description', 'accountName', 'debit', 'credit', 'source'],
  'job/job': ['id', 'jobCode', 'name', 'contractAmount', 'startDate', 'endDate', 'status', 'description'],
  'job/costCode': ['id', 'code', 'name', 'jobId', 'budgetAmount', 'description'],
  'ap/vendor': ['id', 'vendorCode', 'name', 'phone', 'email', 'address', 'taxId', 'status'],
  'ap/bill': ['id', 'vendorId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'taxAmount', 'retentionAmount', 'description', 'status', 'jobId', 'costCode'],
  'ar/customer': ['id', 'customerCode', 'name', 'phone', 'email', 'address', 'status'],
  'ar/invoice': ['id', 'customerId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'description', 'status', 'jobId'],
  'entity/entity': ['id', 'name', 'entityType', 'taxId', 'ein', 'address', 'phone', 'email'],
  'payroll/employee': ['id', 'employeeId', 'name', 'hireDate', 'payRate', 'department', 'status'],
};

const ACTION_BADGE: Record<string, { cls: string; label: string }> = {
  add: { cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: 'Add' },
  update: { cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: 'Update' },
  skip: { cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', label: 'Skip' },
  conflict: { cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', label: 'Conflict' },
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentStep = 0;
let batchId: string | null = null;
let fileContent: string | null = null;
let fileName: string | null = null;
let detectionResult: FormatDetectionResult | null = null;

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function buildStepper(step: number): HTMLElement {
  const stepper = el('div', 'flex items-center gap-2 mb-6 flex-wrap');

  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    const isActive = i === step;
    const isComplete = i < step;

    const stepEl = el('div', 'flex items-center gap-1');

    const numberCls = isComplete
      ? 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-500 text-white'
      : isActive
        ? 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--accent)] text-white'
        : 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]';

    const number = el('div', numberCls, isComplete ? '\u2713' : String(i + 1));
    stepEl.appendChild(number);

    const labelCls = isActive
      ? 'text-sm font-medium text-[var(--text)]'
      : 'text-sm text-[var(--text-muted)]';
    stepEl.appendChild(el('span', labelCls, s.label.split('. ')[1]));

    stepper.appendChild(stepEl);

    if (i < STEPS.length - 1) {
      const separator = el('div', 'flex-1 h-px bg-[var(--border)] min-w-[20px]');
      stepper.appendChild(separator);
    }
  }

  return stepper;
}

// ---------------------------------------------------------------------------
// Step 1: Upload & Config
// ---------------------------------------------------------------------------

function buildUploadStep(container: HTMLElement, wrapper: HTMLElement): HTMLElement {
  const stepContainer = el('div', 'space-y-4');

  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Upload Import File'));

  const dropZone = el('div', 'border-2 border-dashed border-[var(--border)] rounded-lg p-12 text-center hover:border-[var(--accent)] transition-colors cursor-pointer');
  dropZone.appendChild(el('div', 'text-4xl text-[var(--text-muted)] mb-3', '\u2191'));
  const fileLabel = el('p', 'text-[var(--text)] font-medium mb-1', 'Drag and drop your file here');
  dropZone.appendChild(fileLabel);
  dropZone.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Supports CSV, TSV, JSON, IIF, QuickBooks, Sage, Foundation, and fixed-width formats'));

  const fileInput = el('input') as HTMLInputElement;
  fileInput.type = 'file';
  fileInput.accept = '.csv,.tsv,.json,.iif,.txt,.xls,.xlsx';
  fileInput.className = 'hidden';
  dropZone.appendChild(fileInput);

  const browseBtn = el('button', 'mt-4 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Browse Files');
  dropZone.appendChild(browseBtn);

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-[var(--accent)]');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-[var(--accent)]');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-[var(--accent)]');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      readFile(files[0], fileLabel);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      readFile(fileInput.files[0], fileLabel);
    }
  });

  card.appendChild(dropZone);

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

  const settingsGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-6');

  // Format select
  const formatGroup = el('div');
  formatGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Format'));
  const formatSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of FORMAT_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    formatSelect.appendChild(o);
  }
  formatGroup.appendChild(formatSelect);
  settingsGrid.appendChild(formatGroup);

  // Collection select
  const collectionGroup = el('div');
  collectionGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Target Collection'));
  const collectionSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of COLLECTION_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    collectionSelect.appendChild(o);
  }
  collectionGroup.appendChild(collectionSelect);
  settingsGrid.appendChild(collectionGroup);

  // Merge strategy select
  const strategyGroup = el('div');
  strategyGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Merge Strategy'));
  const strategySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of MERGE_STRATEGY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    strategySelect.appendChild(o);
  }
  strategyGroup.appendChild(strategySelect);
  settingsGrid.appendChild(strategyGroup);

  // Custom delimiter
  const delimiterGroup = el('div');
  delimiterGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Custom Delimiter (optional)'));
  const delimiterInput = el('input', inputCls) as HTMLInputElement;
  delimiterInput.type = 'text';
  delimiterInput.placeholder = 'Auto-detect (e.g., | or ; or tab)';
  delimiterGroup.appendChild(delimiterInput);
  settingsGrid.appendChild(delimiterGroup);

  // Show/hide delimiter based on format
  const toggleDelimiter = () => {
    const fmt = formatSelect.value;
    delimiterGroup.style.display = (fmt === 'csv' || fmt === 'tsv') ? '' : 'none';
  };
  formatSelect.addEventListener('change', toggleDelimiter);
  toggleDelimiter();

  card.appendChild(settingsGrid);

  // Composite keys
  const compositeGroup = el('div', 'mt-4');
  compositeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Composite Keys (comma-separated field names for merge detection)'));
  const compositeInput = el('textarea', inputCls) as HTMLTextAreaElement;
  compositeInput.placeholder = 'e.g., vendorId,invoiceNumber';
  compositeInput.rows = 2;
  compositeGroup.appendChild(compositeInput);
  card.appendChild(compositeGroup);

  stepContainer.appendChild(card);

  // Batch name
  const batchNameCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  batchNameCard.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Batch Name'));
  const batchNameInput = el('input', inputCls) as HTMLInputElement;
  batchNameInput.type = 'text';
  batchNameInput.placeholder = 'e.g., Foundation AP Import Feb 2026';
  batchNameCard.appendChild(batchNameInput);
  stepContainer.appendChild(batchNameCard);

  // Confidence display area (hidden initially)
  const confidenceArea = el('div', 'hidden bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  confidenceArea.setAttribute('data-confidence', '1');
  stepContainer.appendChild(confidenceArea);

  // Actions
  const actions = el('div', 'flex justify-end gap-3 mt-4');

  const autoDetectBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Auto-Detect Format');
  autoDetectBtn.addEventListener('click', () => {
    if (!fileContent) {
      showMsg(wrapper, 'Please upload a file first.', true);
      return;
    }
    try {
      const svc = getImportExportService();
      const result = svc.detectFormat(fileContent, fileName ?? undefined);
      detectionResult = result;

      // Populate form from detection
      formatSelect.value = result.format;
      toggleDelimiter();
      if (result.delimiter) {
        delimiterInput.value = result.delimiter === '\t' ? 'tab' : result.delimiter;
      }
      if (result.detectedCollection) {
        collectionSelect.value = result.detectedCollection;
      }

      // Show confidence
      confidenceArea.className = 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4';
      confidenceArea.innerHTML = '';
      const confRow = el('div', 'flex items-center gap-3');
      confRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Detection Confidence:'));
      const pct = Math.round(result.confidence * 100);
      const confCls = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
      confRow.appendChild(el('span', `text-sm font-bold ${confCls}`, `${pct}%`));
      confRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Format: ${result.format.toUpperCase()}`));
      if (result.detectedCollection) {
        confRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', `Collection: ${result.detectedCollection}`));
      }
      confidenceArea.appendChild(confRow);

      showMsg(wrapper, `Format detected: ${result.format.toUpperCase()} (${pct}% confidence)`, false);
    } catch (err) {
      showMsg(wrapper, `Detection failed: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  });
  actions.appendChild(autoDetectBtn);

  const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Next: Detect Format');
  nextBtn.addEventListener('click', async () => {
    if (!fileContent) {
      showMsg(wrapper, 'Please upload a file before proceeding.', true);
      return;
    }
    const name = batchNameInput.value.trim() || `Import ${new Date().toLocaleDateString()}`;
    const format = formatSelect.value as SourceFormat;
    const collection = collectionSelect.value;
    if (!collection) {
      showMsg(wrapper, 'Please select a target collection or use Auto-Detect.', true);
      return;
    }
    const strategy = strategySelect.value as MergeStrategy;
    const compositeKeys = compositeInput.value.trim()
      ? compositeInput.value.trim().split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const delimiter = delimiterInput.value.trim() === 'tab' ? '\t' : delimiterInput.value.trim() || undefined;

    nextBtn.disabled = true;
    nextBtn.textContent = 'Creating batch...';
    try {
      const svc = getImportExportService();
      const batch = await svc.createBatch({
        name,
        sourceFormat: format,
        collection,
        mergeStrategy: strategy,
        compositeKeys,
        delimiter,
      });
      batchId = batch.id;
      await svc.uploadData(batchId, fileContent);

      // Auto-detect if not already done
      if (!detectionResult) {
        detectionResult = svc.detectFormat(fileContent, fileName ?? undefined);
      }

      currentStep = 1;
      renderWizard(container);
    } catch (err) {
      showMsg(wrapper, `Error: ${err instanceof Error ? err.message : String(err)}`, true);
      nextBtn.disabled = false;
      nextBtn.textContent = 'Next: Detect Format';
    }
  });
  actions.appendChild(nextBtn);
  stepContainer.appendChild(actions);

  return stepContainer;
}

function readFile(file: File, label: HTMLElement): void {
  fileName = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    fileContent = reader.result as string;
    label.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  };
  reader.onerror = () => {
    label.textContent = 'Error reading file. Please try again.';
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------------
// Step 2: Format Detection
// ---------------------------------------------------------------------------

function buildFormatDetectionStep(container: HTMLElement, wrapper: HTMLElement): HTMLElement {
  const stepContainer = el('div', 'space-y-4');
  const svc = getImportExportService();

  // Detection result display
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Format Detection Results'));

  const grid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

  const formatCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  formatCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', 'Detected Format'));
  formatCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', detectionResult?.format?.toUpperCase() ?? 'N/A'));
  grid.appendChild(formatCard);

  const confidenceCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  confidenceCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', 'Confidence'));
  const pct = detectionResult ? Math.round(detectionResult.confidence * 100) : 0;
  const confCls = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  confidenceCard.appendChild(el('p', `text-lg font-bold ${confCls}`, `${pct}%`));
  grid.appendChild(confidenceCard);

  const collectionCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  collectionCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', 'Detected Collection'));
  collectionCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', detectionResult?.detectedCollection ?? 'N/A'));
  grid.appendChild(collectionCard);

  card.appendChild(grid);

  // Delimiter
  if (detectionResult?.delimiter) {
    const delimInfo = el('div', 'mt-4');
    delimInfo.appendChild(el('p', 'text-sm text-[var(--text-muted)]', `Delimiter: "${detectionResult.delimiter === '\t' ? 'TAB' : detectionResult.delimiter}"`));
    card.appendChild(delimInfo);
  }

  // Headers
  if (detectionResult?.headers && detectionResult.headers.length > 0) {
    const headersSection = el('div', 'mt-4');
    headersSection.appendChild(el('p', 'text-sm font-medium text-[var(--text-muted)] mb-2', 'Detected Headers'));
    const headerList = el('div', 'flex flex-wrap gap-2');
    for (const header of detectionResult.headers) {
      const badge = el('span', 'px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', header);
      headerList.appendChild(badge);
    }
    headersSection.appendChild(headerList);
    card.appendChild(headersSection);
  }

  stepContainer.appendChild(card);

  // First 5 rows preview
  const previewCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  previewCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Data Preview (first 5 rows)'));

  if (batchId) {
    svc.getBatch(batchId).then((batch) => {
      if (batch?.rawData && batch.rawData.length > 0) {
        const rows = batch.rawData.slice(0, 5);
        const headers = Object.keys(rows[0]);
        const table = el('table', 'w-full text-xs');

        const thead = el('thead');
        const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const h of headers.slice(0, 8)) {
          headRow.appendChild(el('th', 'py-2 px-2 font-medium', h));
        }
        if (headers.length > 8) {
          headRow.appendChild(el('th', 'py-2 px-2 font-medium text-[var(--text-muted)]', `+${headers.length - 8} more`));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = el('tbody');
        for (const row of rows) {
          const tr = el('tr', 'border-b border-[var(--border)]');
          for (const h of headers.slice(0, 8)) {
            const val = row[h];
            tr.appendChild(el('td', 'py-1 px-2 text-[var(--text)] truncate max-w-[150px]', val != null ? String(val) : ''));
          }
          if (headers.length > 8) {
            tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)]', '...'));
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        previewCard.appendChild(table);
      } else {
        previewCard.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No data rows found.'));
      }
    }).catch(() => {
      previewCard.appendChild(el('p', 'text-sm text-red-400', 'Failed to load batch data.'));
    });
  } else {
    previewCard.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No batch data available.'));
  }

  stepContainer.appendChild(previewCard);

  // Actions
  const actions = el('div', 'flex justify-between gap-3 mt-4');
  const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
  backBtn.addEventListener('click', () => {
    currentStep = 0;
    renderWizard(container);
  });
  actions.appendChild(backBtn);

  const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Next: Field Mapping');
  nextBtn.addEventListener('click', () => {
    currentStep = 2;
    renderWizard(container);
  });
  actions.appendChild(nextBtn);
  stepContainer.appendChild(actions);

  return stepContainer;
}

// ---------------------------------------------------------------------------
// Step 3: Field Mapping (inline)
// ---------------------------------------------------------------------------

interface MappingRowState {
  sourceField: string;
  targetField: string;
  transform: FieldTransform;
  confidence: number;
  sampleValues: string[];
}

function buildFieldMappingStep(container: HTMLElement, wrapper: HTMLElement): HTMLElement {
  const stepContainer = el('div', 'space-y-4');
  const svc = getImportExportService();

  stepContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Map each source field from your imported file to the corresponding target field. Use Auto-Match to populate suggestions.'));

  const mappingState: MappingRowState[] = [];
  let sourceHeaders: string[] = [];
  let targetFields: string[] = [];
  let rawRows: Record<string, unknown>[] = [];

  const tableContainer = el('div');
  const loadingMsg = el('p', 'text-sm text-[var(--text-muted)]', 'Loading field mappings...');
  tableContainer.appendChild(loadingMsg);
  stepContainer.appendChild(tableContainer);

  // Load batch data and existing mappings
  const loadData = async () => {
    if (!batchId) return;
    try {
      const batch = await svc.getBatch(batchId);
      if (!batch) throw new Error('Batch not found');

      rawRows = batch.rawData ?? [];
      if (rawRows.length > 0) {
        sourceHeaders = Object.keys(rawRows[0]);
      }
      targetFields = TARGET_FIELDS_BY_COLLECTION[batch.collection] ?? ['id', 'name', 'description', 'amount', 'date', 'status'];

      // Check for existing mappings
      const existingMappings = await svc.getFieldMappings(batchId);
      if (existingMappings.length > 0) {
        for (const em of existingMappings) {
          const samples = rawRows.slice(0, 3).map((r) => {
            const v = r[em.sourceField];
            return v != null ? String(v) : '';
          });
          mappingState.push({
            sourceField: em.sourceField,
            targetField: em.targetField,
            transform: em.transform,
            confidence: 1.0,
            sampleValues: samples,
          });
        }
      } else {
        // Initialize empty mappings for all source headers
        for (const h of sourceHeaders) {
          const samples = rawRows.slice(0, 3).map((r) => {
            const v = r[h];
            return v != null ? String(v) : '';
          });
          mappingState.push({
            sourceField: h,
            targetField: '',
            transform: 'none',
            confidence: 0,
            sampleValues: samples,
          });
        }
      }

      renderMappingTable();
    } catch (err) {
      tableContainer.innerHTML = '';
      tableContainer.appendChild(el('p', 'text-sm text-red-400', `Failed to load data: ${err instanceof Error ? err.message : String(err)}`));
    }
  };

  const renderMappingTable = () => {
    tableContainer.innerHTML = '';

    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)] w-full';

    const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
    const table = el('table', 'w-full text-sm');

    const thead = el('thead');
    const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
    for (const col of ['Source Field', 'Sample Values', 'Target Field', 'Transform', 'Confidence', 'Actions']) {
      headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');

    if (mappingState.length === 0) {
      const tr = el('tr');
      const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No field mappings available.');
      td.setAttribute('colspan', '6');
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    const TRANSFORM_OPTIONS: { value: FieldTransform; label: string }[] = [
      { value: 'none', label: 'None' },
      { value: 'lowercase', label: 'Lowercase' },
      { value: 'uppercase', label: 'Uppercase' },
      { value: 'trim', label: 'Trim' },
      { value: 'date', label: 'Parse Date' },
      { value: 'number', label: 'Parse Number' },
    ];

    const CONFIDENCE_BADGE: Record<string, string> = {
      high: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      low: 'bg-red-500/10 text-red-400 border border-red-500/20',
      none: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    };

    for (let idx = 0; idx < mappingState.length; idx++) {
      const mapping = mappingState[idx];
      const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

      tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', mapping.sourceField));

      const tdSample = el('td', 'py-2 px-3');
      const sampleWrap = el('div', 'flex flex-wrap gap-1');
      for (const val of mapping.sampleValues.slice(0, 3)) {
        sampleWrap.appendChild(el('span', 'px-1.5 py-0.5 rounded text-xs bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]', val));
      }
      tdSample.appendChild(sampleWrap);
      tr.appendChild(tdSample);

      const tdTarget = el('td', 'py-2 px-3');
      const targetSelect = el('select', inputCls) as HTMLSelectElement;
      const emptyOpt = el('option', '', '-- Skip field --') as HTMLOptionElement;
      emptyOpt.value = '';
      targetSelect.appendChild(emptyOpt);
      for (const field of targetFields) {
        const opt = el('option', '', field) as HTMLOptionElement;
        opt.value = field;
        if (field === mapping.targetField) opt.selected = true;
        targetSelect.appendChild(opt);
      }
      targetSelect.addEventListener('change', () => {
        mappingState[idx].targetField = targetSelect.value;
      });
      tdTarget.appendChild(targetSelect);
      tr.appendChild(tdTarget);

      const tdTransform = el('td', 'py-2 px-3');
      const transformSelect = el('select', inputCls) as HTMLSelectElement;
      for (const opt of TRANSFORM_OPTIONS) {
        const o = el('option', '', opt.label) as HTMLOptionElement;
        o.value = opt.value;
        if (opt.value === mapping.transform) o.selected = true;
        transformSelect.appendChild(o);
      }
      transformSelect.addEventListener('change', () => {
        mappingState[idx].transform = transformSelect.value as FieldTransform;
      });
      tdTransform.appendChild(transformSelect);
      tr.appendChild(tdTransform);

      const tdConfidence = el('td', 'py-2 px-3');
      const level = mapping.confidence >= 0.8 ? 'high' : mapping.confidence >= 0.5 ? 'medium' : mapping.confidence > 0 ? 'low' : 'none';
      const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_BADGE[level]}`, `${Math.round(mapping.confidence * 100)}%`);
      tdConfidence.appendChild(badge);
      tr.appendChild(tdConfidence);

      const tdActions = el('td', 'py-2 px-3');
      const clearBtn = el('button', 'text-red-400 hover:text-red-300 text-xs', 'Remove');
      clearBtn.addEventListener('click', () => {
        mappingState[idx].targetField = '';
        mappingState[idx].confidence = 0;
        mappingState[idx].transform = 'none';
        renderMappingTable();
      });
      tdActions.appendChild(clearBtn);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    tableContainer.appendChild(wrap);
  };

  // Header with auto-match
  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Field Mapping'));
  const autoMatchBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Auto-Match Fields');
  autoMatchBtn.addEventListener('click', async () => {
    if (!batchId) return;
    try {
      const batch = await svc.getBatch(batchId);
      if (!batch) return;
      const results = svc.autoMatchFields(sourceHeaders, targetFields, batch.sourceFormat);
      for (const result of results) {
        const stateRow = mappingState.find((m) => m.sourceField === result.sourceField);
        if (stateRow) {
          stateRow.targetField = result.targetField;
          stateRow.confidence = result.confidence;
          stateRow.transform = result.transform;
        }
      }
      renderMappingTable();
      showMsg(wrapper, `Auto-matched ${results.filter((r) => r.targetField).length} of ${results.length} fields.`, false);
    } catch (err) {
      showMsg(wrapper, `Auto-match failed: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  });
  headerRow.appendChild(autoMatchBtn);
  stepContainer.insertBefore(headerRow, stepContainer.firstChild);

  // Actions
  const actions = el('div', 'flex justify-between gap-3 mt-4');
  const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
  backBtn.addEventListener('click', () => {
    currentStep = 1;
    renderWizard(container);
  });
  actions.appendChild(backBtn);

  const saveNextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save & Next: Validate');
  saveNextBtn.addEventListener('click', async () => {
    if (!batchId) return;
    const validMappings = mappingState.filter((m) => m.targetField);
    if (validMappings.length === 0) {
      showMsg(wrapper, 'Please map at least one field before continuing.', true);
      return;
    }
    saveNextBtn.disabled = true;
    saveNextBtn.textContent = 'Saving...';
    try {
      await svc.saveFieldMappings(batchId, validMappings.map((m) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        transform: m.transform,
      })));
      currentStep = 3;
      renderWizard(container);
    } catch (err) {
      showMsg(wrapper, `Failed to save mappings: ${err instanceof Error ? err.message : String(err)}`, true);
      saveNextBtn.disabled = false;
      saveNextBtn.textContent = 'Save & Next: Validate';
    }
  });
  actions.appendChild(saveNextBtn);
  stepContainer.appendChild(actions);

  loadData();

  return stepContainer;
}

// ---------------------------------------------------------------------------
// Step 4: Validate
// ---------------------------------------------------------------------------

function buildValidateStep(container: HTMLElement, wrapper: HTMLElement): HTMLElement {
  const stepContainer = el('div', 'space-y-4');
  const svc = getImportExportService();

  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Validation'));

  const resultArea = el('div');
  resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Click "Run Validation" to validate all rows against the field rules.'));
  card.appendChild(resultArea);

  const errorListArea = el('div', 'mt-4');
  card.appendChild(errorListArea);

  stepContainer.appendChild(card);

  // Actions
  const actions = el('div', 'flex justify-between gap-3 mt-4');
  const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
  backBtn.addEventListener('click', () => {
    currentStep = 2;
    renderWizard(container);
  });
  actions.appendChild(backBtn);

  const rightActions = el('div', 'flex gap-3');

  const validateBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-amber-500 text-white hover:opacity-90', 'Run Validation');
  const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 hidden', 'Next: Preview');

  validateBtn.addEventListener('click', async () => {
    if (!batchId) return;
    validateBtn.disabled = true;
    validateBtn.textContent = 'Validating...';
    resultArea.innerHTML = '';
    errorListArea.innerHTML = '';

    try {
      // Build basic required-field rules from the saved mappings
      const mappings = await svc.getFieldMappings(batchId);
      const rules: ValidationRule[] = mappings.map((m) => ({
        field: m.targetField,
        type: 'required' as const,
        message: `"${m.targetField}" is required.`,
      }));

      const result = await svc.validateRows(batchId, rules);

      // Display results
      const summaryGrid = el('div', 'grid grid-cols-3 gap-4 mb-4');

      const validCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center');
      validCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Valid'));
      validCard.appendChild(el('p', `text-2xl font-bold ${result.valid ? 'text-emerald-400' : 'text-red-400'}`, result.valid ? 'Yes' : 'No'));
      summaryGrid.appendChild(validCard);

      const errCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center');
      errCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Errors'));
      errCard.appendChild(el('p', `text-2xl font-bold ${result.errorCount > 0 ? 'text-red-400' : 'text-emerald-400'}`, String(result.errorCount)));
      summaryGrid.appendChild(errCard);

      const warnCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center');
      warnCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Warnings'));
      warnCard.appendChild(el('p', `text-2xl font-bold ${result.warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`, String(result.warningCount)));
      summaryGrid.appendChild(warnCard);

      resultArea.appendChild(summaryGrid);

      // Load and display errors
      const errors = await svc.getImportErrors(batchId);
      if (errors.length > 0) {
        errorListArea.appendChild(el('h4', 'text-sm font-semibold text-[var(--text)] mb-2', `Issues (${errors.length})`));
        const errorTable = el('table', 'w-full text-xs');
        const etHead = el('thead');
        const etHeadRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
        for (const col of ['Row', 'Field', 'Value', 'Error', 'Severity']) {
          etHeadRow.appendChild(el('th', 'py-1 px-2 font-medium', col));
        }
        etHead.appendChild(etHeadRow);
        errorTable.appendChild(etHead);

        const etBody = el('tbody');
        for (const err of errors.slice(0, 50)) {
          const tr = el('tr', 'border-b border-[var(--border)]');
          tr.appendChild(el('td', 'py-1 px-2 font-mono', String(err.rowNumber)));
          tr.appendChild(el('td', 'py-1 px-2', err.field));
          tr.appendChild(el('td', 'py-1 px-2 text-[var(--text-muted)]', err.value ?? ''));
          tr.appendChild(el('td', 'py-1 px-2', err.error));
          const sevCls = err.severity === 'error' ? 'text-red-400' : 'text-amber-400';
          tr.appendChild(el('td', `py-1 px-2 ${sevCls}`, err.severity));
          etBody.appendChild(tr);
        }
        errorTable.appendChild(etBody);

        const errorWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden max-h-[300px] overflow-y-auto');
        errorWrap.appendChild(errorTable);
        errorListArea.appendChild(errorWrap);

        if (errors.length > 50) {
          errorListArea.appendChild(el('p', 'text-xs text-[var(--text-muted)] mt-2', `Showing first 50 of ${errors.length} issues.`));
        }
      }

      // Show next button (allow proceeding even with warnings)
      nextBtn.className = 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
      validateBtn.textContent = 'Re-Validate';
      validateBtn.disabled = false;
    } catch (err) {
      showMsg(wrapper, `Validation failed: ${err instanceof Error ? err.message : String(err)}`, true);
      validateBtn.disabled = false;
      validateBtn.textContent = 'Run Validation';
    }
  });

  nextBtn.addEventListener('click', () => {
    currentStep = 4;
    renderWizard(container);
  });

  rightActions.appendChild(validateBtn);
  rightActions.appendChild(nextBtn);
  actions.appendChild(rightActions);
  stepContainer.appendChild(actions);

  return stepContainer;
}

// ---------------------------------------------------------------------------
// Step 5: Preview
// ---------------------------------------------------------------------------

function buildPreviewStep(container: HTMLElement, wrapper: HTMLElement): HTMLElement {
  const stepContainer = el('div', 'space-y-4');
  const svc = getImportExportService();

  const summaryArea = el('div');
  const filterArea = el('div');
  const tableArea = el('div');

  stepContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Review the dry-run results below. No data has been changed yet.'));
  stepContainer.appendChild(summaryArea);
  stepContainer.appendChild(filterArea);
  stepContainer.appendChild(tableArea);

  let activeFilter = 'all';
  let previewRows: Array<{
    rowNumber: number;
    action: string;
    sourceData: Record<string, unknown>;
    existingData?: Record<string, unknown>;
    conflicts?: Array<{ field: string; sourceValue: unknown; existingValue: unknown }>;
    errors?: string[];
    warnings?: string[];
  }> = [];

  const renderFilteredTable = () => {
    tableArea.innerHTML = '';
    const filtered = activeFilter === 'all'
      ? previewRows
      : activeFilter === 'error'
        ? previewRows.filter((r) => (r.errors && r.errors.length > 0))
        : previewRows.filter((r) => r.action === activeFilter);

    const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto');
    const table = el('table', 'w-full text-sm');

    const thead = el('thead');
    const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
    for (const col of ['Row', 'Action', 'Data Preview', 'Conflicts', 'Issues']) {
      headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    if (filtered.length === 0) {
      const tr = el('tr');
      const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No rows match this filter.');
      td.setAttribute('colspan', '5');
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    for (const row of filtered) {
      const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors cursor-pointer');

      tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(row.rowNumber)));

      const tdAction = el('td', 'py-2 px-3');
      const actionInfo = ACTION_BADGE[row.action] ?? ACTION_BADGE['skip'];
      tdAction.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.cls}`, actionInfo.label));
      tr.appendChild(tdAction);

      const tdData = el('td', 'py-2 px-3');
      const dataStr = JSON.stringify(row.sourceData);
      tdData.appendChild(el('span', 'text-[var(--text-muted)] text-xs', dataStr.length > 100 ? dataStr.substring(0, 100) + '...' : dataStr));
      tr.appendChild(tdData);

      const tdConflicts = el('td', 'py-2 px-3');
      tdConflicts.appendChild(el('span', 'text-xs text-[var(--text-muted)]', row.conflicts ? String(row.conflicts.length) : '0'));
      tr.appendChild(tdConflicts);

      const tdIssues = el('td', 'py-2 px-3');
      const issueCount = (row.errors?.length ?? 0) + (row.warnings?.length ?? 0);
      tdIssues.appendChild(el('span', `text-xs ${issueCount > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`, String(issueCount)));
      tr.appendChild(tdIssues);

      // Click to expand inline diff
      tr.addEventListener('click', () => {
        const existing = tr.nextElementSibling;
        if (existing?.getAttribute('data-expand') === '1') {
          existing.remove();
          return;
        }
        const expandRow = el('tr');
        expandRow.setAttribute('data-expand', '1');
        const expandTd = el('td', 'p-4 bg-[var(--surface)]');
        expandTd.setAttribute('colspan', '5');

        const diffGrid = el('div', 'grid grid-cols-2 gap-4');
        const sourcePanel = el('div', 'bg-[var(--surface-raised)] rounded-lg p-3 border border-emerald-500/20');
        sourcePanel.appendChild(el('h4', 'text-xs font-bold text-emerald-400 mb-2', 'Source Data'));
        for (const [k, v] of Object.entries(row.sourceData)) {
          const fr = el('div', 'flex justify-between text-xs mb-1');
          fr.appendChild(el('span', 'text-[var(--text-muted)]', k));
          fr.appendChild(el('span', 'text-[var(--text)] font-mono', v != null ? String(v) : '--'));
          sourcePanel.appendChild(fr);
        }
        diffGrid.appendChild(sourcePanel);

        if (row.existingData) {
          const existPanel = el('div', 'bg-[var(--surface-raised)] rounded-lg p-3 border border-red-500/20');
          existPanel.appendChild(el('h4', 'text-xs font-bold text-red-400 mb-2', 'Existing Data'));
          for (const [k, v] of Object.entries(row.existingData)) {
            const isConflict = row.conflicts?.some((c) => c.field === k);
            const fr = el('div', 'flex justify-between text-xs mb-1');
            fr.appendChild(el('span', `${isConflict ? 'text-amber-400 font-bold' : 'text-[var(--text-muted)]'}`, k));
            fr.appendChild(el('span', `font-mono ${isConflict ? 'text-red-400' : 'text-[var(--text)]'}`, v != null ? String(v) : '--'));
            existPanel.appendChild(fr);
          }
          diffGrid.appendChild(existPanel);
        } else {
          const emptyPanel = el('div', 'bg-[var(--surface-raised)] rounded-lg p-3 border border-[var(--border)]');
          emptyPanel.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'No existing record'));
          diffGrid.appendChild(emptyPanel);
        }

        expandTd.appendChild(diffGrid);
        expandRow.appendChild(expandTd);
        tr.after(expandRow);
      });

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    tableArea.appendChild(wrap);
  };

  const loadPreview = async () => {
    if (!batchId) return;
    summaryArea.innerHTML = '';
    summaryArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Loading preview...'));

    try {
      const result = await svc.preview(batchId);
      previewRows = result.rows;

      // Summary cards
      summaryArea.innerHTML = '';
      const grid = el('div', 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4');
      const cards = [
        { label: 'Total Rows', value: result.totalRows, cls: 'text-[var(--text)]' },
        { label: 'To Add', value: result.toAdd, cls: 'text-emerald-400' },
        { label: 'To Update', value: result.toUpdate, cls: 'text-blue-400' },
        { label: 'To Skip', value: result.toSkip, cls: 'text-zinc-400' },
        { label: 'Conflicts', value: result.conflicts, cls: 'text-amber-400' },
        { label: 'Errors', value: result.errors, cls: 'text-red-400' },
        { label: 'Warnings', value: result.warnings, cls: 'text-orange-400' },
      ];
      for (const c of cards) {
        const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center');
        cardEl.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', c.label));
        cardEl.appendChild(el('p', `text-2xl font-bold ${c.cls}`, String(c.value)));
        grid.appendChild(cardEl);
      }
      summaryArea.appendChild(grid);

      // Filter buttons
      filterArea.innerHTML = '';
      const filterBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
      const filterBtnCls = 'px-3 py-1 rounded-md text-xs font-medium border transition-colors';
      const filters = [
        { label: 'All', value: 'all' },
        { label: 'To Add', value: 'add' },
        { label: 'To Update', value: 'update' },
        { label: 'To Skip', value: 'skip' },
        { label: 'Conflicts', value: 'conflict' },
        { label: 'Errors', value: 'error' },
      ];
      for (const f of filters) {
        const isActive = f.value === activeFilter;
        const btnCls = isActive
          ? `${filterBtnCls} bg-[var(--accent)] text-white border-[var(--accent)]`
          : `${filterBtnCls} bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-raised)]`;
        const btn = el('button', btnCls, f.label);
        btn.addEventListener('click', () => {
          activeFilter = f.value;
          loadPreview();
        });
        filterBar.appendChild(btn);
      }
      filterArea.appendChild(filterBar);

      renderFilteredTable();
    } catch (err) {
      summaryArea.innerHTML = '';
      showMsg(wrapper, `Preview failed: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  };

  // Actions
  const actions = el('div', 'flex justify-between gap-3 mt-4');
  const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
  backBtn.addEventListener('click', () => {
    currentStep = 3;
    renderWizard(container);
  });
  actions.appendChild(backBtn);

  const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Next: Import');
  nextBtn.addEventListener('click', () => {
    currentStep = 5;
    renderWizard(container);
  });
  actions.appendChild(nextBtn);
  stepContainer.appendChild(actions);

  loadPreview();

  return stepContainer;
}

// ---------------------------------------------------------------------------
// Step 6: Import (Commit)
// ---------------------------------------------------------------------------

function buildCommitStep(container: HTMLElement, wrapper: HTMLElement): HTMLElement {
  const stepContainer = el('div', 'space-y-4');
  const svc = getImportExportService();

  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Commit Import'));
  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Click "Start Import" to commit all approved rows to the target collection. This action can be reverted from the import history.'));

  // Progress bar
  const progressContainer = el('div', 'mb-4 hidden');
  const progressLabelRow = el('div', 'flex justify-between text-sm mb-1');
  const progressLabel = el('span', 'text-[var(--text)]', 'Importing...');
  const progressPct = el('span', 'text-[var(--text-muted)]', '0%');
  progressLabelRow.appendChild(progressLabel);
  progressLabelRow.appendChild(progressPct);
  progressContainer.appendChild(progressLabelRow);

  const progressTrack = el('div', 'h-3 rounded-full bg-[var(--surface)] overflow-hidden');
  const progressFill = el('div', 'h-full rounded-full bg-[var(--accent)] transition-all duration-300');
  progressFill.style.width = '0%';
  progressTrack.appendChild(progressFill);
  progressContainer.appendChild(progressTrack);
  card.appendChild(progressContainer);

  // Completion area
  const completionArea = el('div');
  card.appendChild(completionArea);

  stepContainer.appendChild(card);

  // Actions
  const actions = el('div', 'flex justify-between gap-3 mt-4');
  const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
  backBtn.addEventListener('click', () => {
    currentStep = 4;
    renderWizard(container);
  });
  actions.appendChild(backBtn);

  const commitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-500 text-white hover:opacity-90', 'Start Import');
  commitBtn.addEventListener('click', async () => {
    if (!batchId) return;

    commitBtn.disabled = true;
    commitBtn.textContent = 'Importing...';
    backBtn.style.display = 'none';
    progressContainer.className = 'mb-4';

    const onProgress = (percent: number) => {
      progressFill.style.width = `${percent}%`;
      progressPct.textContent = `${percent}%`;
      if (percent >= 100) {
        progressLabel.textContent = 'Complete!';
      }
    };

    try {
      // Build resolutions from preview rows for conflict rows (default to skip)
      const previewResult = await svc.preview(batchId);
      const resolutions: Record<number, 'add' | 'update' | 'skip'> = {};
      for (const row of previewResult.rows) {
        if (row.action === 'conflict') {
          resolutions[row.rowNumber] = 'skip';
        }
      }

      const result = await svc.commit(batchId, resolutions, onProgress);

      // Show completion stats
      completionArea.innerHTML = '';
      const statsGrid = el('div', 'grid grid-cols-3 gap-4 mt-4');

      const importedCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-emerald-500/20 text-center');
      importedCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Imported'));
      importedCard.appendChild(el('p', 'text-2xl font-bold text-emerald-400', String(result.importedRows)));
      statsGrid.appendChild(importedCard);

      const skippedCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] text-center');
      skippedCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Skipped'));
      skippedCard.appendChild(el('p', 'text-2xl font-bold text-zinc-400', String(result.skippedRows)));
      statsGrid.appendChild(skippedCard);

      const errorCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-red-500/20 text-center');
      errorCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Errors'));
      errorCard.appendChild(el('p', 'text-2xl font-bold text-red-400', String(result.errorRows)));
      statsGrid.appendChild(errorCard);

      completionArea.appendChild(statsGrid);

      const statusMsg = result.status === 'completed'
        ? 'Import completed successfully!'
        : `Import finished with status: ${result.status}`;
      const statusCls = result.status === 'completed'
        ? 'text-emerald-400'
        : 'text-amber-400';
      completionArea.appendChild(el('p', `text-sm font-medium ${statusCls} mt-4 text-center`, statusMsg));

      // Replace commit button with history link
      commitBtn.textContent = 'View Import History';
      commitBtn.disabled = false;
      commitBtn.className = 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
      commitBtn.onclick = () => {
        window.location.hash = '#/import-export/history';
      };

      showMsg(wrapper, statusMsg, false);
    } catch (err) {
      showMsg(wrapper, `Import failed: ${err instanceof Error ? err.message : String(err)}`, true);
      commitBtn.disabled = false;
      commitBtn.textContent = 'Retry Import';
      backBtn.style.display = '';
    }
  });

  actions.appendChild(commitBtn);
  stepContainer.appendChild(actions);

  return stepContainer;
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

function renderWizard(container: HTMLElement): void {
  container.innerHTML = '';
  const wrapper = el('div', 'space-y-0');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Import Wizard'));
  const historyLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]') as HTMLAnchorElement;
  historyLink.href = '#/import-export/history';
  historyLink.textContent = 'View History';
  headerRow.appendChild(historyLink);
  wrapper.appendChild(headerRow);

  wrapper.appendChild(buildStepper(currentStep));

  switch (currentStep) {
    case 0:
      wrapper.appendChild(buildUploadStep(container, wrapper));
      break;
    case 1:
      wrapper.appendChild(buildFormatDetectionStep(container, wrapper));
      break;
    case 2:
      wrapper.appendChild(buildFieldMappingStep(container, wrapper));
      break;
    case 3:
      wrapper.appendChild(buildValidateStep(container, wrapper));
      break;
    case 4:
      wrapper.appendChild(buildPreviewStep(container, wrapper));
      break;
    case 5:
      wrapper.appendChild(buildCommitStep(container, wrapper));
      break;
  }

  container.appendChild(wrapper);
}

export default {
  render(container: HTMLElement): void {
    // Reset state for fresh wizard
    currentStep = 0;
    batchId = null;
    fileContent = null;
    fileName = null;
    detectionResult = null;
    renderWizard(container);
  },
};

/**
 * Import Wizard view.
 * Step-by-step import flow: select file -> detect format -> field mapping ->
 * validate -> preview -> commit.
 */

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

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV (Comma-Separated)' },
  { value: 'tsv', label: 'TSV (Tab-Separated)' },
  { value: 'json', label: 'JSON' },
  { value: 'iif', label: 'IIF (Intuit Interchange Format)' },
  { value: 'qb', label: 'QuickBooks Desktop/Online' },
  { value: 'sage', label: 'Sage 100/300' },
  { value: 'foundation', label: 'Foundation Software' },
  { value: 'fixed', label: 'Fixed-Width' },
];

const MERGE_STRATEGY_OPTIONS = [
  { value: 'append', label: 'Append - Add all as new records' },
  { value: 'skip', label: 'Skip - Skip existing matches' },
  { value: 'overwrite', label: 'Overwrite - Replace existing matches' },
  { value: 'manual', label: 'Manual - Review conflicts individually' },
];

const COLLECTION_OPTIONS = [
  { value: '', label: 'Auto-detect from headers' },
  { value: 'ap/vendor', label: 'AP Vendors' },
  { value: 'ap/invoice', label: 'AP Invoices' },
  { value: 'ar/customer', label: 'AR Customers' },
  { value: 'ar/invoice', label: 'AR Invoices' },
  { value: 'gl/account', label: 'GL Accounts' },
  { value: 'gl/journalEntry', label: 'GL Journal Entries' },
  { value: 'job/job', label: 'Jobs' },
  { value: 'entity/entity', label: 'Entities' },
  { value: 'payroll/employee', label: 'Payroll Employees' },
];

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function buildStepper(currentStep: number): HTMLElement {
  const stepper = el('div', 'flex items-center gap-2 mb-6 flex-wrap');

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const isActive = i === currentStep;
    const isComplete = i < currentStep;

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
    stepEl.appendChild(el('span', labelCls, step.label.split('. ')[1]));

    stepper.appendChild(stepEl);

    if (i < STEPS.length - 1) {
      const separator = el('div', 'flex-1 h-px bg-[var(--border)] min-w-[20px]');
      stepper.appendChild(separator);
    }
  }

  return stepper;
}

// ---------------------------------------------------------------------------
// Step 1: Upload
// ---------------------------------------------------------------------------

function buildUploadStep(): HTMLElement {
  const container = el('div', 'space-y-4');

  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Upload Import File'));

  const dropZone = el('div', 'border-2 border-dashed border-[var(--border)] rounded-lg p-12 text-center hover:border-[var(--accent)] transition-colors cursor-pointer');
  dropZone.appendChild(el('div', 'text-4xl text-[var(--text-muted)] mb-3', '\u2191'));
  dropZone.appendChild(el('p', 'text-[var(--text)] font-medium mb-1', 'Drag and drop your file here'));
  dropZone.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Supports CSV, TSV, JSON, IIF, QuickBooks, Sage, Foundation, and fixed-width formats'));

  const fileInput = el('input') as HTMLInputElement;
  fileInput.type = 'file';
  fileInput.accept = '.csv,.tsv,.json,.iif,.txt,.xls,.xlsx';
  fileInput.className = 'hidden';
  dropZone.appendChild(fileInput);

  const browseBtn = el('button', 'mt-4 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Browse Files');
  dropZone.appendChild(browseBtn);

  card.appendChild(dropZone);

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';

  const settingsGrid = el('div', 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-6');

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

  const delimiterGroup = el('div');
  delimiterGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Custom Delimiter (optional)'));
  const delimiterInput = el('input', inputCls) as HTMLInputElement;
  delimiterInput.type = 'text';
  delimiterInput.placeholder = 'Auto-detect (e.g., | or ; or tab)';
  delimiterGroup.appendChild(delimiterInput);
  settingsGrid.appendChild(delimiterGroup);

  card.appendChild(settingsGrid);

  const compositeGroup = el('div', 'mt-4');
  compositeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Composite Keys (comma-separated field names for merge detection)'));
  const compositeInput = el('input', inputCls) as HTMLInputElement;
  compositeInput.type = 'text';
  compositeInput.placeholder = 'e.g., vendorId,invoiceNumber';
  compositeGroup.appendChild(compositeInput);
  card.appendChild(compositeGroup);

  container.appendChild(card);

  const batchNameCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  batchNameCard.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Batch Name'));
  const batchNameInput = el('input', inputCls) as HTMLInputElement;
  batchNameInput.type = 'text';
  batchNameInput.placeholder = 'e.g., Foundation AP Import Feb 2026';
  batchNameCard.appendChild(batchNameInput);
  container.appendChild(batchNameCard);

  const actions = el('div', 'flex justify-end gap-3 mt-4');
  const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Next: Detect Format');
  actions.appendChild(nextBtn);
  container.appendChild(actions);

  return container;
}

// ---------------------------------------------------------------------------
// Step 2: Format Detection
// ---------------------------------------------------------------------------

export function buildFormatDetectionStep(): HTMLElement {
  const container = el('div', 'space-y-4');

  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Format Detection Results'));

  const grid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

  const formatCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  formatCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', 'Detected Format'));
  formatCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', 'CSV'));
  grid.appendChild(formatCard);

  const confidenceCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  confidenceCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', 'Confidence'));
  confidenceCard.appendChild(el('p', 'text-lg font-bold text-emerald-400', '95%'));
  grid.appendChild(confidenceCard);

  const collectionCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  collectionCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-1', 'Detected Collection'));
  collectionCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', 'AP Invoices'));
  grid.appendChild(collectionCard);

  card.appendChild(grid);

  const headersSection = el('div', 'mt-4');
  headersSection.appendChild(el('p', 'text-sm font-medium text-[var(--text-muted)] mb-2', 'Detected Headers'));
  const headerList = el('div', 'flex flex-wrap gap-2');
  const sampleHeaders = ['Vendor Name', 'Invoice Number', 'Invoice Date', 'Amount', 'Due Date'];
  for (const header of sampleHeaders) {
    const badge = el('span', 'px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', header);
    headerList.appendChild(badge);
  }
  headersSection.appendChild(headerList);
  card.appendChild(headersSection);

  container.appendChild(card);

  const previewCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  previewCard.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)] mb-4', 'Data Preview (first 5 rows)'));
  previewCard.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Data preview will appear here after file upload.'));
  container.appendChild(previewCard);

  const actions = el('div', 'flex justify-between gap-3 mt-4');
  const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
  actions.appendChild(backBtn);
  const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Next: Field Mapping');
  actions.appendChild(nextBtn);
  container.appendChild(actions);

  return container;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Import Wizard'));
    const historyLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]') as HTMLAnchorElement;
    historyLink.href = '#/import-export/history';
    historyLink.textContent = 'View History';
    headerRow.appendChild(historyLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildStepper(0));
    wrapper.appendChild(buildUploadStep());

    container.appendChild(wrapper);
  },
};

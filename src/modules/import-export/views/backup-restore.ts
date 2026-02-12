/**
 * Backup & Restore view.
 * Full system backup to JSON and restore from backup file.
 * Includes backup history and validation.
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

const COLLECTION_LIST = [
  { name: 'ap/vendor', label: 'AP Vendors' },
  { name: 'ap/invoice', label: 'AP Invoices' },
  { name: 'ap/invoiceLine', label: 'AP Invoice Lines' },
  { name: 'ap/payment', label: 'AP Payments' },
  { name: 'ap/paymentLine', label: 'AP Payment Lines' },
  { name: 'ap/lienWaiver', label: 'AP Lien Waivers' },
  { name: 'ap/complianceCert', label: 'AP Compliance Certs' },
  { name: 'ap/retention', label: 'AP Retentions' },
  { name: 'ar/customer', label: 'AR Customers' },
  { name: 'ar/invoice', label: 'AR Invoices' },
  { name: 'gl/account', label: 'GL Accounts' },
  { name: 'gl/journalEntry', label: 'GL Journal Entries' },
  { name: 'gl/journalEntryLine', label: 'GL Entry Lines' },
  { name: 'job/job', label: 'Jobs' },
  { name: 'job/costCode', label: 'Job Cost Codes' },
  { name: 'entity/entity', label: 'Entities' },
  { name: 'payroll/employee', label: 'Payroll Employees' },
  { name: 'payroll/payRun', label: 'Pay Runs' },
];

// ---------------------------------------------------------------------------
// Backup Section
// ---------------------------------------------------------------------------

function buildBackupSection(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

  const headerRow = el('div', 'flex items-center justify-between mb-4');
  headerRow.appendChild(el('h2', 'text-xl font-bold text-[var(--text)]', 'Create Backup'));
  const backupBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-500 text-white hover:opacity-90', 'Download Full Backup');
  headerRow.appendChild(backupBtn);
  card.appendChild(headerRow);

  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Creates a complete JSON backup of all data across all collections. The backup file can be used to restore data on any Concrete installation.'));

  const infoGrid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4');

  const versionCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  versionCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Backup Version'));
  versionCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', '2.0.0'));
  infoGrid.appendChild(versionCard);

  const collectionsCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  collectionsCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Collections'));
  collectionsCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', String(COLLECTION_LIST.length)));
  infoGrid.appendChild(collectionsCard);

  const dateCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
  dateCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Backup Date'));
  dateCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', new Date().toLocaleDateString()));
  infoGrid.appendChild(dateCard);

  card.appendChild(infoGrid);

  card.appendChild(el('h3', 'text-sm font-medium text-[var(--text-muted)] mb-2', 'Collections included in backup:'));
  const collectionGrid = el('div', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2');
  for (const col of COLLECTION_LIST) {
    const colItem = el('label', 'flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--surface)] cursor-pointer');
    const cb = el('input') as HTMLInputElement;
    cb.type = 'checkbox';
    cb.checked = true;
    cb.className = 'rounded border-[var(--border)]';
    colItem.appendChild(cb);
    colItem.appendChild(el('span', 'text-sm text-[var(--text)]', col.label));
    collectionGrid.appendChild(colItem);
  }
  card.appendChild(collectionGrid);

  return card;
}

// ---------------------------------------------------------------------------
// Restore Section
// ---------------------------------------------------------------------------

function buildRestoreSection(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');
  card.appendChild(el('h2', 'text-xl font-bold text-[var(--text)] mb-4', 'Restore from Backup'));

  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Upload a previously created backup file to restore data. You can choose to replace all existing data or merge the backup with current data.'));

  const dropZone = el('div', 'border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer mb-4');
  dropZone.appendChild(el('div', 'text-3xl text-[var(--text-muted)] mb-2', '\u2191'));
  dropZone.appendChild(el('p', 'text-[var(--text)] font-medium mb-1', 'Drop backup file here'));
  dropZone.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Accepts .json backup files'));

  const fileInput = el('input') as HTMLInputElement;
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.className = 'hidden';
  dropZone.appendChild(fileInput);
  card.appendChild(dropZone);

  const optionsRow = el('div', 'flex items-center gap-6 mb-4');

  const replaceOption = el('label', 'flex items-center gap-2 cursor-pointer');
  const replaceRadio = el('input') as HTMLInputElement;
  replaceRadio.type = 'radio';
  replaceRadio.name = 'restoreMode';
  replaceRadio.value = 'replace';
  replaceRadio.checked = true;
  replaceOption.appendChild(replaceRadio);
  replaceOption.appendChild(el('span', 'text-sm text-[var(--text)]', 'Replace existing data'));
  optionsRow.appendChild(replaceOption);

  const mergeOption = el('label', 'flex items-center gap-2 cursor-pointer');
  const mergeRadio = el('input') as HTMLInputElement;
  mergeRadio.type = 'radio';
  mergeRadio.name = 'restoreMode';
  mergeRadio.value = 'merge';
  mergeOption.appendChild(mergeRadio);
  mergeOption.appendChild(el('span', 'text-sm text-[var(--text)]', 'Merge with existing data'));
  optionsRow.appendChild(mergeOption);

  card.appendChild(optionsRow);

  const warningBox = el('div', 'bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4');
  warningBox.appendChild(el('p', 'text-sm font-medium text-amber-400 mb-1', 'Warning'));
  warningBox.appendChild(el('p', 'text-xs text-amber-400/80', 'Replacing existing data will permanently overwrite all current records in the restored collections. This action cannot be undone. Consider creating a backup of the current data first.'));
  card.appendChild(warningBox);

  const restoreBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Restore Data');
  card.appendChild(restoreBtn);

  return card;
}

// ---------------------------------------------------------------------------
// Backup Validation Info
// ---------------------------------------------------------------------------

function buildValidationInfo(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h2', 'text-xl font-bold text-[var(--text)] mb-4', 'Backup File Validation'));

  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'When a backup file is uploaded, it will be validated against the current schema version. The following checks are performed:'));

  const checks = [
    'Backup format version compatibility',
    'Collection schema validation',
    'Required field presence',
    'Data type verification',
    'Referential integrity between collections',
    'Duplicate ID detection',
  ];

  const checkList = el('ul', 'space-y-2');
  for (const check of checks) {
    const li = el('li', 'flex items-center gap-2');
    li.appendChild(el('span', 'text-emerald-400 text-sm', '\u2713'));
    li.appendChild(el('span', 'text-sm text-[var(--text)]', check));
    checkList.appendChild(li);
  }
  card.appendChild(checkList);

  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Backup & Restore'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildBackupSection());
    wrapper.appendChild(buildRestoreSection());
    wrapper.appendChild(buildValidationInfo());

    container.appendChild(wrapper);
  },
};

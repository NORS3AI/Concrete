/**
 * Backup & Restore view.
 * Full system backup to JSON and restore from backup file.
 * Includes collection selection, backup download, file upload restore,
 * and merge/replace mode selection.
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
// Constants
// ---------------------------------------------------------------------------

const COLLECTION_LIST = [
  { name: 'gl/account', label: 'GL Accounts' },
  { name: 'gl/journal', label: 'GL Journal Entries' },
  { name: 'gl/journalLine', label: 'GL Journal Lines' },
  { name: 'job/job', label: 'Jobs' },
  { name: 'job/costCode', label: 'Job Cost Codes' },
  { name: 'job/budget', label: 'Job Budgets' },
  { name: 'job/estimate', label: 'Estimates' },
  { name: 'job/estimateLine', label: 'Estimate Lines' },
  { name: 'job/bid', label: 'Bids' },
  { name: 'ap/vendor', label: 'AP Vendors' },
  { name: 'ap/bill', label: 'AP Bills' },
  { name: 'ar/customer', label: 'AR Customers' },
  { name: 'ar/invoice', label: 'AR Invoices' },
  { name: 'entity/entity', label: 'Entities' },
  { name: 'payroll/employee', label: 'Payroll Employees' },
  { name: 'payroll/timeEntry', label: 'Time Entries' },
  { name: 'doc/document', label: 'Documents' },
  { name: 'doc/revision', label: 'Document Revisions' },
];

// ---------------------------------------------------------------------------
// BackupData type (mirrors the service type)
// ---------------------------------------------------------------------------

interface BackupData {
  version: string;
  exportedAt: string;
  collections: Record<string, Record<string, unknown>[]>;
  [key: string]: unknown;
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

    // =====================================================================
    // BACKUP SECTION
    // =====================================================================
    const backupCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');

    const backupHeaderRow = el('div', 'flex items-center justify-between mb-4');
    backupHeaderRow.appendChild(el('h2', 'text-xl font-bold text-[var(--text)]', 'Create Backup'));
    const backupBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-500 text-white hover:opacity-90', 'Download Full Backup');
    backupHeaderRow.appendChild(backupBtn);
    backupCard.appendChild(backupHeaderRow);

    backupCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Creates a complete JSON backup of all data across selected collections. The backup file can be used to restore data on any Concrete installation.'));

    // Backup info cards
    const infoGrid = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4');

    const versionCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
    versionCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Backup Version'));
    versionCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', '2.0.0'));
    infoGrid.appendChild(versionCard);

    const collectionsCountCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
    collectionsCountCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Collections'));
    const collectionsCountValue = el('p', 'text-lg font-bold text-[var(--text)]', String(COLLECTION_LIST.length));
    collectionsCountCard.appendChild(collectionsCountValue);
    infoGrid.appendChild(collectionsCountCard);

    const dateCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
    dateCard.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', 'Backup Date'));
    dateCard.appendChild(el('p', 'text-lg font-bold text-[var(--text)]', new Date().toLocaleDateString()));
    infoGrid.appendChild(dateCard);

    backupCard.appendChild(infoGrid);

    // Collection checklist with Select All / Deselect All
    const selectedCollections = new Set<string>(COLLECTION_LIST.map(c => c.name));

    const collectionHeaderRow = el('div', 'flex items-center justify-between mb-2');
    collectionHeaderRow.appendChild(el('h3', 'text-sm font-medium text-[var(--text-muted)]', 'Collections included in backup:'));
    const toggleAllBtn = el('button', 'text-xs text-[var(--accent)] hover:underline font-medium', 'Deselect All');
    collectionHeaderRow.appendChild(toggleAllBtn);
    backupCard.appendChild(collectionHeaderRow);

    const collectionGrid = el('div', 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2');
    const checkboxes: HTMLInputElement[] = [];

    for (const col of COLLECTION_LIST) {
      const colItem = el('label', 'flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--surface)] cursor-pointer');
      const cb = el('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = true;
      cb.className = 'rounded border-[var(--border)]';
      cb.dataset.collection = col.name;
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedCollections.add(col.name);
        } else {
          selectedCollections.delete(col.name);
        }
        collectionsCountValue.textContent = String(selectedCollections.size);
      });
      checkboxes.push(cb);
      colItem.appendChild(cb);
      colItem.appendChild(el('span', 'text-sm text-[var(--text)]', col.label));
      collectionGrid.appendChild(colItem);
    }

    toggleAllBtn.addEventListener('click', () => {
      const allChecked = selectedCollections.size === COLLECTION_LIST.length;
      for (const cb of checkboxes) {
        cb.checked = !allChecked;
        const colName = cb.dataset.collection!;
        if (!allChecked) {
          selectedCollections.add(colName);
        } else {
          selectedCollections.delete(colName);
        }
      }
      collectionsCountValue.textContent = String(selectedCollections.size);
      toggleAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
    });

    backupCard.appendChild(collectionGrid);

    // Backup result info area
    const backupResultArea = el('div');
    backupCard.appendChild(backupResultArea);

    // Backup button handler
    backupBtn.addEventListener('click', async () => {
      if (selectedCollections.size === 0) {
        showMsg(wrapper, 'Please select at least one collection to back up.', true);
        return;
      }

      backupBtn.disabled = true;
      backupBtn.textContent = 'Creating Backup...';

      try {
        const svc = getImportExportService();
        const backup = await svc.exportAll(Array.from(selectedCollections));

        // Show backup info
        backupResultArea.innerHTML = '';
        const infoCard = el('div', 'mt-4 bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]');
        infoCard.appendChild(el('p', 'text-sm font-medium text-[var(--text)] mb-2', 'Backup Created Successfully'));
        infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Version: ${backup.version}`));
        infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Collections: ${Object.keys(backup.collections).length}`));

        let totalRecords = 0;
        const recordLines: string[] = [];
        for (const [name, records] of Object.entries(backup.collections)) {
          totalRecords += records.length;
          recordLines.push(`${name}: ${records.length} records`);
        }
        infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Total Records: ${totalRecords}`));

        const detailList = el('div', 'mt-2 space-y-1');
        for (const line of recordLines) {
          detailList.appendChild(el('p', 'text-xs text-[var(--text-muted)] font-mono', line));
        }
        infoCard.appendChild(detailList);
        backupResultArea.appendChild(infoCard);

        // Trigger download
        const jsonStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `concrete-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showMsg(wrapper, `Backup created: ${Object.keys(backup.collections).length} collections, ${totalRecords} records`, false);
      } catch (err) {
        showMsg(wrapper, `Backup failed: ${err instanceof Error ? err.message : String(err)}`, true);
      } finally {
        backupBtn.disabled = false;
        backupBtn.textContent = 'Download Full Backup';
      }
    });

    wrapper.appendChild(backupCard);

    // =====================================================================
    // RESTORE SECTION
    // =====================================================================
    const restoreCard = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');
    restoreCard.appendChild(el('h2', 'text-xl font-bold text-[var(--text)] mb-4', 'Restore from Backup'));

    restoreCard.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Upload a previously created backup file to restore data. You can choose to replace all existing data or merge the backup with current data.'));

    // File upload area
    const dropZone = el('div', 'border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer mb-4');
    dropZone.appendChild(el('div', 'text-3xl text-[var(--text-muted)] mb-2', '\u2191'));
    const dropLabel = el('p', 'text-[var(--text)] font-medium mb-1', 'Drop backup file here or click to upload');
    dropZone.appendChild(dropLabel);
    dropZone.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Accepts .json backup files'));

    const fileInput = el('input') as HTMLInputElement;
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.className = 'hidden';
    dropZone.appendChild(fileInput);

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
        handleFile(files[0]);
      }
    });

    restoreCard.appendChild(dropZone);

    // Backup info display area (shown after file is loaded)
    const backupInfoArea = el('div');
    restoreCard.appendChild(backupInfoArea);

    // Restore mode options
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

    restoreCard.appendChild(optionsRow);

    // Warning banner for Replace mode
    const warningBox = el('div', 'bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4');
    warningBox.setAttribute('data-warning', 'replace');
    warningBox.appendChild(el('p', 'text-sm font-medium text-amber-400 mb-1', 'Warning'));
    warningBox.appendChild(el('p', 'text-xs text-amber-400/80', 'Replacing existing data will permanently overwrite all current records in the restored collections. This action cannot be undone. Consider creating a backup of the current data first.'));
    restoreCard.appendChild(warningBox);

    // Toggle warning visibility based on mode
    replaceRadio.addEventListener('change', () => {
      warningBox.style.display = replaceRadio.checked ? '' : 'none';
    });
    mergeRadio.addEventListener('change', () => {
      warningBox.style.display = replaceRadio.checked ? '' : 'none';
    });

    // Restore button
    const restoreBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50', 'Restore Data');
    restoreBtn.disabled = true;
    restoreCard.appendChild(restoreBtn);

    wrapper.appendChild(restoreCard);

    // Track parsed backup data
    let parsedBackup: BackupData | null = null;

    // File handler
    const handleFile = (file: File) => {
      if (!file.name.endsWith('.json')) {
        showMsg(wrapper, 'Invalid file type. Please upload a .json backup file.', true);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const data = JSON.parse(text);

          // Validate backup structure
          if (!data.version || !data.exportedAt || !data.collections) {
            showMsg(wrapper, 'Invalid backup file: missing required fields (version, exportedAt, collections).', true);
            parsedBackup = null;
            restoreBtn.disabled = true;
            return;
          }

          if (typeof data.collections !== 'object' || Array.isArray(data.collections)) {
            showMsg(wrapper, 'Invalid backup file: collections must be an object.', true);
            parsedBackup = null;
            restoreBtn.disabled = true;
            return;
          }

          parsedBackup = data as BackupData;
          restoreBtn.disabled = false;

          // Update drop zone label
          dropLabel.textContent = `Loaded: ${file.name}`;

          // Show backup info
          backupInfoArea.innerHTML = '';
          const infoCard = el('div', 'bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)] mb-4');
          infoCard.appendChild(el('p', 'text-sm font-medium text-[var(--text)] mb-2', 'Backup File Info'));
          infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Version: ${data.version}`));
          infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Exported At: ${new Date(data.exportedAt).toLocaleString()}`));

          const collectionNames = Object.keys(data.collections);
          infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Collections: ${collectionNames.length}`));

          let totalRecords = 0;
          const detailList = el('div', 'mt-2 space-y-1');
          for (const name of collectionNames) {
            const records = data.collections[name];
            const count = Array.isArray(records) ? records.length : 0;
            totalRecords += count;
            detailList.appendChild(el('p', 'text-xs text-[var(--text-muted)] font-mono', `${name}: ${count} records`));
          }
          infoCard.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `Total Records: ${totalRecords}`));
          infoCard.appendChild(detailList);
          backupInfoArea.appendChild(infoCard);

          showMsg(wrapper, `Backup file loaded: ${collectionNames.length} collections, ${totalRecords} records`, false);
        } catch (err) {
          showMsg(wrapper, `Failed to parse backup file: ${err instanceof Error ? err.message : String(err)}`, true);
          parsedBackup = null;
          restoreBtn.disabled = true;
        }
      };
      reader.onerror = () => {
        showMsg(wrapper, 'Failed to read file.', true);
      };
      reader.readAsText(file);
    };

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });

    // Restore button handler
    restoreBtn.addEventListener('click', async () => {
      if (!parsedBackup) {
        showMsg(wrapper, 'Please upload a backup file first.', true);
        return;
      }

      const isMerge = mergeRadio.checked;

      if (!isMerge) {
        const confirmed = confirm('Are you sure you want to replace all existing data? This action cannot be undone.');
        if (!confirmed) return;
      }

      restoreBtn.disabled = true;
      restoreBtn.textContent = 'Restoring...';

      try {
        const svc = getImportExportService();
        const result = await svc.importAll(parsedBackup, { merge: isMerge });

        showMsg(wrapper, `Restore complete: ${result.collectionsRestored} collections restored, ${result.totalRecords} total records`, false);

        // Show result
        backupInfoArea.innerHTML = '';
        const resultCard = el('div', 'bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4');
        resultCard.appendChild(el('p', 'text-sm font-medium text-emerald-400 mb-1', 'Restore Successful'));
        resultCard.appendChild(el('p', 'text-xs text-emerald-400/80', `Collections Restored: ${result.collectionsRestored}`));
        resultCard.appendChild(el('p', 'text-xs text-emerald-400/80', `Total Records: ${result.totalRecords}`));
        resultCard.appendChild(el('p', 'text-xs text-emerald-400/80', `Mode: ${isMerge ? 'Merge' : 'Replace'}`));
        backupInfoArea.appendChild(resultCard);

        // Reset state
        parsedBackup = null;
        dropLabel.textContent = 'Drop backup file here or click to upload';
        fileInput.value = '';
      } catch (err) {
        showMsg(wrapper, `Restore failed: ${err instanceof Error ? err.message : String(err)}`, true);
      } finally {
        restoreBtn.disabled = parsedBackup === null;
        restoreBtn.textContent = 'Restore Data';
      }
    });

    container.appendChild(wrapper);
  },
};

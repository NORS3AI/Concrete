/**
 * Field Mapping view.
 * Allows users to map source fields (from imported file) to target fields
 * (in the destination collection). Supports auto-matching, manual override,
 * and transform selection per field.
 *
 * Fully wired to ImportExportService for batch data, auto-match, and save.
 */

import { getImportExportService } from '../service-accessor';
import type { FieldTransform, SourceFormat } from '../import-export-service';

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

const TRANSFORM_OPTIONS: { value: FieldTransform; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'date', label: 'Parse Date' },
  { value: 'number', label: 'Parse Number' },
];

const CONFIDENCE_BADGE: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  low: 'bg-red-500/10 text-red-400 border border-red-500/20',
  none: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MappingRow {
  sourceField: string;
  targetField: string;
  transform: FieldTransform;
  confidence: number;
  sampleValues: string[];
}

// ---------------------------------------------------------------------------
// Parse batchId from hash
// ---------------------------------------------------------------------------

function parseBatchId(): string | null {
  const hash = window.location.hash;
  // Expected format: #/import-export/import/{batchId}/mapping
  const match = hash.match(/import\/([^/]+)\/mapping/);
  if (match) return match[1];
  // Also try generic pattern
  const match2 = hash.match(/import\/([^/]+)/);
  if (match2) return match2[1];
  return null;
}

// ---------------------------------------------------------------------------
// Mapping Table
// ---------------------------------------------------------------------------

function buildMappingTable(
  mappings: MappingRow[],
  targetFields: string[],
  onTargetChange: (idx: number, value: string) => void,
  onTransformChange: (idx: number, value: FieldTransform) => void,
  onRemove: (idx: number) => void,
): HTMLElement {
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

  if (mappings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No field mappings available. Upload a file first.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--text)] w-full';

  for (let idx = 0; idx < mappings.length; idx++) {
    const mapping = mappings[idx];
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdSource = el('td', 'py-2 px-3 font-mono text-[var(--text)]', mapping.sourceField);
    tr.appendChild(tdSource);

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
      if (field === mapping.targetField) {
        opt.selected = true;
      }
      targetSelect.appendChild(opt);
    }
    targetSelect.addEventListener('change', () => {
      onTargetChange(idx, targetSelect.value);
    });
    tdTarget.appendChild(targetSelect);
    tr.appendChild(tdTarget);

    const tdTransform = el('td', 'py-2 px-3');
    const transformSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TRANSFORM_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      if (opt.value === mapping.transform) {
        o.selected = true;
      }
      transformSelect.appendChild(o);
    }
    transformSelect.addEventListener('change', () => {
      onTransformChange(idx, transformSelect.value as FieldTransform);
    });
    tdTransform.appendChild(transformSelect);
    tr.appendChild(tdTransform);

    const tdConfidence = el('td', 'py-2 px-3');
    let confidenceLevel: string;
    if (mapping.confidence >= 0.8) {
      confidenceLevel = 'high';
    } else if (mapping.confidence >= 0.5) {
      confidenceLevel = 'medium';
    } else if (mapping.confidence > 0) {
      confidenceLevel = 'low';
    } else {
      confidenceLevel = 'none';
    }
    const confidenceBadge = el(
      'span',
      `px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_BADGE[confidenceLevel]}`,
      `${Math.round(mapping.confidence * 100)}%`,
    );
    tdConfidence.appendChild(confidenceBadge);
    tr.appendChild(tdConfidence);

    const tdActions = el('td', 'py-2 px-3');
    const clearBtn = el('button', 'text-red-400 hover:text-red-300 text-xs', 'Remove');
    clearBtn.addEventListener('click', () => onRemove(idx));
    tdActions.appendChild(clearBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const svc = getImportExportService();
    const batchId = parseBatchId();

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Field Mapping'));
    const autoMatchBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Auto-Match Fields');
    headerRow.appendChild(autoMatchBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Map each source field from your imported file to the corresponding target field in the destination collection. The auto-matcher uses header name similarity and known format mappings from Foundation, QuickBooks, and Sage.'));

    const tableContainer = el('div');
    tableContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Loading mappings...'));
    wrapper.appendChild(tableContainer);

    const actions = el('div', 'flex justify-between gap-3 mt-4');
    const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
    actions.appendChild(backBtn);
    const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save & Next');
    actions.appendChild(nextBtn);
    wrapper.appendChild(actions);

    container.appendChild(wrapper);

    // --- State ---
    const mappings: MappingRow[] = [];
    let sourceHeaders: string[] = [];
    let targetFields: string[] = [];
    let batchFormat: SourceFormat = 'csv';

    if (!batchId) {
      tableContainer.innerHTML = '';
      tableContainer.appendChild(el('p', 'text-sm text-red-400', 'No batch ID found in the URL. Navigate from the Import Wizard.'));
      return;
    }

    // --- Render mapping table ---
    const rerenderTable = () => {
      tableContainer.innerHTML = '';
      tableContainer.appendChild(buildMappingTable(
        mappings,
        targetFields,
        (idx, value) => {
          mappings[idx].targetField = value;
        },
        (idx, value) => {
          mappings[idx].transform = value;
        },
        (idx) => {
          mappings[idx].targetField = '';
          mappings[idx].confidence = 0;
          mappings[idx].transform = 'none';
          rerenderTable();
        },
      ));
    };

    // --- Load data ---
    const loadData = async () => {
      try {
        const batch = await svc.getBatch(batchId);
        if (!batch) {
          showMsg(wrapper, 'Batch not found.', true);
          return;
        }

        batchFormat = batch.sourceFormat;
        const rawData = batch.rawData ?? [];
        if (rawData.length > 0) {
          sourceHeaders = Object.keys(rawData[0]);
        }
        targetFields = TARGET_FIELDS_BY_COLLECTION[batch.collection] ?? ['id', 'name', 'description', 'amount', 'date', 'status'];

        // Load existing mappings
        const existingMappings = await svc.getFieldMappings(batchId);

        if (existingMappings.length > 0) {
          for (const em of existingMappings) {
            const samples = rawData.slice(0, 3).map((r) => {
              const v = r[em.sourceField];
              return v != null ? String(v) : '';
            });
            mappings.push({
              sourceField: em.sourceField,
              targetField: em.targetField,
              transform: em.transform,
              confidence: 1.0,
              sampleValues: samples,
            });
          }
        } else {
          // Initialize with empty mappings for all source headers
          for (const header of sourceHeaders) {
            const samples = rawData.slice(0, 3).map((r) => {
              const v = r[header];
              return v != null ? String(v) : '';
            });
            mappings.push({
              sourceField: header,
              targetField: '',
              transform: 'none',
              confidence: 0,
              sampleValues: samples,
            });
          }
        }

        rerenderTable();
      } catch (err) {
        tableContainer.innerHTML = '';
        showMsg(wrapper, `Failed to load batch data: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    };

    // --- Auto-Match ---
    autoMatchBtn.addEventListener('click', () => {
      if (sourceHeaders.length === 0) {
        showMsg(wrapper, 'No source headers loaded yet.', true);
        return;
      }
      try {
        const results = svc.autoMatchFields(sourceHeaders, targetFields, batchFormat);
        for (const result of results) {
          const row = mappings.find((m) => m.sourceField === result.sourceField);
          if (row) {
            row.targetField = result.targetField;
            row.confidence = result.confidence;
            row.transform = result.transform;
          }
        }
        rerenderTable();
        const matched = results.filter((r) => r.targetField).length;
        showMsg(wrapper, `Auto-matched ${matched} of ${results.length} fields.`, false);
      } catch (err) {
        showMsg(wrapper, `Auto-match failed: ${err instanceof Error ? err.message : String(err)}`, true);
      }
    });

    // --- Back ---
    backBtn.addEventListener('click', () => {
      window.location.hash = '#/import-export/import';
    });

    // --- Save & Next ---
    nextBtn.addEventListener('click', async () => {
      const validMappings = mappings.filter((m) => m.targetField);
      if (validMappings.length === 0) {
        showMsg(wrapper, 'Please map at least one field before continuing.', true);
        return;
      }

      nextBtn.disabled = true;
      nextBtn.textContent = 'Saving...';

      try {
        await svc.saveFieldMappings(batchId, validMappings.map((m) => ({
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform,
        })));
        showMsg(wrapper, `Saved ${validMappings.length} field mappings.`, false);
        // Navigate to preview
        window.location.hash = `#/import-export/import/${batchId}`;
      } catch (err) {
        showMsg(wrapper, `Failed to save mappings: ${err instanceof Error ? err.message : String(err)}`, true);
        nextBtn.disabled = false;
        nextBtn.textContent = 'Save & Next';
      }
    });

    loadData();
  },
};

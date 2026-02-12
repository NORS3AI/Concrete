/**
 * Field Mapping view.
 * Allows users to map source fields (from imported file) to target fields
 * (in the destination collection). Supports auto-matching, manual override,
 * and transform selection per field.
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

const TRANSFORM_OPTIONS = [
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MappingRow {
  sourceField: string;
  targetField: string;
  transform: string;
  confidence: number;
  sampleValues: string[];
}

// ---------------------------------------------------------------------------
// Mapping Table
// ---------------------------------------------------------------------------

function buildMappingTable(mappings: MappingRow[], targetFields: string[]): HTMLElement {
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

  for (const mapping of mappings) {
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
    const clearBtn = el('button', 'text-red-400 hover:text-red-300 text-xs', 'Clear');
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

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Field Mapping'));
    const autoMatchBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Auto-Match Fields');
    headerRow.appendChild(autoMatchBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Map each source field from your imported file to the corresponding target field in the destination collection. The auto-matcher uses header name similarity and known format mappings from Foundation, QuickBooks, and Sage.'));

    const sampleMappings: MappingRow[] = [
      { sourceField: 'Vendor Name', targetField: 'name', transform: 'trim', confidence: 0.95, sampleValues: ['ABC Concrete', 'XYZ Steel', 'Demo Lumber'] },
      { sourceField: 'Invoice Number', targetField: 'invoiceNumber', transform: 'none', confidence: 0.9, sampleValues: ['INV-001', 'INV-002', 'INV-003'] },
      { sourceField: 'Invoice Date', targetField: 'invoiceDate', transform: 'date', confidence: 0.85, sampleValues: ['02/01/2026', '02/15/2026', '03/01/2026'] },
      { sourceField: 'Amount', targetField: 'amount', transform: 'number', confidence: 0.92, sampleValues: ['$50,000.00', '$25,000.00', '$75,000.00'] },
      { sourceField: 'Due Date', targetField: 'dueDate', transform: 'date', confidence: 0.88, sampleValues: ['03/01/2026', '03/15/2026', '04/01/2026'] },
    ];

    const targetFields = [
      'vendorId', 'name', 'code', 'invoiceNumber', 'invoiceDate', 'dueDate',
      'amount', 'taxAmount', 'retentionAmount', 'description', 'status',
      'jobId', 'entityId', 'costCode', 'costType',
    ];

    wrapper.appendChild(buildMappingTable(sampleMappings, targetFields));

    const actions = el('div', 'flex justify-between gap-3 mt-4');
    const backBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-raised)]', 'Back');
    actions.appendChild(backBtn);
    const nextBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Next: Validate');
    actions.appendChild(nextBtn);
    wrapper.appendChild(actions);

    container.appendChild(wrapper);
  },
};

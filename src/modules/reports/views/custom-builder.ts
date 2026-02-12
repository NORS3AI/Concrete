/**
 * Custom Report Builder view.
 * Provides a drag-and-drop interface for building custom reports with
 * configurable columns, filters, grouping, and sorting. Allows saving
 * configurations as templates and exporting results.
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

const DATA_SOURCE_OPTIONS = [
  { value: 'gl-accounts', label: 'GL Accounts' },
  { value: 'gl-journal-lines', label: 'Journal Lines' },
  { value: 'ap-invoices', label: 'AP Invoices' },
  { value: 'ar-invoices', label: 'AR Invoices' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'actual-costs', label: 'Actual Costs' },
  { value: 'employees', label: 'Employees' },
  { value: 'pay-checks', label: 'Pay Checks' },
  { value: 'equipment-usage', label: 'Equipment Usage' },
];

const OPERATOR_OPTIONS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater or Equal' },
  { value: '<=', label: 'Less or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnConfig {
  field: string;
  label: string;
  visible: boolean;
}

interface FilterConfig {
  field: string;
  operator: string;
  value: string;
}

interface SortConfig {
  field: string;
  direction: string;
}

// ---------------------------------------------------------------------------
// Data Source Selector
// ---------------------------------------------------------------------------

function buildDataSourceSelector(
  onChange: (dataSource: string) => void,
): HTMLElement {
  const section = el('div', 'mb-6');
  section.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Data Source'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full max-w-xs';
  const select = el('select', inputCls) as HTMLSelectElement;

  const defaultOpt = el('option', '', 'Select a data source...') as HTMLOptionElement;
  defaultOpt.value = '';
  select.appendChild(defaultOpt);

  for (const opt of DATA_SOURCE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }

  select.addEventListener('change', () => {
    onChange(select.value);
  });

  section.appendChild(select);
  return section;
}

// ---------------------------------------------------------------------------
// Column Selector
// ---------------------------------------------------------------------------

function buildColumnSelector(columns: ColumnConfig[]): HTMLElement {
  const section = el('div', 'mb-6');
  section.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-2', 'Columns (drag to reorder)'));

  const list = el('div', 'space-y-1');

  if (columns.length === 0) {
    list.appendChild(el('p', 'text-sm text-[var(--text-muted)] italic', 'Select a data source to see available columns.'));
  }

  for (const column of columns) {
    const item = el('div', 'flex items-center gap-2 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-md cursor-move');
    item.draggable = true;

    const checkbox = el('input') as HTMLInputElement;
    checkbox.type = 'checkbox';
    checkbox.checked = column.visible;
    item.appendChild(checkbox);

    item.appendChild(el('span', 'text-sm text-[var(--text)] flex-1', column.label));

    const grip = el('span', 'text-[var(--text-muted)] text-xs', '::');
    item.appendChild(grip);

    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

// ---------------------------------------------------------------------------
// Filter Builder
// ---------------------------------------------------------------------------

function buildFilterBuilder(filters: FilterConfig[]): HTMLElement {
  const section = el('div', 'mb-6');
  const headerRow = el('div', 'flex items-center justify-between mb-2');
  headerRow.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)]', 'Filters'));

  const addBtn = el('button', 'text-xs text-[var(--accent)] hover:underline', '+ Add Filter');
  headerRow.appendChild(addBtn);
  section.appendChild(headerRow);

  const list = el('div', 'space-y-2');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm text-[var(--text)]';

  if (filters.length === 0) {
    list.appendChild(el('p', 'text-sm text-[var(--text-muted)] italic', 'No filters applied. Click "+ Add Filter" to add conditions.'));
  }

  for (const filter of filters) {
    const row = el('div', 'flex items-center gap-2');

    const fieldInput = el('input', inputCls) as HTMLInputElement;
    fieldInput.value = filter.field;
    fieldInput.placeholder = 'Field';
    row.appendChild(fieldInput);

    const opSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of OPERATOR_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      if (opt.value === filter.operator) o.selected = true;
      opSelect.appendChild(o);
    }
    row.appendChild(opSelect);

    const valueInput = el('input', inputCls) as HTMLInputElement;
    valueInput.value = filter.value;
    valueInput.placeholder = 'Value';
    row.appendChild(valueInput);

    const removeBtn = el('button', 'text-red-400 hover:underline text-xs', 'Remove');
    row.appendChild(removeBtn);

    list.appendChild(row);
  }

  section.appendChild(list);
  return section;
}

// ---------------------------------------------------------------------------
// Group By Builder
// ---------------------------------------------------------------------------

function buildGroupByBuilder(groupByFields: string[]): HTMLElement {
  const section = el('div', 'mb-6');
  const headerRow = el('div', 'flex items-center justify-between mb-2');
  headerRow.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)]', 'Group By'));

  const addBtn = el('button', 'text-xs text-[var(--accent)] hover:underline', '+ Add Group');
  headerRow.appendChild(addBtn);
  section.appendChild(headerRow);

  const list = el('div', 'flex flex-wrap gap-2');

  if (groupByFields.length === 0) {
    list.appendChild(el('p', 'text-sm text-[var(--text-muted)] italic', 'No grouping applied.'));
  }

  for (const field of groupByFields) {
    const tag = el('div', 'flex items-center gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs');
    tag.appendChild(el('span', 'text-[var(--text)]', field));
    const removeBtn = el('button', 'text-red-400 hover:text-red-300', 'x');
    tag.appendChild(removeBtn);
    list.appendChild(tag);
  }

  section.appendChild(list);
  return section;
}

// ---------------------------------------------------------------------------
// Sort Builder
// ---------------------------------------------------------------------------

function buildSortBuilder(sorts: SortConfig[]): HTMLElement {
  const section = el('div', 'mb-6');
  const headerRow = el('div', 'flex items-center justify-between mb-2');
  headerRow.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)]', 'Sort By'));

  const addBtn = el('button', 'text-xs text-[var(--accent)] hover:underline', '+ Add Sort');
  headerRow.appendChild(addBtn);
  section.appendChild(headerRow);

  const list = el('div', 'space-y-2');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm text-[var(--text)]';

  if (sorts.length === 0) {
    list.appendChild(el('p', 'text-sm text-[var(--text-muted)] italic', 'No sorting applied.'));
  }

  for (const sort of sorts) {
    const row = el('div', 'flex items-center gap-2');

    const fieldInput = el('input', inputCls) as HTMLInputElement;
    fieldInput.value = sort.field;
    fieldInput.placeholder = 'Field';
    row.appendChild(fieldInput);

    const dirSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of SORT_DIRECTION_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      if (opt.value === sort.direction) o.selected = true;
      dirSelect.appendChild(o);
    }
    row.appendChild(dirSelect);

    const removeBtn = el('button', 'text-red-400 hover:underline text-xs', 'Remove');
    row.appendChild(removeBtn);

    list.appendChild(row);
  }

  section.appendChild(list);
  return section;
}

// ---------------------------------------------------------------------------
// Action Buttons
// ---------------------------------------------------------------------------

function buildActionButtons(): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 pt-4 border-t border-[var(--border)]');

  const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate Report');
  bar.appendChild(generateBtn);

  const saveTemplateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', 'Save as Template');
  bar.appendChild(saveTemplateBtn);

  bar.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Export:'));

  for (const format of ['PDF', 'CSV', 'Excel']) {
    const btn = el('button', 'px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]', format);
    bar.appendChild(btn);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Custom Report Builder'));

    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Reports') as HTMLAnchorElement;
    backLink.href = '#/reports';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Two-column layout: builder on left, preview on right
    const layout = el('div', 'grid grid-cols-1 lg:grid-cols-2 gap-6');

    // Left: Builder panel
    const builderPanel = el('div', 'space-y-0');
    builderPanel.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Report Configuration'));

    builderPanel.appendChild(buildDataSourceSelector((_dataSource) => {
      /* data source change placeholder */
    }));

    builderPanel.appendChild(buildColumnSelector([]));
    builderPanel.appendChild(buildFilterBuilder([]));
    builderPanel.appendChild(buildGroupByBuilder([]));
    builderPanel.appendChild(buildSortBuilder([]));
    builderPanel.appendChild(buildActionButtons());

    layout.appendChild(builderPanel);

    // Right: Preview panel
    const previewPanel = el('div');
    previewPanel.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Report Preview'));

    const previewArea = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
    previewArea.appendChild(el('p', 'text-[var(--text-muted)]', 'Configure the report settings and click "Generate Report" to see a preview.'));
    previewPanel.appendChild(previewArea);

    layout.appendChild(previewPanel);

    wrapper.appendChild(layout);

    container.appendChild(wrapper);
  },
};

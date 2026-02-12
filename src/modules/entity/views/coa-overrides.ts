/**
 * COA Override management view.
 * Entity selector at top. Table of GL accounts with editable override name,
 * excluded checkbox, and default value. Save changes button.
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
// Types
// ---------------------------------------------------------------------------

interface COAOverrideRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  overrideName: string;
  excluded: boolean;
  defaultValue: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]';

// ---------------------------------------------------------------------------
// Entity Selector
// ---------------------------------------------------------------------------

function buildEntitySelector(onChange: (entityId: string) => void): HTMLElement {
  const bar = el('div', 'flex items-center gap-3 mb-4');

  const label = el('label', 'text-sm font-medium text-[var(--text-muted)]', 'Entity');
  bar.appendChild(label);

  const entitySelect = el('select', inputCls) as HTMLSelectElement;
  entitySelect.setAttribute('data-role', 'entity-select');
  const placeholder = el('option', '', 'Select an entity...') as HTMLOptionElement;
  placeholder.value = '';
  entitySelect.appendChild(placeholder);
  bar.appendChild(entitySelect);

  entitySelect.addEventListener('change', () => onChange(entitySelect.value));

  return bar;
}

// ---------------------------------------------------------------------------
// Overrides Table
// ---------------------------------------------------------------------------

function buildTable(rows: COAOverrideRow[]): HTMLElement {
  const tableWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  // thead
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Account #', 'Account Name', 'Type', 'Override Name', 'Excluded', 'Default Value']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = el('tbody');
  tbody.setAttribute('data-role', 'override-rows');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'Select an entity to view and edit COA overrides.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.setAttribute('data-account-id', row.accountId);

    // Account Number
    tr.appendChild(el('td', 'py-2 px-3 font-mono', row.accountNumber));

    // Account Name
    tr.appendChild(el('td', 'py-2 px-3', row.accountName));

    // Type
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.accountType));

    // Override Name (editable)
    const tdOverride = el('td', 'py-2 px-3');
    const overrideInput = el('input', 'w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]') as HTMLInputElement;
    overrideInput.type = 'text';
    overrideInput.name = `override_${row.accountId}`;
    overrideInput.value = row.overrideName;
    overrideInput.placeholder = row.accountName;
    tdOverride.appendChild(overrideInput);
    tr.appendChild(tdOverride);

    // Excluded (checkbox)
    const tdExcluded = el('td', 'py-2 px-3');
    const excludedCb = document.createElement('input');
    excludedCb.type = 'checkbox';
    excludedCb.name = `excluded_${row.accountId}`;
    excludedCb.checked = row.excluded;
    excludedCb.className = 'rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]';
    tdExcluded.appendChild(excludedCb);
    tr.appendChild(tdExcluded);

    // Default Value (editable)
    const tdDefault = el('td', 'py-2 px-3');
    const defaultInput = el('input', 'w-24 bg-transparent border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text)] text-right font-mono focus:outline-none focus:border-[var(--accent)]') as HTMLInputElement;
    defaultInput.type = 'text';
    defaultInput.name = `default_${row.accountId}`;
    defaultInput.value = row.defaultValue;
    defaultInput.placeholder = '0.00';
    tdDefault.appendChild(defaultInput);
    tr.appendChild(tdDefault);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  return tableWrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'space-y-0');

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'COA Overrides'));

    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Changes');
    saveBtn.type = 'button';
    saveBtn.setAttribute('data-role', 'save-overrides');
    saveBtn.addEventListener('click', () => { /* save handler placeholder */ });
    headerRow.appendChild(saveBtn);
    wrapper.appendChild(headerRow);

    // Description
    wrapper.appendChild(
      el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Override account names, exclude accounts from reporting, or set default values per entity. Changes apply only to the selected entity.'),
    );

    // Entity selector
    wrapper.appendChild(buildEntitySelector((_entityId) => { /* entity change handler placeholder */ }));

    // Table (empty shell -- service populates later)
    const rows: COAOverrideRow[] = [];
    wrapper.appendChild(buildTable(rows));

    container.appendChild(wrapper);
  },
};

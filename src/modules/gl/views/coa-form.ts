/**
 * Chart of Accounts form view — create / edit an account.
 * If the route contains an :id segment the form loads existing data.
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

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'costOfRevenue';

const ACCOUNT_TYPES: Array<{ value: AccountType; label: string }> = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'costOfRevenue', label: 'Cost of Revenue' },
];

const NORMAL_BALANCE_MAP: Record<AccountType, 'Debit' | 'Credit'> = {
  asset: 'Debit',
  liability: 'Credit',
  equity: 'Credit',
  revenue: 'Credit',
  expense: 'Debit',
  costOfRevenue: 'Debit',
};

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]';

function fieldGroup(labelText: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', 'flex flex-col gap-1');
  const label = el('label', 'text-sm font-medium text-[var(--text-muted)]', labelText);
  group.appendChild(label);
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', inputCls) as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: Array<{ value: string; label: string }>, includeBlank?: string): HTMLSelectElement {
  const select = el('select', inputCls) as HTMLSelectElement;
  select.name = name;
  if (includeBlank) {
    const blankOpt = el('option', '', includeBlank) as HTMLOptionElement;
    blankOpt.value = '';
    select.appendChild(blankOpt);
  }
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

function checkboxField(name: string, labelText: string, checked: boolean): HTMLElement {
  const row = el('label', 'flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.name = name;
  cb.checked = checked;
  cb.className = 'rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]';
  row.appendChild(cb);
  const span = el('span', '', labelText);
  row.appendChild(span);
  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    // Determine if editing (route param will be wired later)
    const isEdit = window.location.hash.match(/\/gl\/accounts\/(?!new)([^/]+)/);
    const accountId = isEdit ? isEdit[1] : null;

    const wrapper = el('div', 'max-w-2xl mx-auto');

    // Page title
    const title = el('h1', 'text-2xl font-bold text-[var(--text)] mb-6', accountId ? 'Edit Account' : 'New Account');
    wrapper.appendChild(title);

    // Form card
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-5');
    form.setAttribute('data-role', 'account-form');

    // Account Number
    const numberInput = textInput('number', 'e.g. 1000');
    form.appendChild(fieldGroup('Account Number', numberInput));

    // Account Name
    const nameInput = textInput('name', 'e.g. Cash');
    form.appendChild(fieldGroup('Account Name', nameInput));

    // Type select
    const typeSelect = selectInput('type', ACCOUNT_TYPES, 'Select type...');
    form.appendChild(fieldGroup('Type', typeSelect));

    // Normal Balance (read-only, auto-inferred)
    const normalBalanceDisplay = el('input', inputCls) as HTMLInputElement;
    normalBalanceDisplay.type = 'text';
    normalBalanceDisplay.name = 'normalBalance';
    normalBalanceDisplay.readOnly = true;
    normalBalanceDisplay.value = '';
    normalBalanceDisplay.placeholder = 'Auto-inferred from type';
    normalBalanceDisplay.classList.add('opacity-70', 'cursor-not-allowed');
    form.appendChild(fieldGroup('Normal Balance', normalBalanceDisplay));

    // Update normal balance when type changes
    typeSelect.addEventListener('change', () => {
      const t = typeSelect.value as AccountType;
      normalBalanceDisplay.value = t ? NORMAL_BALANCE_MAP[t] : '';
    });

    // Parent Account select (placeholder — populated by service)
    const parentSelect = selectInput('parentId', [], 'None (top-level)');
    parentSelect.setAttribute('data-role', 'parent-select');
    form.appendChild(fieldGroup('Parent Account', parentSelect));

    // Description
    const descArea = el('textarea', inputCls) as HTMLTextAreaElement;
    descArea.name = 'description';
    descArea.rows = 3;
    descArea.placeholder = 'Optional description...';
    form.appendChild(fieldGroup('Description', descArea));

    // Checkboxes row
    const checkRow = el('div', 'flex items-center gap-6');
    checkRow.appendChild(checkboxField('isActive', 'Active', true));
    checkRow.appendChild(checkboxField('isSummary', 'Summary Account', false));
    form.appendChild(checkRow);

    // Buttons
    const btnRow = el('div', 'flex items-center gap-3 pt-4 border-t border-[var(--border)]');

    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveBtn.type = 'submit';
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/gl/accounts';
    btnRow.appendChild(cancelBtn);

    form.appendChild(btnRow);

    // Form submit handler placeholder
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Service wiring will handle actual save
    });

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

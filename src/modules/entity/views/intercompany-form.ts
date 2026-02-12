/**
 * Intercompany transaction create form view.
 * Fields: From Entity, To Entity, Date, Amount, Description, Reference.
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

const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]';

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

function fieldGroup(labelText: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', 'flex flex-col gap-1');
  const label = el('label', 'text-sm font-medium text-[var(--text-muted)]', labelText);
  group.appendChild(label);
  group.appendChild(inputEl);
  return group;
}

function selectInput(name: string, includeBlank?: string): HTMLSelectElement {
  const select = el('select', inputCls) as HTMLSelectElement;
  select.name = name;
  if (includeBlank) {
    const blankOpt = el('option', '', includeBlank) as HTMLOptionElement;
    blankOpt.value = '';
    select.appendChild(blankOpt);
  }
  return select;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', inputCls) as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', 'max-w-2xl mx-auto');

    // Page title
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-6', 'New Intercompany Transaction'));

    // Form card
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-5');
    form.setAttribute('data-role', 'ic-form');

    // From Entity
    const fromSelect = selectInput('fromEntityId', 'Select source entity...');
    fromSelect.setAttribute('data-role', 'from-entity');
    form.appendChild(fieldGroup('From Entity', fromSelect));

    // To Entity
    const toSelect = selectInput('toEntityId', 'Select target entity...');
    toSelect.setAttribute('data-role', 'to-entity');
    form.appendChild(fieldGroup('To Entity', toSelect));

    // Date
    const dateInput = el('input', inputCls) as HTMLInputElement;
    dateInput.type = 'date';
    dateInput.name = 'date';
    dateInput.value = new Date().toISOString().split('T')[0];
    form.appendChild(fieldGroup('Date', dateInput));

    // Amount
    const amountInput = el('input', inputCls) as HTMLInputElement;
    amountInput.type = 'number';
    amountInput.name = 'amount';
    amountInput.step = '0.01';
    amountInput.min = '0';
    amountInput.placeholder = '0.00';
    form.appendChild(fieldGroup('Amount', amountInput));

    // Description
    const descArea = el('textarea', inputCls) as HTMLTextAreaElement;
    descArea.name = 'description';
    descArea.rows = 3;
    descArea.placeholder = 'Transaction description...';
    form.appendChild(fieldGroup('Description', descArea));

    // Reference
    const refInput = textInput('reference', 'e.g. IC-2024-001');
    form.appendChild(fieldGroup('Reference', refInput));

    // Buttons
    const btnRow = el('div', 'flex items-center gap-3 pt-4 border-t border-[var(--border)]');

    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save');
    saveBtn.type = 'submit';
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/entities/intercompany';
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

/**
 * Journal Entry create / edit form view.
 * Header fields, dynamic line items table, running totals, and balance indicator.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]';

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function fieldGroup(labelText: string, inputEl: HTMLElement, inline?: boolean): HTMLElement {
  const group = el('div', inline ? 'flex flex-col gap-1 flex-1' : 'flex flex-col gap-1');
  const label = el('label', 'text-sm font-medium text-[var(--text-muted)]', labelText);
  group.appendChild(label);
  group.appendChild(inputEl);
  return group;
}

// ---------------------------------------------------------------------------
// Totals & balance indicator
// ---------------------------------------------------------------------------

function updateTotals(linesBody: HTMLElement, debitTotal: HTMLElement, creditTotal: HTMLElement, balanceIndicator: HTMLElement): void {
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = linesBody.querySelectorAll('tr[data-line]');
  rows.forEach((row) => {
    const debitInput = row.querySelector('input[name="lineDebit"]') as HTMLInputElement | null;
    const creditInput = row.querySelector('input[name="lineCredit"]') as HTMLInputElement | null;
    totalDebit += parseFloat(debitInput?.value || '0') || 0;
    totalCredit += parseFloat(creditInput?.value || '0') || 0;
  });

  debitTotal.textContent = fmtCurrency(totalDebit);
  creditTotal.textContent = fmtCurrency(totalCredit);

  const diff = Math.abs(totalDebit - totalCredit);
  if (diff < 0.005) {
    balanceIndicator.textContent = 'Balanced';
    balanceIndicator.className = 'text-sm font-medium text-[var(--positive)]';
  } else {
    balanceIndicator.textContent = `Out of balance by ${fmtCurrency(diff)}`;
    balanceIndicator.className = 'text-sm font-medium text-[var(--negative)]';
  }
}

// ---------------------------------------------------------------------------
// Line row builder
// ---------------------------------------------------------------------------

function buildLineRow(
  lineNum: number,
  linesBody: HTMLElement,
  debitTotal: HTMLElement,
  creditTotal: HTMLElement,
  balanceIndicator: HTMLElement,
): HTMLTableRowElement {
  const tr = el('tr', 'border-b border-[var(--border)]') as HTMLTableRowElement;
  tr.setAttribute('data-line', String(lineNum));

  // Line #
  tr.appendChild(el('td', 'py-2 px-2 text-center text-[var(--text-muted)] text-xs', String(lineNum)));

  // Account select (placeholder — service populates options later)
  const tdAccount = el('td', 'py-2 px-2');
  const accountSelect = el('select', `${inputCls} w-full`) as HTMLSelectElement;
  accountSelect.name = 'lineAccount';
  const defaultOpt = el('option', '', 'Select account...') as HTMLOptionElement;
  defaultOpt.value = '';
  accountSelect.appendChild(defaultOpt);
  accountSelect.setAttribute('data-role', 'line-account');
  tdAccount.appendChild(accountSelect);
  tr.appendChild(tdAccount);

  // Description
  const tdDesc = el('td', 'py-2 px-2');
  const descInput = el('input', `${inputCls} w-full`) as HTMLInputElement;
  descInput.type = 'text';
  descInput.name = 'lineDescription';
  descInput.placeholder = 'Line description';
  tdDesc.appendChild(descInput);
  tr.appendChild(tdDesc);

  // Debit
  const tdDebit = el('td', 'py-2 px-2');
  const debitInput = el('input', `${inputCls} w-24 text-right`) as HTMLInputElement;
  debitInput.type = 'number';
  debitInput.name = 'lineDebit';
  debitInput.step = '0.01';
  debitInput.min = '0';
  debitInput.placeholder = '0.00';
  debitInput.addEventListener('input', () => {
    if (parseFloat(debitInput.value) > 0) {
      creditInput.value = '';
    }
    updateTotals(linesBody, debitTotal, creditTotal, balanceIndicator);
  });
  tdDebit.appendChild(debitInput);
  tr.appendChild(tdDebit);

  // Credit
  const tdCredit = el('td', 'py-2 px-2');
  const creditInput = el('input', `${inputCls} w-24 text-right`) as HTMLInputElement;
  creditInput.type = 'number';
  creditInput.name = 'lineCredit';
  creditInput.step = '0.01';
  creditInput.min = '0';
  creditInput.placeholder = '0.00';
  creditInput.addEventListener('input', () => {
    if (parseFloat(creditInput.value) > 0) {
      debitInput.value = '';
    }
    updateTotals(linesBody, debitTotal, creditTotal, balanceIndicator);
  });
  tdCredit.appendChild(creditInput);
  tr.appendChild(tdCredit);

  // Remove button
  const tdRemove = el('td', 'py-2 px-2 text-center');
  const removeBtn = el('button', 'text-[var(--text-muted)] hover:text-[var(--negative)] text-sm', 'Remove');
  removeBtn.type = 'button';
  removeBtn.addEventListener('click', () => {
    tr.remove();
    updateTotals(linesBody, debitTotal, creditTotal, balanceIndicator);
  });
  tdRemove.appendChild(removeBtn);
  tr.appendChild(tdRemove);

  return tr;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const isEdit = window.location.hash.match(/\/gl\/journal\/(?!new)([^/]+)/);
    const entryId = isEdit ? isEdit[1] : null;

    const wrapper = el('div', 'max-w-4xl mx-auto');

    // Title
    const title = el('h1', 'text-2xl font-bold text-[var(--text)] mb-6', entryId ? 'Edit Journal Entry' : 'New Journal Entry');
    wrapper.appendChild(title);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');
    form.setAttribute('data-role', 'je-form');

    // ---- Header fields ----
    const headerRow = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

    const dateInput = el('input', inputCls) as HTMLInputElement;
    dateInput.type = 'date';
    dateInput.name = 'date';
    dateInput.value = new Date().toISOString().split('T')[0];
    headerRow.appendChild(fieldGroup('Date', dateInput, true));

    const refInput = el('input', inputCls) as HTMLInputElement;
    refInput.type = 'text';
    refInput.name = 'reference';
    refInput.placeholder = 'e.g. INV-001';
    headerRow.appendChild(fieldGroup('Reference', refInput, true));

    const descInput = el('input', inputCls) as HTMLInputElement;
    descInput.type = 'text';
    descInput.name = 'description';
    descInput.placeholder = 'Entry description';
    headerRow.appendChild(fieldGroup('Description', descInput, true));

    form.appendChild(headerRow);

    // ---- Lines table ----
    const linesSection = el('div', 'space-y-3');
    const linesHeader = el('div', 'flex items-center justify-between');
    linesHeader.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', 'Lines'));

    const addLineBtn = el('button', 'px-3 py-1 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Line');
    addLineBtn.type = 'button';
    linesHeader.appendChild(addLineBtn);
    linesSection.appendChild(linesHeader);

    const tableWrap = el('div', 'border border-[var(--border)] rounded-lg overflow-hidden');
    const table = el('table', 'w-full text-sm');

    // Lines thead
    const thead = el('thead');
    const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
    for (const col of ['#', 'Account', 'Description', 'Debit', 'Credit', '']) {
      headRow.appendChild(el('th', 'py-2 px-2 font-medium', col));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const linesBody = el('tbody');
    linesBody.setAttribute('data-role', 'je-lines');
    table.appendChild(linesBody);

    // Totals tfoot
    const tfoot = el('tfoot');
    const footRow = el('tr', 'border-t-2 border-[var(--border)] font-semibold');
    footRow.appendChild(el('td', 'py-2 px-2'));
    footRow.appendChild(el('td', 'py-2 px-2'));
    footRow.appendChild(el('td', 'py-2 px-2 text-right text-[var(--text-muted)]', 'Totals'));

    const debitTotal = el('td', 'py-2 px-2 text-right font-mono', fmtCurrency(0));
    footRow.appendChild(debitTotal);
    const creditTotal = el('td', 'py-2 px-2 text-right font-mono', fmtCurrency(0));
    footRow.appendChild(creditTotal);
    footRow.appendChild(el('td', 'py-2 px-2'));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);

    tableWrap.appendChild(table);
    linesSection.appendChild(tableWrap);

    // Balance indicator
    const balanceIndicator = el('div', 'text-sm font-medium text-[var(--positive)]', 'Balanced');
    linesSection.appendChild(balanceIndicator);

    form.appendChild(linesSection);

    // Line counter
    let lineCount = 0;

    // Add initial two lines
    const addLine = () => {
      lineCount++;
      const row = buildLineRow(lineCount, linesBody, debitTotal, creditTotal, balanceIndicator);
      linesBody.appendChild(row);
    };
    addLine();
    addLine();

    addLineBtn.addEventListener('click', addLine);

    // ---- Action buttons ----
    const btnRow = el('div', 'flex items-center gap-3 pt-4 border-t border-[var(--border)]');

    const saveDraftBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] border border-[var(--border)]', 'Save as Draft');
    saveDraftBtn.type = 'button';
    saveDraftBtn.addEventListener('click', () => {
      // Service wiring handles save
    });
    btnRow.appendChild(saveDraftBtn);

    const postBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Post');
    postBtn.type = 'submit';
    btnRow.appendChild(postBtn);

    const cancelLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]', 'Cancel') as HTMLAnchorElement;
    cancelLink.href = '#/gl/journal';
    btnRow.appendChild(cancelLink);

    form.appendChild(btnRow);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Service wiring handles post
    });

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

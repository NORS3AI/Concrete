/**
 * Workers' Compensation Class Codes view.
 * CRUD table for WC class codes with rates, state codes, and effective dates.
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

interface WCCodeRow {
  id: string;
  classCode: string;
  description: string;
  rate: number;
  stateCode: string;
  effectiveDate: string;
  expirationDate: string;
}

// ---------------------------------------------------------------------------
// New WC Code Form
// ---------------------------------------------------------------------------

function buildNewForm(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add WC Class Code'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.placeholder = 'Class Code (e.g., 5403)';
  codeInput.name = 'classCode';
  grid.appendChild(codeInput);

  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.placeholder = 'Description';
  descInput.name = 'description';
  grid.appendChild(descInput);

  const rateInput = el('input', inputCls) as HTMLInputElement;
  rateInput.type = 'number';
  rateInput.step = '0.01';
  rateInput.placeholder = 'Rate per $100';
  rateInput.name = 'rate';
  grid.appendChild(rateInput);

  const stateInput = el('input', inputCls) as HTMLInputElement;
  stateInput.placeholder = 'State Code (e.g., CA)';
  stateInput.name = 'stateCode';
  grid.appendChild(stateInput);

  const effDateInput = el('input', inputCls) as HTMLInputElement;
  effDateInput.type = 'date';
  effDateInput.name = 'effectiveDate';
  effDateInput.title = 'Effective Date';
  grid.appendChild(effDateInput);

  const expDateInput = el('input', inputCls) as HTMLInputElement;
  expDateInput.type = 'date';
  expDateInput.name = 'expirationDate';
  expDateInput.title = 'Expiration Date';
  grid.appendChild(expDateInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Code');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => { /* add placeholder */ });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(codes: WCCodeRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Class Code', 'Description', 'Rate/$100', 'State', 'Effective', 'Expiration', 'Actions']) {
    const align = col === 'Rate/$100' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (codes.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No WC class codes configured. Add one above to get started.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const code of codes) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', code.classCode));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', code.rate.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.stateCode));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.effectiveDate || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.expirationDate || '-'));

    const tdActions = el('td', 'py-2 px-3 flex gap-2');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    editBtn.addEventListener('click', () => { /* edit placeholder */ });
    tdActions.appendChild(editBtn);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => { /* delete placeholder */ });
    tdActions.appendChild(deleteBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Workers\' Compensation Class Codes'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildNewForm());

    const codes: WCCodeRow[] = [];
    wrapper.appendChild(buildTable(codes));

    container.appendChild(wrapper);
  },
};

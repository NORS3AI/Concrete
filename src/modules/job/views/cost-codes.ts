/**
 * Cost Code master list view.
 * Hierarchical table with indentation, standard badge, and add-code form.
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

interface CostCodeRow {
  id: string;
  code: string;
  description: string;
  depth: number;
  isStandard: boolean;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(codes: CostCodeRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden mb-4');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Code', 'Description', 'Standard', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (codes.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No cost codes defined. Add your first cost code below.');
    td.setAttribute('colspan', '4');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const code of codes) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Code with hierarchical indentation
    const tdCode = el('td', 'py-2 px-3 font-mono');
    const codeSpan = el('span');
    codeSpan.style.paddingLeft = `${code.depth * 1.25}rem`;
    codeSpan.textContent = code.code;
    tdCode.appendChild(codeSpan);
    tr.appendChild(tdCode);

    // Description with indentation
    const tdDesc = el('td', 'py-2 px-3');
    const descSpan = el('span');
    descSpan.style.paddingLeft = `${code.depth * 1.25}rem`;
    descSpan.textContent = code.description;
    tdDesc.appendChild(descSpan);
    tr.appendChild(tdDesc);

    // Standard badge
    const tdStd = el('td', 'py-2 px-3');
    if (code.isStandard) {
      const badge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', 'Standard');
      tdStd.appendChild(badge);
    }
    tr.appendChild(tdStd);

    // Actions
    const tdActions = el('td', 'py-2 px-3');
    const deleteBtn = el('button', 'text-xs text-red-400 hover:text-red-300', 'Delete');
    deleteBtn.type = 'button';
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
// Add Code Form
// ---------------------------------------------------------------------------

function buildAddForm(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add Cost Code'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.type = 'text';
  codeInput.placeholder = 'Code (e.g. 01-100)';
  codeInput.name = 'code';
  grid.appendChild(codeInput);

  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.placeholder = 'Description';
  descInput.name = 'description';
  grid.appendChild(descInput);

  const parentInput = el('input', inputCls) as HTMLInputElement;
  parentInput.type = 'text';
  parentInput.placeholder = 'Parent Code (optional)';
  parentInput.name = 'parentId';
  grid.appendChild(parentInput);

  const stdGroup = el('div', 'flex items-center gap-2');
  const stdCheck = el('input', '') as HTMLInputElement;
  stdCheck.type = 'checkbox';
  stdCheck.name = 'isStandard';
  stdCheck.id = 'isStandard';
  stdGroup.appendChild(stdCheck);
  const stdLabel = el('label', 'text-sm text-[var(--text)]', 'Standard') as HTMLLabelElement;
  stdLabel.htmlFor = 'isStandard';
  stdGroup.appendChild(stdLabel);
  grid.appendChild(stdGroup);

  card.appendChild(grid);

  const addBtn = el('button', 'mt-3 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Code');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => { /* add code placeholder */ });
  card.appendChild(addBtn);

  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Cost Codes'));
    wrapper.appendChild(headerRow);

    const codes: CostCodeRow[] = [];
    wrapper.appendChild(buildTable(codes));
    wrapper.appendChild(buildAddForm());

    container.appendChild(wrapper);
  },
};

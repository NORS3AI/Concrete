/**
 * Budget Transfer view.
 * Displays the estimate-to-budget transfer preview and confirmation,
 * showing how estimate lines will map to budget lines by cost code
 * and cost type.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransferLineRow {
  costCodeId: string;
  costType: string;
  description: string;
  amount: number;
  quantity: number;
  unitCost: number;
}

interface TransferPreview {
  estimateId: string;
  jobId: string;
  budgetName: string;
  totalAmount: number;
  lines: TransferLineRow[];
}

// ---------------------------------------------------------------------------
// Transfer Preview
// ---------------------------------------------------------------------------

function buildPreviewCard(preview: TransferPreview | null): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  if (!preview) {
    card.appendChild(
      el('div', 'text-center py-8 text-[var(--text-muted)]', 'No transfer preview available. Select a winning estimate to transfer.'),
    );
    return card;
  }

  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Transfer Preview'));

  // Summary info
  const infoGrid = el('div', 'grid grid-cols-3 gap-4 mb-6');

  const nameCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  nameCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Budget Name'));
  nameCard.appendChild(el('div', 'text-sm font-medium text-[var(--text)] mt-1', preview.budgetName));
  infoGrid.appendChild(nameCard);

  const linesCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  linesCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Budget Lines'));
  linesCard.appendChild(el('div', 'text-sm font-medium text-[var(--text)] mt-1', String(preview.lines.length)));
  infoGrid.appendChild(linesCard);

  const totalCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  totalCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Budget Amount'));
  totalCard.appendChild(el('div', 'text-lg font-bold text-emerald-400 mt-1 font-mono', fmtCurrency(preview.totalAmount)));
  infoGrid.appendChild(totalCard);

  card.appendChild(infoGrid);

  // Lines table
  const table = el('table', 'w-full text-sm');
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Cost Code', 'Cost Type', 'Description', 'Quantity', 'Unit Cost', 'Amount']) {
    const align = ['Quantity', 'Unit Cost', 'Amount'].includes(col) ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const line of preview.lines) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', line.costCodeId || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', line.costType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', line.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', String(line.quantity)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.unitCost)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono font-semibold', fmtCurrency(line.amount)));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  card.appendChild(table);

  // Action buttons
  const btnRow = el('div', 'flex items-center gap-3 mt-6');
  const confirmBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Confirm Transfer');
  confirmBtn.addEventListener('click', () => { /* confirm transfer placeholder */ });
  btnRow.appendChild(confirmBtn);

  const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
  cancelBtn.href = '#/estimating';
  btnRow.appendChild(cancelBtn);
  card.appendChild(btnRow);

  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Estimate to Budget Transfer'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Estimates') as HTMLAnchorElement;
    backLink.href = '#/estimating';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildPreviewCard(null));

    container.appendChild(wrapper);
  },
};

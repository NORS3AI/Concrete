/**
 * Budget Transfer view.
 * Displays the estimate-to-budget transfer preview and confirmation,
 * showing how estimate lines will map to budget lines by cost code
 * and cost type.
 */

import { getEstimatingService } from '../service-accessor';

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransferLineRow {
  costCodeId?: string;
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
// Parse estimate ID from URL hash
// ---------------------------------------------------------------------------

function getEstimateIdFromHash(): string | null {
  const hash = window.location.hash;

  // Try path pattern: #/estimating/budget-transfer/abc123
  const pathMatch = hash.match(/#\/estimating\/budget-transfer\/([^/?]+)/);
  if (pathMatch) return pathMatch[1];

  // Try generic: #/estimating/abc123
  const genericMatch = hash.match(/#\/estimating\/([^/?]+)/);
  if (genericMatch && genericMatch[1] !== 'budget-transfer' && genericMatch[1] !== 'cost-history' && genericMatch[1] !== 'win-loss') {
    return genericMatch[1];
  }

  // Try query param: ?estimateId=abc123
  const paramMatch = hash.match(/[?&]estimateId=([^&]+)/);
  if (paramMatch) return paramMatch[1];

  return null;
}

// ---------------------------------------------------------------------------
// Estimate Selector (when no estimateId in URL)
// ---------------------------------------------------------------------------

async function buildEstimateSelector(
  wrapper: HTMLElement,
  onSelect: (estimateId: string) => void,
): Promise<HTMLElement> {
  const svc = getEstimatingService();
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Select an Estimate to Transfer'));
  card.appendChild(
    el('p', 'text-sm text-[var(--text-muted)] mb-4', 'Choose a won estimate that has not yet been transferred to a budget.'),
  );

  try {
    const estimates = await svc.getEstimates({ status: 'won' });
    const transferable = estimates.filter((e) => !e.transferredToBudget);

    if (transferable.length === 0) {
      card.appendChild(
        el('div', 'text-center py-8 text-[var(--text-muted)]', 'No won estimates available for transfer. Win an estimate first, then transfer it to a budget.'),
      );
      return card;
    }

    const selectCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
    const select = el('select', selectCls) as HTMLSelectElement;

    const defaultOpt = el('option', '', '-- Select an estimate --') as HTMLOptionElement;
    defaultOpt.value = '';
    select.appendChild(defaultOpt);

    for (const est of transferable) {
      const opt = el('option', '', `${est.name} (Rev ${est.revision}) — ${est.clientName ?? est.jobId} — ${fmtCurrency(est.totalPrice)}`) as HTMLOptionElement;
      opt.value = est.id;
      select.appendChild(opt);
    }

    card.appendChild(select);

    const btnRow = el('div', 'flex items-center gap-3 mt-4');
    const loadBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Load Transfer Preview');
    loadBtn.addEventListener('click', () => {
      if (select.value) {
        onSelect(select.value);
      }
    });
    btnRow.appendChild(loadBtn);
    card.appendChild(btnRow);
  } catch (err) {
    card.appendChild(
      el('div', 'text-center py-8 text-red-400', `Error loading estimates: ${(err as Error).message}`),
    );
  }

  return card;
}

// ---------------------------------------------------------------------------
// Transfer Preview Card
// ---------------------------------------------------------------------------

function buildPreviewCard(
  preview: TransferPreview,
  wrapper: HTMLElement,
  onConfirm: () => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Transfer Preview'));

  // Summary info grid
  const infoGrid = el('div', 'grid grid-cols-4 gap-4 mb-6');

  const nameCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  nameCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Budget Name'));
  nameCard.appendChild(el('div', 'text-sm font-medium text-[var(--text)] mt-1', preview.budgetName));
  infoGrid.appendChild(nameCard);

  const jobCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  jobCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Job ID'));
  jobCard.appendChild(el('div', 'text-sm font-medium text-[var(--text)] mt-1', preview.jobId));
  infoGrid.appendChild(jobCard);

  const totalCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  totalCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Budget Amount'));
  totalCard.appendChild(el('div', 'text-lg font-bold text-emerald-400 mt-1 font-mono', fmtCurrency(preview.totalAmount)));
  infoGrid.appendChild(totalCard);

  const linesCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
  linesCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Number of Budget Lines'));
  linesCard.appendChild(el('div', 'text-sm font-medium text-[var(--text)] mt-1', String(preview.lines.length)));
  infoGrid.appendChild(linesCard);

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
  confirmBtn.addEventListener('click', () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Transferring...';
    onConfirm();
  });
  btnRow.appendChild(confirmBtn);

  const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
  cancelBtn.href = '#/estimating';
  btnRow.appendChild(cancelBtn);

  card.appendChild(btnRow);

  return card;
}

// ---------------------------------------------------------------------------
// Load and show transfer preview for an estimate
// ---------------------------------------------------------------------------

async function loadTransferPreview(estimateId: string, wrapper: HTMLElement): Promise<void> {
  const svc = getEstimatingService();

  try {
    // Check if already transferred
    const estimate = await svc.getEstimate(estimateId);
    if (!estimate) {
      showMsg(wrapper, `Estimate not found: ${estimateId}`, true);
      return;
    }

    if (estimate.transferredToBudget) {
      showMsg(wrapper, `This estimate has already been transferred to budget "${estimate.budgetId}".`, true);
      return;
    }

    const preview = await svc.prepareEstimateToBudgetTransfer(estimateId);

    // Remove any existing preview/selector content (keep header)
    const existingContent = wrapper.querySelector('[data-transfer-content]');
    if (existingContent) existingContent.remove();

    const contentWrap = el('div');
    contentWrap.setAttribute('data-transfer-content', '1');

    const previewCard = buildPreviewCard(preview, wrapper, async () => {
      try {
        const budgetId = `budget-${Date.now()}`;
        await svc.markAsTransferred(estimateId, budgetId);
        showMsg(wrapper, `Transfer complete! Budget "${preview.budgetName}" created with ID ${budgetId}.`, false);
        // Navigate back to estimate list after a brief delay
        setTimeout(() => {
          window.location.hash = '#/estimating';
        }, 2000);
      } catch (err) {
        showMsg(wrapper, `Transfer failed: ${(err as Error).message}`, true);
      }
    });

    contentWrap.appendChild(previewCard);
    wrapper.appendChild(contentWrap);
  } catch (err) {
    showMsg(wrapper, `Error loading transfer preview: ${(err as Error).message}`, true);
  }
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

    container.appendChild(wrapper);

    const estimateId = getEstimateIdFromHash();

    if (estimateId) {
      // Load preview directly for the given estimate
      loadTransferPreview(estimateId, wrapper);
    } else {
      // Show selector to pick an estimate
      const contentWrap = el('div');
      contentWrap.setAttribute('data-transfer-content', '1');
      wrapper.appendChild(contentWrap);

      buildEstimateSelector(wrapper, (selectedId: string) => {
        // Remove the selector
        const existing = wrapper.querySelector('[data-transfer-content]');
        if (existing) existing.remove();
        loadTransferPreview(selectedId, wrapper);
      }).then((selectorCard) => {
        contentWrap.appendChild(selectorCard);
      });
    }
  },
};

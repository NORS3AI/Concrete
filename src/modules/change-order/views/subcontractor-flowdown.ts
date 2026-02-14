/**
 * Subcontractor Flow-Down view.
 * Link owner COs to subcontractor COs, track amount distribution.
 */

import { getChangeOrderService } from '../service-accessor';

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

function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const colors: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  const toast = el('div', `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm shadow-lg ${colors[type]}`);
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  executed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  voided: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OwnerCORow {
  id: string;
  number: string;
  title: string;
  amount: number;
  status: string;
  distributedAmount: number;
  remainingAmount: number;
}

interface SubCORow {
  id: string;
  number: string;
  subcontractId: string;
  subcontractName: string;
  amount: number;
  status: string;
  parentCONumber: string;
}

// ---------------------------------------------------------------------------
// Owner COs Table
// ---------------------------------------------------------------------------

function buildOwnerCOsTable(
  rows: OwnerCORow[],
  onFlowDown: (ownerCO: OwnerCORow) => void,
): HTMLElement {
  const section = el('div', 'space-y-3 mb-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Owner Change Orders'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Title', 'Status', 'Amount', 'Distributed', 'Remaining', 'Actions']) {
    const align = ['Amount', 'Distributed', 'Remaining'].includes(col)
      ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No owner change orders found. Create an owner CO to start flowing down changes to subcontractors.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.number) as HTMLAnchorElement;
    link.href = `#/change-orders/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.title));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-emerald-400', fmtCurrency(row.distributedAmount)));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono text-amber-400', fmtCurrency(row.remainingAmount)));

    const tdActions = el('td', 'py-2 px-3');
    const flowDownBtn = el('button', 'px-3 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Flow Down');
    flowDownBtn.type = 'button';
    flowDownBtn.addEventListener('click', () => onFlowDown(row));
    tdActions.appendChild(flowDownBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Sub COs Table
// ---------------------------------------------------------------------------

function buildSubCOsTable(rows: SubCORow[]): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Subcontractor Change Orders'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Subcontractor', 'Parent CO', 'Status', 'Amount']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No subcontractor change orders. Use the "Flow Down" action on an owner CO to create sub COs.');
    td.setAttribute('colspan', '5');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.number) as HTMLAnchorElement;
    link.href = `#/change-orders/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.subcontractName));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', row.parentCONumber));

    const tdStatus = el('td', 'py-2 px-3');
    const statusLabel = row.status.replace('_', ' ');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}`,
      statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Distribution Summary
// ---------------------------------------------------------------------------

function buildDistributionSummary(
  ownerCount: number,
  totalAmount: number,
  distributedAmount: number,
  undistributedAmount: number,
): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-6');
  const grid = el('div', 'grid grid-cols-4 gap-4 text-center');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold font-mono ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  grid.appendChild(buildCard('Owner COs', String(ownerCount), 'text-blue-400'));
  grid.appendChild(buildCard('Total Amount', fmtCurrency(totalAmount), 'text-[var(--text)]'));
  grid.appendChild(buildCard('Distributed', fmtCurrency(distributedAmount), 'text-emerald-400'));
  grid.appendChild(buildCard('Undistributed', fmtCurrency(undistributedAmount), 'text-amber-400'));

  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

async function loadAndRender(container: HTMLElement): Promise<void> {
  const svc = getChangeOrderService();

  // Show loading state
  container.innerHTML = '';
  const loadingEl = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading flow-down data...');
  container.appendChild(loadingEl);

  try {
    // Load owner COs and sub COs
    const ownerCOs = await svc.listChangeOrders({ type: 'owner' });
    const subCOs = await svc.listChangeOrders({ type: 'subcontractor' });

    // Build a map of parentCOId -> sub COs by parsing the sub CO number pattern
    // Sub COs have number like "PARENT-SUB-xxx" and description mentioning the parent
    // We also need to look up parent CO numbers for display
    const ownerIdToNumber = new Map<string, string>();
    for (const oco of ownerCOs) {
      ownerIdToNumber.set(oco.id, oco.number);
    }

    // Group sub COs by their parent (match via number prefix)
    const subCOsByParentId = new Map<string, typeof subCOs>();
    for (const sub of subCOs) {
      // Try to find the parent by matching the sub CO number prefix
      let parentId: string | undefined;
      for (const oco of ownerCOs) {
        if (sub.number.startsWith(oco.number + '-SUB-')) {
          parentId = oco.id;
          break;
        }
      }
      if (parentId) {
        if (!subCOsByParentId.has(parentId)) {
          subCOsByParentId.set(parentId, []);
        }
        subCOsByParentId.get(parentId)!.push(sub);
      }
    }

    // Build owner CO rows with distribution calculations
    const ownerRows: OwnerCORow[] = ownerCOs.map((oco) => {
      const linkedSubs = subCOsByParentId.get(oco.id) ?? [];
      const distributedAmount = linkedSubs.reduce((sum, s) => sum + (s.amount || 0), 0);
      const remainingAmount = (oco.amount || 0) - distributedAmount;
      return {
        id: oco.id,
        number: oco.number,
        title: oco.title,
        amount: oco.amount,
        status: oco.status,
        distributedAmount,
        remainingAmount,
      };
    });

    // Build sub CO rows
    const subRows: SubCORow[] = subCOs.map((sub) => {
      // Extract subcontractId from the number pattern "PARENT-SUB-xxxxxx"
      const parts = sub.number.split('-SUB-');
      const subcontractId = parts.length > 1 ? parts[1] : '';
      const parentNumber = parts.length > 0 ? parts[0] : '';

      // Extract subcontractName from description or title
      const subcontractName = sub.title || sub.description || subcontractId;

      return {
        id: sub.id,
        number: sub.number,
        subcontractId,
        subcontractName,
        amount: sub.amount,
        status: sub.status,
        parentCONumber: parentNumber,
      };
    });

    // Compute summary totals
    const totalAmount = ownerRows.reduce((sum, r) => sum + r.amount, 0);
    const totalDistributed = ownerRows.reduce((sum, r) => sum + r.distributedAmount, 0);
    const totalUndistributed = totalAmount - totalDistributed;

    // Build the UI
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subcontractor Flow-Down'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildDistributionSummary(ownerRows.length, totalAmount, totalDistributed, totalUndistributed));

    const handleFlowDown = async (ownerCO: OwnerCORow) => {
      const subcontractId = prompt('Subcontract ID:');
      if (!subcontractId) {
        showMsg('Subcontract ID is required.', 'error');
        return;
      }

      const subcontractName = prompt('Subcontractor name (optional):') ?? undefined;

      const amountStr = prompt(`Amount to flow down (remaining: ${fmtCurrency(ownerCO.remainingAmount)}):`);
      if (!amountStr) {
        showMsg('Amount is required.', 'error');
        return;
      }
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        showMsg('Please enter a valid positive amount.', 'error');
        return;
      }

      const description = prompt('Description (optional):') ?? undefined;

      try {
        await svc.createSubcontractorCO({
          parentCOId: ownerCO.id,
          subcontractId,
          subcontractName,
          amount,
          description,
        });
        showMsg('Subcontractor CO created successfully.', 'success');
        await loadAndRender(container);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(`Flow-down failed: ${message}`, 'error');
      }
    };

    wrapper.appendChild(buildOwnerCOsTable(ownerRows, handleFlowDown));
    wrapper.appendChild(buildSubCOsTable(subRows));

    container.appendChild(wrapper);
  } catch (err: unknown) {
    container.innerHTML = '';
    const message = err instanceof Error ? err.message : String(err);
    const errorEl = el('div', 'flex items-center justify-center py-12 text-red-400', `Failed to load flow-down data: ${message}`);
    container.appendChild(errorEl);
  }
}

export default {
  render(container: HTMLElement): void {
    loadAndRender(container);
  },
};

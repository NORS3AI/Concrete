/**
 * Change Order Approvals view.
 * Pending approval queue with approve/reject actions and approval chain display.
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

const APPROVAL_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingApprovalRow {
  id: string;
  coNumber: string;
  coTitle: string;
  coType: string;
  amount: number;
  submittedDate: string;
  status: string;
}

interface ApprovalHistoryRow {
  approver: string;
  role: string;
  status: string;
  date: string;
  comments: string;
  sequence: number;
}

// ---------------------------------------------------------------------------
// Pending Approvals Table
// ---------------------------------------------------------------------------

function buildPendingTable(
  rows: PendingApprovalRow[],
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
): HTMLElement {
  const section = el('div', 'space-y-3');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Pending Approvals'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['CO Number', 'Title', 'Type', 'Amount', 'Submitted', 'Actions']) {
    const align = col === 'Amount' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No pending approvals. All change orders are up to date.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdNum = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', row.coNumber) as HTMLAnchorElement;
    link.href = `#/change-orders/${row.id}`;
    tdNum.appendChild(link);
    tr.appendChild(tdNum);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.coTitle));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.coType));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(row.amount)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.submittedDate));

    const tdActions = el('td', 'py-2 px-3');
    const actionsRow = el('div', 'flex items-center gap-2');

    const approveBtn = el('button', 'px-3 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:opacity-90', 'Approve');
    approveBtn.type = 'button';
    approveBtn.addEventListener('click', () => onApprove(row.id));
    actionsRow.appendChild(approveBtn);

    const rejectBtn = el('button', 'px-3 py-1 rounded text-xs font-medium bg-red-600 text-white hover:opacity-90', 'Reject');
    rejectBtn.type = 'button';
    rejectBtn.addEventListener('click', () => onReject(row.id));
    actionsRow.appendChild(rejectBtn);

    tdActions.appendChild(actionsRow);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Approval Chain / History
// ---------------------------------------------------------------------------

function buildApprovalHistory(rows: ApprovalHistoryRow[]): HTMLElement {
  const section = el('div', 'space-y-3 mt-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Recent Approval Activity'));

  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Seq', 'Approver', 'Role', 'Status', 'Date', 'Comments']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No approval history available.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const row of rows) {
    const tr = el('tr', 'border-b border-[var(--border)]');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', String(row.sequence)));
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', row.approver));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.role));

    const tdStatus = el('td', 'py-2 px-3');
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${APPROVAL_STATUS_BADGE[row.status] ?? APPROVAL_STATUS_BADGE.pending}`,
      row.status.charAt(0).toUpperCase() + row.status.slice(1)));
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.date));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', row.comments));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

async function loadAndRender(container: HTMLElement): Promise<void> {
  const svc = getChangeOrderService();

  // Show loading state
  container.innerHTML = '';
  const loadingEl = el('div', 'flex items-center justify-center py-12 text-[var(--text-muted)]', 'Loading approvals...');
  container.appendChild(loadingEl);

  try {
    // Load pending approvals and enrich with CO data
    const pendingApprovals = await svc.getPendingApprovals();

    const pendingRows: PendingApprovalRow[] = [];
    const changeOrderIds = new Set<string>();

    for (const approval of pendingApprovals) {
      changeOrderIds.add(approval.changeOrderId);
      const co = await svc.getChangeOrder(approval.changeOrderId);
      pendingRows.push({
        id: approval.id,
        coNumber: co?.number ?? 'N/A',
        coTitle: co?.title ?? 'Unknown',
        coType: co?.type ?? 'unknown',
        amount: co?.amount ?? 0,
        submittedDate: approval.date ?? '-',
        status: approval.status,
      });
    }

    // Load recent approval history from the approval chains of visible COs
    const historyRows: ApprovalHistoryRow[] = [];
    for (const coId of changeOrderIds) {
      const chain = await svc.getApprovalChain(coId);
      for (const entry of chain) {
        historyRows.push({
          approver: entry.approverId,
          role: entry.approverRole ?? '-',
          status: entry.status,
          date: entry.date ?? '-',
          comments: entry.comments ?? '',
          sequence: entry.sequence,
        });
      }
    }

    // Sort history by date descending
    historyRows.sort((a, b) => b.date.localeCompare(a.date));

    // Build the UI
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Change Order Approvals'));
    wrapper.appendChild(headerRow);

    const handleApprove = async (approvalId: string) => {
      const comments = prompt('Approval comments (optional):');
      try {
        await svc.approve(approvalId, comments ?? undefined);
        showMsg('Change order approved successfully.', 'success');
        await loadAndRender(container);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(`Approve failed: ${message}`, 'error');
      }
    };

    const handleReject = async (approvalId: string) => {
      const comments = prompt('Rejection reason (required):');
      if (!comments) {
        showMsg('Rejection requires a reason.', 'error');
        return;
      }
      try {
        await svc.reject(approvalId, comments);
        showMsg('Change order rejected.', 'success');
        await loadAndRender(container);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(`Reject failed: ${message}`, 'error');
      }
    };

    wrapper.appendChild(buildPendingTable(pendingRows, handleApprove, handleReject));
    wrapper.appendChild(buildApprovalHistory(historyRows));

    container.appendChild(wrapper);
  } catch (err: unknown) {
    container.innerHTML = '';
    const message = err instanceof Error ? err.message : String(err);
    const errorEl = el('div', 'flex items-center justify-center py-12 text-red-400', `Failed to load approvals: ${message}`);
    container.appendChild(errorEl);
  }
}

export default {
  render(container: HTMLElement): void {
    loadAndRender(container);
  },
};

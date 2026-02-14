/**
 * Audit Log view.
 * Audit log viewer with date range filter, user filter, action filter,
 * severity indicator, and CSV export.
 * Wired to AuthService for live data.
 */

import { getAuthService } from '../service-accessor';
import type { AuditSeverity } from '../auth-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
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

function formatDate(iso: string): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_BADGE: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login.success', label: 'Login Success' },
  { value: 'login.failed', label: 'Login Failed' },
  { value: 'logout', label: 'Logout' },
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deactivated', label: 'User Deactivated' },
  { value: 'role.created', label: 'Role Created' },
  { value: 'role.updated', label: 'Role Updated' },
  { value: 'role.deleted', label: 'Role Deleted' },
  { value: 'password.changed', label: 'Password Changed' },
  { value: 'password.reset', label: 'Password Reset' },
  { value: 'mfa.enabled', label: 'MFA Enabled' },
  { value: 'mfa.disabled', label: 'MFA Disabled' },
  { value: 'apikey.created', label: 'API Key Created' },
  { value: 'apikey.revoked', label: 'API Key Revoked' },
  { value: 'settings.updated', label: 'Settings Updated' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severity' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditRow {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  severity: string;
}

// ---------------------------------------------------------------------------
// Filter State
// ---------------------------------------------------------------------------

interface FilterState {
  userFilter: string;
  actionFilter: string;
  severityFilter: string;
  dateFrom: string;
  dateTo: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  state: FilterState,
  onFilter: (state: FilterState) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const userInput = el('input', inputCls) as HTMLInputElement;
  userInput.type = 'text';
  userInput.placeholder = 'Filter by user...';
  userInput.value = state.userFilter;
  bar.appendChild(userInput);

  const actionSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of ACTION_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === state.actionFilter) o.selected = true;
    actionSelect.appendChild(o);
  }
  bar.appendChild(actionSelect);

  const severitySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of SEVERITY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === state.severityFilter) o.selected = true;
    severitySelect.appendChild(o);
  }
  bar.appendChild(severitySelect);

  const fromLabel = el('span', 'text-sm text-[var(--text-muted)]', 'From:');
  bar.appendChild(fromLabel);
  const fromDate = el('input', inputCls) as HTMLInputElement;
  fromDate.type = 'date';
  fromDate.value = state.dateFrom;
  bar.appendChild(fromDate);

  const toLabel = el('span', 'text-sm text-[var(--text-muted)]', 'To:');
  bar.appendChild(toLabel);
  const toDate = el('input', inputCls) as HTMLInputElement;
  toDate.type = 'date';
  toDate.value = state.dateTo;
  bar.appendChild(toDate);

  const fire = () => onFilter({
    userFilter: userInput.value,
    actionFilter: actionSelect.value,
    severityFilter: severitySelect.value,
    dateFrom: fromDate.value,
    dateTo: toDate.value,
  });

  actionSelect.addEventListener('change', fire);
  severitySelect.addEventListener('change', fire);
  userInput.addEventListener('input', fire);
  fromDate.addEventListener('change', fire);
  toDate.addEventListener('change', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(entries: AuditRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Timestamp', 'Severity', 'User', 'Action', 'Resource', 'Details', 'IP Address']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (entries.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No audit log entries found.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entry of entries) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs font-mono whitespace-nowrap', formatDate(entry.timestamp)));

    const tdSeverity = el('td', 'py-2 px-3');
    const severityCls = SEVERITY_BADGE[entry.severity] ?? SEVERITY_BADGE.info;
    tdSeverity.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${severityCls}`,
      entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)));
    tr.appendChild(tdSeverity);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', entry.username || 'System'));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)] text-xs', entry.action));

    const tdResource = el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs');
    tdResource.textContent = entry.resource + (entry.resourceId ? ` #${entry.resourceId.slice(0, 8)}` : '');
    tr.appendChild(tdResource);

    const tdDetails = el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs max-w-[200px] truncate');
    const truncatedDetails = entry.details.length > 80 ? entry.details.slice(0, 80) + '...' : entry.details;
    tdDetails.textContent = truncatedDetails;
    tdDetails.title = entry.details;
    tr.appendChild(tdDetails);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)] text-xs', entry.ipAddress || '-'));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportCSV(entries: AuditRow[]): void {
  const headers = ['Timestamp', 'Severity', 'User', 'Action', 'Resource', 'Resource ID', 'Details', 'IP Address'];

  const escapeCSV = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = entries.map((e) => [
    e.timestamp,
    e.severity,
    e.username,
    e.action,
    e.resource,
    e.resourceId,
    e.details,
    e.ipAddress,
  ].map(escapeCSV).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const svc = getAuthService();

    const wrapper = el('div', 'space-y-0');

    // Filter state
    const filterState: FilterState = {
      userFilter: '',
      actionFilter: '',
      severityFilter: '',
      dateFrom: '',
      dateTo: '',
    };

    // All loaded entries (before client-side filtering)
    let allEntries: AuditRow[] = [];

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Audit Log'));
    const headerRight = el('div', 'flex items-center gap-3');
    const totalLabel = el('span', 'text-sm text-[var(--text-muted)]', '');
    headerRight.appendChild(totalLabel);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export CSV');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => {
      const filtered = applyClientFilters(allEntries, filterState);
      if (filtered.length === 0) {
        showMsg(wrapper, 'No entries to export.', true);
        return;
      }
      exportCSV(filtered);
      showMsg(wrapper, `Exported ${filtered.length} entries.`, false);
    });
    headerRight.appendChild(exportBtn);
    headerRow.appendChild(headerRight);
    wrapper.appendChild(headerRow);

    // Filter bar placeholder
    const filterBarArea = el('div', '');
    wrapper.appendChild(filterBarArea);

    // Content area for table
    const contentArea = el('div', '');
    wrapper.appendChild(contentArea);

    container.appendChild(wrapper);

    // Client-side filtering for user and action (service handles severity + dates)
    function applyClientFilters(entries: AuditRow[], state: FilterState): AuditRow[] {
      let result = entries;

      if (state.userFilter) {
        const term = state.userFilter.toLowerCase();
        result = result.filter((e) => e.username.toLowerCase().includes(term));
      }

      if (state.actionFilter) {
        result = result.filter((e) => e.action === state.actionFilter);
      }

      return result;
    }

    function renderFilterBar(): void {
      filterBarArea.innerHTML = '';
      filterBarArea.appendChild(buildFilterBar(filterState, (newState: FilterState) => {
        const severityChanged = newState.severityFilter !== filterState.severityFilter;
        const dateChanged = newState.dateFrom !== filterState.dateFrom || newState.dateTo !== filterState.dateTo;

        filterState.userFilter = newState.userFilter;
        filterState.actionFilter = newState.actionFilter;
        filterState.severityFilter = newState.severityFilter;
        filterState.dateFrom = newState.dateFrom;
        filterState.dateTo = newState.dateTo;

        // If severity or dates changed, re-fetch from service
        if (severityChanged || dateChanged) {
          loadData();
        } else {
          // Just re-filter client-side
          renderTable();
        }
      }));
    }

    function renderTable(): void {
      const filtered = applyClientFilters(allEntries, filterState);
      contentArea.innerHTML = '';
      contentArea.appendChild(buildTable(filtered));
    }

    async function loadData(): Promise<void> {
      try {
        // Build service filters
        const serviceFilters: {
          severity?: AuditSeverity;
          fromDate?: string;
          toDate?: string;
        } = {};

        if (filterState.severityFilter) {
          serviceFilters.severity = filterState.severityFilter as AuditSeverity;
        }
        if (filterState.dateFrom) {
          serviceFilters.fromDate = new Date(filterState.dateFrom).toISOString();
        }
        if (filterState.dateTo) {
          // End of day for the to-date
          const toDate = new Date(filterState.dateTo);
          toDate.setHours(23, 59, 59, 999);
          serviceFilters.toDate = toDate.toISOString();
        }

        const [entries, totalCount] = await Promise.all([
          svc.getAuditLogs(Object.keys(serviceFilters).length > 0 ? serviceFilters : undefined),
          svc.getAuditLogCount(),
        ]);

        totalLabel.textContent = `${totalCount} total entries`;

        allEntries = entries.map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          username: e.username,
          action: e.action,
          resource: e.resource,
          resourceId: e.resourceId,
          details: e.details,
          ipAddress: e.ipAddress,
          severity: e.severity,
        }));

        renderTable();
      } catch (err: unknown) {
        contentArea.innerHTML = '';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load audit logs.', true);
      }
    }

    renderFilterBar();
    loadData();
  },
};

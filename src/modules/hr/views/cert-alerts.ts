/**
 * Certification Expiration Alerts view.
 * Displays all certifications expiring within 180 days with summary stats,
 * color-coded urgency indicators, and a refresh button.
 * Wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';
import type { CertificationStatus } from '../hr-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-toast]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-toast': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const COLUMNS = [
  'Employee',
  'Certification',
  'Type',
  'Expiration Date',
  'Days Until Expiry',
  'Status',
];

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCertType(type: string): string {
  const labels: Record<string, string> = {
    osha_10: 'OSHA 10',
    osha_30: 'OSHA 30',
    cdl: 'CDL',
    crane: 'Crane',
    confined_space: 'Confined Space',
    first_aid: 'First Aid',
    cpr: 'CPR',
    hazmat: 'HazMat',
    scaffolding: 'Scaffolding',
    rigging: 'Rigging',
    welding: 'Welding',
    electrical: 'Electrical',
    plumbing: 'Plumbing',
    hvac: 'HVAC',
    other: 'Other',
  };
  return labels[type] ?? type;
}

// ---------------------------------------------------------------------------
// Alert Data Type
// ---------------------------------------------------------------------------

interface AlertRow {
  employeeName: string;
  certName: string;
  certType: string;
  expirationDate: string;
  daysUntilExpiry: number;
  status: CertificationStatus;
}

// ---------------------------------------------------------------------------
// Summary Stats
// ---------------------------------------------------------------------------

function buildSummaryStats(alerts: AlertRow[]): HTMLElement {
  const totalAlerts = alerts.length;
  const expired = alerts.filter((a) => a.daysUntilExpiry < 0).length;
  const within30 = alerts.filter((a) => a.daysUntilExpiry >= 0 && a.daysUntilExpiry <= 30).length;
  const within90 = alerts.filter((a) => a.daysUntilExpiry >= 0 && a.daysUntilExpiry <= 90).length;

  const items: { label: string; value: number; color: string }[] = [
    { label: 'Total Alerts', value: totalAlerts, color: 'text-[var(--text)]' },
    { label: 'Expired', value: expired, color: 'text-red-400' },
    { label: 'Expiring in 30 days', value: within30, color: 'text-amber-400' },
    { label: 'Expiring in 90 days', value: within90, color: 'text-blue-400' },
  ];

  const bar = el('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6' });

  for (const item of items) {
    const card = el(
      'div',
      {
        className:
          'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 text-center',
      },
      el('div', { className: `text-2xl font-bold ${item.color}` }, String(item.value)),
      el('div', { className: 'text-xs text-[var(--text-muted)] mt-1' }, item.label),
    );
    bar.appendChild(card);
  }

  return bar;
}

// ---------------------------------------------------------------------------
// Alerts Table
// ---------------------------------------------------------------------------

function buildAlertsTable(alerts: AlertRow[]): HTMLElement {
  const wrap = el('div', {
    className:
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto',
  });
  const table = el('table', { className: 'w-full text-sm' });

  // Header
  const thead = el('thead');
  const headRow = el('tr', {
    className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
  });
  for (const col of COLUMNS) {
    const align = col === 'Days Until Expiry' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', { className: `${align} whitespace-nowrap` }, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');

  if (alerts.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      {
        className: 'py-8 px-3 text-center text-[var(--text-muted)]',
        colspan: String(COLUMNS.length),
      },
      'No certifications expiring in the next 180 days.',
    );
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  for (const alert of alerts) {
    const tr = el('tr', {
      className:
        'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    });

    // Employee
    tr.appendChild(
      el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, alert.employeeName),
    );

    // Certification name
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text)]' }, alert.certName),
    );

    // Type
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, formatCertType(alert.certType)),
    );

    // Expiration date
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, alert.expirationDate),
    );

    // Days until expiry -- color coded
    let daysCls = 'text-emerald-400';
    if (alert.daysUntilExpiry < 0) {
      daysCls = 'text-red-400';
    } else if (alert.daysUntilExpiry < 30) {
      daysCls = 'text-amber-400';
    } else if (alert.daysUntilExpiry < 90) {
      daysCls = 'text-blue-400';
    }
    tr.appendChild(
      el(
        'td',
        { className: `py-2 px-3 text-right font-mono font-medium ${daysCls}` },
        String(alert.daysUntilExpiry),
      ),
    );

    // Status badge
    const tdStatus = el('td', { className: 'py-2 px-3' });
    const badgeCls = STATUS_BADGE[alert.status] ?? STATUS_BADGE.active;
    tdStatus.appendChild(
      el(
        'span',
        { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` },
        formatStatus(alert.status),
      ),
    );
    tr.appendChild(tdStatus);

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
    const wrapper = el('div', { className: 'space-y-0' });

    // Header row
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(
      el(
        'h1',
        { className: 'text-2xl font-bold text-[var(--text)]' },
        'Certification Expiration Alerts',
      ),
    );

    const refreshBtn = el(
      'button',
      {
        className:
          'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
        type: 'button',
      },
      'Refresh',
    );
    headerRow.appendChild(refreshBtn);
    wrapper.appendChild(headerRow);

    // Containers
    const summaryContainer = el('div', { className: '' });
    wrapper.appendChild(summaryContainer);

    const tableContainer = el('div', { className: '' });
    wrapper.appendChild(tableContainer);

    // Load data
    async function loadData(): Promise<void> {
      try {
        // Loading state
        summaryContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        tableContainer.appendChild(
          el(
            'div',
            { className: 'py-12 text-center text-[var(--text-muted)]' },
            'Loading certification alerts...',
          ),
        );

        const svc = getHRService();
        const alerts = await svc.getExpiringCertifications(180);

        const rows: AlertRow[] = alerts.map((a) => ({
          employeeName: a.employeeName,
          certName: a.certName,
          certType: a.certType,
          expirationDate: a.expirationDate,
          daysUntilExpiry: a.daysUntilExpiry,
          status: a.status,
        }));

        // Render summary
        summaryContainer.innerHTML = '';
        summaryContainer.appendChild(buildSummaryStats(rows));

        // Render table
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildAlertsTable(rows));
      } catch (err: unknown) {
        summaryContainer.innerHTML = '';
        tableContainer.innerHTML = '';
        const message =
          err instanceof Error ? err.message : 'Failed to load certification alerts';
        showMsg(wrapper, message, 'error');
      }
    }

    // Refresh button handler
    refreshBtn.addEventListener('click', () => {
      void loadData();
    });

    container.appendChild(wrapper);

    // Initial load
    void loadData();
  },
};

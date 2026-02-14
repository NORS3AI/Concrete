/**
 * Skills & Certifications view.
 * Allows loading certifications by employee, viewing/revoking/adding certs,
 * and shows a global "expiring soon" alerts panel.
 * Wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';
import type { CertificationType, CertificationStatus } from '../hr-service';

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
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  revoked: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const CERT_TYPE_OPTIONS: { value: CertificationType; label: string }[] = [
  { value: 'osha_10', label: 'OSHA 10' },
  { value: 'osha_30', label: 'OSHA 30' },
  { value: 'cdl', label: 'CDL' },
  { value: 'crane', label: 'Crane' },
  { value: 'confined_space', label: 'Confined Space' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'cpr', label: 'CPR' },
  { value: 'hazmat', label: 'HazMat' },
  { value: 'scaffolding', label: 'Scaffolding' },
  { value: 'rigging', label: 'Rigging' },
  { value: 'welding', label: 'Welding' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'other', label: 'Other' },
];

const CERT_COLUMNS = [
  'Type',
  'Name',
  'Issued By',
  'Issued Date',
  'Expiration Date',
  'Certificate #',
  'Status',
  'Actions',
];

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCertType(type: string): string {
  const found = CERT_TYPE_OPTIONS.find((o) => o.value === type);
  return found ? found.label : type;
}

// ---------------------------------------------------------------------------
// Cert Table
// ---------------------------------------------------------------------------

interface CertRow {
  id: string;
  type: CertificationType;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expirationDate: string;
  certificateNumber: string;
  status: CertificationStatus;
}

function buildCertTable(
  certs: CertRow[],
  onRevoke: (id: string) => void,
): HTMLElement {
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
  for (const col of CERT_COLUMNS) {
    headRow.appendChild(el('th', { className: 'py-2 px-3 font-medium whitespace-nowrap' }, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');

  if (certs.length === 0) {
    const tr = el('tr');
    const td = el(
      'td',
      {
        className: 'py-8 px-3 text-center text-[var(--text-muted)]',
        colspan: String(CERT_COLUMNS.length),
      },
      'No certifications found for this employee.',
    );
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const cert of certs) {
    const tr = el('tr', {
      className:
        'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    });

    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, formatCertType(cert.type)),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, cert.name),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, cert.issuedBy || '--'),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, cert.issuedDate || '--'),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, cert.expirationDate || '--'),
    );
    tr.appendChild(
      el(
        'td',
        { className: 'py-2 px-3 text-[var(--text-muted)] font-mono text-xs' },
        cert.certificateNumber || '--',
      ),
    );

    // Status badge
    const tdStatus = el('td', { className: 'py-2 px-3' });
    const badgeCls = STATUS_BADGE[cert.status] ?? STATUS_BADGE.active;
    tdStatus.appendChild(
      el(
        'span',
        { className: `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}` },
        formatStatus(cert.status),
      ),
    );
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', { className: 'py-2 px-3' });
    if (cert.status === 'active' || cert.status === 'expiring_soon') {
      const revokeBtn = el(
        'button',
        {
          className:
            'px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer',
        },
        'Revoke',
      );
      revokeBtn.addEventListener('click', () => onRevoke(cert.id));
      tdActions.appendChild(revokeBtn);
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Expiring Alerts Table
// ---------------------------------------------------------------------------

interface ExpiringAlert {
  employeeName: string;
  certName: string;
  certType: string;
  expirationDate: string;
  daysUntilExpiry: number;
  status: CertificationStatus;
}

function buildExpiringAlertsTable(alerts: ExpiringAlert[]): HTMLElement {
  const section = el('div', { className: 'mt-8' });
  section.appendChild(
    el(
      'h2',
      { className: 'text-xl font-bold text-[var(--text)] mb-4' },
      'All Expiring Certifications (90 days)',
    ),
  );

  if (alerts.length === 0) {
    section.appendChild(
      el(
        'div',
        { className: 'py-6 text-center text-[var(--text-muted)]' },
        'No certifications expiring in the next 90 days.',
      ),
    );
    return section;
  }

  const wrap = el('div', {
    className:
      'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-x-auto',
  });
  const table = el('table', { className: 'w-full text-sm' });

  const alertCols = ['Employee', 'Certification', 'Type', 'Expiration Date', 'Days Left', 'Status'];

  const thead = el('thead');
  const headRow = el('tr', {
    className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]',
  });
  for (const col of alertCols) {
    const align = col === 'Days Left' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', { className: align }, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const alert of alerts) {
    const tr = el('tr', {
      className:
        'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors',
    });

    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text)]' }, alert.employeeName),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text)]' }, alert.certName),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, formatCertType(alert.certType)),
    );
    tr.appendChild(
      el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, alert.expirationDate),
    );

    // Days column coloring
    let daysCls = 'text-emerald-400';
    if (alert.daysUntilExpiry < 0) daysCls = 'text-red-400';
    else if (alert.daysUntilExpiry < 30) daysCls = 'text-amber-400';
    else if (alert.daysUntilExpiry < 90) daysCls = 'text-blue-400';
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
  section.appendChild(wrap);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'space-y-0' });

    // Header
    wrapper.appendChild(
      el(
        'h1',
        { className: 'text-2xl font-bold text-[var(--text)] mb-6' },
        'Skills & Certifications',
      ),
    );

    // Employee lookup bar
    const lookupBar = el('div', {
      className: 'flex flex-wrap items-end gap-3 mb-6',
    });
    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const empIdGroup = el('div', { className: '' });
    empIdGroup.appendChild(
      el(
        'label',
        { className: 'block text-sm font-medium text-[var(--text-muted)] mb-1' },
        'Employee ID',
      ),
    );
    const empIdInput = el('input', {
      className: inputCls,
      type: 'text',
      placeholder: 'Enter employee ID...',
    }) as HTMLInputElement;
    empIdGroup.appendChild(empIdInput);
    lookupBar.appendChild(empIdGroup);

    const loadBtn = el(
      'button',
      {
        className:
          'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
        type: 'button',
      },
      'Load',
    );
    lookupBar.appendChild(loadBtn);

    const addCertBtn = el(
      'button',
      {
        className:
          'px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90',
        type: 'button',
      },
      'Add Certification',
    );
    lookupBar.appendChild(addCertBtn);

    wrapper.appendChild(lookupBar);

    // Cert table container
    const certContainer = el('div', { className: '' });
    certContainer.appendChild(
      el(
        'div',
        { className: 'py-6 text-center text-[var(--text-muted)]' },
        'Enter an employee ID and click "Load" to view certifications.',
      ),
    );
    wrapper.appendChild(certContainer);

    // Expiring alerts container
    const alertsContainer = el('div', { className: '' });
    wrapper.appendChild(alertsContainer);

    // Current state
    let currentEmployeeId = '';

    // Load certs for employee
    async function loadCerts(): Promise<void> {
      if (!currentEmployeeId) {
        certContainer.innerHTML = '';
        certContainer.appendChild(
          el(
            'div',
            { className: 'py-6 text-center text-[var(--text-muted)]' },
            'Enter an employee ID and click "Load" to view certifications.',
          ),
        );
        return;
      }

      try {
        certContainer.innerHTML = '';
        certContainer.appendChild(
          el(
            'div',
            { className: 'py-6 text-center text-[var(--text-muted)]' },
            'Loading certifications...',
          ),
        );

        const svc = getHRService();
        const certs = await svc.getCertificationsByEmployee(currentEmployeeId);

        const rows: CertRow[] = certs.map((cert) => ({
          id: (cert as any).id as string,
          type: cert.type,
          name: cert.name,
          issuedBy: cert.issuedBy ?? '',
          issuedDate: cert.issuedDate,
          expirationDate: cert.expirationDate ?? '',
          certificateNumber: cert.certificateNumber ?? '',
          status: cert.status,
        }));

        certContainer.innerHTML = '';
        certContainer.appendChild(
          el(
            'h2',
            { className: 'text-lg font-semibold text-[var(--text)] mb-3' },
            `Certifications for Employee: ${currentEmployeeId}`,
          ),
        );
        certContainer.appendChild(
          buildCertTable(rows, (id) => {
            void handleRevoke(id);
          }),
        );
      } catch (err: unknown) {
        certContainer.innerHTML = '';
        const message =
          err instanceof Error ? err.message : 'Failed to load certifications';
        showMsg(wrapper, message, 'error');
      }
    }

    // Load expiring alerts (global)
    async function loadExpiringAlerts(): Promise<void> {
      try {
        alertsContainer.innerHTML = '';
        alertsContainer.appendChild(
          el(
            'div',
            { className: 'py-6 text-center text-[var(--text-muted)]' },
            'Loading expiring certifications...',
          ),
        );

        const svc = getHRService();
        const alerts = await svc.getExpiringCertifications(90);

        const mapped: ExpiringAlert[] = alerts.map((a) => ({
          employeeName: a.employeeName,
          certName: a.certName,
          certType: a.certType,
          expirationDate: a.expirationDate,
          daysUntilExpiry: a.daysUntilExpiry,
          status: a.status,
        }));

        alertsContainer.innerHTML = '';
        alertsContainer.appendChild(buildExpiringAlertsTable(mapped));
      } catch (err: unknown) {
        alertsContainer.innerHTML = '';
        const message =
          err instanceof Error ? err.message : 'Failed to load expiring certifications';
        showMsg(wrapper, message, 'error');
      }
    }

    // Revoke handler
    async function handleRevoke(certId: string): Promise<void> {
      if (!confirm('Are you sure you want to revoke this certification?')) return;

      try {
        const svc = getHRService();
        await svc.revokeCertification(certId);
        showMsg(wrapper, 'Certification revoked.', 'success');
        await loadCerts();
        await loadExpiringAlerts();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to revoke certification';
        showMsg(wrapper, message, 'error');
      }
    }

    // Load button
    loadBtn.addEventListener('click', () => {
      currentEmployeeId = empIdInput.value.trim();
      if (!currentEmployeeId) {
        showMsg(wrapper, 'Please enter an employee ID.', 'error');
        return;
      }
      void loadCerts();
    });

    // Add certification button
    addCertBtn.addEventListener('click', () => {
      const employeeId = empIdInput.value.trim();
      if (!employeeId) {
        showMsg(wrapper, 'Please enter an employee ID first.', 'error');
        return;
      }

      // Collect data via prompts
      const typeLabels = CERT_TYPE_OPTIONS.map((o) => `${o.value} (${o.label})`).join(', ');
      const typeStr = prompt(`Certification type (${typeLabels}):`);
      if (!typeStr) return;

      const certType = typeStr.trim() as CertificationType;
      if (!CERT_TYPE_OPTIONS.some((o) => o.value === certType)) {
        showMsg(wrapper, `Invalid certification type: ${certType}`, 'error');
        return;
      }

      const name = prompt('Certification name:');
      if (!name) return;

      const issuedBy = prompt('Issued by (optional):') ?? '';
      const issuedDate = prompt('Issued date (YYYY-MM-DD):');
      if (!issuedDate) return;

      const expirationDate = prompt('Expiration date (YYYY-MM-DD, optional):') ?? '';
      const certificateNumber = prompt('Certificate number (optional):') ?? '';

      void (async () => {
        try {
          const svc = getHRService();
          await svc.addCertification({
            employeeId,
            type: certType,
            name,
            issuedBy: issuedBy || undefined,
            issuedDate,
            expirationDate: expirationDate || undefined,
            certificateNumber: certificateNumber || undefined,
          });

          showMsg(wrapper, 'Certification added successfully.', 'success');
          currentEmployeeId = employeeId;
          await loadCerts();
          await loadExpiringAlerts();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to add certification';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // Also allow Enter key in the employee ID input
    empIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loadBtn.click();
      }
    });

    container.appendChild(wrapper);

    // Initial load of expiring alerts (global view)
    void loadExpiringAlerts();
  },
};

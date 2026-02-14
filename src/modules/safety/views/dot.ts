/**
 * DOT Compliance Tracking view.
 * Displays driver DOT compliance records with filtering by status and search.
 * Supports updating individual fields and adding new driver records.
 * Highlights expired and expiring-soon dates. Wired to SafetyService.
 */

import { getSafetyService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: Array<string | HTMLElement>
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else node.setAttribute(k, v);
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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', { className: cls }, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'non_compliant', label: 'Non-Compliant' },
];

const STATUS_BADGE: Record<string, string> = {
  compliant: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  non_compliant: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  non_compliant: 'Non-Compliant',
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function isExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

function isExpiringSoon(dateStr: string | undefined, daysThreshold: number = 90): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const expDate = new Date(dateStr);
  const diffMs = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);
  return diffDays > 0 && diffDays <= daysThreshold;
}

function getDateClass(dateStr: string | undefined): string {
  if (!dateStr) return 'px-4 py-3 text-sm text-[var(--text-muted)]';
  if (isExpired(dateStr)) return 'px-4 py-3 text-sm text-red-400 font-medium';
  if (isExpiringSoon(dateStr)) return 'px-4 py-3 text-sm text-amber-400 font-medium';
  return 'px-4 py-3 text-sm text-[var(--text-muted)]';
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'max-w-7xl mx-auto' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'DOT Compliance Tracking'));
    const addBtn = el('button', { className: btnCls, type: 'button' }, 'Add Driver');
    headerRow.appendChild(addBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsContainer = el('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6' });
    wrapper.appendChild(statsContainer);

    // ---- Filter Bar ----
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = el('input', {
      className: inputCls,
      type: 'text',
      placeholder: 'Search drivers...',
    }) as HTMLInputElement;
    filterBar.appendChild(searchInput);

    const statusSelect = el('select', { className: inputCls }) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);
    wrapper.appendChild(filterBar);

    // ---- Loading State ----
    const loadingEl = el(
      'div',
      { className: 'py-8 text-center text-[var(--text-muted)] text-sm' },
      'Loading DOT compliance data...',
    );
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // -------------------------------------------------------------------
    // Data loading & rendering
    // -------------------------------------------------------------------

    function renderStats(
      items: Array<{ status: string }>,
    ): void {
      statsContainer.innerHTML = '';

      const total = items.length;
      const compliant = items.filter((i) => i.status === 'compliant').length;
      const expiringSoon = items.filter((i) => i.status === 'expiring_soon').length;
      const expiredNonCompliant = items.filter((i) => i.status === 'expired' || i.status === 'non_compliant').length;

      const cards: Array<{ label: string; value: number; cls: string }> = [
        { label: 'Total Drivers', value: total, cls: 'text-[var(--text)]' },
        { label: 'Compliant', value: compliant, cls: 'text-emerald-400' },
        { label: 'Expiring Soon', value: expiringSoon, cls: expiringSoon > 0 ? 'text-amber-400' : 'text-[var(--text)]' },
        { label: 'Expired / Non-Compliant', value: expiredNonCompliant, cls: expiredNonCompliant > 0 ? 'text-red-400' : 'text-[var(--text)]' },
      ];

      for (const card of cards) {
        const c = el('div', {
          className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4',
        });
        c.appendChild(el('div', { className: 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1' }, card.label));
        c.appendChild(el('div', { className: `text-2xl font-bold ${card.cls}` }, String(card.value)));
        statsContainer.appendChild(c);
      }
    }

    async function loadAndRender(): Promise<void> {
      try {
        const svc = getSafetyService();
        loadingEl.style.display = 'block';
        tableContainer.innerHTML = '';

        const allItems = await svc.listDOTCompliance();

        loadingEl.style.display = 'none';

        // Render stats from all items (before client-side filtering)
        renderStats(allItems);

        // Client-side filtering
        const searchQuery = searchInput.value.trim().toLowerCase();
        const statusFilter = statusSelect.value;

        let filtered = allItems;

        if (statusFilter) {
          filtered = filtered.filter((i: any) => i.status === statusFilter);
        }

        if (searchQuery) {
          filtered = filtered.filter((i: any) => {
            const searchable = [
              i.employeeName ?? '',
              i.employeeId ?? '',
              i.cdlNumber ?? '',
              i.cdlState ?? '',
            ].join(' ').toLowerCase();
            return searchable.includes(searchQuery);
          });
        }

        // Build table
        const wrap = el('div', {
          className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden overflow-x-auto',
        });
        const table = el('table', { className: 'w-full text-sm' });

        // Table header
        const thead = el('thead');
        const headRow = el('tr', { className: 'border-b border-[var(--border)]' });
        const columns = ['Employee', 'CDL Number', 'CDL State', 'CDL Class', 'CDL Expiration', 'Medical Card Expiration', 'Last Physical', 'HOS Compliant', 'Status', 'Actions'];
        for (const col of columns) {
          headRow.appendChild(el('th', {
            className: 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap',
          }, col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Table body
        const tbody = el('tbody');
        if (filtered.length === 0) {
          const tr = el('tr');
          const td = el('td', {
            className: 'py-8 px-4 text-center text-[var(--text-muted)]',
            colspan: String(columns.length),
          }, 'No DOT compliance records found.');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const item of filtered) {
          const tr = el('tr', { className: 'border-t border-[var(--border)] hover:bg-[var(--surface)]' });

          // Employee
          const empText = item.employeeName
            ? `${item.employeeName} (${item.employeeId})`
            : item.employeeId;
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)] font-medium whitespace-nowrap' }, empText));

          // CDL Number
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)] font-mono' }, item.cdlNumber || '-'));

          // CDL State
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, item.cdlState || '-'));

          // CDL Class
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text)]' }, item.cdlClass || '-'));

          // CDL Expiration (with color highlighting)
          tr.appendChild(el('td', { className: getDateClass(item.cdlExpiration) + ' whitespace-nowrap' }, item.cdlExpiration || '-'));

          // Medical Card Expiration (with color highlighting)
          tr.appendChild(el('td', { className: getDateClass(item.medicalCardExpiration) + ' whitespace-nowrap' }, item.medicalCardExpiration || '-'));

          // Last Physical
          tr.appendChild(el('td', { className: 'px-4 py-3 text-sm text-[var(--text-muted)] whitespace-nowrap' }, item.lastPhysicalDate || '-'));

          // HOS Compliant
          const tdHos = el('td', { className: 'px-4 py-3 text-sm text-center' });
          if (item.hoursOfServiceCompliant) {
            tdHos.appendChild(el('span', { className: 'text-emerald-400 font-bold' }, '\u2713'));
          } else {
            tdHos.appendChild(el('span', { className: 'text-red-400 font-bold' }, '\u2717'));
          }
          tr.appendChild(tdHos);

          // Status badge
          const tdStatus = el('td', { className: 'px-4 py-3 text-sm' });
          const badgeCls = STATUS_BADGE[item.status] ?? STATUS_BADGE.compliant;
          tdStatus.appendChild(el('span', {
            className: `px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeCls}`,
          }, STATUS_LABEL[item.status] ?? item.status));
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', { className: 'px-4 py-3 text-sm' });
          const actionsWrap = el('div', { className: 'flex items-center gap-3' });

          const updateBtn = el('button', {
            className: 'text-[var(--accent)] hover:underline text-sm',
            type: 'button',
          }, 'Update');
          updateBtn.addEventListener('click', () => {
            const field = prompt('Field to update (cdlExpiration / medicalCardExpiration / lastPhysicalDate):');
            if (!field) return;
            const validFields = ['cdlExpiration', 'medicalCardExpiration', 'lastPhysicalDate'];
            if (!validFields.includes(field)) {
              showMsg(wrapper, `Invalid field "${field}". Must be one of: ${validFields.join(', ')}`, true);
              return;
            }
            const newValue = prompt(`New value for ${field} (YYYY-MM-DD):`);
            if (!newValue) return;

            void (async () => {
              try {
                const changes: Record<string, string> = {};
                changes[field] = newValue;
                await svc.updateDOTRecord(item.id, changes);
                showMsg(wrapper, `DOT record for ${item.employeeName || item.employeeId} updated.`, false);
                await loadAndRender();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to update DOT record.';
                showMsg(wrapper, message, true);
              }
            })();
          });
          actionsWrap.appendChild(updateBtn);

          tdActions.appendChild(actionsWrap);
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load DOT compliance data.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Add Driver Handler ----
    addBtn.addEventListener('click', () => {
      const employeeId = prompt('Employee ID:');
      if (!employeeId) return;
      const employeeName = prompt('Employee Name:');
      if (!employeeName) return;
      const cdlNumber = prompt('CDL Number:');
      if (!cdlNumber) return;
      const cdlState = prompt('CDL State (e.g., TX, CA):');
      if (!cdlState) return;
      const cdlClass = prompt('CDL Class (e.g., A, B, C):');
      if (!cdlClass) return;
      const cdlExpiration = prompt('CDL Expiration Date (YYYY-MM-DD):');
      if (!cdlExpiration) return;
      const medicalCardExpiration = prompt('Medical Card Expiration Date (YYYY-MM-DD):');
      if (!medicalCardExpiration) return;
      const lastPhysicalDate = prompt('Last Physical Date (YYYY-MM-DD):');
      if (!lastPhysicalDate) return;

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.addDOTRecord({
            employeeId,
            employeeName,
            cdlNumber,
            cdlState,
            cdlClass,
            cdlExpiration,
            medicalCardExpiration,
            lastPhysicalDate,
          });
          showMsg(wrapper, `DOT record added for ${employeeName}.`, false);
          await loadAndRender();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add DOT record.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => void loadAndRender());
    statusSelect.addEventListener('change', () => void loadAndRender());

    // ---- Initial Load ----
    void loadAndRender();
  },
};

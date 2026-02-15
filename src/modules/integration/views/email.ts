/**
 * Email Integration view.
 * Inbox table showing received emails with document type, vendor matching, and processing actions.
 * Status badges: pending=amber, processed=emerald, rejected=red, manual_review=blue.
 */

import { getIntegrationService } from '../service-accessor';

const svc = () => getIntegrationService();

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

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = ok
    ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  processed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  manual_review: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processed: 'Processed',
  rejected: 'Rejected',
  manual_review: 'Manual Review',
};

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Email Integration'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // Loading
    const loading = el('div', 'py-12 text-center text-[var(--text-muted)]', 'Loading emails...');
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Data loading & rendering
    // -----------------------------------------------------------------------

    async function loadAndRender(): Promise<void> {
      try {
        const items = await svc().listEmails();
        countBadge.textContent = String(items.length);

        const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
        const table = el('table', 'w-full text-sm');

        // Header
        const thead = el('thead');
        const headRow = el('tr', 'border-b border-[var(--border)]');
        for (const col of ['From', 'Subject', 'Received', 'Attachments', 'Doc Type', 'Matched Vendor', 'Status', 'Actions']) {
          headRow.appendChild(el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = el('tbody');
        if (items.length === 0) {
          const tr = el('tr');
          const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No emails found. Emails will appear here when received via the email integration.');
          td.setAttribute('colspan', '8');
          tr.appendChild(td);
          tbody.appendChild(tr);
        }

        for (const email of items) {
          const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text)]', email.from));
          tr.appendChild(el('td', 'px-4 py-3 font-medium text-[var(--text)] max-w-xs truncate', email.subject));
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)] text-xs', fmtDateTime(email.receivedAt)));

          // Attachments as tags
          const tdAttach = el('td', 'px-4 py-3');
          const attachments = email.attachments.split(',').map(s => s.trim()).filter(Boolean);
          if (attachments.length > 0) {
            const attachWrap = el('div', 'flex flex-wrap gap-1');
            for (const att of attachments) {
              attachWrap.appendChild(el('span', 'px-1.5 py-0.5 rounded text-xs bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', att));
            }
            tdAttach.appendChild(attachWrap);
          } else {
            tdAttach.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '\u2014'));
          }
          tr.appendChild(tdAttach);

          // Document type
          const docType = email.documentType || '\u2014';
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', docType));

          // Matched vendor
          const vendor = email.matchedVendor || '\u2014';
          tr.appendChild(el('td', 'px-4 py-3 text-[var(--text-muted)]', vendor));

          // Status badge
          const tdStatus = el('td', 'px-4 py-3');
          const statusCls = STATUS_BADGE[email.status] ?? STATUS_BADGE.pending;
          const statusLabel = STATUS_LABEL[email.status] ?? email.status;
          tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`, statusLabel));
          tr.appendChild(tdStatus);

          // Actions
          const tdActions = el('td', 'px-4 py-3');
          if (email.status === 'pending') {
            const processBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Process');
            processBtn.addEventListener('click', () => {
              void (async () => {
                try {
                  await svc().processEmail(email.id, email.documentType || 'invoice', email.matchedVendor || '');
                  showMsg(wrapper, `Email "${email.subject}" processed.`, true);
                  await loadAndRender();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Failed to process email';
                  showMsg(wrapper, message, false);
                }
              })();
            });
            tdActions.appendChild(processBtn);
          } else {
            tdActions.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '\u2014'));
          }
          tr.appendChild(tdActions);

          tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrap.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(wrap);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load emails';
        showMsg(wrapper, message, false);
      }
    }

    // Initial load
    void loadAndRender();
  },
};

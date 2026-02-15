/**
 * Push Notifications view.
 * Displays push notifications with type, title, body, sent time, and read status.
 * Filterable by type. Includes a "Mark as Read" button for unread notifications.
 */

import { getMobileService } from '../service-accessor';

const svc = () => getMobileService();

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const showMsg = (c: HTMLElement, msg: string, ok = true) => {
  const d = el('div', `p-3 rounded mb-4 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`, msg);
  c.prepend(d);
  setTimeout(() => d.remove(), 3000);
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const TYPE_BADGE: Record<string, string> = {
  approval: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  alert: 'bg-red-500/10 text-red-400 border border-red-500/20',
  assignment: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  reminder: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'approval', label: 'Approval' },
  { value: 'alert', label: 'Alert' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'reminder', label: 'Reminder' },
];

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Notifications'));
    const badge = el('span', 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', '...');
    titleWrap.appendChild(badge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // ---- Filter Bar ----
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');

    const typeSelect = el('select', inputCls) as HTMLSelectElement;
    for (const opt of TYPE_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    wrapper.appendChild(bar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Loading State ----
    const loading = el('div', 'flex items-center justify-center py-12');
    loading.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Loading notifications...'));
    tableContainer.appendChild(loading);

    container.appendChild(wrapper);

    // ---- Load & Render ----
    async function loadTable(): Promise<void> {
      const service = svc();
      // List all notifications (pass empty recipientId to get all)
      let records = await service.listNotifications('');

      // Client-side type filter
      const typeFilter = typeSelect.value;
      if (typeFilter) {
        records = records.filter(r => r.type === typeFilter);
      }

      badge.textContent = String(records.length);
      renderTable(records);
    }

    function renderTable(records: any[]): void {
      tableContainer.innerHTML = '';

      if (records.length === 0) {
        const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
        empty.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'No notifications found. Push notifications will appear here once sent.'));
        tableContainer.appendChild(empty);
        return;
      }

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Type', 'Title', 'Body', 'Sent', 'Read', 'Actions']) {
        headRow.appendChild(el('th', thCls, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      for (const row of records) {
        const tr = el('tr', trCls);

        // Unread rows get a subtle highlight
        if (!row.read) {
          tr.className = trCls + ' bg-[var(--accent)]/5';
        }

        // Type badge
        const tdType = el('td', tdCls);
        const typeCls = TYPE_BADGE[row.type] ?? TYPE_BADGE.reminder;
        const typeLabel = row.type.charAt(0).toUpperCase() + row.type.slice(1);
        tdType.appendChild(el('span', `px-2 py-1 rounded-full text-xs font-medium ${typeCls}`, typeLabel));
        tr.appendChild(tdType);

        tr.appendChild(el('td', tdCls + ' font-medium', row.title));

        // Body - truncate if long
        const bodyText = row.body.length > 60
          ? row.body.substring(0, 60) + '...'
          : row.body;
        tr.appendChild(el('td', tdCls + ' max-w-xs text-[var(--text-muted)]', bodyText));

        // Sent time
        const sentDate = new Date(row.sentAt);
        const formattedSent = sentDate.toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        tr.appendChild(el('td', tdCls + ' text-[var(--text-muted)]', formattedSent));

        // Read status
        const tdRead = el('td', tdCls);
        if (row.read) {
          tdRead.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Read'));
        } else {
          tdRead.appendChild(el('span', 'px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', 'Unread'));
        }
        tr.appendChild(tdRead);

        // Actions
        const tdActions = el('td', tdCls);
        if (!row.read) {
          const markBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Mark as Read');
          markBtn.addEventListener('click', () => {
            void (async () => {
              try {
                const service = svc();
                await service.markRead(row.id);
                showMsg(wrapper, 'Notification marked as read.', true);
                await loadTable();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to mark notification.';
                showMsg(wrapper, message, false);
              }
            })();
          });
          tdActions.appendChild(markBtn);
        }
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Filter Handlers ----
    typeSelect.addEventListener('change', () => { void loadTable(); });

    // ---- Initial Load ----
    void (async () => {
      try {
        await loadTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load notifications.';
        showMsg(wrapper, message, false);
      }
    })();
  },
};

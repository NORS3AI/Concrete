/**
 * Sessions view.
 * Active sessions list with terminate action, user info, and expiry display.
 */

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

function formatDate(iso: string): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  if (!iso) return 'N/A';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionRow {
  id: string;
  username: string;
  displayName: string;
  ipAddress: string;
  userAgent: string;
  lastActivityAt: string;
  expiresAt: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-4 mb-4');

  const buildCard = (label: string, value: string, accent?: boolean): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Active Sessions', '0', true));
  row.appendChild(buildCard('Unique Users', '0'));
  row.appendChild(buildCard('Expired (Today)', '0'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(sessions: SessionRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['User', 'IP Address', 'User Agent', 'Last Activity', 'Expires At', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (sessions.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No active sessions.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const session of sessions) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdUser = el('td', 'py-2 px-3');
    tdUser.appendChild(el('div', 'font-medium text-[var(--text)]', session.displayName));
    tdUser.appendChild(el('div', 'text-xs text-[var(--text-muted)]', session.username));
    tr.appendChild(tdUser);

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)] text-xs', session.ipAddress || 'Unknown'));

    const tdUA = el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs max-w-[200px] truncate');
    tdUA.textContent = session.userAgent || 'Unknown';
    tdUA.title = session.userAgent || 'Unknown';
    tr.appendChild(tdUA);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', timeAgo(session.lastActivityAt)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', formatDate(session.expiresAt)));

    const tdStatus = el('td', 'py-2 px-3');
    if (session.isActive) {
      tdStatus.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Active'));
    } else {
      tdStatus.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', 'Expired'));
    }
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (session.isActive) {
      const terminateBtn = el('button', 'text-red-400 hover:underline text-sm', 'Terminate');
      terminateBtn.type = 'button';
      terminateBtn.addEventListener('click', () => { /* terminate placeholder */ });
      tdActions.appendChild(terminateBtn);
    }
    tr.appendChild(tdActions);

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
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sessions'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const cleanupBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Clean Expired');
    cleanupBtn.type = 'button';
    cleanupBtn.addEventListener('click', () => { /* cleanup placeholder */ });
    btnGroup.appendChild(cleanupBtn);
    const terminateAllBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10', 'Terminate All');
    terminateAllBtn.type = 'button';
    terminateAllBtn.addEventListener('click', () => { /* terminate all placeholder */ });
    btnGroup.appendChild(terminateAllBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());

    const sessions: SessionRow[] = [];
    wrapper.appendChild(buildTable(sessions));

    container.appendChild(wrapper);
  },
};

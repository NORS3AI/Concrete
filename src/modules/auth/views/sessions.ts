/**
 * Sessions view.
 * Active sessions list with terminate action, user info, and expiry display.
 * Wired to AuthService for live data.
 */

import { getAuthService } from '../service-accessor';

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
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  if (!iso) return 'N/A';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(
  activeCount: number,
  uniqueUsers: number,
  totalFromService: number,
): HTMLElement {
  const row = el('div', 'grid grid-cols-3 gap-4 mb-4');

  const buildCard = (label: string, value: string, accent?: boolean): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
    card.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Active Sessions', String(activeCount), true));
  row.appendChild(buildCard('Unique Users', String(uniqueUsers)));
  row.appendChild(buildCard('Total Active (Service)', String(totalFromService)));

  return row;
}

// ---------------------------------------------------------------------------
// Table
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

function buildTable(
  sessions: SessionRow[],
  onTerminate: (sessionId: string) => void,
): HTMLElement {
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
      terminateBtn.addEventListener('click', () => onTerminate(session.id));
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

    const svc = getAuthService();

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Sessions'));
    const btnGroup = el('div', 'flex items-center gap-2');

    const cleanupBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Clean Expired');
    cleanupBtn.type = 'button';
    cleanupBtn.addEventListener('click', async () => {
      try {
        const cleaned = await svc.cleanExpiredSessions();
        showMsg(wrapper, `Cleaned ${cleaned} expired session(s).`, false);
        renderContent();
      } catch (err: unknown) {
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to clean sessions.', true);
      }
    });
    btnGroup.appendChild(cleanupBtn);

    const terminateAllBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10', 'Terminate All');
    terminateAllBtn.type = 'button';
    terminateAllBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to terminate ALL active sessions?')) return;
      try {
        const sessions = await svc.getActiveSessions();
        for (const session of sessions) {
          await svc.endSession(session.id);
        }
        showMsg(wrapper, `Terminated ${sessions.length} session(s).`, false);
        renderContent();
      } catch (err: unknown) {
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to terminate sessions.', true);
      }
    });
    btnGroup.appendChild(terminateAllBtn);

    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    // Placeholder for dynamic content
    const contentArea = el('div', '');
    wrapper.appendChild(contentArea);

    container.appendChild(wrapper);

    // Load and render data
    async function renderContent(): Promise<void> {
      try {
        const [sessions, users, activeCountFromService] = await Promise.all([
          svc.getActiveSessions(),
          svc.getUsers(),
          svc.getActiveSessionCount(),
        ]);

        // Build user map for resolving userId -> username/displayName
        const userMap = new Map<string, { username: string; displayName: string }>();
        for (const u of users) {
          userMap.set(u.id, { username: u.username, displayName: u.displayName });
        }

        // Map sessions to rows
        const rows: SessionRow[] = sessions.map((s) => {
          const user = userMap.get(s.userId);
          return {
            id: s.id,
            username: user?.username ?? s.userId,
            displayName: user?.displayName ?? 'Unknown User',
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            lastActivityAt: s.lastActivityAt,
            expiresAt: s.expiresAt,
            isActive: s.isActive,
          };
        });

        // Compute unique user count
        const uniqueUserIds = new Set(sessions.map((s) => s.userId));

        contentArea.innerHTML = '';
        contentArea.appendChild(buildSummaryCards(rows.length, uniqueUserIds.size, activeCountFromService));
        contentArea.appendChild(buildTable(rows, async (sessionId: string) => {
          if (!confirm('Are you sure you want to terminate this session?')) return;
          try {
            await svc.endSession(sessionId);
            showMsg(wrapper, 'Session terminated.', false);
            renderContent();
          } catch (err: unknown) {
            showMsg(wrapper, err instanceof Error ? err.message : 'Failed to terminate session.', true);
          }
        }));
      } catch (err: unknown) {
        contentArea.innerHTML = '';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load sessions.', true);
      }
    }

    renderContent();
  },
};

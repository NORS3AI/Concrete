/**
 * API Keys view.
 * API key management: create, revoke, show key prefix and last used.
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
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  username: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  isRevoked: boolean;
  isExpired: boolean;
}

// ---------------------------------------------------------------------------
// Create Key Form
// ---------------------------------------------------------------------------

function buildCreateForm(
  onGenerate: (name: string, expiryDays: number) => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Generate New API Key'));

  const formGrid = el('div', 'grid grid-cols-3 gap-4');
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const nameGroup = el('div', '');
  nameGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Key Name'));
  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g., CI/CD Pipeline';
  nameGroup.appendChild(nameInput);
  formGrid.appendChild(nameGroup);

  const expiryGroup = el('div', '');
  expiryGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Expiry (days)'));
  const expiryInput = el('input', inputCls) as HTMLInputElement;
  expiryInput.type = 'number';
  expiryInput.value = '365';
  expiryInput.min = '1';
  expiryGroup.appendChild(expiryInput);
  formGrid.appendChild(expiryGroup);

  const btnGroup = el('div', 'flex items-end');
  const generateBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Generate Key');
  generateBtn.type = 'button';
  generateBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const days = parseInt(expiryInput.value, 10) || 365;
    onGenerate(name, days);
    nameInput.value = '';
    expiryInput.value = '365';
  });
  btnGroup.appendChild(generateBtn);
  formGrid.appendChild(btnGroup);

  card.appendChild(formGrid);

  // Key display area (hidden until generated)
  const keyDisplay = el('div', 'mt-4 hidden');
  keyDisplay.id = 'api-key-display';
  const keyAlert = el('div', 'bg-amber-500/10 border border-amber-500/20 rounded-md p-4');
  keyAlert.appendChild(el('div', 'text-sm font-medium text-amber-400 mb-2', 'Copy your API key now. It will not be shown again.'));
  const keyCode = el('code', 'block bg-[var(--surface)] rounded px-3 py-2 text-sm font-mono text-[var(--text)] select-all');
  keyCode.id = 'api-key-value';
  keyCode.textContent = '';
  keyAlert.appendChild(keyCode);
  keyDisplay.appendChild(keyAlert);
  card.appendChild(keyDisplay);

  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  keys: ApiKeyRow[],
  onRevoke: (keyId: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Key Prefix', 'User', 'Created', 'Expires', 'Last Used', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (keys.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No API keys found. Generate your first key above.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const key of keys) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', key.name));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)] text-xs', key.keyPrefix + '...'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', key.username));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', formatDate(key.createdAt)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', formatDate(key.expiresAt)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', formatDate(key.lastUsedAt)));

    const tdStatus = el('td', 'py-2 px-3');
    if (key.isRevoked) {
      tdStatus.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20', 'Revoked'));
    } else if (key.isExpired) {
      tdStatus.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20', 'Expired'));
    } else {
      tdStatus.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Active'));
    }
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (!key.isRevoked) {
      const revokeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Revoke');
      revokeBtn.type = 'button';
      revokeBtn.addEventListener('click', () => onRevoke(key.id));
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
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const svc = getAuthService();

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'API Keys'));
    const summaryLabel = el('span', 'text-sm text-[var(--text-muted)]', 'Manage API keys for external integrations');
    headerRow.appendChild(summaryLabel);
    wrapper.appendChild(headerRow);

    // Create form
    const createFormEl = buildCreateForm(async (name: string, expiryDays: number) => {
      try {
        // Resolve userId: use the first available user or admin
        const users = await svc.getUsers();
        if (users.length === 0) {
          showMsg(wrapper, 'No users found. Create a user first.', true);
          return;
        }
        const userId = users[0].id;

        const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
        const result = await svc.createApiKey({
          userId,
          name,
          expiryDays,
        });

        // Show the full key in the display area
        const keyDisplay = createFormEl.querySelector('#api-key-display') as HTMLElement;
        const keyValue = createFormEl.querySelector('#api-key-value') as HTMLElement;
        if (keyDisplay && keyValue) {
          keyValue.textContent = result.fullKey;
          keyDisplay.classList.remove('hidden');
        }

        showMsg(wrapper, `API key "${name}" generated successfully.`, false);
        renderContent();
      } catch (err: unknown) {
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to generate API key.', true);
      }
    });
    wrapper.appendChild(createFormEl);

    // Content area for table
    const contentArea = el('div', '');
    wrapper.appendChild(contentArea);

    container.appendChild(wrapper);

    // Load and render data
    async function renderContent(): Promise<void> {
      try {
        const [allKeys, users, activeKeyCount] = await Promise.all([
          svc.getAllApiKeys(),
          svc.getUsers(),
          svc.getActiveApiKeyCount(),
        ]);

        // Update summary label
        summaryLabel.textContent = `${activeKeyCount} active key(s)`;

        // Build user map
        const userMap = new Map<string, string>();
        for (const u of users) {
          userMap.set(u.id, u.username);
        }

        const now = new Date();
        const rows: ApiKeyRow[] = allKeys.map((k) => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          username: userMap.get(k.userId) ?? k.userId,
          createdAt: k.createdAt,
          expiresAt: k.expiresAt,
          lastUsedAt: k.lastUsedAt,
          isRevoked: k.isRevoked,
          isExpired: !k.isRevoked && !!k.expiresAt && new Date(k.expiresAt) < now,
        }));

        contentArea.innerHTML = '';
        contentArea.appendChild(buildTable(rows, async (keyId: string) => {
          if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
          try {
            await svc.revokeApiKey(keyId);
            showMsg(wrapper, 'API key revoked.', false);
            renderContent();
          } catch (err: unknown) {
            showMsg(wrapper, err instanceof Error ? err.message : 'Failed to revoke API key.', true);
          }
        }));
      } catch (err: unknown) {
        contentArea.innerHTML = '';
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load API keys.', true);
      }
    }

    renderContent();
  },
};

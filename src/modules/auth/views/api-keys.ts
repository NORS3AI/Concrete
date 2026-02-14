/**
 * API Keys view.
 * API key management: create, revoke, show key prefix and last used.
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
}

// ---------------------------------------------------------------------------
// Create Key Modal
// ---------------------------------------------------------------------------

function buildCreateForm(): HTMLElement {
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
  generateBtn.addEventListener('click', () => { /* generate placeholder */ });
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

function buildTable(keys: ApiKeyRow[]): HTMLElement {
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
    } else {
      tdStatus.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Active'));
    }
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    if (!key.isRevoked) {
      const revokeBtn = el('button', 'text-red-400 hover:underline text-sm', 'Revoke');
      revokeBtn.type = 'button';
      revokeBtn.addEventListener('click', () => { /* revoke placeholder */ });
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
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'API Keys'));
    headerRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Manage API keys for external integrations'));
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildCreateForm());

    const keys: ApiKeyRow[] = [];
    wrapper.appendChild(buildTable(keys));

    container.appendChild(wrapper);
  },
};

/**
 * User create/edit form view.
 * Full user details with role assignment, MFA toggle, and status management.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: '', label: 'Select Role' },
  { value: 'admin', label: 'Admin' },
  { value: 'controller', label: 'Controller' },
  { value: 'pm', label: 'PM' },
  { value: 'ap-clerk', label: 'AP Clerk' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'field', label: 'Field' },
  { value: 'read-only', label: 'Read-Only' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'locked', label: 'Locked' },
  { value: 'pending', label: 'Pending' },
];

const SSO_OPTIONS = [
  { value: 'none', label: 'None (Password)' },
  { value: 'saml', label: 'SAML' },
  { value: 'oidc', label: 'OpenID Connect' },
  { value: 'google', label: 'Google' },
  { value: 'microsoft', label: 'Microsoft' },
];

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
  colSpan?: number,
): HTMLElement {
  const group = el('div', colSpan === 2 ? 'col-span-2' : '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string, type?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = type ?? 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: { value: string; label: string }[]): HTMLSelectElement {
  const select = el('select', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  select.name = name;
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

function checkboxInput(name: string, label: string): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');
  const input = el('input', 'rounded border-[var(--border)]') as HTMLInputElement;
  input.type = 'checkbox';
  input.name = name;
  wrapper.appendChild(input);
  wrapper.appendChild(el('span', 'text-sm text-[var(--text)]', label));
  return wrapper;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'User Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Users') as HTMLAnchorElement;
    backLink.href = '#/auth/users';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Account Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Account Information'));
    const acctGrid = el('div', 'grid grid-cols-2 gap-4');
    acctGrid.appendChild(buildField('Username', textInput('username', 'Enter username')));
    acctGrid.appendChild(buildField('Email', textInput('email', 'user@example.com', 'email')));
    acctGrid.appendChild(buildField('Display Name', textInput('displayName', 'Full name')));
    acctGrid.appendChild(buildField('Password', textInput('password', 'Set password', 'password')));
    form.appendChild(acctGrid);

    // Section: Role & Status
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Role & Status'));
    const roleGrid = el('div', 'grid grid-cols-2 gap-4');
    roleGrid.appendChild(buildField('Role', selectInput('roleId', ROLE_OPTIONS)));
    roleGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    form.appendChild(roleGrid);

    // Section: Profile Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Profile Information'));
    const profileGrid = el('div', 'grid grid-cols-2 gap-4');
    profileGrid.appendChild(buildField('Phone', textInput('phone', '(555) 555-5555', 'tel')));
    profileGrid.appendChild(buildField('Department', textInput('department', 'Department')));
    profileGrid.appendChild(buildField('Title', textInput('title', 'Job title')));
    profileGrid.appendChild(buildField('Avatar URL', textInput('avatar', 'https://')));
    form.appendChild(profileGrid);

    // Section: Authentication
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Authentication'));
    const authGrid = el('div', 'grid grid-cols-2 gap-4');
    authGrid.appendChild(buildField('SSO Provider', selectInput('ssoProvider', SSO_OPTIONS)));
    authGrid.appendChild(buildField('SSO External ID', textInput('ssoExternalId', 'External user ID')));
    const mfaGroup = el('div', 'col-span-2 flex items-center gap-6 mt-2');
    mfaGroup.appendChild(checkboxInput('mfaEnabled', 'Enable Multi-Factor Authentication (MFA)'));
    authGrid.appendChild(mfaGroup);
    form.appendChild(authGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save User');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const deactivateBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10', 'Deactivate');
    deactivateBtn.type = 'button';
    deactivateBtn.addEventListener('click', () => { /* deactivate placeholder */ });
    btnRow.appendChild(deactivateBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/auth/users';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

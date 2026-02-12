/**
 * Login view.
 * Login form with username/email, password, and MFA code fields.
 * Includes SSO provider buttons.
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
// Form Builder
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
): HTMLElement {
  const group = el('div', 'mb-4');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder: string, type?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = type ?? 'text';
  input.name = name;
  input.placeholder = placeholder;
  return input;
}

// ---------------------------------------------------------------------------
// SSO Buttons
// ---------------------------------------------------------------------------

function buildSSOButtons(): HTMLElement {
  const section = el('div', 'mt-6');
  section.appendChild(el('div', 'relative mb-4'));
  const divider = el('div', 'flex items-center gap-3 mb-4');
  const line1 = el('div', 'flex-1 border-t border-[var(--border)]');
  const orText = el('span', 'text-xs text-[var(--text-muted)] uppercase', 'or continue with');
  const line2 = el('div', 'flex-1 border-t border-[var(--border)]');
  divider.appendChild(line1);
  divider.appendChild(orText);
  divider.appendChild(line2);
  section.appendChild(divider);

  const btnGrid = el('div', 'grid grid-cols-2 gap-3');

  const ssoProviders = [
    { id: 'saml', label: 'SAML SSO', icon: 'S' },
    { id: 'oidc', label: 'OpenID Connect', icon: 'O' },
    { id: 'google', label: 'Google', icon: 'G' },
    { id: 'microsoft', label: 'Microsoft', icon: 'M' },
  ];

  for (const provider of ssoProviders) {
    const btn = el('button', 'flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors');
    btn.type = 'button';
    const iconSpan = el('span', 'w-5 h-5 flex items-center justify-center rounded bg-[var(--surface)] text-xs font-bold text-[var(--accent)]', provider.icon);
    btn.appendChild(iconSpan);
    btn.appendChild(el('span', '', provider.label));
    btn.addEventListener('click', () => { /* SSO login placeholder */ });
    btnGrid.appendChild(btn);
  }

  section.appendChild(btnGrid);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const outer = el('div', 'min-h-screen flex items-center justify-center bg-[var(--surface)]');
    const card = el('div', 'w-full max-w-md bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8');

    // Logo / Header
    const header = el('div', 'text-center mb-8');
    header.appendChild(el('h1', 'text-3xl font-bold text-[var(--text)]', 'Concrete'));
    header.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-1', 'Construction Financial Platform'));
    card.appendChild(header);

    // Login Form
    const form = el('form', '');

    // Error message area (hidden by default)
    const errorDiv = el('div', 'hidden mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm');
    errorDiv.id = 'login-error';
    form.appendChild(errorDiv);

    form.appendChild(buildField('Username or Email', textInput('usernameOrEmail', 'Enter username or email')));
    form.appendChild(buildField('Password', textInput('password', 'Enter password', 'password')));

    // MFA Code (hidden initially, shown when needed)
    const mfaGroup = el('div', 'mb-4');
    mfaGroup.id = 'mfa-group';
    mfaGroup.style.display = 'none';
    mfaGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'MFA Code'));
    const mfaInput = textInput('mfaCode', '000000');
    mfaInput.maxLength = 6;
    mfaInput.setAttribute('pattern', '[0-9]{6}');
    mfaInput.setAttribute('inputmode', 'numeric');
    mfaGroup.appendChild(mfaInput);
    mfaGroup.appendChild(el('p', 'text-xs text-[var(--text-muted)] mt-1', 'Enter the 6-digit code from your authenticator app.'));
    form.appendChild(mfaGroup);

    // Show MFA toggle link
    const showMfa = el('button', 'text-xs text-[var(--accent)] hover:underline mb-4 block', 'Have an MFA code?');
    showMfa.type = 'button';
    showMfa.addEventListener('click', () => {
      mfaGroup.style.display = mfaGroup.style.display === 'none' ? 'block' : 'none';
    });
    form.appendChild(showMfa);

    // Remember me & forgot password
    const rememberRow = el('div', 'flex items-center justify-between mb-6');
    const rememberLabel = el('label', 'flex items-center gap-2');
    const rememberCheckbox = el('input', 'rounded border-[var(--border)]') as HTMLInputElement;
    rememberCheckbox.type = 'checkbox';
    rememberCheckbox.name = 'remember';
    rememberLabel.appendChild(rememberCheckbox);
    rememberLabel.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Remember me'));
    rememberRow.appendChild(rememberLabel);
    const forgotLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Forgot password?') as HTMLAnchorElement;
    forgotLink.href = '#/auth/forgot-password';
    rememberRow.appendChild(forgotLink);
    form.appendChild(rememberRow);

    // Login button
    const loginBtn = el('button', 'w-full px-4 py-2.5 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Sign In');
    loginBtn.type = 'button';
    loginBtn.addEventListener('click', () => { /* login placeholder */ });
    form.appendChild(loginBtn);

    card.appendChild(form);

    // SSO Buttons
    card.appendChild(buildSSOButtons());

    // Registration link
    const regRow = el('div', 'text-center mt-6');
    regRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Need an account? '));
    const regLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Request Access') as HTMLAnchorElement;
    regLink.href = '#/auth/register';
    regRow.appendChild(regLink);
    card.appendChild(regRow);

    outer.appendChild(card);
    container.appendChild(outer);
  },
};

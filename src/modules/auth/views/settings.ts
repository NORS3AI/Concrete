/**
 * Auth Settings view.
 * Configuration for session timeout, password policy, MFA requirements,
 * CORS, and rate limiting.
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
  description?: string,
): HTMLElement {
  const group = el('div', '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  if (description) {
    group.appendChild(el('p', 'text-xs text-[var(--text-muted)] mt-1', description));
  }
  return group;
}

function numberInput(name: string, value: string, min?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.value = value;
  if (min) input.min = min;
  return input;
}

function textInput(name: string, value: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function checkboxInput(name: string, label: string, checked: boolean): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');
  const input = el('input', 'rounded border-[var(--border)]') as HTMLInputElement;
  input.type = 'checkbox';
  input.name = name;
  input.checked = checked;
  wrapper.appendChild(input);
  wrapper.appendChild(el('span', 'text-sm text-[var(--text)]', label));
  return wrapper;
}

// ---------------------------------------------------------------------------
// Section Builder
// ---------------------------------------------------------------------------

function buildSection(title: string, description: string, content: HTMLElement): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-1', title));
  section.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', description));
  section.appendChild(content);
  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-6');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Auth Settings'));
    wrapper.appendChild(headerRow);

    // Session Settings
    const sessionGrid = el('div', 'grid grid-cols-2 gap-4');
    sessionGrid.appendChild(buildField('Session Timeout (minutes)', numberInput('sessionTimeoutMinutes', '480', '1'), 'How long before an idle session expires.'));
    sessionGrid.appendChild(buildField('Max Failed Login Attempts', numberInput('maxFailedLoginAttempts', '5', '1'), 'Number of failed attempts before account lockout.'));
    sessionGrid.appendChild(buildField('Lockout Duration (minutes)', numberInput('lockoutDurationMinutes', '30', '1'), 'How long an account stays locked after exceeding max attempts.'));
    wrapper.appendChild(buildSection('Session & Lockout', 'Configure session timeout and account lockout policy.', sessionGrid));

    // Password Policy
    const pwGrid = el('div', 'space-y-4');
    const pwLenRow = el('div', 'grid grid-cols-2 gap-4');
    pwLenRow.appendChild(buildField('Minimum Password Length', numberInput('passwordMinLength', '8', '4')));
    pwLenRow.appendChild(buildField('Password Expiry (days)', numberInput('passwordExpiryDays', '90', '0'), 'Set to 0 for no expiry.'));
    pwGrid.appendChild(pwLenRow);
    const pwReqRow = el('div', 'flex flex-wrap gap-6 mt-2');
    pwReqRow.appendChild(checkboxInput('passwordRequireUppercase', 'Require uppercase letter', true));
    pwReqRow.appendChild(checkboxInput('passwordRequireLowercase', 'Require lowercase letter', true));
    pwReqRow.appendChild(checkboxInput('passwordRequireNumber', 'Require number', true));
    pwReqRow.appendChild(checkboxInput('passwordRequireSpecial', 'Require special character', false));
    pwGrid.appendChild(pwReqRow);
    wrapper.appendChild(buildSection('Password Policy', 'Set password complexity and expiration requirements.', pwGrid));

    // MFA Settings
    const mfaGrid = el('div', 'space-y-4');
    mfaGrid.appendChild(checkboxInput('mfaRequired', 'Require MFA for all users', false));
    mfaGrid.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'When enabled, all users must set up multi-factor authentication before accessing the system.'));
    wrapper.appendChild(buildSection('Multi-Factor Authentication', 'Configure MFA requirements.', mfaGrid));

    // SSO Settings
    const ssoGrid = el('div', 'space-y-4');
    const ssoCheckboxes = el('div', 'flex flex-wrap gap-6');
    ssoCheckboxes.appendChild(checkboxInput('sso_saml', 'SAML 2.0', false));
    ssoCheckboxes.appendChild(checkboxInput('sso_oidc', 'OpenID Connect', false));
    ssoCheckboxes.appendChild(checkboxInput('sso_google', 'Google', false));
    ssoCheckboxes.appendChild(checkboxInput('sso_microsoft', 'Microsoft', false));
    ssoGrid.appendChild(ssoCheckboxes);
    wrapper.appendChild(buildSection('Single Sign-On (SSO)', 'Enable SSO providers for federated authentication.', ssoGrid));

    // CORS & Rate Limiting
    const corsGrid = el('div', 'grid grid-cols-2 gap-4');
    corsGrid.appendChild(buildField('Allowed Origins', textInput('corsAllowedOrigins', '*', 'Comma-separated origins or * for all'), 'CORS allowed origins for API requests.'));
    corsGrid.appendChild(buildField('Rate Limit (requests/min)', numberInput('rateLimitRequestsPerMinute', '100', '1'), 'Maximum API requests per minute per user.'));
    wrapper.appendChild(buildSection('CORS & Rate Limiting', 'Configure cross-origin access and request rate limits.', corsGrid));

    // API Key Settings
    const apiGrid = el('div', 'grid grid-cols-2 gap-4');
    apiGrid.appendChild(buildField('Default API Key Expiry (days)', numberInput('apiKeyExpiryDays', '365', '1'), 'Default expiration for newly generated API keys.'));
    wrapper.appendChild(buildSection('API Keys', 'Configure default settings for API key generation.', apiGrid));

    // Data Encryption
    const encGrid = el('div', 'space-y-4');
    encGrid.appendChild(checkboxInput('encryptAtRest', 'Encrypt data at rest (localStorage)', false));
    encGrid.appendChild(checkboxInput('encryptExports', 'Encrypt exported files', false));
    encGrid.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Note: Client-side encryption provides limited security. For production use, enable server-side encryption.'));
    wrapper.appendChild(buildSection('Data Encryption', 'Configure encryption settings for stored data.', encGrid));

    // Save button
    const btnRow = el('div', 'flex items-center gap-3');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Settings');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);
    const resetBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Reset to Defaults');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => { /* reset placeholder */ });
    btnRow.appendChild(resetBtn);
    wrapper.appendChild(btnRow);

    container.appendChild(wrapper);
  },
};

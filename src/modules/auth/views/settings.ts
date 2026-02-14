/**
 * Auth Settings view.
 * Configuration for session timeout, password policy, MFA requirements,
 * CORS, and rate limiting.
 * Wired to AuthService for live data.
 */

import { getAuthService } from '../service-accessor';
import { DEFAULT_AUTH_SETTINGS } from '../auth-service';
import type { AuthSettings } from '../auth-service';

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

function numberInput(name: string, value: number, min?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.value = String(value);
  if (min) input.min = min;
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
// SSO Providers
// ---------------------------------------------------------------------------

const SSO_PROVIDERS = ['saml', 'oidc', 'google', 'microsoft'] as const;

const SSO_LABELS: Record<string, string> = {
  saml: 'SAML 2.0',
  oidc: 'OpenID Connect',
  google: 'Google',
  microsoft: 'Microsoft',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const svc = getAuthService();

    const wrapper = el('div', 'space-y-6');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Auth Settings'));
    wrapper.appendChild(headerRow);

    // We build the form inside a container that we can re-populate
    const formArea = el('div', 'space-y-6');
    wrapper.appendChild(formArea);

    // Save / Reset buttons
    const btnRow = el('div', 'flex items-center gap-3');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Settings');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      try {
        const changes = gatherFormValues();
        await svc.updateSettings(changes);
        showMsg(wrapper, 'Settings saved successfully.', false);
      } catch (err: unknown) {
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to save settings.', true);
      }
    });
    btnRow.appendChild(saveBtn);

    const resetBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Reset to Defaults');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to reset all settings to their default values?')) return;
      try {
        await svc.updateSettings(DEFAULT_AUTH_SETTINGS);
        showMsg(wrapper, 'Settings reset to defaults.', false);
        populateForm(DEFAULT_AUTH_SETTINGS);
      } catch (err: unknown) {
        showMsg(wrapper, err instanceof Error ? err.message : 'Failed to reset settings.', true);
      }
    });
    btnRow.appendChild(resetBtn);
    wrapper.appendChild(btnRow);

    container.appendChild(wrapper);

    // Build the form sections
    function buildForm(settings: AuthSettings): void {
      formArea.innerHTML = '';

      // Session & Lockout
      const sessionGrid = el('div', 'grid grid-cols-2 gap-4');
      sessionGrid.appendChild(buildField('Session Timeout (minutes)', numberInput('sessionTimeoutMinutes', settings.sessionTimeoutMinutes, '1'), 'How long before an idle session expires.'));
      sessionGrid.appendChild(buildField('Max Failed Login Attempts', numberInput('maxFailedLoginAttempts', settings.maxFailedLoginAttempts, '1'), 'Number of failed attempts before account lockout.'));
      sessionGrid.appendChild(buildField('Lockout Duration (minutes)', numberInput('lockoutDurationMinutes', settings.lockoutDurationMinutes, '1'), 'How long an account stays locked after exceeding max attempts.'));
      formArea.appendChild(buildSection('Session & Lockout', 'Configure session timeout and account lockout policy.', sessionGrid));

      // Password Policy
      const pwGrid = el('div', 'space-y-4');
      const pwLenRow = el('div', 'grid grid-cols-2 gap-4');
      pwLenRow.appendChild(buildField('Minimum Password Length', numberInput('passwordMinLength', settings.passwordMinLength, '4')));
      pwLenRow.appendChild(buildField('Password Expiry (days)', numberInput('passwordExpiryDays', settings.passwordExpiryDays, '0'), 'Set to 0 for no expiry.'));
      pwGrid.appendChild(pwLenRow);
      const pwReqRow = el('div', 'flex flex-wrap gap-6 mt-2');
      pwReqRow.appendChild(checkboxInput('passwordRequireUppercase', 'Require uppercase letter', settings.passwordRequireUppercase));
      pwReqRow.appendChild(checkboxInput('passwordRequireLowercase', 'Require lowercase letter', settings.passwordRequireLowercase));
      pwReqRow.appendChild(checkboxInput('passwordRequireNumber', 'Require number', settings.passwordRequireNumber));
      pwReqRow.appendChild(checkboxInput('passwordRequireSpecial', 'Require special character', settings.passwordRequireSpecial));
      pwGrid.appendChild(pwReqRow);
      formArea.appendChild(buildSection('Password Policy', 'Set password complexity and expiration requirements.', pwGrid));

      // MFA
      const mfaGrid = el('div', 'space-y-4');
      mfaGrid.appendChild(checkboxInput('mfaRequired', 'Require MFA for all users', settings.mfaRequired));
      mfaGrid.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'When enabled, all users must set up multi-factor authentication before accessing the system.'));
      formArea.appendChild(buildSection('Multi-Factor Authentication', 'Configure MFA requirements.', mfaGrid));

      // SSO Providers
      const ssoGrid = el('div', 'space-y-4');
      const ssoCheckboxes = el('div', 'flex flex-wrap gap-6');
      for (const provider of SSO_PROVIDERS) {
        const isChecked = settings.allowedSSOProviders.includes(provider);
        ssoCheckboxes.appendChild(checkboxInput(`sso_${provider}`, SSO_LABELS[provider], isChecked));
      }
      ssoGrid.appendChild(ssoCheckboxes);
      formArea.appendChild(buildSection('Single Sign-On (SSO)', 'Enable SSO providers for federated authentication.', ssoGrid));

      // CORS & Rate Limiting
      const corsGrid = el('div', 'grid grid-cols-2 gap-4');
      const originsGroup = el('div', '');
      originsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Allowed Origins'));
      const originsTextarea = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] h-24') as HTMLTextAreaElement;
      originsTextarea.name = 'corsAllowedOrigins';
      originsTextarea.placeholder = 'One origin per line, or * for all';
      originsTextarea.value = settings.corsAllowedOrigins.join('\n');
      originsGroup.appendChild(originsTextarea);
      originsGroup.appendChild(el('p', 'text-xs text-[var(--text-muted)] mt-1', 'CORS allowed origins for API requests. One per line.'));
      corsGrid.appendChild(originsGroup);
      corsGrid.appendChild(buildField('Rate Limit (requests/min)', numberInput('rateLimitRequestsPerMinute', settings.rateLimitRequestsPerMinute, '1'), 'Maximum API requests per minute per user.'));
      formArea.appendChild(buildSection('CORS & Rate Limiting', 'Configure cross-origin access and request rate limits.', corsGrid));

      // API Key Settings
      const apiGrid = el('div', 'grid grid-cols-2 gap-4');
      apiGrid.appendChild(buildField('Default API Key Expiry (days)', numberInput('apiKeyExpiryDays', settings.apiKeyExpiryDays, '1'), 'Default expiration for newly generated API keys.'));
      formArea.appendChild(buildSection('API Keys', 'Configure default settings for API key generation.', apiGrid));
    }

    // Populate form with settings (re-builds entire form)
    function populateForm(settings: AuthSettings): void {
      buildForm(settings);
    }

    // Gather current form values
    function gatherFormValues(): Partial<AuthSettings> {
      const getNum = (name: string): number => {
        const input = formArea.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
        return input ? parseInt(input.value, 10) || 0 : 0;
      };

      const getBool = (name: string): boolean => {
        const input = formArea.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
        return input ? input.checked : false;
      };

      // Gather SSO providers
      const ssoProviders: string[] = [];
      for (const provider of SSO_PROVIDERS) {
        if (getBool(`sso_${provider}`)) {
          ssoProviders.push(provider);
        }
      }

      // Gather CORS origins
      const originsTextarea = formArea.querySelector('[name="corsAllowedOrigins"]') as HTMLTextAreaElement | null;
      const corsOrigins = originsTextarea
        ? originsTextarea.value.split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
        : ['*'];

      return {
        sessionTimeoutMinutes: getNum('sessionTimeoutMinutes'),
        maxFailedLoginAttempts: getNum('maxFailedLoginAttempts'),
        lockoutDurationMinutes: getNum('lockoutDurationMinutes'),
        passwordMinLength: getNum('passwordMinLength'),
        passwordExpiryDays: getNum('passwordExpiryDays'),
        passwordRequireUppercase: getBool('passwordRequireUppercase'),
        passwordRequireLowercase: getBool('passwordRequireLowercase'),
        passwordRequireNumber: getBool('passwordRequireNumber'),
        passwordRequireSpecial: getBool('passwordRequireSpecial'),
        mfaRequired: getBool('mfaRequired'),
        allowedSSOProviders: ssoProviders as AuthSettings['allowedSSOProviders'],
        corsAllowedOrigins: corsOrigins,
        rateLimitRequestsPerMinute: getNum('rateLimitRequestsPerMinute'),
        apiKeyExpiryDays: getNum('apiKeyExpiryDays'),
      };
    }

    // Initial load
    try {
      const settings = svc.getSettings();
      populateForm(settings);
    } catch (err: unknown) {
      showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load settings.', true);
    }
  },
};

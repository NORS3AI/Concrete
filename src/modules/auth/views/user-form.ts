/**
 * User create/edit form view.
 * Full user details with role assignment, MFA toggle, and status management.
 * Wired to AuthService for live data.
 */

import { getAuthService } from '../service-accessor';

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
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const svc = getAuthService();

    // Determine create vs. edit mode from hash
    const hash = window.location.hash; // e.g. #/auth/users/new or #/auth/users/{id}
    const segments = hash.replace('#/', '').split('/');
    const idParam = segments[2]; // 'new' or an actual ID
    const isCreate = idParam === 'new';

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isCreate ? 'Create User' : 'Edit User'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Users') as HTMLAnchorElement;
    backLink.href = '#/auth/users';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Load existing user data if editing
    let existingUser: ReturnType<typeof svc.getUser> = null;
    if (!isCreate) {
      existingUser = svc.getUser(idParam);
      if (!existingUser) {
        showMsg(wrapper, `User with ID "${idParam}" not found.`, true);
        container.appendChild(wrapper);
        return;
      }
    }

    // Load roles for dropdown
    const roles = svc.getRoles();
    const roleOptions: { value: string; label: string }[] = [
      { value: '', label: 'Select Role' },
    ];
    for (const r of roles) {
      roleOptions.push({ value: r.id!, label: r.name });
    }

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // ------- Section: Account Information -------
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Account Information'));
    const acctGrid = el('div', 'grid grid-cols-2 gap-4');

    const usernameInput = textInput('username', 'Enter username');
    const emailInput = textInput('email', 'user@example.com', 'email');
    const displayNameInput = textInput('displayName', 'Full name');
    const passwordInput = textInput('password', isCreate ? 'Set password' : 'Leave blank to keep current', 'password');

    if (existingUser) {
      usernameInput.value = existingUser.username ?? '';
      emailInput.value = existingUser.email ?? '';
      displayNameInput.value = existingUser.displayName ?? '';
    }

    acctGrid.appendChild(buildField('Username *', usernameInput));
    acctGrid.appendChild(buildField('Email *', emailInput));
    acctGrid.appendChild(buildField('Display Name *', displayNameInput));
    acctGrid.appendChild(buildField(isCreate ? 'Password *' : 'Password', passwordInput));
    form.appendChild(acctGrid);

    // ------- Section: Role & Status -------
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Role & Status'));
    const roleGrid = el('div', 'grid grid-cols-2 gap-4');

    const roleSelect = selectInput('roleId', roleOptions);
    const statusSelect = selectInput('status', STATUS_OPTIONS);

    if (existingUser) {
      roleSelect.value = existingUser.roleId ?? '';
      statusSelect.value = existingUser.status ?? 'active';
    }

    roleGrid.appendChild(buildField('Role', roleSelect));
    roleGrid.appendChild(buildField('Status', statusSelect));
    form.appendChild(roleGrid);

    // ------- Section: Profile Information -------
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Profile Information'));
    const profileGrid = el('div', 'grid grid-cols-2 gap-4');

    const phoneInput = textInput('phone', '(555) 555-5555', 'tel');
    const departmentInput = textInput('department', 'Department');
    const titleInput = textInput('title', 'Job title');
    const avatarInput = textInput('avatar', 'https://');

    if (existingUser) {
      phoneInput.value = existingUser.phone ?? '';
      departmentInput.value = existingUser.department ?? '';
      titleInput.value = existingUser.title ?? '';
      avatarInput.value = existingUser.avatar ?? '';
    }

    profileGrid.appendChild(buildField('Phone', phoneInput));
    profileGrid.appendChild(buildField('Department', departmentInput));
    profileGrid.appendChild(buildField('Title', titleInput));
    profileGrid.appendChild(buildField('Avatar URL', avatarInput));
    form.appendChild(profileGrid);

    // ------- Section: Authentication -------
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Authentication'));
    const authGrid = el('div', 'grid grid-cols-2 gap-4');

    const ssoSelect = selectInput('ssoProvider', SSO_OPTIONS);
    const ssoIdInput = textInput('ssoExternalId', 'External user ID');

    if (existingUser) {
      ssoSelect.value = existingUser.ssoProvider ?? 'none';
      ssoIdInput.value = existingUser.ssoExternalId ?? '';
    }

    authGrid.appendChild(buildField('SSO Provider', ssoSelect));
    authGrid.appendChild(buildField('SSO External ID', ssoIdInput));

    // MFA controls
    const mfaGroup = el('div', 'col-span-2 mt-2');
    if (!isCreate && existingUser) {
      const mfaStatus = el('div', 'flex items-center gap-4');
      const mfaLabel = el('span', 'text-sm text-[var(--text)]',
        `MFA Status: ${existingUser.mfaEnabled ? 'Enabled' : 'Disabled'}`);
      mfaStatus.appendChild(mfaLabel);

      if (existingUser.mfaEnabled) {
        const disableMfaBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10', 'Disable MFA');
        disableMfaBtn.type = 'button';
        disableMfaBtn.addEventListener('click', async () => {
          try {
            await svc.disableMFA(existingUser!.id!);
            showMsg(card, 'MFA has been disabled for this user.', false);
            // Re-render the form to reflect updated state
            this.render(container);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to disable MFA.';
            showMsg(card, message, true);
          }
        });
        mfaStatus.appendChild(disableMfaBtn);
      } else {
        const enableMfaBtn = el('button', 'px-3 py-1 rounded-md text-xs font-medium text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10', 'Enable MFA');
        enableMfaBtn.type = 'button';
        enableMfaBtn.addEventListener('click', async () => {
          try {
            const mfaResult = await svc.enableMFA(existingUser!.id!);
            const infoDiv = el('div', 'mt-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md');
            infoDiv.appendChild(el('p', 'text-sm font-medium text-[var(--text)] mb-2', 'MFA Setup'));
            infoDiv.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-1', `Secret: ${mfaResult.secret}`));
            infoDiv.appendChild(el('p', 'text-xs text-[var(--text-muted)]', `QR Data: ${mfaResult.qrData}`));
            mfaGroup.appendChild(infoDiv);
            showMsg(card, 'MFA has been enabled. Share the secret or QR data with the user.', false);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to enable MFA.';
            showMsg(card, message, true);
          }
        });
        mfaStatus.appendChild(enableMfaBtn);
      }

      mfaGroup.appendChild(mfaStatus);
    } else {
      // Create mode: simple checkbox
      const mfaCheckWrap = el('div', 'flex items-center gap-2');
      const mfaCheckbox = el('input', 'rounded border-[var(--border)]') as HTMLInputElement;
      mfaCheckbox.type = 'checkbox';
      mfaCheckbox.name = 'mfaEnabled';
      mfaCheckWrap.appendChild(mfaCheckbox);
      mfaCheckWrap.appendChild(el('span', 'text-sm text-[var(--text)]', 'Enable Multi-Factor Authentication (MFA)'));
      mfaGroup.appendChild(mfaCheckWrap);
    }
    authGrid.appendChild(mfaGroup);
    form.appendChild(authGrid);

    // ------- Reset Password Section (edit only) -------
    if (!isCreate && existingUser) {
      form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Reset Password'));
      const resetGrid = el('div', 'flex items-end gap-3');
      const newPwInput = textInput('newPassword', 'Enter new password', 'password');
      newPwInput.className += ' flex-1';
      resetGrid.appendChild(buildField('New Password', newPwInput));

      const resetBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-amber-400 border border-amber-400/30 hover:bg-amber-400/10', 'Reset Password');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', async () => {
        const newPw = newPwInput.value;
        if (!newPw) {
          showMsg(card, 'Please enter a new password.', true);
          return;
        }
        try {
          await svc.resetPassword(existingUser!.id!, newPw);
          newPwInput.value = '';
          showMsg(card, 'Password has been reset successfully.', false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to reset password.';
          showMsg(card, message, true);
        }
      });
      resetGrid.appendChild(resetBtn);
      form.appendChild(resetGrid);
    }

    // ------- Action Buttons -------
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', isCreate ? 'Create User' : 'Save Changes');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const displayName = displayNameInput.value.trim();
      const password = passwordInput.value;

      // Validate required fields
      if (!username || !email || !displayName) {
        showMsg(card, 'Username, email, and display name are required.', true);
        return;
      }
      if (isCreate && !password) {
        showMsg(card, 'Password is required for new users.', true);
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        if (isCreate) {
          await svc.createUser({
            username,
            email,
            displayName,
            password,
            roleId: roleSelect.value || undefined,
            status: statusSelect.value as 'active' | 'inactive' | 'locked' | 'pending',
            phone: phoneInput.value.trim() || undefined,
            department: departmentInput.value.trim() || undefined,
            title: titleInput.value.trim() || undefined,
            ssoProvider: ssoSelect.value as 'none' | 'saml' | 'oidc' | 'google' | 'microsoft',
            ssoExternalId: ssoIdInput.value.trim() || undefined,
          });
        } else {
          const changes: Record<string, unknown> = {
            username,
            email,
            displayName,
            roleId: roleSelect.value || undefined,
            status: statusSelect.value,
            phone: phoneInput.value.trim() || undefined,
            department: departmentInput.value.trim() || undefined,
            title: titleInput.value.trim() || undefined,
            ssoProvider: ssoSelect.value,
            ssoExternalId: ssoIdInput.value.trim() || undefined,
          };
          // Only include password if explicitly provided during edit
          if (password) {
            changes.password = password;
          }
          await svc.updateUser(idParam, changes);
        }

        // Navigate back to list
        window.location.hash = '#/auth/users';
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save user.';
        showMsg(card, message, true);
        saveBtn.disabled = false;
        saveBtn.textContent = isCreate ? 'Create User' : 'Save Changes';
      }
    });
    btnRow.appendChild(saveBtn);

    // Deactivate button (edit mode, active users only)
    if (!isCreate && existingUser && existingUser.status === 'active') {
      const deactivateBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10', 'Deactivate');
      deactivateBtn.type = 'button';
      deactivateBtn.addEventListener('click', async () => {
        if (!confirm(`Deactivate user "${existingUser!.username}"? They will no longer be able to log in.`)) return;
        try {
          await svc.deactivateUser(existingUser!.id!);
          showMsg(card, 'User has been deactivated.', false);
          setTimeout(() => { window.location.hash = '#/auth/users'; }, 1000);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to deactivate user.';
          showMsg(card, message, true);
        }
      });
      btnRow.appendChild(deactivateBtn);
    }

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/auth/users';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

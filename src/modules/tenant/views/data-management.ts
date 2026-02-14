/**
 * Data Management view.
 * Export all data button, schedule deletion, GDPR/CCPA compliance.
 * Wired to TenantService for live data.
 */

import { getTenantService } from '../service-accessor';

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

/**
 * Resolve a tenantId for data management.
 * Tries #/tenant/{id}/data-management first, then falls back to
 * first tenant from getTenants().
 */
async function resolveTenantId(): Promise<string> {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  // #/tenant/{id}/data-management
  if (parts.length >= 3 && parts[0] === 'tenant' && parts[1] !== 'data-management') {
    return parts[1];
  }
  // Fallback: get first tenant from service
  const svc = getTenantService();
  const tenants = await svc.getTenants();
  if (tenants.length > 0) {
    return tenants[0].id;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Data Export Section
// ---------------------------------------------------------------------------

function buildExportSection(tenantId: string, wrapper: HTMLElement): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');

  const header = el('div', 'flex items-start gap-4 mb-4');
  const iconBox = el('div', 'w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-lg');
  iconBox.textContent = 'D';
  header.appendChild(iconBox);
  const headerText = el('div', '');
  headerText.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', 'Data Export'));
  headerText.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Download a complete copy of all your tenant data in JSON format. This includes tenant configuration, users, subscriptions, and branding settings.'));
  header.appendChild(headerText);
  card.appendChild(header);

  const infoBox = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 mb-4');
  const infoTitle = el('div', 'font-medium text-sm text-[var(--text)] mb-2');
  infoTitle.textContent = 'Export includes:';
  infoBox.appendChild(infoTitle);

  const items = [
    'Tenant profile and settings',
    'Configuration (COA templates, tax tables, features)',
    'Subscription and billing history',
    'User list and roles',
    'Branding settings (colors, logos, custom CSS)',
  ];

  const itemList = el('ul', 'space-y-1');
  for (const item of items) {
    itemList.appendChild(el('li', 'text-sm text-[var(--text-muted)]', `- ${item}`));
  }
  infoBox.appendChild(itemList);
  card.appendChild(infoBox);

  const btnRow = el('div', 'flex items-center gap-3');
  const exportBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Export All Data');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', async () => {
    try {
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting...';

      const svc = getTenantService();
      const exportData = await svc.exportAllTenantData(tenantId);

      // Create and trigger download
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tenant-export-${tenantId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMsg(wrapper, `Data exported successfully at ${exportData.exportedAt}.`, false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMsg(wrapper, `Failed to export data: ${message}`, true);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export All Data';
    }
  });
  btnRow.appendChild(exportBtn);

  const formatInfo = el('span', 'text-xs text-[var(--text-muted)]', 'JSON format, typically completes in seconds');
  btnRow.appendChild(formatInfo);
  card.appendChild(btnRow);

  return card;
}

// ---------------------------------------------------------------------------
// Data Deletion Section
// ---------------------------------------------------------------------------

function buildDeletionSection(tenantId: string, wrapper: HTMLElement): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-red-500/20 rounded-lg p-6');

  const header = el('div', 'flex items-start gap-4 mb-4');
  const iconBox = el('div', 'w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-lg');
  iconBox.textContent = 'X';
  header.appendChild(iconBox);
  const headerText = el('div', '');
  headerText.appendChild(el('h2', 'text-lg font-semibold text-red-400', 'Data Deletion'));
  headerText.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Permanently delete all tenant data. This action is irreversible and complies with GDPR Article 17 (Right to Erasure) and CCPA requirements.'));
  header.appendChild(headerText);
  card.appendChild(header);

  // Warning box
  const warningBox = el('div', 'bg-red-500/5 border border-red-500/20 rounded-md p-4 mb-4');
  warningBox.appendChild(el('div', 'font-medium text-sm text-red-400 mb-2', 'Warning: This action cannot be undone'));
  const warningItems = [
    'All tenant data will be permanently deleted',
    'All user access will be revoked immediately',
    'Active subscriptions will be cancelled',
    'Custom branding and configuration will be lost',
    'A confirmation code will be required to proceed',
  ];
  const warningList = el('ul', 'space-y-1');
  for (const item of warningItems) {
    warningList.appendChild(el('li', 'text-sm text-red-400/80', `- ${item}`));
  }
  warningBox.appendChild(warningList);
  card.appendChild(warningBox);

  // Step 1: Schedule deletion
  const step1 = el('div', 'mb-4');
  step1.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-2', 'Step 1: Request Deletion'));
  step1.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-3', 'Clicking this button will generate a confirmation code. You must enter this code in Step 2 to complete the deletion.'));

  const scheduleBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10', 'Schedule Deletion');
  scheduleBtn.type = 'button';

  // Code display area (initially hidden)
  const codeDisplay = el('div', 'mt-3 hidden');
  step1.appendChild(scheduleBtn);
  step1.appendChild(codeDisplay);
  card.appendChild(step1);

  // Step 2: Confirm deletion
  const step2 = el('div', 'opacity-50');
  step2.setAttribute('data-step2', '1');
  step2.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-2', 'Step 2: Confirm Deletion'));
  step2.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-3', 'Enter the confirmation code from Step 1 to permanently delete all data.'));

  const confirmRow = el('div', 'flex items-center gap-3');
  const codeInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] font-mono w-48') as HTMLInputElement;
  codeInput.type = 'text';
  codeInput.placeholder = 'Enter confirmation code';
  codeInput.disabled = true;
  confirmRow.appendChild(codeInput);

  const confirmBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50', 'Confirm Permanent Deletion') as HTMLButtonElement;
  confirmBtn.type = 'button';
  confirmBtn.disabled = true;
  confirmRow.appendChild(confirmBtn);
  step2.appendChild(confirmRow);
  card.appendChild(step2);

  // Wire schedule deletion button
  scheduleBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Are you sure you want to schedule this tenant for deletion? This will generate a confirmation code.',
    );
    if (!confirmed) return;

    try {
      const svc = getTenantService();
      const request = await svc.scheduleDeletion(tenantId);

      // Show the confirmation code
      codeDisplay.className = 'mt-3';
      codeDisplay.innerHTML = '';
      const codeBox = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
      codeBox.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', 'Your confirmation code:'));
      codeBox.appendChild(el('div', 'text-lg font-mono font-bold text-red-400', request.confirmationCode));
      codeBox.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', `Scheduled at: ${request.scheduledAt}`));
      codeDisplay.appendChild(codeBox);

      // Enable Step 2
      step2.classList.remove('opacity-50');
      codeInput.disabled = false;
      confirmBtn.disabled = false;

      showMsg(wrapper, 'Deletion scheduled. Enter the confirmation code in Step 2 to proceed.', false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMsg(wrapper, `Failed to schedule deletion: ${message}`, true);
    }
  });

  // Wire confirm deletion button
  confirmBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (!code) {
      showMsg(wrapper, 'Please enter the confirmation code.', true);
      return;
    }

    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';

      const svc = getTenantService();
      await svc.confirmDeletion(tenantId, code);

      showMsg(wrapper, 'Tenant data has been permanently deleted.', false);

      // Navigate to tenant list after a brief delay
      setTimeout(() => {
        window.location.hash = '#/tenant/list';
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMsg(wrapper, `Failed to confirm deletion: ${message}`, true);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Permanent Deletion';
    }
  });

  return card;
}

// ---------------------------------------------------------------------------
// GDPR Info Section
// ---------------------------------------------------------------------------

function buildGdprInfo(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Privacy & Compliance'));

  const grid = el('div', 'grid grid-cols-2 gap-4');

  const gdprBox = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4');
  gdprBox.appendChild(el('h3', 'font-medium text-sm text-[var(--text)] mb-2', 'GDPR Compliance'));
  const gdprItems = [
    'Right to access (data export)',
    'Right to erasure (data deletion)',
    'Right to data portability (JSON export)',
    'Data residency controls (US/EU/APAC)',
  ];
  for (const item of gdprItems) {
    gdprBox.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', `- ${item}`));
  }
  grid.appendChild(gdprBox);

  const ccpaBox = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4');
  ccpaBox.appendChild(el('h3', 'font-medium text-sm text-[var(--text)] mb-2', 'CCPA Compliance'));
  const ccpaItems = [
    'Right to know (data access)',
    'Right to delete (data deletion)',
    'Right to opt-out (analytics opt-in only)',
    'Non-discrimination in service',
  ];
  for (const item of ccpaItems) {
    ccpaBox.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', `- ${item}`));
  }
  grid.appendChild(ccpaBox);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Data Management'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Show loading state
    const loadingEl = el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading...');
    wrapper.appendChild(loadingEl);
    container.appendChild(wrapper);

    resolveTenantId()
      .then((tenantId) => {
        loadingEl.remove();

        if (!tenantId) {
          showMsg(wrapper, 'Could not determine tenant ID. Please navigate from the tenant list.', true);
          return;
        }

        wrapper.appendChild(buildExportSection(tenantId, wrapper));
        wrapper.appendChild(buildGdprInfo());
        wrapper.appendChild(buildDeletionSection(tenantId, wrapper));
      })
      .catch((err: unknown) => {
        loadingEl.remove();
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to initialize data management: ${message}`, true);
      });
  },
};

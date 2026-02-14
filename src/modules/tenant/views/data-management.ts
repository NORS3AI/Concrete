/**
 * Data Management view.
 * Export all data button, schedule deletion, GDPR/CCPA compliance.
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
// Data Export Section
// ---------------------------------------------------------------------------

function buildExportSection(): HTMLElement {
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
  exportBtn.addEventListener('click', () => { /* export placeholder */ });
  btnRow.appendChild(exportBtn);

  const formatInfo = el('span', 'text-xs text-[var(--text-muted)]', 'JSON format, typically completes in seconds');
  btnRow.appendChild(formatInfo);
  card.appendChild(btnRow);

  return card;
}

// ---------------------------------------------------------------------------
// Data Deletion Section
// ---------------------------------------------------------------------------

function buildDeletionSection(): HTMLElement {
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
  scheduleBtn.addEventListener('click', () => { /* schedule deletion placeholder */ });
  step1.appendChild(scheduleBtn);
  card.appendChild(step1);

  // Step 2: Confirm deletion
  const step2 = el('div', 'opacity-50');
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
  confirmBtn.addEventListener('click', () => { /* confirm deletion placeholder */ });
  confirmRow.appendChild(confirmBtn);
  step2.appendChild(confirmRow);
  card.appendChild(step2);

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

    wrapper.appendChild(buildExportSection());
    wrapper.appendChild(buildGdprInfo());
    wrapper.appendChild(buildDeletionSection());

    container.appendChild(wrapper);
  },
};

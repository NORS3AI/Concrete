/**
 * Tenant Configuration view.
 * Manage COA template, tax tables, fiscal year, timezone, and feature flags.
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

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'Central (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (America/Los_Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (America/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Pacific/Honolulu)' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'Europe/Berlin', label: 'Berlin (Europe/Berlin)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Asia/Tokyo)' },
  { value: 'Asia/Singapore', label: 'Singapore (Asia/Singapore)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia/Sydney)' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
];

const FISCAL_YEAR_OPTIONS = [
  { value: '01-01', label: 'January 1 (Calendar Year)' },
  { value: '04-01', label: 'April 1' },
  { value: '07-01', label: 'July 1' },
  { value: '10-01', label: 'October 1 (US Federal)' },
];

const FEATURE_FLAGS = [
  { key: 'multiCurrency', label: 'Multi-Currency Support', description: 'Enable transactions in multiple currencies' },
  { key: 'advancedReporting', label: 'Advanced Reporting', description: 'Custom report builder and dashboards' },
  { key: 'apiAccess', label: 'API Access', description: 'REST API for integrations' },
  { key: 'auditTrail', label: 'Audit Trail', description: 'Full audit logging of all changes' },
  { key: 'customFields', label: 'Custom Fields', description: 'User-defined fields on entities' },
  { key: 'budgeting', label: 'Budgeting Module', description: 'Budget creation and tracking' },
  { key: 'documentManagement', label: 'Document Management', description: 'File attachments and document storage' },
  { key: 'workflow', label: 'Workflow Automation', description: 'Automated approval workflows' },
];

// ---------------------------------------------------------------------------
// Form Helpers
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
    group.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', description));
  }
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
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
// Feature Flags Section
// ---------------------------------------------------------------------------

function buildFeatureFlags(): HTMLElement {
  const section = el('div', 'space-y-3');

  for (const flag of FEATURE_FLAGS) {
    const row = el('div', 'flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md');

    const toggle = el('input', 'mt-1 rounded border-[var(--border)]') as HTMLInputElement;
    toggle.type = 'checkbox';
    toggle.name = `feature_${flag.key}`;
    row.appendChild(toggle);

    const info = el('div', '');
    info.appendChild(el('div', 'text-sm font-medium text-[var(--text)]', flag.label));
    info.appendChild(el('div', 'text-xs text-[var(--text-muted)]', flag.description));
    row.appendChild(info);

    section.appendChild(row);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tenant Configuration'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Templates
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Chart of Accounts & Templates'));
    const templateGrid = el('div', 'grid grid-cols-2 gap-4');
    templateGrid.appendChild(buildField('COA Template', textInput('coaTemplateId', 'Template ID or name'), 'Pre-configured chart of accounts for this tenant'));
    templateGrid.appendChild(buildField('Tax Table', textInput('taxTableId', 'Tax table ID'), 'Tax calculation rules'));
    templateGrid.appendChild(buildField('Pay Scale', textInput('payScaleId', 'Pay scale ID'), 'Payroll pay scale template'));
    form.appendChild(templateGrid);

    // Section: Financial Settings
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial Settings'));
    const finGrid = el('div', 'grid grid-cols-2 gap-4');
    finGrid.appendChild(buildField('Fiscal Year Start', selectInput('fiscalYearStart', FISCAL_YEAR_OPTIONS)));
    finGrid.appendChild(buildField('Default Currency', selectInput('defaultCurrency', CURRENCY_OPTIONS)));
    finGrid.appendChild(buildField('Timezone', selectInput('timezone', TIMEZONE_OPTIONS)));
    form.appendChild(finGrid);

    // Section: Feature Flags
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Feature Flags'));
    form.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Enable or disable features for this tenant. Some features require specific plan levels.'));
    form.appendChild(buildFeatureFlags());

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Configuration');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const resetBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/10', 'Reset to Defaults');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => { /* reset placeholder */ });
    btnRow.appendChild(resetBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/tenant/list';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

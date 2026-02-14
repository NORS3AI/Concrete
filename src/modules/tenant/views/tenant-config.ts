/**
 * Tenant Configuration view.
 * Manage COA template, tax tables, fiscal year, timezone, and feature flags.
 * Wired to TenantService for load, save, and reset.
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

function buildFeatureFlags(features: Record<string, boolean>): HTMLElement {
  const section = el('div', 'space-y-3');

  for (const flag of FEATURE_FLAGS) {
    const row = el('div', 'flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md');

    const toggle = el('input', 'mt-1 rounded border-[var(--border)]') as HTMLInputElement;
    toggle.type = 'checkbox';
    toggle.name = `feature_${flag.key}`;
    toggle.checked = features[flag.key] === true;
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

    // Extract tenantId from hash: #/tenant/{id}/config
    const hash = window.location.hash;
    const match = hash.match(/#\/tenant\/([^/]+)\/config/);
    const tenantId = match ? match[1] : '';

    if (!tenantId) {
      container.appendChild(el('div', 'p-6 text-red-400', 'Missing tenant ID in URL.'));
      return;
    }

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tenant Configuration'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenant') as HTMLAnchorElement;
    backLink.href = `#/tenant/${tenantId}`;
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Templates
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Chart of Accounts & Templates'));
    const templateGrid = el('div', 'grid grid-cols-2 gap-4');

    const coaInput = textInput('coaTemplateId', 'Template ID or name');
    templateGrid.appendChild(buildField('COA Template', coaInput, 'Pre-configured chart of accounts for this tenant'));

    const taxInput = textInput('taxTableId', 'Tax table ID');
    templateGrid.appendChild(buildField('Tax Table', taxInput, 'Tax calculation rules'));

    const payScaleInput = textInput('payScaleId', 'Pay scale ID');
    templateGrid.appendChild(buildField('Pay Scale', payScaleInput, 'Payroll pay scale template'));

    form.appendChild(templateGrid);

    // Section: Financial Settings
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Financial Settings'));
    const finGrid = el('div', 'grid grid-cols-2 gap-4');

    const fiscalYearSelect = selectInput('fiscalYearStart', FISCAL_YEAR_OPTIONS);
    finGrid.appendChild(buildField('Fiscal Year Start', fiscalYearSelect));

    const currencySelect = selectInput('defaultCurrency', CURRENCY_OPTIONS);
    finGrid.appendChild(buildField('Default Currency', currencySelect));

    const timezoneSelect = selectInput('timezone', TIMEZONE_OPTIONS);
    finGrid.appendChild(buildField('Timezone', timezoneSelect));

    form.appendChild(finGrid);

    // Section: Feature Flags (placeholder, will be replaced after data loads)
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Feature Flags'));
    form.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Enable or disable features for this tenant. Some features require specific plan levels.'));
    const featureFlagsSlot = el('div');
    featureFlagsSlot.appendChild(buildFeatureFlags({}));
    form.appendChild(featureFlagsSlot);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Configuration');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      try {
        const svc = getTenantService();

        // Collect feature flags from checkboxes
        const features: Record<string, boolean> = {};
        for (const flag of FEATURE_FLAGS) {
          const checkbox = form.querySelector(`input[name="feature_${flag.key}"]`) as HTMLInputElement | null;
          if (checkbox) {
            features[flag.key] = checkbox.checked;
          }
        }

        await svc.updateConfig(tenantId, {
          coaTemplateId: coaInput.value.trim() || undefined,
          taxTableId: taxInput.value.trim() || undefined,
          payScaleId: payScaleInput.value.trim() || undefined,
          fiscalYearStart: fiscalYearSelect.value,
          defaultCurrency: currencySelect.value,
          timezone: timezoneSelect.value,
          features,
        });

        showMsg(wrapper, 'Configuration saved successfully.', false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to save configuration: ${message}`, true);
      }
    });
    btnRow.appendChild(saveBtn);

    const resetBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/10', 'Reset to Defaults');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset all configuration to default values? This cannot be undone.')) {
        return;
      }

      try {
        const svc = getTenantService();
        await svc.resetConfig(tenantId);
        showMsg(wrapper, 'Configuration reset to defaults.', false);
        // Re-render to show defaults
        setTimeout(() => this.render(container), 300);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to reset configuration: ${message}`, true);
      }
    });
    btnRow.appendChild(resetBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = `#/tenant/${tenantId}`;
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // Load existing config from service
    (async () => {
      try {
        const svc = getTenantService();
        const config = await svc.getConfig(tenantId);

        if (config) {
          // Populate template fields
          coaInput.value = config.coaTemplateId ?? '';
          taxInput.value = config.taxTableId ?? '';
          payScaleInput.value = config.payScaleId ?? '';

          // Populate financial settings
          fiscalYearSelect.value = config.fiscalYearStart;
          currencySelect.value = config.defaultCurrency;
          timezoneSelect.value = config.timezone;

          // Rebuild feature flags with loaded data
          featureFlagsSlot.replaceChildren(buildFeatureFlags(config.features ?? {}));
        }
        // If no config exists, the form stays empty (defaults) and will be created on save
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to load configuration: ${message}`, true);
      }
    })();
  },
};

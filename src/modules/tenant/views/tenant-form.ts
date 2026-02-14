/**
 * Tenant create/edit form view.
 * Full tenant details with name, slug, plan, data region, and owner fields.
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

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const REGION_OPTIONS = [
  { value: 'us', label: 'US (United States)' },
  { value: 'eu', label: 'EU (European Union)' },
  { value: 'apac', label: 'APAC (Asia-Pacific)' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ---------------------------------------------------------------------------
// Form Builder Helpers
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

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

// ---------------------------------------------------------------------------
// Slug Preview
// ---------------------------------------------------------------------------

function buildSlugPreview(slugInput: HTMLInputElement): HTMLElement {
  const preview = el('div', 'mt-1 text-xs text-[var(--text-muted)]');
  preview.textContent = 'Your tenant URL: __.concrete.app';

  slugInput.addEventListener('input', () => {
    const slug = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    preview.textContent = slug ? `Your tenant URL: ${slug}.concrete.app` : 'Your tenant URL: __.concrete.app';
  });

  return preview;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Tenant Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Tenant Name', textInput('name', 'Enter company name')));

    const slugField = textInput('slug', 'company-slug');
    const slugGroup = buildField('Slug', slugField);
    slugGroup.appendChild(buildSlugPreview(slugField));
    genGrid.appendChild(slugGroup);

    genGrid.appendChild(buildField('Custom Domain', textInput('domain', 'custom.example.com')));
    genGrid.appendChild(buildField('Owner ID', textInput('ownerId', 'Owner user ID')));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Plan', selectInput('plan', PLAN_OPTIONS)));
    form.appendChild(genGrid);

    // Section: Data Residency
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Data Residency'));
    const regionGrid = el('div', 'grid grid-cols-2 gap-4');
    regionGrid.appendChild(buildField('Data Region', selectInput('dataRegion', REGION_OPTIONS)));
    regionGrid.appendChild(buildField('Trial Ends At', dateInput('trialEndsAt')));
    form.appendChild(regionGrid);

    // Region info boxes
    const regionInfo = el('div', 'grid grid-cols-3 gap-3 mt-4');
    const regions = [
      { region: 'US', desc: 'AWS us-east-1, us-west-2', flag: 'US' },
      { region: 'EU', desc: 'AWS eu-west-1, eu-central-1', flag: 'EU' },
      { region: 'APAC', desc: 'AWS ap-southeast-1, ap-northeast-1', flag: 'APAC' },
    ];
    for (const r of regions) {
      const box = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3');
      box.appendChild(el('div', 'font-medium text-[var(--text)] text-sm', `${r.flag} ${r.region}`));
      box.appendChild(el('div', 'text-xs text-[var(--text-muted)] mt-1', r.desc));
      regionInfo.appendChild(box);
    }
    form.appendChild(regionInfo);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Tenant');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/tenant/list';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

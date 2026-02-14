/**
 * Tenant create/edit form view.
 * Full tenant details with name, slug, plan, data region, and owner fields.
 * Wired to TenantService for create, update, suspend, and reactivate.
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

    // Determine mode from hash: #/tenant/new = create, #/tenant/{id} = edit
    const hash = window.location.hash;
    const match = hash.match(/#\/tenant\/(.+)/);
    const paramId = match ? match[1] : 'new';
    const isEdit = paramId !== 'new';

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Tenant' : 'New Tenant'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');

    const nameInput = textInput('name', 'Enter company name');
    genGrid.appendChild(buildField('Tenant Name', nameInput));

    const slugField = textInput('slug', 'company-slug');
    const slugGroup = buildField('Slug', slugField);
    slugGroup.appendChild(buildSlugPreview(slugField));

    // Slug validation indicator
    const slugStatus = el('div', 'mt-1 text-xs');
    slugStatus.setAttribute('data-slug-status', '1');
    slugGroup.appendChild(slugStatus);
    genGrid.appendChild(slugGroup);

    // Slug on-blur validation
    slugField.addEventListener('blur', async () => {
      const slug = slugField.value.trim().toLowerCase();
      if (!slug) {
        slugStatus.textContent = '';
        slugStatus.className = 'mt-1 text-xs';
        return;
      }

      try {
        const svc = getTenantService();
        const isValid = svc.validateSlug(slug);
        if (!isValid) {
          slugStatus.textContent = 'Invalid slug format. Use 3-63 lowercase alphanumeric characters and hyphens.';
          slugStatus.className = 'mt-1 text-xs text-red-400';
          return;
        }

        const isAvailable = await svc.checkSlugAvailability(slug);
        // When editing, the current tenant's slug is "taken" by itself - that is expected
        if (!isAvailable && !(isEdit && slug === slugField.defaultValue)) {
          slugStatus.textContent = 'This slug is already taken.';
          slugStatus.className = 'mt-1 text-xs text-red-400';
          return;
        }

        slugStatus.textContent = 'Slug is valid and available.';
        slugStatus.className = 'mt-1 text-xs text-emerald-400';
      } catch {
        slugStatus.textContent = 'Could not validate slug.';
        slugStatus.className = 'mt-1 text-xs text-amber-400';
      }
    });

    const domainInput = textInput('domain', 'custom.example.com');
    genGrid.appendChild(buildField('Custom Domain', domainInput));

    const ownerIdInput = textInput('ownerId', 'Owner user ID');
    genGrid.appendChild(buildField('Owner ID', ownerIdInput));

    const statusSelect = selectInput('status', STATUS_OPTIONS);
    genGrid.appendChild(buildField('Status', statusSelect));

    const planSelect = selectInput('plan', PLAN_OPTIONS);
    genGrid.appendChild(buildField('Plan', planSelect));

    form.appendChild(genGrid);

    // Section: Data Residency
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Data Residency'));
    const regionGrid = el('div', 'grid grid-cols-2 gap-4');

    const regionSelect = selectInput('dataRegion', REGION_OPTIONS);
    regionGrid.appendChild(buildField('Data Region', regionSelect));

    const trialEndsInput = dateInput('trialEndsAt');
    regionGrid.appendChild(buildField('Trial Ends At', trialEndsInput));

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

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', isEdit ? 'Update Tenant' : 'Create Tenant');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', async () => {
      // Validate required fields
      const name = nameInput.value.trim();
      const slug = slugField.value.trim().toLowerCase();
      const ownerId = ownerIdInput.value.trim();

      if (!name) {
        showMsg(wrapper, 'Tenant name is required.', true);
        return;
      }
      if (!slug) {
        showMsg(wrapper, 'Slug is required.', true);
        return;
      }
      if (!ownerId) {
        showMsg(wrapper, 'Owner ID is required.', true);
        return;
      }

      try {
        const svc = getTenantService();

        if (isEdit) {
          await svc.updateTenant(paramId, {
            name,
            slug,
            domain: domainInput.value.trim() || undefined,
            status: statusSelect.value as 'active' | 'trial' | 'suspended' | 'cancelled',
            plan: planSelect.value as 'free' | 'starter' | 'professional' | 'enterprise',
            ownerId,
            dataRegion: regionSelect.value as 'us' | 'eu' | 'apac',
            trialEndsAt: trialEndsInput.value || undefined,
          });
          showMsg(wrapper, 'Tenant updated successfully.', false);
        } else {
          await svc.createTenant({
            name,
            slug,
            domain: domainInput.value.trim() || undefined,
            plan: planSelect.value as 'free' | 'starter' | 'professional' | 'enterprise',
            ownerId,
            dataRegion: regionSelect.value as 'us' | 'eu' | 'apac',
            trialEndsAt: trialEndsInput.value || undefined,
          });
          showMsg(wrapper, 'Tenant created successfully.', false);
        }

        // Navigate back to list
        window.location.hash = '#/tenant/list';
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to save tenant: ${message}`, true);
      }
    });
    btnRow.appendChild(saveBtn);

    // Suspend / Reactivate buttons (edit mode only, added dynamically after load)
    const suspendBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/10', 'Suspend Tenant');
    suspendBtn.type = 'button';
    suspendBtn.style.display = 'none';
    suspendBtn.addEventListener('click', async () => {
      const reason = prompt('Reason for suspension (optional):');
      try {
        const svc = getTenantService();
        await svc.suspendTenant(paramId, reason ?? undefined);
        showMsg(wrapper, 'Tenant suspended successfully.', false);
        // Re-render to reflect new state
        setTimeout(() => this.render(container), 500);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to suspend tenant: ${message}`, true);
      }
    });
    btnRow.appendChild(suspendBtn);

    const reactivateBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10', 'Reactivate Tenant');
    reactivateBtn.type = 'button';
    reactivateBtn.style.display = 'none';
    reactivateBtn.addEventListener('click', async () => {
      try {
        const svc = getTenantService();
        await svc.reactivateTenant(paramId);
        showMsg(wrapper, 'Tenant reactivated successfully.', false);
        // Re-render to reflect new state
        setTimeout(() => this.render(container), 500);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to reactivate tenant: ${message}`, true);
      }
    });
    btnRow.appendChild(reactivateBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/tenant/list';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // In edit mode, load existing tenant data and populate the form
    if (isEdit) {
      (async () => {
        try {
          const svc = getTenantService();
          const tenant = await svc.getTenant(paramId);
          if (!tenant) {
            showMsg(wrapper, `Tenant not found: ${paramId}`, true);
            return;
          }

          // Populate form fields
          nameInput.value = tenant.name;
          slugField.value = tenant.slug;
          slugField.defaultValue = tenant.slug;
          domainInput.value = tenant.domain ?? '';
          ownerIdInput.value = tenant.ownerId;

          // Set select values
          statusSelect.value = tenant.status;
          planSelect.value = tenant.plan;
          regionSelect.value = tenant.dataRegion;

          if (tenant.trialEndsAt) {
            trialEndsInput.value = tenant.trialEndsAt.split('T')[0];
          }

          // Show suspend/reactivate buttons based on current status
          if (tenant.status === 'active' || tenant.status === 'trial') {
            suspendBtn.style.display = '';
          }
          if (tenant.status === 'suspended') {
            reactivateBtn.style.display = '';
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          showMsg(wrapper, `Failed to load tenant: ${message}`, true);
        }
      })();
    }
  },
};

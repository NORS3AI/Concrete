/**
 * Branding view.
 * Logo upload placeholder, color pickers, company name, custom CSS editor.
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

/** Extract tenantId from hash: #/tenant/{id}/branding */
function parseTenantId(): string {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts.length >= 3 && parts[0] === 'tenant') {
    return parts[1];
  }
  return '';
}

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

function textInput(name: string, placeholder?: string, value?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  if (value) input.value = value;
  return input;
}

function colorInput(name: string, defaultValue: string): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');

  const colorPicker = el('input', 'w-10 h-10 rounded-md border border-[var(--border)] cursor-pointer') as HTMLInputElement;
  colorPicker.type = 'color';
  colorPicker.name = name;
  colorPicker.value = defaultValue;
  colorPicker.setAttribute('data-color-picker', name);
  wrapper.appendChild(colorPicker);

  const hexInput = el('input', 'flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] font-mono') as HTMLInputElement;
  hexInput.type = 'text';
  hexInput.value = defaultValue;
  hexInput.placeholder = '#000000';
  hexInput.setAttribute('data-hex-input', name);
  wrapper.appendChild(hexInput);

  // Sync color picker and hex input
  colorPicker.addEventListener('input', () => {
    hexInput.value = colorPicker.value;
  });
  hexInput.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
      colorPicker.value = hexInput.value;
    }
  });

  return wrapper;
}

// ---------------------------------------------------------------------------
// Logo Upload Section
// ---------------------------------------------------------------------------

function buildLogoUpload(wrapper: HTMLElement, logoUrl?: string): HTMLElement {
  const section = el('div', 'flex items-start gap-6');

  // Preview area
  const previewWrapper = el('div', 'flex-shrink-0');
  const preview = el('div', 'w-24 h-24 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-lg flex items-center justify-center');
  if (logoUrl) {
    const img = el('img') as HTMLImageElement;
    img.src = logoUrl;
    img.alt = 'Logo';
    img.className = 'w-full h-full object-contain rounded-lg';
    preview.appendChild(img);
  } else {
    preview.appendChild(el('span', 'text-[var(--text-muted)] text-xs text-center', 'No logo\nuploaded'));
  }
  previewWrapper.appendChild(preview);
  section.appendChild(previewWrapper);

  // Upload controls
  const controls = el('div', 'flex-1');
  controls.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-2', 'Company Logo'));
  controls.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-3', 'Recommended: 256x256 pixels, PNG or SVG. Max 2MB.'));

  const btnRow = el('div', 'flex items-center gap-2');
  const uploadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Upload Logo');
  uploadBtn.type = 'button';
  uploadBtn.addEventListener('click', () => {
    showMsg(wrapper, 'Logo upload requires cloud storage (R2) integration.', false);
  });
  btnRow.appendChild(uploadBtn);

  const removeBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10', 'Remove');
  removeBtn.type = 'button';
  removeBtn.addEventListener('click', () => {
    showMsg(wrapper, 'Logo upload requires cloud storage (R2) integration.', false);
  });
  btnRow.appendChild(removeBtn);

  controls.appendChild(btnRow);
  section.appendChild(controls);

  return section;
}

// ---------------------------------------------------------------------------
// Favicon Section
// ---------------------------------------------------------------------------

function buildFaviconUpload(wrapper: HTMLElement, favicon?: string): HTMLElement {
  const section = el('div', 'flex items-start gap-6');

  const previewWrapper = el('div', 'flex-shrink-0');
  const preview = el('div', 'w-12 h-12 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-md flex items-center justify-center');
  if (favicon) {
    const img = el('img') as HTMLImageElement;
    img.src = favicon;
    img.alt = 'Favicon';
    img.className = 'w-full h-full object-contain rounded-md';
    preview.appendChild(img);
  } else {
    preview.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '?'));
  }
  previewWrapper.appendChild(preview);
  section.appendChild(previewWrapper);

  const controls = el('div', 'flex-1');
  controls.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-2', 'Favicon'));
  controls.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-3', 'Recommended: 32x32 pixels, ICO or PNG.'));

  const uploadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Upload Favicon');
  uploadBtn.type = 'button';
  uploadBtn.addEventListener('click', () => {
    showMsg(wrapper, 'Favicon upload requires cloud storage (R2) integration.', false);
  });
  controls.appendChild(uploadBtn);
  section.appendChild(controls);

  return section;
}

// ---------------------------------------------------------------------------
// Preview Section
// ---------------------------------------------------------------------------

function buildPreview(primaryColor: string, secondaryColor: string, companyName: string): HTMLElement {
  const section = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4');
  section.setAttribute('data-preview', '1');
  section.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-3', 'Brand Preview'));

  const mockup = el('div', 'rounded-lg overflow-hidden border border-[var(--border)]');

  // Mock header
  const header = el('div', 'px-4 py-3 flex items-center gap-3');
  header.style.backgroundColor = secondaryColor;
  header.setAttribute('data-preview-header', '1');
  const logoPlaceholder = el('div', 'w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold');
  logoPlaceholder.style.backgroundColor = primaryColor;
  logoPlaceholder.setAttribute('data-preview-logo', '1');
  logoPlaceholder.textContent = companyName ? companyName.charAt(0).toUpperCase() : 'C';
  header.appendChild(logoPlaceholder);
  const nameSpan = el('span', 'text-white font-semibold text-sm', companyName || 'Company Name');
  nameSpan.setAttribute('data-preview-name', '1');
  header.appendChild(nameSpan);
  mockup.appendChild(header);

  // Mock body
  const body = el('div', 'p-4 bg-[var(--surface-raised)]');
  const mockBtn = el('div', 'inline-block px-3 py-1 rounded text-white text-xs font-medium', 'Sample Button');
  mockBtn.style.backgroundColor = primaryColor;
  mockBtn.setAttribute('data-preview-btn', '1');
  body.appendChild(mockBtn);
  mockup.appendChild(body);

  section.appendChild(mockup);
  return section;
}

// ---------------------------------------------------------------------------
// Custom CSS Editor
// ---------------------------------------------------------------------------

function buildCssEditor(customCss?: string): HTMLElement {
  const section = el('div', '');
  section.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-1', 'Custom CSS'));
  section.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-2', 'Advanced: Add custom CSS rules that override the default theme. Changes are scoped to your tenant.'));

  const textarea = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] font-mono') as HTMLTextAreaElement;
  textarea.name = 'customCss';
  textarea.rows = 8;
  textarea.placeholder = '/* Example: override the primary accent */\n:root {\n  --accent: #FF6B35;\n}';
  if (customCss) textarea.value = customCss;
  section.appendChild(textarea);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const brandingView = {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Branding'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Show loading state
    const loadingEl = el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading branding data...');
    wrapper.appendChild(loadingEl);
    container.appendChild(wrapper);

    const tenantId = parseTenantId();
    if (!tenantId) {
      loadingEl.remove();
      showMsg(wrapper, 'Could not determine tenant ID from the URL.', true);
      return;
    }

    const svc = getTenantService();

    svc.getBranding(tenantId)
      .then((branding) => {
        loadingEl.remove();

        const primaryColor = branding?.primaryColor ?? '#3B82F6';
        const secondaryColor = branding?.secondaryColor ?? '#1E293B';
        const companyName = branding?.companyName ?? '';
        const customCss = branding?.customCss ?? '';
        const logoUrl = branding?.logoUrl;
        const favicon = branding?.favicon;

        const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
        const form = el('form', 'space-y-6');

        // Logo
        form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Logo & Favicon'));
        form.appendChild(buildLogoUpload(wrapper, logoUrl));
        form.appendChild(buildFaviconUpload(wrapper, favicon));

        // Colors
        form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Brand Colors'));
        const colorGrid = el('div', 'grid grid-cols-2 gap-4');
        colorGrid.appendChild(buildField('Primary Color', colorInput('primaryColor', primaryColor), 'Main accent color for buttons and links'));
        colorGrid.appendChild(buildField('Secondary Color', colorInput('secondaryColor', secondaryColor), 'Navigation and header background'));
        form.appendChild(colorGrid);

        // Company name
        form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Company Identity'));
        const nameGrid = el('div', 'grid grid-cols-2 gap-4');
        nameGrid.appendChild(buildField('Company Name', textInput('companyName', 'Your company name', companyName), 'Displayed in the header and reports'));
        form.appendChild(nameGrid);

        // Preview
        form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Preview'));
        const previewSection = buildPreview(primaryColor, secondaryColor, companyName);
        form.appendChild(previewSection);

        // Attach live preview listeners to color inputs
        const attachPreviewListeners = (): void => {
          const primaryPicker = form.querySelector('[data-color-picker="primaryColor"]') as HTMLInputElement | null;
          const primaryHex = form.querySelector('[data-hex-input="primaryColor"]') as HTMLInputElement | null;
          const secondaryPicker = form.querySelector('[data-color-picker="secondaryColor"]') as HTMLInputElement | null;
          const secondaryHex = form.querySelector('[data-hex-input="secondaryColor"]') as HTMLInputElement | null;

          const updatePreview = (): void => {
            const pColor = primaryPicker?.value ?? primaryColor;
            const sColor = secondaryPicker?.value ?? secondaryColor;

            const previewHeader = previewSection.querySelector('[data-preview-header]') as HTMLElement | null;
            const previewLogo = previewSection.querySelector('[data-preview-logo]') as HTMLElement | null;
            const previewBtn = previewSection.querySelector('[data-preview-btn]') as HTMLElement | null;

            if (previewHeader) previewHeader.style.backgroundColor = sColor;
            if (previewLogo) previewLogo.style.backgroundColor = pColor;
            if (previewBtn) previewBtn.style.backgroundColor = pColor;
          };

          primaryPicker?.addEventListener('input', updatePreview);
          primaryHex?.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(primaryHex.value)) updatePreview();
          });
          secondaryPicker?.addEventListener('input', updatePreview);
          secondaryHex?.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(secondaryHex.value)) updatePreview();
          });
        };

        attachPreviewListeners();

        // Custom CSS
        form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Advanced'));
        form.appendChild(buildCssEditor(customCss));

        // Action buttons
        const btnRow = el('div', 'flex items-center gap-3 mt-6');
        const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Branding');
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', async () => {
          try {
            const formEl = form;
            const nameInput = formEl.querySelector('input[name="companyName"]') as HTMLInputElement | null;
            const primaryPickerEl = formEl.querySelector('[data-color-picker="primaryColor"]') as HTMLInputElement | null;
            const secondaryPickerEl = formEl.querySelector('[data-color-picker="secondaryColor"]') as HTMLInputElement | null;
            const cssTextarea = formEl.querySelector('textarea[name="customCss"]') as HTMLTextAreaElement | null;

            const changes: Record<string, unknown> = {};
            if (nameInput) changes.companyName = nameInput.value;
            if (primaryPickerEl) changes.primaryColor = primaryPickerEl.value;
            if (secondaryPickerEl) changes.secondaryColor = secondaryPickerEl.value;
            if (cssTextarea) changes.customCss = cssTextarea.value;

            await svc.updateBranding(tenantId, changes);
            showMsg(wrapper, 'Branding saved successfully.', false);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showMsg(wrapper, `Failed to save branding: ${message}`, true);
          }
        });
        btnRow.appendChild(saveBtn);

        const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
        cancelBtn.href = '#/tenant/list';
        btnRow.appendChild(cancelBtn);
        form.appendChild(btnRow);

        card.appendChild(form);
        wrapper.appendChild(card);
      })
      .catch((err: unknown) => {
        loadingEl.remove();
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to load branding data: ${message}`, true);
      });
  },
};

export default brandingView;

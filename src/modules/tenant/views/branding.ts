/**
 * Branding view.
 * Logo upload placeholder, color pickers, company name, custom CSS editor.
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

function colorInput(name: string, defaultValue: string): HTMLElement {
  const wrapper = el('div', 'flex items-center gap-2');

  const colorPicker = el('input', 'w-10 h-10 rounded-md border border-[var(--border)] cursor-pointer') as HTMLInputElement;
  colorPicker.type = 'color';
  colorPicker.name = name;
  colorPicker.value = defaultValue;
  wrapper.appendChild(colorPicker);

  const hexInput = el('input', 'flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] font-mono') as HTMLInputElement;
  hexInput.type = 'text';
  hexInput.value = defaultValue;
  hexInput.placeholder = '#000000';
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

function buildLogoUpload(): HTMLElement {
  const section = el('div', 'flex items-start gap-6');

  // Preview area
  const previewWrapper = el('div', 'flex-shrink-0');
  const preview = el('div', 'w-24 h-24 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-lg flex items-center justify-center');
  preview.appendChild(el('span', 'text-[var(--text-muted)] text-xs text-center', 'No logo\nuploaded'));
  previewWrapper.appendChild(preview);
  section.appendChild(previewWrapper);

  // Upload controls
  const controls = el('div', 'flex-1');
  controls.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-2', 'Company Logo'));
  controls.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-3', 'Recommended: 256x256 pixels, PNG or SVG. Max 2MB.'));

  const btnRow = el('div', 'flex items-center gap-2');
  const uploadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Upload Logo');
  uploadBtn.type = 'button';
  uploadBtn.addEventListener('click', () => { /* upload placeholder */ });
  btnRow.appendChild(uploadBtn);

  const removeBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10', 'Remove');
  removeBtn.type = 'button';
  removeBtn.addEventListener('click', () => { /* remove placeholder */ });
  btnRow.appendChild(removeBtn);

  controls.appendChild(btnRow);
  section.appendChild(controls);

  return section;
}

// ---------------------------------------------------------------------------
// Favicon Section
// ---------------------------------------------------------------------------

function buildFaviconUpload(): HTMLElement {
  const section = el('div', 'flex items-start gap-6');

  const previewWrapper = el('div', 'flex-shrink-0');
  const preview = el('div', 'w-12 h-12 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-md flex items-center justify-center');
  preview.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '?'));
  previewWrapper.appendChild(preview);
  section.appendChild(previewWrapper);

  const controls = el('div', 'flex-1');
  controls.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-2', 'Favicon'));
  controls.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-3', 'Recommended: 32x32 pixels, ICO or PNG.'));

  const uploadBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Upload Favicon');
  uploadBtn.type = 'button';
  uploadBtn.addEventListener('click', () => { /* upload placeholder */ });
  controls.appendChild(uploadBtn);
  section.appendChild(controls);

  return section;
}

// ---------------------------------------------------------------------------
// Preview Section
// ---------------------------------------------------------------------------

function buildPreview(primaryColor: string, secondaryColor: string): HTMLElement {
  const section = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4');
  section.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-3', 'Brand Preview'));

  const mockup = el('div', 'rounded-lg overflow-hidden border border-[var(--border)]');

  // Mock header
  const header = el('div', 'px-4 py-3 flex items-center gap-3');
  header.style.backgroundColor = secondaryColor;
  const logoPlaceholder = el('div', 'w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold');
  logoPlaceholder.style.backgroundColor = primaryColor;
  logoPlaceholder.textContent = 'C';
  header.appendChild(logoPlaceholder);
  header.appendChild(el('span', 'text-white font-semibold text-sm', 'Company Name'));
  mockup.appendChild(header);

  // Mock body
  const body = el('div', 'p-4 bg-[var(--surface-raised)]');
  const mockBtn = el('div', 'inline-block px-3 py-1 rounded text-white text-xs font-medium', 'Sample Button');
  mockBtn.style.backgroundColor = primaryColor;
  body.appendChild(mockBtn);
  mockup.appendChild(body);

  section.appendChild(mockup);
  return section;
}

// ---------------------------------------------------------------------------
// Custom CSS Editor
// ---------------------------------------------------------------------------

function buildCssEditor(): HTMLElement {
  const section = el('div', '');
  section.appendChild(el('h3', 'text-sm font-medium text-[var(--text)] mb-1', 'Custom CSS'));
  section.appendChild(el('p', 'text-xs text-[var(--text-muted)] mb-2', 'Advanced: Add custom CSS rules that override the default theme. Changes are scoped to your tenant.'));

  const textarea = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] font-mono') as HTMLTextAreaElement;
  textarea.name = 'customCss';
  textarea.rows = 8;
  textarea.placeholder = '/* Example: override the primary accent */\n:root {\n  --accent: #FF6B35;\n}';
  section.appendChild(textarea);

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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Branding'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Logo
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Logo & Favicon'));
    form.appendChild(buildLogoUpload());
    form.appendChild(buildFaviconUpload());

    // Colors
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Brand Colors'));
    const colorGrid = el('div', 'grid grid-cols-2 gap-4');
    colorGrid.appendChild(buildField('Primary Color', colorInput('primaryColor', '#3B82F6'), 'Main accent color for buttons and links'));
    colorGrid.appendChild(buildField('Secondary Color', colorInput('secondaryColor', '#1E293B'), 'Navigation and header background'));
    form.appendChild(colorGrid);

    // Company name
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Company Identity'));
    const nameGrid = el('div', 'grid grid-cols-2 gap-4');
    nameGrid.appendChild(buildField('Company Name', textInput('companyName', 'Your company name'), 'Displayed in the header and reports'));
    form.appendChild(nameGrid);

    // Preview
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Preview'));
    form.appendChild(buildPreview('#3B82F6', '#1E293B'));

    // Custom CSS
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Advanced'));
    form.appendChild(buildCssEditor());

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Branding');
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

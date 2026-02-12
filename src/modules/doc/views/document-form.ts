/**
 * Document Form view.
 * Create or edit a document with all metadata fields, file upload,
 * tag management, and expiration date tracking.
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

const CATEGORY_OPTIONS = [
  { value: 'contract', label: 'Contract' },
  { value: 'change_order', label: 'Change Order' },
  { value: 'rfi', label: 'RFI' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'photo', label: 'Photo' },
  { value: 'report', label: 'Report' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permit', label: 'Permit' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
];

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildFormField(
  labelText: string,
  inputType: string,
  name: string,
  placeholder?: string,
  required?: boolean,
): HTMLElement {
  const group = el('div', 'space-y-1');
  const label = el('label', 'block text-sm font-medium text-[var(--text-muted)]', labelText);
  label.setAttribute('for', name);
  group.appendChild(label);

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  if (inputType === 'textarea') {
    const textarea = el('textarea', inputCls) as HTMLTextAreaElement;
    textarea.name = name;
    textarea.id = name;
    textarea.rows = 4;
    if (placeholder) textarea.placeholder = placeholder;
    if (required) textarea.required = true;
    group.appendChild(textarea);
  } else {
    const input = el('input', inputCls) as HTMLInputElement;
    input.type = inputType;
    input.name = name;
    input.id = name;
    if (placeholder) input.placeholder = placeholder;
    if (required) input.required = true;
    group.appendChild(input);
  }

  return group;
}

function buildSelectField(
  labelText: string,
  name: string,
  options: { value: string; label: string }[],
): HTMLElement {
  const group = el('div', 'space-y-1');
  const label = el('label', 'block text-sm font-medium text-[var(--text-muted)]', labelText);
  label.setAttribute('for', name);
  group.appendChild(label);

  const selectCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const select = el('select', selectCls) as HTMLSelectElement;
  select.name = name;
  select.id = name;

  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }

  group.appendChild(select);
  return group;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-3xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Document'));
    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Documents') as HTMLAnchorElement;
    backLink.href = '#/doc/documents';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const form = el('form', 'space-y-4');

    form.appendChild(buildFormField('Title', 'text', 'title', 'Document title', true));
    form.appendChild(buildSelectField('Category', 'category', CATEGORY_OPTIONS));
    form.appendChild(buildFormField('Description', 'textarea', 'description', 'Document description'));
    form.appendChild(buildFormField('File Name', 'text', 'fileName', 'document.pdf'));
    form.appendChild(buildFormField('File Size (bytes)', 'number', 'fileSize', '0'));
    form.appendChild(buildFormField('MIME Type', 'text', 'mimeType', 'application/pdf'));

    const row1 = el('div', 'grid grid-cols-2 gap-4');
    row1.appendChild(buildFormField('Job ID', 'text', 'jobId', 'Job reference'));
    row1.appendChild(buildFormField('Entity ID', 'text', 'entityId', 'Entity reference'));
    form.appendChild(row1);

    const row2 = el('div', 'grid grid-cols-2 gap-4');
    row2.appendChild(buildFormField('Vendor ID', 'text', 'vendorId', 'Vendor reference'));
    row2.appendChild(buildFormField('Employee ID', 'text', 'employeeId', 'Employee reference'));
    form.appendChild(row2);

    form.appendChild(buildFormField('Tags (comma-separated)', 'text', 'tags', 'tag1, tag2, tag3'));
    form.appendChild(buildFormField('Expiration Date', 'date', 'expirationDate'));
    form.appendChild(buildSelectField('Status', 'status', STATUS_OPTIONS));
    form.appendChild(buildFormField('Uploaded By', 'text', 'uploadedBy', 'User name'));

    // File upload area (static mode - metadata only)
    const uploadArea = el('div', 'border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center');
    uploadArea.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'Static mode: Enter file metadata above. File storage uses local download/upload cycle.'));
    form.appendChild(uploadArea);

    const btnRow = el('div', 'flex gap-3 pt-4');
    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Document');
    saveBtn.type = 'submit';
    btnRow.appendChild(saveBtn);

    const cancelLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)]', 'Cancel') as HTMLAnchorElement;
    cancelLink.href = '#/doc/documents';
    btnRow.appendChild(cancelLink);
    form.appendChild(btnRow);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      /* save placeholder */
    });

    wrapper.appendChild(form);
    container.appendChild(wrapper);
  },
};

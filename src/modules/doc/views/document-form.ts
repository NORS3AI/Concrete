/**
 * Document Form view.
 * Create or edit a document with all metadata fields, file upload,
 * tag management, and expiration date tracking.
 * Wired to DocService for live data.
 */

import { getDocService } from '../service-accessor';
import type { DocumentCategory, DocumentStatus } from '../doc-service';

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

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
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

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

// ---------------------------------------------------------------------------
// Form Builder helpers
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

function buildReadonlyField(labelText: string, value: string): HTMLElement {
  const group = el('div', 'space-y-1');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', labelText));
  group.appendChild(el('p', 'text-sm text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 opacity-70', value || '-'));
  return group;
}

// ---------------------------------------------------------------------------
// Tag chip management
// ---------------------------------------------------------------------------

function buildTagSection(initialTags: string[]): {
  container: HTMLElement;
  getTags: () => string[];
} {
  const tags = [...initialTags];

  const group = el('div', 'space-y-1');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Tags'));

  const chipContainer = el('div', 'flex flex-wrap gap-1 mb-2');
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const tagInput = el('input', inputCls) as HTMLInputElement;
  tagInput.type = 'text';
  tagInput.placeholder = 'Type a tag and press Enter or comma to add';

  function renderChips(): void {
    chipContainer.innerHTML = '';
    for (const tag of tags) {
      const chip = el('span', 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20');
      chip.appendChild(el('span', '', tag));
      const removeBtn = el('button', 'text-blue-400 hover:text-blue-200 font-bold ml-1', '\u00d7');
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', () => {
        const idx = tags.indexOf(tag);
        if (idx > -1) tags.splice(idx, 1);
        renderChips();
      });
      chip.appendChild(removeBtn);
      chipContainer.appendChild(chip);
    }
  }

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.value.replace(/,/g, '').trim();
      if (val && !tags.includes(val)) {
        tags.push(val);
        renderChips();
      }
      tagInput.value = '';
    }
  });

  // Also support paste of comma-separated tags
  tagInput.addEventListener('blur', () => {
    const parts = tagInput.value.split(',').map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (!tags.includes(p)) tags.push(p);
    }
    if (parts.length > 0) {
      tagInput.value = '';
      renderChips();
    }
  });

  renderChips();
  group.appendChild(chipContainer);
  group.appendChild(tagInput);

  return { container: group, getTags: () => [...tags] };
}

// ---------------------------------------------------------------------------
// Route parsing
// ---------------------------------------------------------------------------

function parseDocId(): string | null {
  const hash = window.location.hash; // e.g. #/doc/documents/new or #/doc/documents/{id}
  const match = hash.match(/#\/doc\/documents\/(.+)/);
  if (!match) return null;
  const segment = match[1].split('/')[0]; // grab first segment after /documents/
  return segment === 'new' ? null : segment;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-3xl mx-auto');

    const docId = parseDocId();
    const isEdit = docId !== null;

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Document' : 'New Document'));
    const backLink = el('a', 'text-sm text-[var(--accent)] hover:underline', 'Back to Documents') as HTMLAnchorElement;
    backLink.href = '#/doc/documents';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const form = el('form', 'space-y-6');

    // ---- General Section ----
    const generalSection = el('div', 'space-y-4');
    generalSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2', 'General'));
    generalSection.appendChild(buildFormField('Title', 'text', 'title', 'Document title', true));
    generalSection.appendChild(buildSelectField('Category', 'category', CATEGORY_OPTIONS));
    generalSection.appendChild(buildFormField('Description', 'textarea', 'description', 'Document description'));
    form.appendChild(generalSection);

    // ---- File Section ----
    const fileSection = el('div', 'space-y-4');
    fileSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2', 'File'));
    fileSection.appendChild(buildFormField('File Name', 'text', 'fileName', 'document.pdf'));

    // File upload simulation area
    const uploadArea = el('div', 'border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center');
    uploadArea.appendChild(el('p', 'text-[var(--text-muted)] text-sm', 'Static mode: Enter file metadata above. File storage uses local download/upload cycle.'));
    fileSection.appendChild(uploadArea);

    const fileMeta = el('div', 'grid grid-cols-2 gap-4');
    const fileSizeField = buildFormField('File Size (bytes)', 'number', 'fileSize', '0');
    fileMeta.appendChild(fileSizeField);
    const mimeField = buildFormField('MIME Type', 'text', 'mimeType', 'application/pdf');
    fileMeta.appendChild(mimeField);
    fileSection.appendChild(fileMeta);
    form.appendChild(fileSection);

    // ---- References Section ----
    const refSection = el('div', 'space-y-4');
    refSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2', 'References'));
    const row1 = el('div', 'grid grid-cols-2 gap-4');
    row1.appendChild(buildFormField('Job ID', 'text', 'jobId', 'Job reference'));
    row1.appendChild(buildFormField('Entity ID', 'text', 'entityId', 'Entity reference'));
    refSection.appendChild(row1);
    const row2 = el('div', 'grid grid-cols-2 gap-4');
    row2.appendChild(buildFormField('Vendor ID', 'text', 'vendorId', 'Vendor reference'));
    row2.appendChild(buildFormField('Employee ID', 'text', 'employeeId', 'Employee reference'));
    refSection.appendChild(row2);
    form.appendChild(refSection);

    // ---- Tags Section ----
    const tagSection = buildTagSection([]);
    form.appendChild(tagSection.container);

    // ---- Expiration Section ----
    const expSection = el('div', 'space-y-4');
    expSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2', 'Expiration & Status'));
    const expRow = el('div', 'grid grid-cols-2 gap-4');
    expRow.appendChild(buildFormField('Expiration Date', 'date', 'expirationDate'));
    expRow.appendChild(buildSelectField('Status', 'status', STATUS_OPTIONS));
    expSection.appendChild(expRow);
    form.appendChild(expSection);

    // ---- Metadata Section (edit only, readonly) ----
    const metaContainer = el('div', 'space-y-4');
    metaContainer.setAttribute('data-meta-section', '1');
    // Will be populated in edit mode after data load
    form.appendChild(metaContainer);

    // ---- Buttons ----
    const btnRow = el('div', 'flex gap-3 pt-4');
    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', isEdit ? 'Update Document' : 'Create Document');
    saveBtn.type = 'submit';
    btnRow.appendChild(saveBtn);

    const cancelLink = el('a', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)]', 'Cancel') as HTMLAnchorElement;
    cancelLink.href = '#/doc/documents';
    btnRow.appendChild(cancelLink);
    form.appendChild(btnRow);

    // ---- Form getters ----
    const getVal = (name: string): string => {
      const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      return field ? field.value.trim() : '';
    };
    const setVal = (name: string, value: string): void => {
      const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (field) field.value = value;
    };

    // ---- Submit handler ----
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = getVal('title');
      if (!title) {
        showMsg(wrapper, 'Title is required.', true);
        return;
      }

      const payload = {
        title,
        category: getVal('category') as DocumentCategory,
        description: getVal('description') || undefined,
        fileName: getVal('fileName') || undefined,
        fileSize: getVal('fileSize') ? Number(getVal('fileSize')) : undefined,
        mimeType: getVal('mimeType') || undefined,
        jobId: getVal('jobId') || undefined,
        entityId: getVal('entityId') || undefined,
        vendorId: getVal('vendorId') || undefined,
        employeeId: getVal('employeeId') || undefined,
        tags: tagSection.getTags(),
        expirationDate: getVal('expirationDate') || undefined,
        status: (getVal('status') as DocumentStatus) || 'active',
        uploadedBy: getVal('uploadedBy') || undefined,
      };

      try {
        const svc = getDocService();
        if (isEdit && docId) {
          await svc.updateDocument(docId, payload);
          showMsg(wrapper, 'Document updated successfully.', false);
        } else {
          await svc.createDocument(payload);
          showMsg(wrapper, 'Document created successfully.', false);
        }
        // Navigate back to list after short delay so user sees message
        setTimeout(() => {
          window.location.hash = '#/doc/documents';
        }, 600);
      } catch (err: unknown) {
        showMsg(wrapper, `Save failed: ${(err as Error).message}`, true);
      }
    });

    wrapper.appendChild(form);
    container.appendChild(wrapper);

    // ---- Load existing document for edit mode ----
    if (isEdit && docId) {
      (async () => {
        try {
          const svc = getDocService();
          const doc = await svc.getDocument(docId);
          if (!doc) {
            showMsg(wrapper, 'Document not found.', true);
            return;
          }

          // Populate form fields
          setVal('title', doc.title);
          setVal('category', doc.category);
          setVal('description', doc.description ?? '');
          setVal('fileName', doc.fileName ?? '');
          setVal('fileSize', doc.fileSize != null ? String(doc.fileSize) : '');
          setVal('mimeType', doc.mimeType ?? '');
          setVal('jobId', doc.jobId ?? '');
          setVal('entityId', doc.entityId ?? '');
          setVal('vendorId', doc.vendorId ?? '');
          setVal('employeeId', doc.employeeId ?? '');
          setVal('expirationDate', doc.expirationDate ?? '');
          setVal('status', doc.status);

          // Rebuild tag section with existing tags
          if (doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0) {
            const existingTagContainer = tagSection.container;
            const newTagSection = buildTagSection(doc.tags as string[]);
            existingTagContainer.replaceWith(newTagSection.container);
            // Update the reference so submit reads the right tags
            tagSection.container = newTagSection.container;
            tagSection.getTags = newTagSection.getTags;
          }

          // Populate readonly metadata section
          metaContainer.innerHTML = '';
          metaContainer.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2', 'Metadata'));
          const metaRow = el('div', 'grid grid-cols-2 gap-4');
          metaRow.appendChild(buildReadonlyField('Uploaded By', doc.uploadedBy ?? '-'));
          metaRow.appendChild(buildReadonlyField('Uploaded At', doc.uploadedAt ?? '-'));
          metaContainer.appendChild(metaRow);

          // Add uploadedBy as editable field reference (hidden) so form reads it
          // but keep the readonly display
          const hiddenUploadedBy = el('input') as HTMLInputElement;
          hiddenUploadedBy.type = 'hidden';
          hiddenUploadedBy.name = 'uploadedBy';
          hiddenUploadedBy.value = doc.uploadedBy ?? '';
          metaContainer.appendChild(hiddenUploadedBy);
        } catch (err: unknown) {
          showMsg(wrapper, `Failed to load document: ${(err as Error).message}`, true);
        }
      })();
    } else {
      // For new document, add uploadedBy field
      const uploadBySection = el('div', 'space-y-4');
      uploadBySection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2', 'Upload Info'));
      uploadBySection.appendChild(buildFormField('Uploaded By', 'text', 'uploadedBy', 'User name'));
      metaContainer.appendChild(uploadBySection);
    }
  },
};

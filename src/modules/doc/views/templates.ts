/**
 * Templates view.
 * Manage document templates for contracts, lien waivers, AIA forms,
 * change orders, and other standard construction documents.
 * Wired to DocService for live data.
 */

import { getDocService } from '../service-accessor';
import type { TemplateCategory } from '../doc-service';

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

const TEMPLATE_CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
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
  { value: 'lien_waiver', label: 'Lien Waiver' },
  { value: 'aia_form', label: 'AIA Form' },
  { value: 'other', label: 'Other' },
];

const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active Only' },
  { value: 'false', label: 'Inactive Only' },
];

const CATEGORY_LABEL: Record<string, string> = {
  contract: 'Contract',
  change_order: 'Change Order',
  rfi: 'RFI',
  submittal: 'Submittal',
  drawing: 'Drawing',
  photo: 'Photo',
  report: 'Report',
  correspondence: 'Correspondence',
  insurance: 'Insurance',
  permit: 'Permit',
  lien_waiver: 'Lien Waiver',
  aia_form: 'AIA Form',
  other: 'Other',
};

const ACTIVE_BADGE = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
const INACTIVE_BADGE = 'bg-red-500/10 text-red-400 border border-red-500/20';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let categoryFilter = '';
let activeFilter = '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  name: string;
  category?: string;
  description?: string;
  content?: string;
  variables?: string[];
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: () => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const selectCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const catFilter = el('select', selectCls) as HTMLSelectElement;
  for (const opt of TEMPLATE_CATEGORY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === categoryFilter) o.selected = true;
    catFilter.appendChild(o);
  }
  bar.appendChild(catFilter);

  const actFilter = el('select', selectCls) as HTMLSelectElement;
  for (const opt of ACTIVE_FILTER_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    if (opt.value === activeFilter) o.selected = true;
    actFilter.appendChild(o);
  }
  bar.appendChild(actFilter);

  catFilter.addEventListener('change', () => {
    categoryFilter = catFilter.value;
    onFilter();
  });
  actFilter.addEventListener('change', () => {
    activeFilter = actFilter.value;
    onFilter();
  });

  return bar;
}

// ---------------------------------------------------------------------------
// Template Table
// ---------------------------------------------------------------------------

function buildTemplateTable(
  templates: TemplateRow[],
  wrapper: HTMLElement,
  reloadFn: () => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Name', 'Category', 'Description', 'Variables', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (templates.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No templates found. Create your first template to get started.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const tmpl of templates) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    // Name
    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', tmpl.name));

    // Category badge
    const tdCat = el('td', 'py-2 px-3');
    if (tmpl.category) {
      tdCat.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', CATEGORY_LABEL[tmpl.category] ?? tmpl.category));
    } else {
      tdCat.appendChild(el('span', 'text-[var(--text-muted)] text-xs', '-'));
    }
    tr.appendChild(tdCat);

    // Description
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', tmpl.description || '-'));

    // Variables
    const tdVars = el('td', 'py-2 px-3 text-[var(--text-muted)]');
    if (tmpl.variables && tmpl.variables.length > 0) {
      const varSpan = el('span', 'cursor-help', `${tmpl.variables.length} var${tmpl.variables.length !== 1 ? 's' : ''}`);
      varSpan.title = tmpl.variables.join(', ');
      tdVars.appendChild(varSpan);
    } else {
      tdVars.appendChild(el('span', 'text-xs', '-'));
    }
    tr.appendChild(tdVars);

    // Status badge
    const tdStatus = el('td', 'py-2 px-3');
    const badgeCls = tmpl.isActive ? ACTIVE_BADGE : INACTIVE_BADGE;
    const badgeText = tmpl.isActive ? 'Active' : 'Inactive';
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, badgeText));
    tr.appendChild(tdStatus);

    // Actions
    const tdActions = el('td', 'py-2 px-3 whitespace-nowrap');

    // Edit button
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    editBtn.addEventListener('click', () => {
      const newName = prompt('Template name:', tmpl.name);
      if (newName === null) return;
      const newDesc = prompt('Description:', tmpl.description ?? '');
      if (newDesc === null) return;
      const newContent = prompt('Content (use {{variable}} syntax):', tmpl.content ?? '');
      if (newContent === null) return;

      (async () => {
        try {
          const svc = getDocService();
          const changes: Record<string, unknown> = {};
          if (newName.trim()) changes.name = newName.trim();
          if (newDesc !== tmpl.description) changes.description = newDesc;
          if (newContent !== tmpl.content) changes.content = newContent;
          await svc.updateTemplate(tmpl.id, changes);
          showMsg(wrapper, `Template "${newName.trim() || tmpl.name}" updated.`, false);
          reloadFn();
        } catch (err: unknown) {
          showMsg(wrapper, `Update failed: ${(err as Error).message}`, true);
        }
      })();
    });
    tdActions.appendChild(editBtn);

    // Preview button
    const previewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Preview');
    previewBtn.addEventListener('click', () => {
      if (!tmpl.content) {
        showMsg(wrapper, 'This template has no content to preview.', true);
        return;
      }

      const svc = getDocService();
      // Build sample variables: map each variable to "[variableName]"
      const sampleVars: Record<string, string> = {};
      if (tmpl.variables) {
        for (const v of tmpl.variables) {
          sampleVars[v] = `[${v}]`;
        }
      }

      const rendered = svc.renderTemplate(tmpl.content, sampleVars);

      // Show preview panel
      const existingPreview = wrapper.querySelector('[data-preview]');
      if (existingPreview) existingPreview.remove();

      const previewPanel = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 space-y-2');
      previewPanel.setAttribute('data-preview', '1');

      const previewHeader = el('div', 'flex items-center justify-between');
      previewHeader.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', `Preview: ${tmpl.name}`));
      const closeBtn = el('button', 'text-[var(--text-muted)] hover:text-[var(--text)] text-sm', 'Close');
      closeBtn.addEventListener('click', () => previewPanel.remove());
      previewHeader.appendChild(closeBtn);
      previewPanel.appendChild(previewHeader);

      const previewContent = el('pre', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-3 text-sm text-[var(--text)] whitespace-pre-wrap overflow-auto max-h-64', rendered);
      previewPanel.appendChild(previewContent);

      wrapper.appendChild(previewPanel);
    });
    tdActions.appendChild(previewBtn);

    // Toggle Active button
    const toggleBtn = el('button', 'text-yellow-400 hover:underline text-sm mr-2', tmpl.isActive ? 'Deactivate' : 'Activate');
    toggleBtn.addEventListener('click', async () => {
      try {
        const svc = getDocService();
        await svc.updateTemplate(tmpl.id, { isActive: !tmpl.isActive });
        showMsg(wrapper, `Template "${tmpl.name}" ${tmpl.isActive ? 'deactivated' : 'activated'}.`, false);
        reloadFn();
      } catch (err: unknown) {
        showMsg(wrapper, `Toggle failed: ${(err as Error).message}`, true);
      }
    });
    tdActions.appendChild(toggleBtn);

    // Delete button
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Delete template "${tmpl.name}"?`)) return;
      try {
        const svc = getDocService();
        await svc.deleteTemplate(tmpl.id);
        showMsg(wrapper, `Template "${tmpl.name}" deleted.`, false);
        reloadFn();
      } catch (err: unknown) {
        showMsg(wrapper, `Delete failed: ${(err as Error).message}`, true);
      }
    });
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Template Form
// ---------------------------------------------------------------------------

function buildNewTemplateForm(
  wrapper: HTMLElement,
  reloadFn: () => void,
): HTMLElement {
  const form = el('form', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 space-y-3');
  form.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Create Template'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  // Name
  const nameGroup = el('div', 'space-y-1');
  nameGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Template Name'));
  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.name = 'name';
  nameInput.placeholder = 'e.g., Standard Subcontract Agreement';
  nameInput.required = true;
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // Category
  const catGroup = el('div', 'space-y-1');
  catGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Category'));
  const catSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TEMPLATE_CATEGORY_OPTIONS.slice(1)) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    catSelect.appendChild(o);
  }
  catGroup.appendChild(catSelect);
  form.appendChild(catGroup);

  // Description
  const descGroup = el('div', 'space-y-1');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Description'));
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.name = 'description';
  descInput.placeholder = 'Brief description of this template';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  // Content
  const contentGroup = el('div', 'space-y-1');
  contentGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Template Content'));
  const contentArea = el('textarea', inputCls) as HTMLTextAreaElement;
  contentArea.name = 'content';
  contentArea.rows = 8;
  contentArea.placeholder = 'Template content with {{variable}} placeholders...';
  contentGroup.appendChild(contentArea);
  form.appendChild(contentGroup);

  // Variables
  const varsGroup = el('div', 'space-y-1');
  varsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Variables (comma-separated)'));
  const varsInput = el('input', inputCls) as HTMLInputElement;
  varsInput.type = 'text';
  varsInput.name = 'variables';
  varsInput.placeholder = 'projectName, contractDate, contractAmount';
  varsGroup.appendChild(varsInput);
  form.appendChild(varsGroup);

  // isActive checkbox
  const activeGroup = el('div', 'flex items-center gap-2');
  const activeCheckbox = el('input') as HTMLInputElement;
  activeCheckbox.type = 'checkbox';
  activeCheckbox.name = 'isActive';
  activeCheckbox.id = 'isActive';
  activeCheckbox.checked = true;
  activeCheckbox.className = 'rounded border-[var(--border)]';
  activeGroup.appendChild(activeCheckbox);
  activeGroup.appendChild(el('label', 'text-sm text-[var(--text-muted)]', 'Active'));
  form.appendChild(activeGroup);

  const submitBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Template');
  submitBtn.type = 'submit';
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
      showMsg(wrapper, 'Template name is required.', true);
      return;
    }

    const variables = varsInput.value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      const svc = getDocService();
      await svc.createTemplate({
        name,
        category: (catSelect.value as TemplateCategory) || undefined,
        description: descInput.value.trim() || undefined,
        content: contentArea.value || undefined,
        variables: variables.length > 0 ? variables : undefined,
        isActive: activeCheckbox.checked,
      });

      showMsg(wrapper, `Template "${name}" created.`, false);

      // Reset form
      nameInput.value = '';
      descInput.value = '';
      contentArea.value = '';
      varsInput.value = '';
      activeCheckbox.checked = true;

      reloadFn();
    } catch (err: unknown) {
      showMsg(wrapper, `Create failed: ${(err as Error).message}`, true);
    }
  });

  return form;
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadTemplates(): Promise<TemplateRow[]> {
  const svc = getDocService();
  const filters: { category?: TemplateCategory; isActive?: boolean } = {};
  if (categoryFilter) filters.category = categoryFilter as TemplateCategory;
  if (activeFilter === 'true') filters.isActive = true;
  if (activeFilter === 'false') filters.isActive = false;

  const templates = await svc.getTemplates(filters);

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    content: t.content,
    variables: t.variables as string[] | undefined,
    isActive: t.isActive,
  }));
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-6');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Document Templates'));
    wrapper.appendChild(headerRow);

    // Placeholder containers for dynamic content
    const tableContainer = el('div');
    const formContainer = el('div');

    const reload = async () => {
      try {
        const templates = await loadTemplates();
        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTemplateTable(templates, wrapper, reload));
      } catch (err: unknown) {
        showMsg(wrapper, `Failed to load templates: ${(err as Error).message}`, true);
      }
    };

    wrapper.appendChild(buildFilterBar(reload));
    wrapper.appendChild(tableContainer);

    // Build create form
    formContainer.appendChild(buildNewTemplateForm(wrapper, reload));
    wrapper.appendChild(formContainer);

    container.appendChild(wrapper);

    // Initial load
    reload();
  },
};

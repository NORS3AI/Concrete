/**
 * Templates view.
 * Manage document templates for contracts, lien waivers, AIA forms,
 * change orders, and other standard construction documents.
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

const TEMPLATE_CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'contract', label: 'Contract' },
  { value: 'change_order', label: 'Change Order' },
  { value: 'rfi', label: 'RFI' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'lien_waiver', label: 'Lien Waiver' },
  { value: 'aia_form', label: 'AIA Form' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permit', label: 'Permit' },
  { value: 'other', label: 'Other' },
];

const ACTIVE_BADGE = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
const INACTIVE_BADGE = 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  description: string;
  variableCount: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Template Table
// ---------------------------------------------------------------------------

function buildTemplateTable(templates: TemplateRow[]): HTMLElement {
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

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', tmpl.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', tmpl.category || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', tmpl.description || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', tmpl.variableCount > 0 ? `${tmpl.variableCount} vars` : '-'));

    const tdStatus = el('td', 'py-2 px-3');
    const badgeCls = tmpl.isActive ? ACTIVE_BADGE : INACTIVE_BADGE;
    const badgeText = tmpl.isActive ? 'Active' : 'Inactive';
    tdStatus.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, badgeText));
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Edit');
    tdActions.appendChild(editBtn);
    const previewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Preview');
    tdActions.appendChild(previewBtn);
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

function buildNewTemplateForm(): HTMLElement {
  const form = el('form', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 space-y-3');
  form.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Create Template'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const nameGroup = el('div', 'space-y-1');
  nameGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Template Name'));
  const nameInput = el('input', inputCls) as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.name = 'name';
  nameInput.placeholder = 'e.g., Standard Subcontract Agreement';
  nameInput.required = true;
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

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

  const descGroup = el('div', 'space-y-1');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Description'));
  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.type = 'text';
  descInput.name = 'description';
  descInput.placeholder = 'Brief description of this template';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  const contentGroup = el('div', 'space-y-1');
  contentGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Template Content'));
  const contentArea = el('textarea', inputCls) as HTMLTextAreaElement;
  contentArea.name = 'content';
  contentArea.rows = 8;
  contentArea.placeholder = 'Template content with {{variable}} placeholders...';
  contentGroup.appendChild(contentArea);
  form.appendChild(contentGroup);

  const varsGroup = el('div', 'space-y-1');
  varsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Variables (comma-separated)'));
  const varsInput = el('input', inputCls) as HTMLInputElement;
  varsInput.type = 'text';
  varsInput.name = 'variables';
  varsInput.placeholder = 'projectName, contractDate, contractAmount';
  varsGroup.appendChild(varsInput);
  form.appendChild(varsGroup);

  const submitBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Template');
  submitBtn.type = 'submit';
  form.appendChild(submitBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    /* create template placeholder */
  });

  return form;
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

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const selectCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const catFilter = el('select', selectCls) as HTMLSelectElement;
    for (const opt of TEMPLATE_CATEGORY_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      catFilter.appendChild(o);
    }
    bar.appendChild(catFilter);
    wrapper.appendChild(bar);

    const templates: TemplateRow[] = [];
    wrapper.appendChild(buildTemplateTable(templates));
    wrapper.appendChild(buildNewTemplateForm());

    container.appendChild(wrapper);
  },
};

/**
 * Project create/edit form view.
 * Full project details: name, job, dates, budget, manager, percent complete method.
 */

import { getProjectService } from '../service-accessor';

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

function parseProjectId(): string {
  const hash = window.location.hash;
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts.length >= 2 && parts[0] === 'project') return parts[1];
  return '';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PCT_METHOD_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'cost', label: 'Cost-Based' },
  { value: 'units', label: 'Units-Based' },
];

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(label: string, inputEl: HTMLElement, colSpan?: number): HTMLElement {
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

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
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

function textareaInput(name: string, rows: number): HTMLTextAreaElement {
  const ta = el('textarea', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLTextAreaElement;
  ta.name = name;
  ta.rows = rows;
  return ta;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    // Determine mode: #/project/new = create, #/project/{id} = edit
    const rawId = parseProjectId();
    const isCreate = rawId === 'new';
    // Exclude sub-routes like gantt, tasks, daily-log, milestones
    const SUB_ROUTES = ['list', 'gantt', 'tasks', 'daily-log', 'milestones'];
    if (!isCreate && SUB_ROUTES.includes(rawId)) {
      // Not a form route — bail
      return;
    }
    const projectId = isCreate ? '' : rawId;

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isCreate ? 'New Project' : 'Edit Project'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Projects') as HTMLAnchorElement;
    backLink.href = '#/project/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    const nameInput = textInput('name', 'Enter project name');
    genGrid.appendChild(buildField('Project Name', nameInput));
    const jobIdInput = textInput('jobId', 'Link to job');
    genGrid.appendChild(buildField('Job ID', jobIdInput));
    const statusSelect = selectInput('status', STATUS_OPTIONS);
    genGrid.appendChild(buildField('Status', statusSelect));
    const managerInput = textInput('manager', 'Manager name');
    genGrid.appendChild(buildField('Project Manager', managerInput));
    form.appendChild(genGrid);

    // Schedule
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Schedule'));
    const schedGrid = el('div', 'grid grid-cols-2 gap-4');
    const startDateInput = dateInput('startDate');
    schedGrid.appendChild(buildField('Start Date', startDateInput));
    const endDateInput = dateInput('endDate');
    schedGrid.appendChild(buildField('End Date', endDateInput));
    const baselineStartInput = dateInput('baselineStartDate');
    schedGrid.appendChild(buildField('Baseline Start', baselineStartInput));
    const baselineEndInput = dateInput('baselineEndDate');
    schedGrid.appendChild(buildField('Baseline End', baselineEndInput));
    form.appendChild(schedGrid);

    // Budget & Progress
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Budget & Progress'));
    const budgetGrid = el('div', 'grid grid-cols-2 gap-4');
    const budgetedCostInput = numberInput('budgetedCost', '0.00');
    budgetGrid.appendChild(buildField('Budgeted Cost', budgetedCostInput));
    const actualCostInput = numberInput('actualCost', '0.00');
    budgetGrid.appendChild(buildField('Actual Cost', actualCostInput));
    const pctMethodSelect = selectInput('percentCompleteMethod', PCT_METHOD_OPTIONS);
    budgetGrid.appendChild(buildField('% Complete Method', pctMethodSelect));
    const pctCompleteInput = numberInput('percentComplete', '0');
    budgetGrid.appendChild(buildField('% Complete', pctCompleteInput));
    form.appendChild(budgetGrid);

    // Description
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Description'));
    const descInput = textareaInput('description', 4);
    form.appendChild(buildField('Project Description', descInput, 2));

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Project');
    saveBtn.type = 'button';
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/project/list';
    btnRow.appendChild(cancelBtn);

    // Delete button (edit mode only) — added after cancel
    let deleteBtn: HTMLButtonElement | null = null;
    if (!isCreate) {
      deleteBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 ml-auto', 'Delete') as HTMLButtonElement;
      deleteBtn.type = 'button';
      btnRow.appendChild(deleteBtn);
    }

    form.appendChild(btnRow);
    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // --- Service wiring ---
    const svc = getProjectService();

    /** Collect form values */
    function collectFormData(): Record<string, any> {
      return {
        name: nameInput.value.trim(),
        jobId: jobIdInput.value.trim() || undefined,
        status: statusSelect.value,
        manager: managerInput.value.trim() || undefined,
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        baselineStartDate: baselineStartInput.value || undefined,
        baselineEndDate: baselineEndInput.value || undefined,
        budgetedCost: budgetedCostInput.value ? parseFloat(budgetedCostInput.value) : undefined,
        actualCost: actualCostInput.value ? parseFloat(actualCostInput.value) : undefined,
        percentCompleteMethod: pctMethodSelect.value || undefined,
        percentComplete: pctCompleteInput.value ? parseFloat(pctCompleteInput.value) : undefined,
        description: descInput.value.trim() || undefined,
      };
    }

    /** Populate form fields from a project object */
    function populateForm(p: any): void {
      nameInput.value = p.name ?? '';
      jobIdInput.value = p.jobId ?? '';
      statusSelect.value = p.status ?? 'planning';
      managerInput.value = p.manager ?? '';
      startDateInput.value = p.startDate ?? '';
      endDateInput.value = p.endDate ?? '';
      baselineStartInput.value = p.baselineStartDate ?? '';
      baselineEndInput.value = p.baselineEndDate ?? '';
      budgetedCostInput.value = p.budgetedCost != null ? String(p.budgetedCost) : '';
      actualCostInput.value = p.actualCost != null ? String(p.actualCost) : '';
      pctMethodSelect.value = p.percentCompleteMethod ?? 'manual';
      pctCompleteInput.value = p.percentComplete != null ? String(p.percentComplete) : '';
      descInput.value = p.description ?? '';
    }

    // If editing, load the project
    if (!isCreate && projectId) {
      (async () => {
        try {
          const project = await svc.getProject(projectId);
          if (!project) {
            showMsg(wrapper, 'Project not found.', true);
            return;
          }
          populateForm(project);
        } catch (err: any) {
          showMsg(wrapper, `Failed to load project: ${err.message ?? err}`, true);
        }
      })();
    }

    // Save handler
    saveBtn.addEventListener('click', async () => {
      const data = collectFormData();

      // Validation
      if (!data.name) {
        showMsg(wrapper, 'Project name is required.', true);
        return;
      }
      if (!data.startDate) {
        showMsg(wrapper, 'Start date is required.', true);
        return;
      }
      if (!data.endDate) {
        showMsg(wrapper, 'End date is required.', true);
        return;
      }

      try {
        saveBtn.textContent = 'Saving...';
        (saveBtn as HTMLButtonElement).disabled = true;

        if (isCreate) {
          await svc.createProject(data as any);
        } else {
          await svc.updateProject(projectId, data);
        }

        window.location.hash = '#/project/list';
      } catch (err: any) {
        showMsg(wrapper, `Failed to save project: ${err.message ?? err}`, true);
        saveBtn.textContent = 'Save Project';
        (saveBtn as HTMLButtonElement).disabled = false;
      }
    });

    // Delete handler (edit mode only)
    if (deleteBtn && !isCreate) {
      deleteBtn.addEventListener('click', async () => {
        const confirmed = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');
        if (!confirmed) return;

        try {
          await svc.deleteProject(projectId);
          window.location.hash = '#/project/list';
        } catch (err: any) {
          showMsg(wrapper, `Failed to delete project: ${err.message ?? err}`, true);
        }
      });
    }
  },
};

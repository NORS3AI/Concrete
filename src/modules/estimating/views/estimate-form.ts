/**
 * Estimate create/edit form view.
 * Full estimate details with all fields for creating or editing an estimate,
 * including job linkage, bid day info, markup defaults, and status management.
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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'withdrawn', label: 'Withdrawn' },
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

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
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

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Estimate Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Estimates') as HTMLAnchorElement;
    backLink.href = '#/estimating';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: General Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');
    genGrid.appendChild(buildField('Estimate Name', textInput('name', 'Enter estimate name')));
    genGrid.appendChild(buildField('Job', selectInput('jobId', [{ value: '', label: 'Select a job...' }])));
    genGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    genGrid.appendChild(buildField('Revision', numberInput('revision', '1')));
    genGrid.appendChild(buildField('Client Name', textInput('clientName', 'Client name')));
    genGrid.appendChild(buildField('Project Name', textInput('projectName', 'Project name')));
    genGrid.appendChild(buildField('Description', textareaInput('description', 3), 2));
    form.appendChild(genGrid);

    // Section: Bid Day Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Bid Day Information'));
    const bidGrid = el('div', 'grid grid-cols-2 gap-4');
    bidGrid.appendChild(buildField('Bid Date', dateInput('bidDate')));
    bidGrid.appendChild(buildField('Submitted Date', dateInput('submittedDate')));
    bidGrid.appendChild(buildField('Created By', textInput('createdBy', 'Estimator name')));
    form.appendChild(bidGrid);

    // Section: Markup & Margin Defaults
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Markup & Margin'));
    const markupGrid = el('div', 'grid grid-cols-2 gap-4');
    markupGrid.appendChild(buildField('Default Markup %', numberInput('defaultMarkupPct', '0')));
    form.appendChild(markupGrid);

    // Section: Totals (read-only)
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Totals'));
    const totalsGrid = el('div', 'grid grid-cols-4 gap-4');

    const costCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
    costCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Cost'));
    costCard.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1 font-mono', '$0.00'));
    totalsGrid.appendChild(costCard);

    const markupCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
    markupCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Markup'));
    markupCard.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1 font-mono', '$0.00'));
    totalsGrid.appendChild(markupCard);

    const priceCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
    priceCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Price'));
    priceCard.appendChild(el('div', 'text-xl font-bold text-[var(--text)] mt-1 font-mono', '$0.00'));
    totalsGrid.appendChild(priceCard);

    const marginCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
    marginCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Margin'));
    marginCard.appendChild(el('div', 'text-xl font-bold text-emerald-400 mt-1 font-mono', '0.0%'));
    totalsGrid.appendChild(marginCard);

    form.appendChild(totalsGrid);

    // Section: Win/Loss Info (conditional, shown when won or lost)
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Win/Loss Information'));
    const wlGrid = el('div', 'grid grid-cols-2 gap-4');
    wlGrid.appendChild(buildField('Lost Reason', textInput('lostReason', 'Reason for loss')));
    wlGrid.appendChild(buildField('Competitor Name', textInput('competitorName', 'Winning competitor')));
    wlGrid.appendChild(buildField('Competitor Price', numberInput('competitorPrice', '0.00')));
    form.appendChild(wlGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Estimate');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:opacity-90', 'Submit Estimate');
    submitBtn.type = 'button';
    submitBtn.addEventListener('click', () => { /* submit placeholder */ });
    btnRow.appendChild(submitBtn);

    const revisionBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-zinc-600 text-white hover:opacity-90', 'Create Revision');
    revisionBtn.type = 'button';
    revisionBtn.addEventListener('click', () => { /* revision placeholder */ });
    btnRow.appendChild(revisionBtn);

    const transferBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Transfer to Budget');
    transferBtn.type = 'button';
    transferBtn.addEventListener('click', () => { /* transfer placeholder */ });
    btnRow.appendChild(transferBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/estimating';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

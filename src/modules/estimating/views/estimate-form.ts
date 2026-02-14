/**
 * Estimate create/edit form view.
 * Full estimate details with all fields for creating or editing an estimate,
 * including job linkage, bid day info, markup defaults, and status management.
 */

import { getEstimatingService } from '../service-accessor';

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (v: number): string => `${v.toFixed(1)}%`;

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

function readonlyInput(value: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-muted)] cursor-not-allowed') as HTMLInputElement;
  input.type = 'text';
  input.readOnly = true;
  input.value = value;
  return input;
}

// ---------------------------------------------------------------------------
// URL Parsing
// ---------------------------------------------------------------------------

function getEstimateIdFromHash(): string | null {
  const hash = window.location.hash; // e.g. #/estimating/abc123 or #/estimating/new
  const match = hash.match(/#\/estimating\/([^/]+)/);
  if (!match) return null;
  const id = match[1];
  return id === 'new' ? null : id;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const estimateId = getEstimateIdFromHash();
    const isEditMode = estimateId !== null;

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(
      el('h1', 'text-2xl font-bold text-[var(--text)]', isEditMode ? 'Edit Estimate' : 'New Estimate'),
    );
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Estimates') as HTMLAnchorElement;
    backLink.href = '#/estimating';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // ----- Section: General Information -----
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'General Information'));
    const genGrid = el('div', 'grid grid-cols-2 gap-4');

    const nameInput = textInput('name', 'Enter estimate name');
    genGrid.appendChild(buildField('Estimate Name *', nameInput));

    const jobIdInput = textInput('jobId', 'Job ID');
    genGrid.appendChild(buildField('Job ID', jobIdInput));

    const statusSelect = selectInput('status', STATUS_OPTIONS);
    if (isEditMode) {
      statusSelect.disabled = true;
      statusSelect.className += ' cursor-not-allowed opacity-70';
    }
    genGrid.appendChild(buildField('Status', statusSelect));

    const revisionInput = numberInput('revision', '1');
    revisionInput.readOnly = true;
    revisionInput.className += ' cursor-not-allowed';
    genGrid.appendChild(buildField('Revision', revisionInput));

    const clientNameInput = textInput('clientName', 'Client name');
    genGrid.appendChild(buildField('Client Name', clientNameInput));

    const projectNameInput = textInput('projectName', 'Project name');
    genGrid.appendChild(buildField('Project Name', projectNameInput));

    const descriptionInput = textareaInput('description', 3);
    genGrid.appendChild(buildField('Description', descriptionInput, 2));

    form.appendChild(genGrid);

    // ----- Section: Bid Day Information -----
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Bid Day Information'));
    const bidGrid = el('div', 'grid grid-cols-2 gap-4');

    const bidDateInput = dateInput('bidDate');
    bidGrid.appendChild(buildField('Bid Date', bidDateInput));

    const submittedDateInput = dateInput('submittedDate');
    bidGrid.appendChild(buildField('Submitted Date', submittedDateInput));

    const createdByInput = textInput('createdBy', 'Estimator name');
    bidGrid.appendChild(buildField('Created By', createdByInput));

    form.appendChild(bidGrid);

    // ----- Section: Markup -----
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Markup & Margin'));
    const markupGrid = el('div', 'grid grid-cols-2 gap-4');

    const markupPctInput = numberInput('defaultMarkupPct', '0');
    markupGrid.appendChild(buildField('Default Markup %', markupPctInput));

    form.appendChild(markupGrid);

    // ----- Section: Totals (read-only, edit mode only) -----
    const totalsSection = el('div');
    if (isEditMode) {
      totalsSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Totals'));
      const totalsGrid = el('div', 'grid grid-cols-4 gap-4');

      const costCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
      costCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Cost'));
      const costValue = el('div', 'text-xl font-bold text-[var(--text)] mt-1 font-mono', '$0.00');
      costValue.setAttribute('data-field', 'totalCost');
      costCard.appendChild(costValue);
      totalsGrid.appendChild(costCard);

      const markupCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
      markupCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Markup'));
      const markupValue = el('div', 'text-xl font-bold text-[var(--text)] mt-1 font-mono', '$0.00');
      markupValue.setAttribute('data-field', 'totalMarkup');
      markupCard.appendChild(markupValue);
      totalsGrid.appendChild(markupCard);

      const priceCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
      priceCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Total Price'));
      const priceValue = el('div', 'text-xl font-bold text-[var(--text)] mt-1 font-mono', '$0.00');
      priceValue.setAttribute('data-field', 'totalPrice');
      priceCard.appendChild(priceValue);
      totalsGrid.appendChild(priceCard);

      const marginCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
      marginCard.appendChild(el('div', 'text-xs text-[var(--text-muted)] uppercase tracking-wider', 'Margin'));
      const marginValue = el('div', 'text-xl font-bold text-emerald-400 mt-1 font-mono', '0.0%');
      marginValue.setAttribute('data-field', 'marginPct');
      marginCard.appendChild(marginValue);
      totalsGrid.appendChild(marginCard);

      totalsSection.appendChild(totalsGrid);
    }
    form.appendChild(totalsSection);

    // ----- Section: Win/Loss Info (conditional) -----
    const winLossSection = el('div');
    winLossSection.setAttribute('data-section', 'winloss');
    winLossSection.style.display = 'none';

    winLossSection.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Win/Loss Information'));
    const wlGrid = el('div', 'grid grid-cols-2 gap-4');

    const wonDateInput = dateInput('wonDate');
    wlGrid.appendChild(buildField('Won Date', wonDateInput));

    const lostDateInput = dateInput('lostDate');
    wlGrid.appendChild(buildField('Lost Date', lostDateInput));

    const lostReasonInput = textInput('lostReason', 'Reason for loss');
    wlGrid.appendChild(buildField('Lost Reason', lostReasonInput));

    const competitorNameInput = textInput('competitorName', 'Winning competitor');
    wlGrid.appendChild(buildField('Competitor Name', competitorNameInput));

    const competitorPriceInput = numberInput('competitorPrice', '0.00');
    wlGrid.appendChild(buildField('Competitor Price', competitorPriceInput));

    winLossSection.appendChild(wlGrid);
    form.appendChild(winLossSection);

    // ----- Action buttons -----
    const btnRow = el('div', 'flex items-center gap-3 mt-6');

    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Estimate');
    saveBtn.type = 'button';
    btnRow.appendChild(saveBtn);

    const submitBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:opacity-90', 'Submit Estimate');
    submitBtn.type = 'button';
    if (!isEditMode) submitBtn.style.display = 'none';
    btnRow.appendChild(submitBtn);

    const revisionBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-zinc-600 text-white hover:opacity-90', 'Create Revision');
    revisionBtn.type = 'button';
    if (!isEditMode) revisionBtn.style.display = 'none';
    btnRow.appendChild(revisionBtn);

    const transferBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:opacity-90', 'Transfer to Budget');
    transferBtn.type = 'button';
    if (!isEditMode) transferBtn.style.display = 'none';
    btnRow.appendChild(transferBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/estimating';
    btnRow.appendChild(cancelBtn);

    form.appendChild(btnRow);
    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // ----- Helper to populate form from estimate data -----
    const populateForm = (est: {
      name: string;
      jobId: string;
      status: string;
      revision: number;
      clientName?: string;
      projectName?: string;
      description?: string;
      bidDate?: string;
      submittedDate?: string;
      createdBy?: string;
      defaultMarkupPct: number;
      totalCost: number;
      totalMarkup: number;
      totalPrice: number;
      marginPct: number;
      wonDate?: string;
      lostDate?: string;
      lostReason?: string;
      competitorName?: string;
      competitorPrice?: number;
      transferredToBudget: boolean;
    }) => {
      nameInput.value = est.name;
      jobIdInput.value = est.jobId;
      statusSelect.value = est.status;
      revisionInput.value = String(est.revision);
      clientNameInput.value = est.clientName ?? '';
      projectNameInput.value = est.projectName ?? '';
      descriptionInput.value = est.description ?? '';
      bidDateInput.value = est.bidDate ?? '';
      submittedDateInput.value = est.submittedDate ?? '';
      createdByInput.value = est.createdBy ?? '';
      markupPctInput.value = String(est.defaultMarkupPct);

      // Totals
      const costEl = totalsSection.querySelector('[data-field="totalCost"]');
      if (costEl) costEl.textContent = fmtCurrency(est.totalCost);
      const markupEl = totalsSection.querySelector('[data-field="totalMarkup"]');
      if (markupEl) markupEl.textContent = fmtCurrency(est.totalMarkup);
      const priceEl = totalsSection.querySelector('[data-field="totalPrice"]');
      if (priceEl) priceEl.textContent = fmtCurrency(est.totalPrice);
      const marginEl = totalsSection.querySelector('[data-field="marginPct"]');
      if (marginEl) marginEl.textContent = fmtPct(est.marginPct);

      // Show/hide win/loss section
      const showWinLoss = est.status === 'won' || est.status === 'lost';
      winLossSection.style.display = showWinLoss ? '' : 'none';
      if (showWinLoss) {
        wonDateInput.value = est.wonDate ?? '';
        lostDateInput.value = est.lostDate ?? '';
        lostReasonInput.value = est.lostReason ?? '';
        competitorNameInput.value = est.competitorName ?? '';
        competitorPriceInput.value = est.competitorPrice != null ? String(est.competitorPrice) : '';
      }

      // Show/hide conditional buttons
      submitBtn.style.display = est.status === 'draft' ? '' : 'none';
      revisionBtn.style.display = isEditMode ? '' : 'none';
      transferBtn.style.display =
        isEditMode && est.status === 'won' && !est.transferredToBudget ? '' : 'none';
    };

    // ----- Wire save button -----
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const jobId = jobIdInput.value.trim();

      if (!name) {
        showMsg(wrapper, 'Estimate name is required.', true);
        return;
      }
      if (!jobId) {
        showMsg(wrapper, 'Job ID is required.', true);
        return;
      }

      const svc = getEstimatingService();

      try {
        if (isEditMode) {
          await svc.updateEstimate(estimateId, {
            name,
            jobId,
            clientName: clientNameInput.value.trim() || undefined,
            projectName: projectNameInput.value.trim() || undefined,
            description: descriptionInput.value.trim() || undefined,
            bidDate: bidDateInput.value || undefined,
            submittedDate: submittedDateInput.value || undefined,
            createdBy: createdByInput.value.trim() || undefined,
            defaultMarkupPct: parseFloat(markupPctInput.value) || 0,
            wonDate: wonDateInput.value || undefined,
            lostDate: lostDateInput.value || undefined,
            lostReason: lostReasonInput.value.trim() || undefined,
            competitorName: competitorNameInput.value.trim() || undefined,
            competitorPrice: competitorPriceInput.value ? parseFloat(competitorPriceInput.value) : undefined,
          });
          showMsg(wrapper, 'Estimate updated successfully.', false);
          // Navigate to list after short delay to show the success message
          setTimeout(() => { window.location.hash = '#/estimating'; }, 800);
        } else {
          await svc.createEstimate({
            name,
            jobId,
            clientName: clientNameInput.value.trim() || undefined,
            projectName: projectNameInput.value.trim() || undefined,
            description: descriptionInput.value.trim() || undefined,
            bidDate: bidDateInput.value || undefined,
            submittedDate: submittedDateInput.value || undefined,
            createdBy: createdByInput.value.trim() || undefined,
            defaultMarkupPct: parseFloat(markupPctInput.value) || 0,
          });
          showMsg(wrapper, 'Estimate created successfully.', false);
          setTimeout(() => { window.location.hash = '#/estimating'; }, 800);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save estimate.';
        showMsg(wrapper, message, true);
      }
    });

    // ----- Wire submit button -----
    submitBtn.addEventListener('click', async () => {
      if (!estimateId) return;
      try {
        const svc = getEstimatingService();
        const updated = await svc.submitEstimate(estimateId);
        showMsg(wrapper, 'Estimate submitted successfully.', false);
        populateForm(updated);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit estimate.';
        showMsg(wrapper, message, true);
      }
    });

    // ----- Wire revision button -----
    revisionBtn.addEventListener('click', async () => {
      if (!estimateId) return;
      try {
        const svc = getEstimatingService();
        const newRevision = await svc.createRevision(estimateId, createdByInput.value.trim() || undefined);
        showMsg(wrapper, `Revision ${newRevision.revision} created.`, false);
        setTimeout(() => { window.location.hash = `#/estimating/${newRevision.id}`; }, 800);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create revision.';
        showMsg(wrapper, message, true);
      }
    });

    // ----- Wire transfer button -----
    transferBtn.addEventListener('click', () => {
      if (!estimateId) return;
      window.location.hash = `#/estimating/${estimateId}/budget-transfer`;
    });

    // ----- Load existing estimate data in edit mode -----
    if (isEditMode) {
      const svc = getEstimatingService();
      svc
        .getEstimate(estimateId)
        .then((est) => {
          if (!est) {
            showMsg(wrapper, `Estimate not found: ${estimateId}`, true);
            return;
          }
          populateForm(est);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load estimate.';
          showMsg(wrapper, message, true);
        });
    } else {
      // Create mode defaults
      revisionInput.value = '1';
      statusSelect.value = 'draft';
      winLossSection.style.display = 'none';
      submitBtn.style.display = 'none';
      revisionBtn.style.display = 'none';
      transferBtn.style.display = 'none';
    }
  },
};

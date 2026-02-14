/**
 * Submittals view.
 * Submittal log with number, spec section, description, status, and dates.
 * Wired to ProjectService for data operations.
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

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  approved_as_noted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  resubmit: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  approved_as_noted: 'Approved as Noted',
  rejected: 'Rejected',
  resubmit: 'Resubmit',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'approved_as_noted', label: 'Approved as Noted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resubmit', label: 'Resubmit' },
];

const REVIEW_STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'approved_as_noted', label: 'Approved as Noted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resubmit', label: 'Resubmit' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubmittalRow {
  id: string;
  number: number;
  specSection: string;
  description: string;
  submittedBy: string;
  status: string;
  submittedDate: string;
  reviewedDate: string;
  reviewer: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search submittals...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_FILTER_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const fire = () => onFilter(statusSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  submittals: SubmittalRow[],
  onReview: (sub: SubmittalRow) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Spec Section', 'Description', 'Submitted By', 'Status', 'Submitted', 'Reviewed', 'Reviewer', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (submittals.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No submittals found. Create a submittal to track project submissions.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const sub of submittals) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `SUB-${String(sub.number).padStart(3, '0')}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.specSection));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)] max-w-xs truncate', sub.description));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.submittedBy));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[sub.status] ?? STATUS_BADGE.pending}`,
      STATUS_LABELS[sub.status] ?? sub.status);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.submittedDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.reviewedDate || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', sub.reviewer || '--'));

    const tdActions = el('td', 'py-2 px-3');
    if (sub.status === 'pending' || sub.status === 'resubmit') {
      const reviewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Review');
      reviewBtn.type = 'button';
      reviewBtn.addEventListener('click', () => onReview(sub));
      tdActions.appendChild(reviewBtn);
    }
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Submittal Modal
// ---------------------------------------------------------------------------

function showNewSubmittalForm(
  projectId: string,
  nextNumber: number,
  onCreated: () => void,
): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const modal = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-lg');
  modal.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', `New Submittal (SUB-${String(nextNumber).padStart(3, '0')})`));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const form = el('div', 'space-y-3');

  const specGroup = el('div');
  specGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Spec Section'));
  const specInput = el('input', inputCls) as HTMLInputElement;
  specInput.type = 'text';
  specInput.placeholder = 'e.g. 03 30 00';
  specGroup.appendChild(specInput);
  form.appendChild(specGroup);

  const descGroup = el('div');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Description'));
  const descInput = el('textarea', inputCls) as HTMLTextAreaElement;
  descInput.rows = 3;
  descInput.placeholder = 'Describe the submittal';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  const submittedByGroup = el('div');
  submittedByGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Submitted By'));
  const submittedByInput = el('input', inputCls) as HTMLInputElement;
  submittedByInput.type = 'text';
  submittedByInput.placeholder = 'Name';
  submittedByGroup.appendChild(submittedByInput);
  form.appendChild(submittedByGroup);

  const btnRow = el('div', 'flex items-center gap-3 mt-4');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Submittal');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const specSection = specInput.value.trim();
    const description = descInput.value.trim();
    const submittedBy = submittedByInput.value.trim();

    if (!specSection || !description || !submittedBy) {
      showMsg(modal, 'Spec section, description, and submitted by are required.', true);
      return;
    }

    try {
      const svc = getProjectService();
      await svc.createSubmittal({
        projectId,
        number: nextNumber,
        specSection,
        description,
        submittedBy,
      });
      overlay.remove();
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create submittal';
      showMsg(modal, message, true);
    }
  });
  btnRow.appendChild(saveBtn);

  const cancelBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]', 'Cancel');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(cancelBtn);

  form.appendChild(btnRow);
  modal.appendChild(form);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Review Modal
// ---------------------------------------------------------------------------

function showReviewForm(
  sub: SubmittalRow,
  onReviewed: () => void,
): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const modal = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-lg');
  modal.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', `Review SUB-${String(sub.number).padStart(3, '0')}`));
  modal.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', `${sub.specSection} - ${sub.description}`));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const form = el('div', 'space-y-3');

  const reviewerGroup = el('div');
  reviewerGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Reviewer Name'));
  const reviewerInput = el('input', inputCls) as HTMLInputElement;
  reviewerInput.type = 'text';
  reviewerInput.placeholder = 'Your name';
  reviewerGroup.appendChild(reviewerInput);
  form.appendChild(reviewerGroup);

  const statusGroup = el('div');
  statusGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Review Decision'));
  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of REVIEW_STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  statusGroup.appendChild(statusSelect);
  form.appendChild(statusGroup);

  const btnRow = el('div', 'flex items-center gap-3 mt-4');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Submit Review');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const reviewer = reviewerInput.value.trim();
    const status = statusSelect.value;

    if (!reviewer) {
      showMsg(modal, 'Reviewer name is required.', true);
      return;
    }

    try {
      const svc = getProjectService();
      await svc.reviewSubmittal(sub.id, reviewer, status as any);
      overlay.remove();
      onReviewed();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to review submittal';
      showMsg(modal, message, true);
    }
  });
  btnRow.appendChild(saveBtn);

  const cancelBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]', 'Cancel');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(cancelBtn);

  form.appendChild(btnRow);
  modal.appendChild(form);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const projectId = parseProjectId();

    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleArea = el('div', 'flex items-center gap-3');
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', '\u2190 Back') as HTMLAnchorElement;
    backLink.href = `#/project/${projectId}`;
    titleArea.appendChild(backLink);
    titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Submittals'));
    headerRow.appendChild(titleArea);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Submittal');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Slots for dynamic content
    const filterSlot = el('div');
    wrapper.appendChild(filterSlot);

    const tableSlot = el('div');
    wrapper.appendChild(tableSlot);

    container.appendChild(wrapper);

    // State
    let allSubmittals: SubmittalRow[] = [];
    let filterStatus = '';
    let filterSearch = '';

    const getFiltered = (): SubmittalRow[] => {
      let result = allSubmittals;
      if (filterStatus) {
        result = result.filter(s => s.status === filterStatus);
      }
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        result = result.filter(s =>
          s.specSection.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
        );
      }
      return result;
    };

    const renderContent = () => {
      tableSlot.innerHTML = '';
      tableSlot.appendChild(buildTable(
        getFiltered(),
        (sub) => {
          showReviewForm(sub, () => loadData());
        },
      ));
    };

    // Filter bar
    filterSlot.appendChild(buildFilterBar((status, search) => {
      filterStatus = status;
      filterSearch = search;
      renderContent();
    }));

    // Load data
    const loadData = async () => {
      try {
        const svc = getProjectService();
        const submittals = await svc.listSubmittals(projectId);
        allSubmittals = submittals.map((s: any) => ({
          id: s.id ?? '',
          number: s.number ?? 0,
          specSection: s.specSection ?? '',
          description: s.description ?? '',
          submittedBy: s.submittedBy ?? '',
          status: s.status ?? 'pending',
          submittedDate: s.submittedDate ?? '',
          reviewedDate: s.reviewedDate ?? '',
          reviewer: s.reviewer ?? '',
          notes: s.notes ?? '',
        }));
        renderContent();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load submittals';
        showMsg(wrapper, message, true);
      }
    };

    // New submittal button
    newBtn.addEventListener('click', () => {
      const nextNumber = allSubmittals.length > 0
        ? Math.max(...allSubmittals.map(s => s.number)) + 1
        : 1;
      showNewSubmittalForm(projectId, nextNumber, () => loadData());
    });

    // Initial load
    loadData();
  },
};

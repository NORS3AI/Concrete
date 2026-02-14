/**
 * RFI (Request for Information) view.
 * RFI log with number, subject, status, assigned to, due date, and priority badges.
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
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  answered: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'answered', label: 'Answered' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RFIRow {
  id: string;
  number: number;
  subject: string;
  question: string;
  requestedBy: string;
  assignedTo: string;
  dueDate: string;
  status: string;
  priority: string;
  response: string;
  responseDate: string;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(rfis: RFIRow[]): HTMLElement {
  const row = el('div', 'grid grid-cols-4 gap-3 mb-4');

  const openCount = rfis.filter(r => r.status === 'open').length;
  const answeredCount = rfis.filter(r => r.status === 'answered').length;
  const overdueCount = rfis.filter(r => r.status === 'overdue').length;
  const totalCount = rfis.length;

  const buildCard = (label: string, value: string, colorCls: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-2xl font-bold ${colorCls}`, value));
    return card;
  };

  row.appendChild(buildCard('Open', String(openCount), 'text-blue-400'));
  row.appendChild(buildCard('Answered', String(answeredCount), 'text-emerald-400'));
  row.appendChild(buildCard('Overdue', String(overdueCount), 'text-red-400'));
  row.appendChild(buildCard('Total', String(totalCount), 'text-[var(--text)]'));

  return row;
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
  searchInput.placeholder = 'Search RFIs...';
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
  rfis: RFIRow[],
  onRespond: (rfi: RFIRow) => void,
  onClose: (rfi: RFIRow) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['#', 'Subject', 'Requested By', 'Assigned To', 'Due Date', 'Priority', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (rfis.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No RFIs found. Create an RFI to track project questions.');
    td.setAttribute('colspan', '8');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const rfi of rfis) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', `RFI-${String(rfi.number).padStart(3, '0')}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', rfi.subject));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rfi.requestedBy));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rfi.assignedTo || '--'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', rfi.dueDate || '--'));

    const tdPriority = el('td', 'py-2 px-3');
    const prBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[rfi.priority] ?? PRIORITY_BADGE.medium}`,
      rfi.priority.charAt(0).toUpperCase() + rfi.priority.slice(1));
    tdPriority.appendChild(prBadge);
    tr.appendChild(tdPriority);

    const tdStatus = el('td', 'py-2 px-3');
    const stBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rfi.status] ?? STATUS_BADGE.open}`,
      rfi.status.charAt(0).toUpperCase() + rfi.status.slice(1));
    tdStatus.appendChild(stBadge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3');
    const actionWrap = el('div', 'flex items-center gap-2');

    if (rfi.status === 'open' || rfi.status === 'overdue') {
      const respondBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Respond');
      respondBtn.type = 'button';
      respondBtn.addEventListener('click', () => onRespond(rfi));
      actionWrap.appendChild(respondBtn);
    }

    if (rfi.status === 'answered') {
      const closeBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Close');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => onClose(rfi));
      actionWrap.appendChild(closeBtn);
    }

    tdActions.appendChild(actionWrap);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New RFI Modal
// ---------------------------------------------------------------------------

function showNewRFIForm(
  container: HTMLElement,
  projectId: string,
  nextNumber: number,
  onCreated: () => void,
): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const modal = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-lg');
  modal.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', `New RFI (RFI-${String(nextNumber).padStart(3, '0')})`));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const form = el('div', 'space-y-3');

  const subjectGroup = el('div');
  subjectGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Subject'));
  const subjectInput = el('input', inputCls) as HTMLInputElement;
  subjectInput.type = 'text';
  subjectInput.placeholder = 'RFI Subject';
  subjectGroup.appendChild(subjectInput);
  form.appendChild(subjectGroup);

  const questionGroup = el('div');
  questionGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Question'));
  const questionInput = el('textarea', inputCls) as HTMLTextAreaElement;
  questionInput.rows = 3;
  questionInput.placeholder = 'Describe the question or information needed';
  questionGroup.appendChild(questionInput);
  form.appendChild(questionGroup);

  const row1 = el('div', 'grid grid-cols-2 gap-3');

  const reqByGroup = el('div');
  reqByGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Requested By'));
  const reqByInput = el('input', inputCls) as HTMLInputElement;
  reqByInput.type = 'text';
  reqByInput.placeholder = 'Name';
  reqByGroup.appendChild(reqByInput);
  row1.appendChild(reqByGroup);

  const assignGroup = el('div');
  assignGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Assigned To'));
  const assignInput = el('input', inputCls) as HTMLInputElement;
  assignInput.type = 'text';
  assignInput.placeholder = 'Name (optional)';
  assignGroup.appendChild(assignInput);
  row1.appendChild(assignGroup);

  form.appendChild(row1);

  const row2 = el('div', 'grid grid-cols-2 gap-3');

  const priorityGroup = el('div');
  priorityGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Priority'));
  const prioritySelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of PRIORITY_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    prioritySelect.appendChild(o);
  }
  prioritySelect.value = 'medium';
  priorityGroup.appendChild(prioritySelect);
  row2.appendChild(priorityGroup);

  const dueDateGroup = el('div');
  dueDateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Due Date'));
  const dueDateInput = el('input', inputCls) as HTMLInputElement;
  dueDateInput.type = 'date';
  dueDateGroup.appendChild(dueDateInput);
  row2.appendChild(dueDateGroup);

  form.appendChild(row2);

  const btnRow = el('div', 'flex items-center gap-3 mt-4');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create RFI');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const subject = subjectInput.value.trim();
    const question = questionInput.value.trim();
    const requestedBy = reqByInput.value.trim();

    if (!subject || !question || !requestedBy) {
      showMsg(modal, 'Subject, question, and requested by are required.', true);
      return;
    }

    try {
      const svc = getProjectService();
      await svc.createRFI({
        projectId,
        number: nextNumber,
        subject,
        question,
        requestedBy,
        assignedTo: assignInput.value.trim() || undefined,
        dueDate: dueDateInput.value || undefined,
        priority: (prioritySelect.value as 'low' | 'medium' | 'high' | 'urgent') || undefined,
      });
      overlay.remove();
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create RFI';
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
// Respond Modal
// ---------------------------------------------------------------------------

function showRespondForm(
  rfi: RFIRow,
  onResponded: () => void,
): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const modal = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-lg');
  modal.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', `Respond to RFI-${String(rfi.number).padStart(3, '0')}`));
  modal.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-4', rfi.subject));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const responseGroup = el('div', 'mb-4');
  responseGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Response'));
  const responseInput = el('textarea', inputCls) as HTMLTextAreaElement;
  responseInput.rows = 4;
  responseInput.placeholder = 'Enter your response...';
  responseGroup.appendChild(responseInput);
  modal.appendChild(responseGroup);

  const btnRow = el('div', 'flex items-center gap-3');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Submit Response');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const response = responseInput.value.trim();
    if (!response) {
      showMsg(modal, 'Response text is required.', true);
      return;
    }

    try {
      const svc = getProjectService();
      await svc.respondToRFI(rfi.id, response);
      overlay.remove();
      onResponded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to respond to RFI';
      showMsg(modal, message, true);
    }
  });
  btnRow.appendChild(saveBtn);

  const cancelBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]', 'Cancel');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(cancelBtn);

  modal.appendChild(btnRow);
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
    titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'RFIs'));
    headerRow.appendChild(titleArea);

    const newBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New RFI');
    newBtn.type = 'button';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // Placeholders for dynamic content
    const summarySlot = el('div');
    wrapper.appendChild(summarySlot);

    const filterSlot = el('div');
    wrapper.appendChild(filterSlot);

    const tableSlot = el('div');
    wrapper.appendChild(tableSlot);

    container.appendChild(wrapper);

    // State
    let allRFIs: RFIRow[] = [];
    let filterStatus = '';
    let filterSearch = '';

    const getFiltered = (): RFIRow[] => {
      let result = allRFIs;
      if (filterStatus) {
        result = result.filter(r => r.status === filterStatus);
      }
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        result = result.filter(r =>
          r.subject.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q) ||
          (r.assignedTo && r.assignedTo.toLowerCase().includes(q)),
        );
      }
      return result;
    };

    const renderContent = () => {
      summarySlot.innerHTML = '';
      summarySlot.appendChild(buildSummaryCards(allRFIs));

      tableSlot.innerHTML = '';
      tableSlot.appendChild(buildTable(
        getFiltered(),
        (rfi) => {
          showRespondForm(rfi, () => loadData());
        },
        async (rfi) => {
          try {
            const svc = getProjectService();
            await svc.closeRFI(rfi.id);
            await loadData();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to close RFI';
            showMsg(wrapper, message, true);
          }
        },
      ));
    };

    // Filter bar (static, wired to re-render on change)
    filterSlot.appendChild(buildFilterBar((status, search) => {
      filterStatus = status;
      filterSearch = search;
      renderContent();
    }));

    // Load data
    const loadData = async () => {
      try {
        const svc = getProjectService();
        const rfis = await svc.listRFIs(projectId);
        allRFIs = rfis.map((r: any) => ({
          id: r.id ?? '',
          number: r.number ?? 0,
          subject: r.subject ?? '',
          question: r.question ?? '',
          requestedBy: r.requestedBy ?? '',
          assignedTo: r.assignedTo ?? '',
          dueDate: r.dueDate ?? '',
          status: r.status ?? 'open',
          priority: r.priority ?? 'medium',
          response: r.response ?? '',
          responseDate: r.responseDate ?? '',
        }));
        renderContent();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load RFIs';
        showMsg(wrapper, message, true);
      }
    };

    // New RFI button
    newBtn.addEventListener('click', () => {
      const nextNumber = allRFIs.length > 0
        ? Math.max(...allRFIs.map(r => r.number)) + 1
        : 1;
      showNewRFIForm(container, projectId, nextNumber, () => loadData());
    });

    // Initial load
    loadData();
  },
};

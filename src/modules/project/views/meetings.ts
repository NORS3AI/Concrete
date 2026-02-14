/**
 * Meeting Minutes view.
 * Meeting minutes list and creation form with type, attendees, topics, and action items.
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

const TYPE_OPTIONS = [
  { value: 'progress', label: 'Progress Meeting' },
  { value: 'safety', label: 'Safety Meeting' },
  { value: 'owner', label: 'Owner Meeting' },
  { value: 'pre_construction', label: 'Pre-Construction Meeting' },
];

const TYPE_BADGE: Record<string, string> = {
  progress: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  safety: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  owner: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pre_construction: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  progress: 'Progress',
  safety: 'Safety',
  owner: 'Owner',
  pre_construction: 'Pre-Construction',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeetingRow {
  id: string;
  date: string;
  type: string;
  attendees: string[];
  topics: string[];
  actionItems: string[];
  nextMeetingDate: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function buildForm(
  projectId: string,
  wrapper: HTMLElement,
  onSaved: () => void,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Meeting Minutes'));

  const form = el('form', 'space-y-4');
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const row1 = el('div', 'grid grid-cols-3 gap-4');

  const dateGroup = el('div');
  dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Meeting Date'));
  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'date';
  dateGroup.appendChild(dateInput);
  row1.appendChild(dateGroup);

  const typeGroup = el('div');
  typeGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Meeting Type'));
  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  typeSelect.name = 'type';
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  typeGroup.appendChild(typeSelect);
  row1.appendChild(typeGroup);

  const nextGroup = el('div');
  nextGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Next Meeting'));
  const nextInput = el('input', inputCls) as HTMLInputElement;
  nextInput.type = 'date';
  nextInput.name = 'nextMeetingDate';
  nextGroup.appendChild(nextInput);
  row1.appendChild(nextGroup);

  form.appendChild(row1);

  const attendeesGroup = el('div');
  attendeesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Attendees (one per line)'));
  const attendeesInput = el('textarea', inputCls) as HTMLTextAreaElement;
  attendeesInput.name = 'attendees';
  attendeesInput.rows = 3;
  attendeesInput.placeholder = 'John Smith - GC\nJane Doe - Owner';
  attendeesGroup.appendChild(attendeesInput);
  form.appendChild(attendeesGroup);

  const topicsGroup = el('div');
  topicsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Topics Discussed (one per line)'));
  const topicsInput = el('textarea', inputCls) as HTMLTextAreaElement;
  topicsInput.name = 'topics';
  topicsInput.rows = 3;
  topicsInput.placeholder = 'Schedule update\nBudget review\nSafety items';
  topicsGroup.appendChild(topicsInput);
  form.appendChild(topicsGroup);

  const actionGroup = el('div');
  actionGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Action Items (one per line)'));
  const actionInput = el('textarea', inputCls) as HTMLTextAreaElement;
  actionInput.name = 'actionItems';
  actionInput.rows = 3;
  actionInput.placeholder = 'Submit revised schedule - Due 2/28\nProvide RFI response - Due 3/1';
  actionGroup.appendChild(actionInput);
  form.appendChild(actionGroup);

  const notesGroup = el('div');
  notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Additional Notes'));
  const notesInput = el('textarea', inputCls) as HTMLTextAreaElement;
  notesInput.name = 'notes';
  notesInput.rows = 2;
  notesGroup.appendChild(notesInput);
  form.appendChild(notesGroup);

  const btnRow = el('div', 'flex items-center gap-3');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Minutes');
  saveBtn.type = 'button';
  saveBtn.addEventListener('click', async () => {
    const date = dateInput.value.trim();
    const type = typeSelect.value;

    if (!date) {
      showMsg(wrapper, 'Meeting date is required.', true);
      return;
    }

    const splitLines = (val: string): string[] =>
      val.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    try {
      const svc = getProjectService();
      await svc.createMeetingMinutes({
        projectId,
        date,
        type: type as any,
        attendees: splitLines(attendeesInput.value),
        topics: splitLines(topicsInput.value),
        actionItems: splitLines(actionInput.value),
        nextMeetingDate: nextInput.value || undefined,
        notes: notesInput.value.trim() || undefined,
      });

      // Clear form
      dateInput.value = '';
      typeSelect.selectedIndex = 0;
      nextInput.value = '';
      attendeesInput.value = '';
      topicsInput.value = '';
      actionInput.value = '';
      notesInput.value = '';

      showMsg(wrapper, 'Meeting minutes saved successfully.', false);
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save meeting minutes';
      showMsg(wrapper, message, true);
    }
  });
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  card.appendChild(form);
  return card;
}

// ---------------------------------------------------------------------------
// Detail Modal
// ---------------------------------------------------------------------------

function showMeetingDetail(mtg: MeetingRow): void {
  const overlay = el('div', 'fixed inset-0 bg-black/50 flex items-center justify-center z-50');
  const modal = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto');

  modal.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-1', `Meeting - ${mtg.date}`));

  const typeBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[mtg.type] ?? TYPE_BADGE.progress}`,
    TYPE_LABELS[mtg.type] ?? mtg.type);
  const typeRow = el('div', 'mb-4');
  typeRow.appendChild(typeBadge);
  modal.appendChild(typeRow);

  if (mtg.attendees.length > 0) {
    modal.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mt-3 mb-1', 'Attendees'));
    const list = el('ul', 'list-disc list-inside text-sm text-[var(--text-muted)] mb-2');
    for (const a of mtg.attendees) {
      list.appendChild(el('li', '', a));
    }
    modal.appendChild(list);
  }

  if (mtg.topics.length > 0) {
    modal.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mt-3 mb-1', 'Topics Discussed'));
    const list = el('ul', 'list-disc list-inside text-sm text-[var(--text-muted)] mb-2');
    for (const t of mtg.topics) {
      list.appendChild(el('li', '', t));
    }
    modal.appendChild(list);
  }

  if (mtg.actionItems.length > 0) {
    modal.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mt-3 mb-1', 'Action Items'));
    const list = el('ul', 'list-disc list-inside text-sm text-[var(--text-muted)] mb-2');
    for (const ai of mtg.actionItems) {
      list.appendChild(el('li', '', ai));
    }
    modal.appendChild(list);
  }

  if (mtg.notes) {
    modal.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mt-3 mb-1', 'Notes'));
    modal.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-2', mtg.notes));
  }

  if (mtg.nextMeetingDate) {
    modal.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-3', `Next meeting: ${mtg.nextMeetingDate}`));
  }

  const closeBtn = el('button', 'mt-4 px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Close');
  closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  meetings: MeetingRow[],
  onView: (mtg: MeetingRow) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Type', 'Attendees', 'Topics', 'Action Items', 'Next Meeting', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (meetings.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No meeting minutes recorded yet.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const mtg of meetings) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', mtg.date));

    const tdType = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[mtg.type] ?? TYPE_BADGE.progress}`,
      TYPE_LABELS[mtg.type] ?? mtg.type);
    tdType.appendChild(badge);
    tr.appendChild(tdType);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${mtg.attendees.length} attendee(s)`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${mtg.topics.length} topic(s)`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${mtg.actionItems.length} item(s)`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', mtg.nextMeetingDate || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const viewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'View');
    viewBtn.type = 'button';
    viewBtn.addEventListener('click', () => onView(mtg));
    tdActions.appendChild(viewBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const projectId = parseProjectId();

    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    const titleArea = el('div', 'flex items-center gap-3');
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', '\u2190 Back') as HTMLAnchorElement;
    backLink.href = `#/project/${projectId}`;
    titleArea.appendChild(backLink);
    titleArea.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Meeting Minutes'));
    headerRow.appendChild(titleArea);
    wrapper.appendChild(headerRow);

    // Table slot (rendered below form)
    const tableSlot = el('div');

    // Form wired to service
    wrapper.appendChild(buildForm(projectId, wrapper, () => loadData()));
    wrapper.appendChild(tableSlot);

    container.appendChild(wrapper);

    // State
    let allMeetings: MeetingRow[] = [];

    const renderTable = () => {
      tableSlot.innerHTML = '';
      tableSlot.appendChild(buildTable(allMeetings, (mtg) => {
        showMeetingDetail(mtg);
      }));
    };

    // Load data
    const loadData = async () => {
      try {
        const svc = getProjectService();
        const meetings = await svc.listMeetingMinutes(projectId);
        allMeetings = meetings.map((m: any) => ({
          id: m.id ?? '',
          date: m.date ?? '',
          type: m.type ?? 'progress',
          attendees: Array.isArray(m.attendees) ? m.attendees : [],
          topics: Array.isArray(m.topics) ? m.topics : [],
          actionItems: Array.isArray(m.actionItems) ? m.actionItems : [],
          nextMeetingDate: m.nextMeetingDate ?? '',
          notes: m.notes ?? '',
        }));
        renderTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load meeting minutes';
        showMsg(wrapper, message, true);
      }
    };

    // Initial load
    loadData();
  },
};

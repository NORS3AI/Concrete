/**
 * Meeting Minutes view.
 * Meeting minutes list and creation form with type, attendees, topics, and action items.
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
  attendeeCount: number;
  topicCount: number;
  actionItemCount: number;
  nextMeetingDate: string;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function buildForm(): HTMLElement {
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
  saveBtn.addEventListener('click', () => { /* save placeholder */ });
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  card.appendChild(form);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(meetings: MeetingRow[]): HTMLElement {
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

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${mtg.attendeeCount} attendee(s)`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${mtg.topicCount} topic(s)`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${mtg.actionItemCount} item(s)`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', mtg.nextMeetingDate || '--'));

    const tdActions = el('td', 'py-2 px-3');
    const viewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'View');
    viewBtn.type = 'button';
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
    const wrapper = el('div', 'space-y-4');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Meeting Minutes'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Project') as HTMLAnchorElement;
    backLink.href = '#/project/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildForm());

    const meetings: MeetingRow[] = [];
    wrapper.appendChild(buildTable(meetings));

    container.appendChild(wrapper);
  },
};

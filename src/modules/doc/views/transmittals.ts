/**
 * Transmittals view.
 * Create, send, and track transmittals with associated documents.
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
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'acknowledged', label: 'Acknowledged' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  sent: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  acknowledged: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransmittalRow {
  id: string;
  number: string;
  jobId: string;
  toName: string;
  toCompany: string;
  fromName: string;
  date: string;
  subject: string;
  status: string;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Transmittal Table
// ---------------------------------------------------------------------------

function buildTransmittalTable(transmittals: TransmittalRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Number', 'Date', 'To', 'Company', 'From', 'Subject', 'Items', 'Status', 'Actions']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (transmittals.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No transmittals found. Create your first transmittal below.');
    td.setAttribute('colspan', '9');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const trans of transmittals) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--accent)]', trans.number));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] text-xs', trans.date));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', trans.toName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', trans.toCompany || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', trans.fromName || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', trans.subject || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${trans.itemCount} doc(s)`));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[trans.status] ?? STATUS_BADGE.draft}`,
      trans.status.charAt(0).toUpperCase() + trans.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3 space-x-2');
    if (trans.status === 'draft') {
      const sendBtn = el('button', 'text-blue-400 hover:underline text-sm', 'Send');
      tdActions.appendChild(sendBtn);
    }
    if (trans.status === 'sent') {
      const ackBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Acknowledge');
      tdActions.appendChild(ackBtn);
    }
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    tdActions.appendChild(editBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// New Transmittal Form
// ---------------------------------------------------------------------------

function buildNewTransmittalForm(): HTMLElement {
  const form = el('form', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 space-y-3');
  form.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Create Transmittal'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const row1 = el('div', 'grid grid-cols-2 gap-4');

  const numGroup = el('div', 'space-y-1');
  numGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Transmittal Number'));
  const numInput = el('input', inputCls) as HTMLInputElement;
  numInput.type = 'text';
  numInput.name = 'number';
  numInput.placeholder = 'TRANS-001';
  numInput.required = true;
  numGroup.appendChild(numInput);
  row1.appendChild(numGroup);

  const dateGroup = el('div', 'space-y-1');
  dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Date'));
  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'date';
  dateInput.required = true;
  dateGroup.appendChild(dateInput);
  row1.appendChild(dateGroup);

  form.appendChild(row1);

  const row2 = el('div', 'grid grid-cols-2 gap-4');

  const toGroup = el('div', 'space-y-1');
  toGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'To Name'));
  const toInput = el('input', inputCls) as HTMLInputElement;
  toInput.type = 'text';
  toInput.name = 'toName';
  toInput.placeholder = 'Recipient name';
  toInput.required = true;
  toGroup.appendChild(toInput);
  row2.appendChild(toGroup);

  const companyGroup = el('div', 'space-y-1');
  companyGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'To Company'));
  const companyInput = el('input', inputCls) as HTMLInputElement;
  companyInput.type = 'text';
  companyInput.name = 'toCompany';
  companyInput.placeholder = 'Company name';
  companyGroup.appendChild(companyInput);
  row2.appendChild(companyGroup);

  form.appendChild(row2);

  const row3 = el('div', 'grid grid-cols-2 gap-4');

  const fromGroup = el('div', 'space-y-1');
  fromGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'From Name'));
  const fromInput = el('input', inputCls) as HTMLInputElement;
  fromInput.type = 'text';
  fromInput.name = 'fromName';
  fromInput.placeholder = 'Sender name';
  fromGroup.appendChild(fromInput);
  row3.appendChild(fromGroup);

  const jobGroup = el('div', 'space-y-1');
  jobGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Job ID'));
  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.name = 'jobId';
  jobInput.placeholder = 'Job reference';
  jobGroup.appendChild(jobInput);
  row3.appendChild(jobGroup);

  form.appendChild(row3);

  const subjectGroup = el('div', 'space-y-1');
  subjectGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Subject'));
  const subjectInput = el('input', inputCls) as HTMLInputElement;
  subjectInput.type = 'text';
  subjectInput.name = 'subject';
  subjectInput.placeholder = 'Transmittal subject';
  subjectGroup.appendChild(subjectInput);
  form.appendChild(subjectGroup);

  const notesGroup = el('div', 'space-y-1');
  notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Notes'));
  const notesArea = el('textarea', inputCls) as HTMLTextAreaElement;
  notesArea.name = 'notes';
  notesArea.rows = 3;
  notesArea.placeholder = 'Additional notes';
  notesGroup.appendChild(notesArea);
  form.appendChild(notesGroup);

  const submitBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Transmittal');
  submitBtn.type = 'submit';
  form.appendChild(submitBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    /* create transmittal placeholder */
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Transmittals'));
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const selectCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const statusFilter = el('select', selectCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      statusFilter.appendChild(o);
    }
    bar.appendChild(statusFilter);
    wrapper.appendChild(bar);

    const transmittals: TransmittalRow[] = [];
    wrapper.appendChild(buildTransmittalTable(transmittals));
    wrapper.appendChild(buildNewTransmittalForm());

    container.appendChild(wrapper);
  },
};

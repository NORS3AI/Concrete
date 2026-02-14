/**
 * Transmittals view.
 * Create, send, and track transmittals with associated documents.
 */

import { getDocService } from '../service-accessor';
import type { TransmittalStatus } from '../doc-service';

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'acknowledged', label: 'Acknowledged' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  sent: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  acknowledged: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let statusFilter: TransmittalStatus | '' = '';
let jobFilter = '';

// ---------------------------------------------------------------------------
// Transmittal Table
// ---------------------------------------------------------------------------

function buildTransmittalTable(
  transmittals: Array<{ id: string; number: string; jobId?: string; toName: string; toCompany?: string; fromName?: string; date: string; subject?: string; status: string; items?: string[] }>,
  onSend: (id: string) => void,
  onAcknowledge: (id: string) => void,
  onDelete: (id: string) => void,
): HTMLElement {
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

    const itemCount = Array.isArray(trans.items) ? trans.items.length : 0;
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${itemCount} doc(s)`));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[trans.status] ?? STATUS_BADGE.draft}`,
      trans.status.charAt(0).toUpperCase() + trans.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdActions = el('td', 'py-2 px-3 space-x-2');
    if (trans.status === 'draft') {
      const sendBtn = el('button', 'text-blue-400 hover:underline text-sm', 'Send');
      sendBtn.addEventListener('click', () => onSend(trans.id));
      tdActions.appendChild(sendBtn);

      const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
      editBtn.addEventListener('click', () => {
        window.location.hash = `#/doc/transmittals/${trans.id}`;
      });
      tdActions.appendChild(editBtn);

      const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
      deleteBtn.addEventListener('click', () => onDelete(trans.id));
      tdActions.appendChild(deleteBtn);
    }
    if (trans.status === 'sent') {
      const ackBtn = el('button', 'text-emerald-400 hover:underline text-sm', 'Acknowledge');
      ackBtn.addEventListener('click', () => onAcknowledge(trans.id));
      tdActions.appendChild(ackBtn);
    }
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

function buildNewTransmittalForm(container: HTMLElement, onCreated: () => void): HTMLElement {
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
  dateInput.valueAsDate = new Date();
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const svc = getDocService();
      await svc.createTransmittal({
        number: numInput.value.trim(),
        jobId: jobInput.value.trim() || undefined,
        toName: toInput.value.trim(),
        toCompany: companyInput.value.trim() || undefined,
        fromName: fromInput.value.trim() || undefined,
        date: dateInput.value,
        subject: subjectInput.value.trim() || undefined,
        notes: notesArea.value.trim() || undefined,
      });
      showMsg(container, `Transmittal "${numInput.value.trim()}" created successfully.`, false);
      form.reset();
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create transmittal.';
      showMsg(container, message, true);
    }
  });

  return form;
}

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------

function exportCsv(
  transmittals: Array<{ number: string; jobId?: string; toName: string; toCompany?: string; fromName?: string; date: string; subject?: string; status: string; items?: string[] }>,
): void {
  const headers = ['Number', 'Date', 'To Name', 'To Company', 'From', 'Subject', 'Items', 'Status'];
  const rows = transmittals.map((t) => [
    t.number,
    t.date,
    t.toName,
    t.toCompany ?? '',
    t.fromName ?? '',
    t.subject ?? '',
    String(Array.isArray(t.items) ? t.items.length : 0),
    t.status,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transmittals.csv';
  a.click();
  URL.revokeObjectURL(url);
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

    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] hover:opacity-90', 'Export CSV');
    headerRow.appendChild(exportBtn);
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const selectCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const statusSelect = el('select', selectCls) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', '', opt.label) as HTMLOptionElement;
      o.value = opt.value;
      if (opt.value === statusFilter) o.selected = true;
      statusSelect.appendChild(o);
    }
    bar.appendChild(statusSelect);

    const jobInput = el('input', inputCls) as HTMLInputElement;
    jobInput.type = 'text';
    jobInput.placeholder = 'Filter by Job ID...';
    jobInput.value = jobFilter;
    bar.appendChild(jobInput);

    wrapper.appendChild(bar);

    // Table placeholder
    const tableArea = el('div');
    wrapper.appendChild(tableArea);

    // Form
    const formArea = el('div');
    wrapper.appendChild(formArea);

    container.appendChild(wrapper);

    // -- Data loading and rendering --
    let currentData: Array<{ id: string; number: string; jobId?: string; toName: string; toCompany?: string; fromName?: string; date: string; subject?: string; status: string; items?: string[] }> = [];

    const loadData = async () => {
      try {
        const svc = getDocService();
        const filters: { jobId?: string; status?: TransmittalStatus } = {};
        if (statusFilter) filters.status = statusFilter as TransmittalStatus;
        if (jobFilter) filters.jobId = jobFilter;

        const transmittals = await svc.getTransmittals(filters);
        currentData = transmittals.map((t) => ({
          id: t.id,
          number: t.number,
          jobId: t.jobId,
          toName: t.toName,
          toCompany: t.toCompany,
          fromName: t.fromName,
          date: t.date,
          subject: t.subject,
          status: t.status,
          items: t.items,
        }));
        renderTable();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load transmittals.';
        showMsg(container, message, true);
      }
    };

    const renderTable = () => {
      tableArea.innerHTML = '';
      tableArea.appendChild(buildTransmittalTable(
        currentData,
        async (id) => {
          try {
            const svc = getDocService();
            await svc.sendTransmittal(id);
            showMsg(container, 'Transmittal sent successfully.', false);
            await loadData();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send transmittal.';
            showMsg(container, message, true);
          }
        },
        async (id) => {
          try {
            const svc = getDocService();
            await svc.acknowledgeTransmittal(id);
            showMsg(container, 'Transmittal acknowledged successfully.', false);
            await loadData();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to acknowledge transmittal.';
            showMsg(container, message, true);
          }
        },
        async (id) => {
          if (!confirm('Are you sure you want to delete this transmittal?')) return;
          try {
            const svc = getDocService();
            await svc.updateTransmittal(id, { status: 'acknowledged' as TransmittalStatus });
            showMsg(container, 'Transmittal deleted.', false);
            await loadData();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete transmittal.';
            showMsg(container, message, true);
          }
        },
      ));
    };

    // Form
    formArea.appendChild(buildNewTransmittalForm(container, () => loadData()));

    // Export CSV
    exportBtn.addEventListener('click', () => {
      exportCsv(currentData);
    });

    // Filter handlers
    statusSelect.addEventListener('change', () => {
      statusFilter = statusSelect.value as TransmittalStatus | '';
      loadData();
    });

    jobInput.addEventListener('input', () => {
      jobFilter = jobInput.value.trim();
      loadData();
    });

    // Initial load
    loadData();
  },
};

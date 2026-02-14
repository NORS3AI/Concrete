/**
 * Toolbox Talks & Safety Meetings view.
 * Displays a filterable table of toolbox talks and safety meetings with
 * summary statistics. Supports logging new meetings via prompt-based
 * input. Wired to SafetyService for data persistence.
 */

import { getSafetyService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string> | null,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', { className: cls }, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'toolbox_talk', label: 'Toolbox Talk' },
  { value: 'safety_meeting', label: 'Safety Meeting' },
  { value: 'stand_down', label: 'Stand Down' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'drill', label: 'Drill' },
];

const TYPE_BADGE: Record<string, string> = {
  toolbox_talk: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  safety_meeting: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  stand_down: 'bg-red-500/10 text-red-400 border border-red-500/20',
  orientation: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  drill: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const COLUMNS = [
  'Title', 'Type', 'Date', 'Time', 'Job', 'Conducted By',
  'Topic', 'Attendees', 'Duration (min)', 'Notes',
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';

    const wrapper = el('div', { className: 'max-w-7xl mx-auto' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const thCls =
      'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3';
    const tdCls = 'px-4 py-3 text-sm text-[var(--text)]';
    const trCls = 'border-t border-[var(--border)] hover:bg-[var(--surface-hover)]';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-6' },
      el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Toolbox Talks & Safety Meetings'),
    );
    const logBtn = el('button', { className: btnCls, type: 'button' }, 'Log Meeting');
    headerRow.appendChild(logBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsRow = el('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6' });
    const statCardCls = 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4';
    const statLabelCls = 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider';
    const statValueCls = 'text-2xl font-bold text-[var(--text)] mt-1';

    const totalCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Total Meetings'),
      el('div', { className: statValueCls + ' total-meetings' }, '...'),
    );
    const monthCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'This Month'),
      el('div', { className: statValueCls + ' this-month' }, '...'),
    );
    const attendeesCard = el('div', { className: statCardCls },
      el('div', { className: statLabelCls }, 'Total Attendees'),
      el('div', { className: statValueCls + ' total-attendees' }, '...'),
    );
    statsRow.appendChild(totalCard);
    statsRow.appendChild(monthCard);
    statsRow.appendChild(attendeesCard);
    wrapper.appendChild(statsRow);

    // ---- Filter Bar ----
    const bar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = document.createElement('input') as HTMLInputElement;
    searchInput.className = inputCls;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search talks...';
    bar.appendChild(searchInput);

    const typeSelect = document.createElement('select') as HTMLSelectElement;
    typeSelect.className = inputCls;
    for (const opt of TYPE_OPTIONS) {
      const o = document.createElement('option') as HTMLOptionElement;
      o.value = opt.value;
      o.textContent = opt.label;
      typeSelect.appendChild(o);
    }
    bar.appendChild(typeSelect);

    wrapper.appendChild(bar);

    // ---- Loading Indicator ----
    const loadingEl = el('div', { className: 'text-sm text-[var(--text-muted)] py-8 text-center' }, 'Loading toolbox talks...');
    wrapper.appendChild(loadingEl);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    container.appendChild(wrapper);

    // ---- Data & Rendering ----
    type TalkRow = {
      id: string;
      title: string;
      type: string;
      date: string;
      time?: string;
      jobId?: string;
      jobName?: string;
      conductedBy: string;
      topic: string;
      attendeeCount: number;
      duration?: number;
      notes?: string;
    };

    let allTalks: TalkRow[] = [];

    function updateStats(talks: TalkRow[]): void {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const totalEl = wrapper.querySelector('.total-meetings');
      const monthEl = wrapper.querySelector('.this-month');
      const attendeesEl = wrapper.querySelector('.total-attendees');

      if (totalEl) totalEl.textContent = String(talks.length);
      if (monthEl) {
        const thisMonth = talks.filter((t) => t.date.startsWith(currentMonth)).length;
        monthEl.textContent = String(thisMonth);
      }
      if (attendeesEl) {
        const total = talks.reduce((sum, t) => sum + (t.attendeeCount || 0), 0);
        attendeesEl.textContent = String(total);
      }
    }

    function getFilteredTalks(): TalkRow[] {
      let filtered = [...allTalks];
      const search = searchInput.value.toLowerCase().trim();
      const typeVal = typeSelect.value;

      if (typeVal) {
        filtered = filtered.filter((t) => t.type === typeVal);
      }
      if (search) {
        filtered = filtered.filter((t) =>
          t.title.toLowerCase().includes(search) ||
          t.topic.toLowerCase().includes(search) ||
          t.conductedBy.toLowerCase().includes(search) ||
          (t.jobName ?? '').toLowerCase().includes(search),
        );
      }

      return filtered;
    }

    function formatType(type: string): string {
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function renderTable(): void {
      tableContainer.innerHTML = '';
      const filtered = getFilteredTalks();

      const wrap = el('div', { className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden' });
      const table = el('table', { className: 'w-full text-sm' });

      // Header
      const thead = el('thead');
      const headRow = el('tr', { className: 'border-b border-[var(--border)]' });
      for (const col of COLUMNS) {
        headRow.appendChild(el('th', { className: thCls }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      // Body
      const tbody = el('tbody');

      if (filtered.length === 0) {
        const tr = el('tr');
        const td = el('td', { className: 'px-4 py-8 text-center text-sm text-[var(--text-muted)]', colspan: String(COLUMNS.length) },
          'No toolbox talks found. Log a meeting to get started.',
        );
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const row of filtered) {
        const tr = el('tr', { className: trCls });

        // Title
        tr.appendChild(el('td', { className: tdCls + ' font-medium' }, row.title));

        // Type badge
        const tdType = el('td', { className: tdCls });
        const badgeCls = TYPE_BADGE[row.type] ?? TYPE_BADGE.toolbox_talk;
        tdType.appendChild(
          el('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${badgeCls}` }, formatType(row.type)),
        );
        tr.appendChild(tdType);

        // Date
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.date));

        // Time
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, row.time || '-'));

        // Job
        tr.appendChild(el('td', { className: tdCls }, row.jobName || row.jobId || '-'));

        // Conducted By
        tr.appendChild(el('td', { className: tdCls }, row.conductedBy));

        // Topic
        const topicText = row.topic.length > 40 ? row.topic.substring(0, 40) + '...' : row.topic;
        tr.appendChild(el('td', { className: tdCls }, topicText));

        // Attendees
        tr.appendChild(el('td', { className: tdCls + ' font-mono' }, String(row.attendeeCount)));

        // Duration
        tr.appendChild(el('td', { className: tdCls + ' font-mono' }, row.duration ? String(row.duration) : '-'));

        // Notes
        const noteText = (row.notes ?? '').length > 30 ? (row.notes ?? '').substring(0, 30) + '...' : (row.notes ?? '-');
        tr.appendChild(el('td', { className: tdCls + ' text-[var(--text-muted)]' }, noteText));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    }

    // ---- Load Data ----
    async function loadData(): Promise<void> {
      loadingEl.style.display = '';
      tableContainer.innerHTML = '';
      try {
        const svc = getSafetyService();
        const talks = await svc.listToolboxTalks();
        allTalks = talks.map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          date: t.date,
          time: t.time || undefined,
          jobId: t.jobId || undefined,
          jobName: t.jobName || undefined,
          conductedBy: t.conductedBy,
          topic: t.topic,
          attendeeCount: t.attendeeCount,
          duration: t.duration || undefined,
          notes: t.notes || undefined,
        }));
        updateStats(allTalks);
        loadingEl.style.display = 'none';
        renderTable();
      } catch (err: unknown) {
        loadingEl.style.display = 'none';
        const message = err instanceof Error ? err.message : 'Failed to load toolbox talks.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Log Meeting ----
    logBtn.addEventListener('click', () => {
      const title = prompt('Meeting title:');
      if (!title) return;

      const type = prompt('Type (toolbox_talk, safety_meeting, stand_down, orientation, drill):') || 'toolbox_talk';
      const date = prompt('Date (YYYY-MM-DD):');
      if (!date) return;

      const time = prompt('Time (e.g. 07:00):') || '';
      const conductedBy = prompt('Conducted by:');
      if (!conductedBy) return;

      const topic = prompt('Topic:');
      if (!topic) return;

      const attendeeCountStr = prompt('Number of attendees:');
      if (!attendeeCountStr) return;
      const attendeeCount = parseInt(attendeeCountStr, 10);
      if (isNaN(attendeeCount) || attendeeCount < 0) {
        showMsg(wrapper, 'Invalid attendee count.', true);
        return;
      }

      const durationStr = prompt('Duration in minutes (leave blank to skip):');
      const duration = durationStr ? parseInt(durationStr, 10) : undefined;

      const jobId = prompt('Job ID (leave blank to skip):') || '';
      const notes = prompt('Notes (leave blank to skip):') || '';

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.logToolboxTalk({
            title,
            type: type as 'toolbox_talk' | 'safety_meeting' | 'stand_down' | 'orientation' | 'drill',
            date,
            time: time || undefined,
            conductedBy,
            topic,
            attendeeCount,
            duration,
            jobId: jobId || undefined,
            notes: notes || undefined,
          });
          showMsg(wrapper, 'Meeting logged successfully.', false);
          await loadData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to log meeting.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => {
      renderTable();
    });
    typeSelect.addEventListener('change', () => {
      renderTable();
    });

    // ---- Initial Load ----
    void loadData();
  },
};

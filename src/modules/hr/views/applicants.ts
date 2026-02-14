/**
 * Applicant Tracking view.
 * Displays applicant pipeline with summary stats, filterable table,
 * status advancement actions, and new applicant creation.
 * Wired to HRService for live data.
 */

import { getHRService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(
  tag: string,
  attrs?: Record<string, string>,
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
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function showMsg(
  container: HTMLElement,
  msg: string,
  type: 'success' | 'error' = 'success',
): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-msg': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_BADGE: Record<string, string> = {
  applied: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  screening: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  interview: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  offer: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  hired: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  withdrawn: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', { className: 'space-y-0' });

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnPrimary =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const btnAction =
      'px-2 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90';
    const btnDanger =
      'px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:opacity-90';

    // ---- Header ----
    const headerRow = el('div', { className: 'flex items-center justify-between mb-4' });
    headerRow.appendChild(el('h1', { className: 'text-2xl font-bold text-[var(--text)]' }, 'Applicant Tracking'));
    const newBtn = el('button', { className: btnPrimary, type: 'button' }, 'New Applicant');
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    // ---- Summary Stats ----
    const statsRow = el('div', { className: 'grid grid-cols-6 gap-3 mb-4' });

    function buildStatCard(label: string, colorCls: string): HTMLElement {
      const card = el('div', { className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center' });
      const valueEl = el('div', { className: `text-lg font-bold ${colorCls}` }, '0');
      card.appendChild(el('div', { className: 'text-xs text-[var(--text-muted)] mb-1' }, label));
      card.appendChild(valueEl);
      return card;
    }

    const statCards = {
      total: buildStatCard('Total Applicants', 'text-[var(--text)]'),
      applied: buildStatCard('Applied', 'text-blue-400'),
      screening: buildStatCard('Screening', 'text-amber-400'),
      interview: buildStatCard('Interview', 'text-amber-400'),
      offers: buildStatCard('Offers', 'text-emerald-400'),
      hired: buildStatCard('Hired', 'text-emerald-400'),
    };

    for (const card of Object.values(statCards)) {
      statsRow.appendChild(card);
    }
    wrapper.appendChild(statsRow);

    // ---- Filter Bar ----
    const filterBar = el('div', { className: 'flex flex-wrap items-center gap-3 mb-4' });

    const searchInput = el('input', {
      className: inputCls,
      type: 'text',
      placeholder: 'Search applicants...',
    }) as HTMLInputElement;
    filterBar.appendChild(searchInput);

    const statusSelect = el('select', { className: inputCls }) as HTMLSelectElement;
    for (const opt of STATUS_OPTIONS) {
      const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
      statusSelect.appendChild(o);
    }
    filterBar.appendChild(statusSelect);

    wrapper.appendChild(filterBar);

    // ---- Table Container ----
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // ---- Loading State ----
    const loadingEl = el(
      'div',
      { className: 'py-12 text-center text-[var(--text-muted)]' },
      'Loading applicants...',
    );

    container.appendChild(wrapper);

    // ---- State ----
    let currentSearch = '';
    let currentStatus = '';

    // ---- Update Stats ----
    function updateStats(applicants: Array<{ status: string }>): void {
      const counts = { total: applicants.length, applied: 0, screening: 0, interview: 0, offers: 0, hired: 0 };
      for (const a of applicants) {
        if (a.status === 'applied') counts.applied++;
        else if (a.status === 'screening') counts.screening++;
        else if (a.status === 'interview') counts.interview++;
        else if (a.status === 'offer') counts.offers++;
        else if (a.status === 'hired') counts.hired++;
      }
      const valueEl = (card: HTMLElement) => card.querySelector('div:last-child') as HTMLElement;
      valueEl(statCards.total).textContent = String(counts.total);
      valueEl(statCards.applied).textContent = String(counts.applied);
      valueEl(statCards.screening).textContent = String(counts.screening);
      valueEl(statCards.interview).textContent = String(counts.interview);
      valueEl(statCards.offers).textContent = String(counts.offers);
      valueEl(statCards.hired).textContent = String(counts.hired);
    }

    // ---- Build Table ----
    function buildTable(
      applicants: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        positionTitle: string;
        appliedDate: string;
        source: string;
        status: string;
      }>,
    ): HTMLElement {
      const wrap = el('div', { className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden' });
      const table = el('table', { className: 'w-full text-sm' });

      const thead = el('thead');
      const headRow = el('tr', { className: 'text-left text-[var(--text-muted)] border-b border-[var(--border)]' });
      for (const col of ['Name', 'Email', 'Phone', 'Position', 'Applied Date', 'Source', 'Status', 'Actions']) {
        headRow.appendChild(el('th', { className: 'py-2 px-3 font-medium' }, col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');

      if (applicants.length === 0) {
        const tr = el('tr');
        const td = el('td', {
          className: 'py-8 px-3 text-center text-[var(--text-muted)]',
          colspan: '8',
        }, 'No applicants found. Click "New Applicant" to add one.');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const app of applicants) {
        const tr = el('tr', { className: 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors' });

        tr.appendChild(
          el('td', { className: 'py-2 px-3 font-medium text-[var(--text)]' }, `${app.firstName} ${app.lastName}`),
        );
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, app.email || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, app.phone || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text)]' }, app.positionTitle || '-'));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, app.appliedDate));
        tr.appendChild(el('td', { className: 'py-2 px-3 text-[var(--text-muted)]' }, app.source || '-'));

        // Status badge
        const tdStatus = el('td', { className: 'py-2 px-3' });
        const badge = el(
          'span',
          { className: `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[app.status] ?? STATUS_BADGE.applied}` },
          STATUS_LABELS[app.status] ?? app.status,
        );
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);

        // Action buttons
        const tdActions = el('td', { className: 'py-2 px-3' });
        const actionWrap = el('div', { className: 'flex items-center gap-1 flex-wrap' });

        if (app.status === 'applied') {
          const screenBtn = el('button', { className: btnAction, type: 'button' }, 'Screen');
          screenBtn.addEventListener('click', () => void handleAdvance(app.id, 'screening'));
          actionWrap.appendChild(screenBtn);

          const rejectBtn = el('button', { className: btnDanger, type: 'button' }, 'Reject');
          rejectBtn.addEventListener('click', () => void handleReject(app.id));
          actionWrap.appendChild(rejectBtn);
        }

        if (app.status === 'screening') {
          const interviewBtn = el('button', { className: btnAction, type: 'button' }, 'Interview');
          interviewBtn.addEventListener('click', () => void handleInterview(app.id));
          actionWrap.appendChild(interviewBtn);

          const rejectBtn = el('button', { className: btnDanger, type: 'button' }, 'Reject');
          rejectBtn.addEventListener('click', () => void handleReject(app.id));
          actionWrap.appendChild(rejectBtn);
        }

        if (app.status === 'interview') {
          const offerBtn = el('button', { className: btnAction, type: 'button' }, 'Offer');
          offerBtn.addEventListener('click', () => void handleOffer(app.id));
          actionWrap.appendChild(offerBtn);

          const rejectBtn = el('button', { className: btnDanger, type: 'button' }, 'Reject');
          rejectBtn.addEventListener('click', () => void handleReject(app.id));
          actionWrap.appendChild(rejectBtn);
        }

        if (app.status === 'offer') {
          const hireBtn = el('button', { className: btnAction, type: 'button' }, 'Hire');
          hireBtn.addEventListener('click', () => void handleAdvance(app.id, 'hired'));
          actionWrap.appendChild(hireBtn);
        }

        tdActions.appendChild(actionWrap);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    // ---- Actions ----

    async function handleAdvance(
      id: string,
      newStatus: 'screening' | 'hired',
    ): Promise<void> {
      try {
        const svc = getHRService();
        await svc.advanceApplicant(id, newStatus);
        showMsg(wrapper, `Applicant ${newStatus === 'hired' ? 'hired' : 'advanced to ' + newStatus} successfully.`, 'success');
        await loadApplicants();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to advance applicant.';
        showMsg(wrapper, message, 'error');
      }
    }

    async function handleInterview(id: string): Promise<void> {
      const interviewDate = prompt('Enter interview date (YYYY-MM-DD):');
      if (!interviewDate) return;
      try {
        const svc = getHRService();
        await svc.advanceApplicant(id, 'interview', { interviewDate });
        showMsg(wrapper, 'Applicant advanced to interview.', 'success');
        await loadApplicants();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to schedule interview.';
        showMsg(wrapper, message, 'error');
      }
    }

    async function handleOffer(id: string): Promise<void> {
      const amountStr = prompt('Enter offer amount:');
      if (!amountStr) return;
      const offerAmount = parseFloat(amountStr);
      if (isNaN(offerAmount)) {
        showMsg(wrapper, 'Invalid offer amount.', 'error');
        return;
      }
      try {
        const svc = getHRService();
        await svc.advanceApplicant(id, 'offer', {
          offerAmount,
          offerDate: new Date().toISOString().split('T')[0],
        });
        showMsg(wrapper, 'Offer extended to applicant.', 'success');
        await loadApplicants();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to extend offer.';
        showMsg(wrapper, message, 'error');
      }
    }

    async function handleReject(id: string): Promise<void> {
      const rejectionReason = prompt('Enter rejection reason:');
      if (rejectionReason === null) return;
      try {
        const svc = getHRService();
        await svc.advanceApplicant(id, 'rejected', { rejectionReason });
        showMsg(wrapper, 'Applicant rejected.', 'success');
        await loadApplicants();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to reject applicant.';
        showMsg(wrapper, message, 'error');
      }
    }

    // ---- New Applicant ----
    newBtn.addEventListener('click', () => {
      const firstName = prompt('First name:');
      if (!firstName) return;
      const lastName = prompt('Last name:');
      if (!lastName) return;
      const email = prompt('Email:') ?? '';
      const phone = prompt('Phone:') ?? '';
      const positionTitle = prompt('Position title:') ?? '';
      const source = prompt('Source (e.g. referral, website, job board):') ?? '';
      const resumeNotes = prompt('Resume notes:') ?? '';

      void (async () => {
        try {
          const svc = getHRService();
          await svc.createApplicant({
            firstName,
            lastName,
            email,
            phone,
            positionTitle,
            source,
            resumeNotes,
          });
          showMsg(wrapper, 'Applicant created successfully.', 'success');
          await loadApplicants();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create applicant.';
          showMsg(wrapper, message, 'error');
        }
      })();
    });

    // ---- Data Loading ----
    async function loadApplicants(): Promise<void> {
      tableContainer.innerHTML = '';
      tableContainer.appendChild(loadingEl.cloneNode(true));

      try {
        const svc = getHRService();
        let applicants = await svc.listApplicants();

        // Update stats from full unfiltered list
        updateStats(applicants);

        // Apply client-side filters
        if (currentStatus) {
          applicants = applicants.filter((a) => a.status === currentStatus);
        }
        if (currentSearch) {
          const term = currentSearch.toLowerCase();
          applicants = applicants.filter((a) => {
            const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
            const email = (a.email ?? '').toLowerCase();
            const phone = (a.phone ?? '').toLowerCase();
            const position = (a.positionTitle ?? '').toLowerCase();
            return (
              fullName.includes(term) ||
              email.includes(term) ||
              phone.includes(term) ||
              position.includes(term)
            );
          });
        }

        const rows = applicants.map((a) => ({
          id: (a as any).id as string,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email ?? '',
          phone: a.phone ?? '',
          positionTitle: a.positionTitle ?? '',
          appliedDate: a.appliedDate,
          source: a.source ?? '',
          status: a.status,
        }));

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(rows));
      } catch (err: unknown) {
        tableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load applicants.';
        showMsg(wrapper, message, 'error');
      }
    }

    // ---- Filter Handlers ----
    searchInput.addEventListener('input', () => {
      currentSearch = (searchInput as HTMLInputElement).value;
      void loadApplicants();
    });

    statusSelect.addEventListener('change', () => {
      currentStatus = (statusSelect as HTMLSelectElement).value;
      void loadApplicants();
    });

    // ---- Initial Load ----
    void loadApplicants();
  },
};

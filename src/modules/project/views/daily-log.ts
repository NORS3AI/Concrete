/**
 * Daily Log view.
 * Form for creating daily log entries and history of past entries.
 * Includes date, weather, crew, work performed, visitors, incidents, photos.
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
// Types
// ---------------------------------------------------------------------------

interface DailyLogEntry {
  id: string;
  date: string;
  weather: string;
  temperature: string;
  crew: string;
  workPerformed: string;
  visitors: string;
  incidents: string;
  notes: string;
  photoCount: number;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

interface FormRefs {
  dateInput: HTMLInputElement;
  weatherInput: HTMLInputElement;
  tempInput: HTMLInputElement;
  crewInput: HTMLTextAreaElement;
  workInput: HTMLTextAreaElement;
  visitorsInput: HTMLInputElement;
  incidentsInput: HTMLInputElement;
  notesInput: HTMLTextAreaElement;
  saveBtn: HTMLButtonElement;
}

function buildForm(onSave: (refs: FormRefs) => void): { element: HTMLElement; refs: FormRefs } {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Daily Log Entry'));

  const form = el('form', 'space-y-4');
  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const row1 = el('div', 'grid grid-cols-3 gap-4');

  const dateGroup = el('div');
  dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Date'));
  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'date';
  dateInput.valueAsDate = new Date();
  dateGroup.appendChild(dateInput);
  row1.appendChild(dateGroup);

  const weatherGroup = el('div');
  weatherGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Weather'));
  const weatherInput = el('input', inputCls) as HTMLInputElement;
  weatherInput.type = 'text';
  weatherInput.name = 'weather';
  weatherInput.placeholder = 'Sunny, 72F';
  weatherGroup.appendChild(weatherInput);
  row1.appendChild(weatherGroup);

  const tempGroup = el('div');
  tempGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Temperature'));
  const tempInput = el('input', inputCls) as HTMLInputElement;
  tempInput.type = 'text';
  tempInput.name = 'temperature';
  tempInput.placeholder = '72F / 22C';
  tempGroup.appendChild(tempInput);
  row1.appendChild(tempGroup);

  form.appendChild(row1);

  const row2 = el('div', 'grid grid-cols-2 gap-4');

  const crewGroup = el('div');
  crewGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Crew'));
  const crewInput = el('textarea', inputCls) as HTMLTextAreaElement;
  crewInput.name = 'crew';
  crewInput.rows = 2;
  crewInput.placeholder = 'List crew members and headcount';
  crewGroup.appendChild(crewInput);
  row2.appendChild(crewGroup);

  const workGroup = el('div');
  workGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Work Performed'));
  const workInput = el('textarea', inputCls) as HTMLTextAreaElement;
  workInput.name = 'workPerformed';
  workInput.rows = 2;
  workInput.placeholder = 'Describe work performed today';
  workGroup.appendChild(workInput);
  row2.appendChild(workGroup);

  form.appendChild(row2);

  const row3 = el('div', 'grid grid-cols-2 gap-4');

  const visitorsGroup = el('div');
  visitorsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Visitors'));
  const visitorsInput = el('input', inputCls) as HTMLInputElement;
  visitorsInput.type = 'text';
  visitorsInput.name = 'visitors';
  visitorsInput.placeholder = 'Inspectors, owner reps, etc.';
  visitorsGroup.appendChild(visitorsInput);
  row3.appendChild(visitorsGroup);

  const incidentsGroup = el('div');
  incidentsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Incidents'));
  const incidentsInput = el('input', inputCls) as HTMLInputElement;
  incidentsInput.type = 'text';
  incidentsInput.name = 'incidents';
  incidentsInput.placeholder = 'Safety incidents or near-misses';
  incidentsGroup.appendChild(incidentsInput);
  row3.appendChild(incidentsGroup);

  form.appendChild(row3);

  const notesGroup = el('div');
  notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Notes'));
  const notesInput = el('textarea', inputCls) as HTMLTextAreaElement;
  notesInput.name = 'notes';
  notesInput.rows = 3;
  notesInput.placeholder = 'Additional notes or observations';
  notesGroup.appendChild(notesInput);
  form.appendChild(notesGroup);

  const photoGroup = el('div');
  photoGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Photos'));
  const photoMsg = el('div', 'p-3 rounded-md text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20',
    'Photo upload requires cloud storage (R2) integration');
  photoGroup.appendChild(photoMsg);
  form.appendChild(photoGroup);

  const btnRow = el('div', 'flex items-center gap-3');
  const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Entry') as HTMLButtonElement;
  saveBtn.type = 'button';
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  card.appendChild(form);

  const refs: FormRefs = {
    dateInput,
    weatherInput,
    tempInput,
    crewInput,
    workInput,
    visitorsInput,
    incidentsInput,
    notesInput,
    saveBtn,
  };

  saveBtn.addEventListener('click', () => onSave(refs));

  return { element: card, refs };
}

// ---------------------------------------------------------------------------
// History Table
// ---------------------------------------------------------------------------

function buildHistory(entries: DailyLogEntry[]): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');

  const headerWrap = el('div', 'px-4 py-3 border-b border-[var(--border)]');
  headerWrap.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)]', 'Log History'));
  card.appendChild(headerWrap);

  const table = el('table', 'w-full text-sm');
  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Date', 'Weather', 'Crew', 'Work Performed', 'Incidents', 'Photos']) {
    headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (entries.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No daily log entries yet.');
    td.setAttribute('colspan', '6');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const entry of entries) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text)]', entry.date));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${entry.weather} ${entry.temperature}`));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.crew));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] max-w-xs truncate', entry.workPerformed));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', entry.incidents || 'None'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', `${entry.photoCount} photo(s)`));
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  card.appendChild(table);
  return card;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-4');

    const projectId = parseProjectId();

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Daily Log'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Project') as HTMLAnchorElement;
    backLink.href = `#/project/${projectId}`;
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Service and state
    const svc = getProjectService();
    let historyContainer: HTMLElement | null = null;

    /** Replace history table */
    function replaceHistory(entries: DailyLogEntry[]): void {
      const newHistory = buildHistory(entries);
      if (historyContainer) {
        wrapper.replaceChild(newHistory, historyContainer);
      } else {
        wrapper.appendChild(newHistory);
      }
      historyContainer = newHistory;
    }

    /** Load daily log entries from the service */
    async function loadEntries(): Promise<void> {
      try {
        const logs = await svc.getDailyLogs(projectId);
        const entries: DailyLogEntry[] = logs.map((log: any) => ({
          id: log.id,
          date: log.date || '',
          weather: log.weather || '',
          temperature: log.temperature || '',
          crew: log.crew || '',
          workPerformed: log.workPerformed || '',
          visitors: log.visitors || '',
          incidents: log.incidents || '',
          notes: log.notes || '',
          photoCount: Array.isArray(log.photos) ? log.photos.length : 0,
        }));
        replaceHistory(entries);
      } catch (err: any) {
        showMsg(wrapper, `Failed to load daily logs: ${err.message ?? err}`, true);
      }
    }

    /** Handle save */
    async function handleSave(refs: FormRefs): Promise<void> {
      const date = refs.dateInput.value;
      if (!date) {
        showMsg(wrapper, 'Date is required.', true);
        return;
      }

      try {
        refs.saveBtn.textContent = 'Saving...';
        refs.saveBtn.disabled = true;

        await svc.createDailyLog({
          projectId,
          date,
          weather: refs.weatherInput.value.trim() || undefined,
          temperature: refs.tempInput.value.trim() || undefined,
          crew: refs.crewInput.value.trim() || undefined,
          workPerformed: refs.workInput.value.trim() || undefined,
          visitors: refs.visitorsInput.value.trim() || undefined,
          incidents: refs.incidentsInput.value.trim() || undefined,
          notes: refs.notesInput.value.trim() || undefined,
          photos: [],
        } as any);

        showMsg(wrapper, 'Daily log entry saved successfully.', false);

        // Clear form fields
        refs.dateInput.valueAsDate = new Date();
        refs.weatherInput.value = '';
        refs.tempInput.value = '';
        refs.crewInput.value = '';
        refs.workInput.value = '';
        refs.visitorsInput.value = '';
        refs.incidentsInput.value = '';
        refs.notesInput.value = '';

        // Reload history
        await loadEntries();
      } catch (err: any) {
        showMsg(wrapper, `Failed to save daily log: ${err.message ?? err}`, true);
      } finally {
        refs.saveBtn.textContent = 'Save Entry';
        refs.saveBtn.disabled = false;
      }
    }

    // Build form
    const { element: formElement } = buildForm(handleSave);
    wrapper.appendChild(formElement);

    // Initial empty history placeholder
    historyContainer = buildHistory([]);
    wrapper.appendChild(historyContainer);

    container.appendChild(wrapper);

    // Kick off initial load
    loadEntries();
  },
};

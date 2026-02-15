/**
 * Year-End Processing view.
 * Step-by-step year-end processing wizard for tax compliance.
 */

import { getTaxComplianceService } from '../service-accessor';
import type { YearEndStatus } from '../tax-compliance-service';

const svc = () => getTaxComplianceService();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
}

function showMsg(container: HTMLElement, text: string, ok = true): void {
  const old = container.querySelector('[data-msg]'); if (old) old.remove();
  const cls = ok ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const m = el('div', cls, text); m.setAttribute('data-msg', '1'); container.prepend(m); setTimeout(() => m.remove(), 4000);
}

const STATUS_BADGE: Record<string, string> = {
  not_started: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  skipped: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STEP_LABELS: Record<string, { label: string; description: string }> = {
  review_payroll: { label: 'Review Payroll', description: 'Verify all payroll runs are complete and accurate for the year.' },
  reconcile_taxes: { label: 'Reconcile Taxes', description: 'Reconcile federal, state, and local tax withholdings against payments.' },
  generate_w2: { label: 'Generate W-2s', description: 'Generate W-2 forms for all employees.' },
  generate_w3: { label: 'Generate W-3', description: 'Generate W-3 transmittal summary of all W-2s.' },
  generate_1099: { label: 'Generate 1099s', description: 'Generate 1099-NEC and 1099-MISC for all qualifying vendors.' },
  file_annual: { label: 'File Annual Returns', description: 'File federal Form 940 and state annual returns.' },
  archive: { label: 'Archive Records', description: 'Archive payroll records, tax filings, and compliance documents.' },
  rollover: { label: 'Year Rollover', description: 'Set up new tax year: update tax tables, reset accumulators, carry forward balances.' },
};

function fmtDateTime(iso?: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-5xl mx-auto');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Year-End Processing'));

    const yearSelect = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
    const curYear = new Date().getFullYear();
    for (let y = curYear; y >= curYear - 3; y--) {
      const o = el('option', '', String(y)) as HTMLOptionElement; o.value = String(y); yearSelect.appendChild(o);
    }
    headerRow.appendChild(yearSelect);
    wrapper.appendChild(headerRow);

    // Progress bar area
    const progressContainer = el('div', 'mb-6');
    wrapper.appendChild(progressContainer);

    // Steps area
    const stepsContainer = el('div', 'space-y-3');
    wrapper.appendChild(stepsContainer);

    // Init button area
    const initContainer = el('div', 'mt-6');
    wrapper.appendChild(initContainer);

    container.appendChild(wrapper);

    let selectedYear = curYear;
    yearSelect.addEventListener('change', () => { selectedYear = parseInt(yearSelect.value, 10); void loadAndRender(); });

    async function loadAndRender(): Promise<void> {
      try {
        const steps = await svc().listYearEndSteps(selectedYear);

        // Progress summary
        progressContainer.innerHTML = '';
        if (steps.length > 0) {
          const completed = steps.filter(s => s.status === 'completed').length;
          const total = steps.length;
          const pct = Math.round((completed / total) * 100);

          const progressWrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          const progressLabel = el('div', 'flex justify-between items-center mb-2');
          progressLabel.appendChild(el('span', 'text-sm font-medium text-[var(--text)]', `Year-End ${selectedYear} Progress`));
          progressLabel.appendChild(el('span', 'text-sm font-medium text-[var(--accent)]', `${completed}/${total} steps (${pct}%)`));
          progressWrap.appendChild(progressLabel);

          const barBg = el('div', 'w-full bg-[var(--surface)] rounded-full h-3');
          const barFill = el('div', `h-3 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`);
          barFill.style.width = `${pct}%`;
          barBg.appendChild(barFill);
          progressWrap.appendChild(barBg);

          if (pct === 100) {
            progressWrap.appendChild(el('div', 'mt-2 text-sm text-emerald-400 font-medium', 'All year-end steps completed!'));
          }
          progressContainer.appendChild(progressWrap);
        }

        // Steps list
        stepsContainer.innerHTML = '';
        if (steps.length === 0) {
          const emptyMsg = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
          emptyMsg.appendChild(el('div', 'text-lg font-medium text-[var(--text)] mb-2', `No year-end process started for ${selectedYear}`));
          emptyMsg.appendChild(el('div', 'text-sm text-[var(--text-muted)]', 'Initialize the year-end process to begin the step-by-step wizard.'));
          stepsContainer.appendChild(emptyMsg);
        }

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const meta = STEP_LABELS[step.step] ?? { label: step.step, description: '' };

          const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
          const topRow = el('div', 'flex items-center justify-between');

          const leftWrap = el('div', 'flex items-center gap-3');
          const stepNum = el('div', `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : step.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'}`, String(i + 1));
          leftWrap.appendChild(stepNum);
          const textWrap = el('div');
          textWrap.appendChild(el('div', 'font-medium text-[var(--text)]', meta.label));
          textWrap.appendChild(el('div', 'text-xs text-[var(--text-muted)]', meta.description));
          leftWrap.appendChild(textWrap);
          topRow.appendChild(leftWrap);

          const rightWrap = el('div', 'flex items-center gap-3');
          rightWrap.appendChild(el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[step.status] ?? STATUS_BADGE.not_started}`, step.status.replace(/_/g, ' ')));

          if (step.status === 'not_started') {
            const prevCompleted = i === 0 || steps[i - 1].status === 'completed' || steps[i - 1].status === 'skipped';
            if (prevCompleted) {
              const startBtn = el('button', 'px-3 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Start');
              startBtn.addEventListener('click', () => {
                void (async () => {
                  try { await svc().startYearEndStep(step.id, 'current_user'); showMsg(wrapper, `Started: ${meta.label}`); void loadAndRender(); }
                  catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
                })();
              });
              rightWrap.appendChild(startBtn);
            }
          } else if (step.status === 'in_progress') {
            const completeBtn = el('button', 'px-3 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:opacity-90', 'Complete');
            completeBtn.addEventListener('click', () => {
              void (async () => {
                try { await svc().completeYearEndStep(step.id, step.recordsProcessed || 0, 0, 0, 'current_user'); showMsg(wrapper, `Completed: ${meta.label}`); void loadAndRender(); }
                catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
              })();
            });
            rightWrap.appendChild(completeBtn);
          }

          topRow.appendChild(rightWrap);
          card.appendChild(topRow);

          // Completion details
          if (step.status === 'completed') {
            const details = el('div', 'mt-2 pt-2 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--text-muted)]');
            details.appendChild(el('span', '', `Completed: ${fmtDateTime(step.completedAt)}`));
            if (step.recordsProcessed) details.appendChild(el('span', '', `Records: ${step.recordsProcessed}`));
            if (step.errors) details.appendChild(el('span', 'text-red-400', `Errors: ${step.errors}`));
            if (step.warnings) details.appendChild(el('span', 'text-amber-400', `Warnings: ${step.warnings}`));
            card.appendChild(details);
          }

          stepsContainer.appendChild(card);
        }

        // Init button
        initContainer.innerHTML = '';
        if (steps.length === 0) {
          const initBtn = el('button', 'px-6 py-3 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', `Initialize Year-End ${selectedYear}`);
          initBtn.addEventListener('click', () => {
            void (async () => {
              try { await svc().initYearEnd(selectedYear, 'current_user'); showMsg(wrapper, `Year-end process initialized for ${selectedYear}.`); void loadAndRender(); }
              catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed', false); }
            })();
          });
          initContainer.appendChild(initBtn);
        }
      } catch (err: unknown) { showMsg(wrapper, err instanceof Error ? err.message : 'Failed to load year-end steps', false); }
    }

    void loadAndRender();
  },
};

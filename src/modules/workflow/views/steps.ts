/**
 * Approval Steps view.
 * Lists all approval steps grouped by workflow template, showing step order,
 * name, approver type, approver, required flag, threshold, and timeout.
 */

import { getWorkflowService } from '../service-accessor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const svc = () => getWorkflowService();

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

function showMsg(container: HTMLElement, msg: string, ok = true): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = ok
    ? 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20';
  const d = el('div', cls, msg);
  d.setAttribute('data-msg', '1');
  container.prepend(d);
  setTimeout(() => d.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APPROVER_TYPE_BADGE: Record<string, string> = {
  role: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  user: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  department: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateInfo {
  id: string;
  name: string;
  approvalType: string;
  status: string;
}

interface StepRow {
  id: string;
  templateId: string;
  stepOrder: number;
  stepName: string;
  approverType: string;
  approverId: string;
  approverName: string;
  required: boolean;
  thresholdMin: number;
  thresholdMax: number;
  timeoutDays: number;
}

interface TemplateGroup {
  template: TemplateInfo;
  steps: StepRow[];
}

// ---------------------------------------------------------------------------
// Grouped Table
// ---------------------------------------------------------------------------

function buildGroupedTable(groups: TemplateGroup[]): HTMLElement {
  const container = el('div', 'space-y-6');

  if (groups.length === 0) {
    const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
    empty.appendChild(el('div', 'text-[var(--text-muted)]', 'No approval steps found. Add steps to your workflow templates to get started.'));
    container.appendChild(empty);
    return container;
  }

  for (const group of groups) {
    const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');

    // Group header
    const groupHeader = el('div', 'px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]');
    const headerRow = el('div', 'flex items-center justify-between');
    const titleArea = el('div', 'flex items-center gap-2');
    titleArea.appendChild(el('span', 'font-semibold text-[var(--text)]', group.template.name));
    titleArea.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20', group.template.approvalType));
    const stepCountBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', `${group.steps.length} step${group.steps.length !== 1 ? 's' : ''}`);
    titleArea.appendChild(stepCountBadge);
    headerRow.appendChild(titleArea);
    headerRow.appendChild(el('span', 'text-xs text-[var(--text-muted)]', `Status: ${group.template.status}`));
    groupHeader.appendChild(headerRow);
    section.appendChild(groupHeader);

    // Steps table
    const table = el('table', 'w-full text-sm');
    const thead = el('thead');
    const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
    for (const col of ['Order', 'Step Name', 'Approver Type', 'Approver', 'Required', 'Threshold Range', 'Timeout (Days)']) {
      headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const step of group.steps) {
      const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

      tr.appendChild(el('td', 'py-2 px-3 font-mono text-center text-[var(--text)]', String(step.stepOrder)));
      tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', step.stepName));

      const tdType = el('td', 'py-2 px-3');
      const typeBadge = el(
        'span',
        `px-2 py-0.5 rounded-full text-xs font-medium ${APPROVER_TYPE_BADGE[step.approverType] ?? APPROVER_TYPE_BADGE.user}`,
        step.approverType.charAt(0).toUpperCase() + step.approverType.slice(1),
      );
      tdType.appendChild(typeBadge);
      tr.appendChild(tdType);

      tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', step.approverName || step.approverId));

      const tdRequired = el('td', 'py-2 px-3');
      if (step.required) {
        tdRequired.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', 'Yes'));
      } else {
        tdRequired.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'No'));
      }
      tr.appendChild(tdRequired);

      const thresholdText = (step.thresholdMin || step.thresholdMax)
        ? `${step.thresholdMin.toLocaleString()} - ${step.thresholdMax.toLocaleString()}`
        : '--';
      tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', thresholdText));

      tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', step.timeoutDays ? `${step.timeoutDays}d` : '--'));

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }

  return container;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wrapper = el('div', 'p-6');
let totalStepCount = 0;

// ---------------------------------------------------------------------------
// Async initialisation
// ---------------------------------------------------------------------------

void (async () => {
  // Loading state
  wrapper.appendChild(el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading approval steps...'));

  try {
    const templates = await svc().listTemplates();
    const groups: TemplateGroup[] = [];
    totalStepCount = 0;

    for (const t of templates) {
      const templateId = (t as any).id ?? '';
      const steps = await svc().getSteps(templateId);
      const stepRows: StepRow[] = steps.map((s) => ({
        id: (s as any).id ?? '',
        templateId: s.templateId,
        stepOrder: s.stepOrder,
        stepName: s.stepName,
        approverType: s.approverType,
        approverId: s.approverId,
        approverName: s.approverName ?? '',
        required: s.required,
        thresholdMin: s.thresholdMin ?? 0,
        thresholdMax: s.thresholdMax ?? 0,
        timeoutDays: s.timeoutDays ?? 0,
      }));
      totalStepCount += stepRows.length;

      groups.push({
        template: {
          id: templateId,
          name: t.name,
          approvalType: t.approvalType,
          status: t.status,
        },
        steps: stepRows,
      });
    }

    wrapper.innerHTML = '';

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    const titleWrap = el('div', 'flex items-center gap-3');
    titleWrap.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Approval Steps'));
    const countBadge = el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)]', String(totalStepCount));
    titleWrap.appendChild(countBadge);
    headerRow.appendChild(titleWrap);
    wrapper.appendChild(headerRow);

    // Summary cards
    const summarySection = el('div', 'grid grid-cols-3 gap-4 mb-6');
    const summaryData = [
      { label: 'Total Steps', value: String(totalStepCount), cls: 'text-[var(--text)]' },
      { label: 'Templates', value: String(groups.length), cls: 'text-blue-400' },
      { label: 'Required Steps', value: String(groups.reduce((s, g) => s + g.steps.filter((st) => st.required).length, 0)), cls: 'text-emerald-400' },
    ];
    for (const card of summaryData) {
      const cardEl = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4');
      cardEl.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', card.label));
      cardEl.appendChild(el('div', `text-2xl font-bold ${card.cls}`, card.value));
      summarySection.appendChild(cardEl);
    }
    wrapper.appendChild(summarySection);

    // Grouped tables
    wrapper.appendChild(buildGroupedTable(groups));
  } catch (err: unknown) {
    wrapper.innerHTML = '';
    const message = err instanceof Error ? err.message : 'Failed to load approval steps';
    showMsg(wrapper, message, false);
  }
})();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

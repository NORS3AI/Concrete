/**
 * Report List view.
 * Main report index / menu showing all available report types with descriptions
 * and links to each report view.
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
// Report Categories
// ---------------------------------------------------------------------------

interface ReportCategory {
  title: string;
  description: string;
  reports: Array<{
    name: string;
    description: string;
    path: string;
    icon: string;
  }>;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: 'Financial Statements',
    description: 'Core financial reports for management and external reporting.',
    reports: [
      { name: 'Balance Sheet', description: 'Standard, comparative, and consolidated balance sheets showing assets, liabilities, and equity.', path: '/reports/balance-sheet', icon: 'columns' },
      { name: 'Income Statement', description: 'Profit and loss by period, job, or entity with comparative analysis.', path: '/reports/income-statement', icon: 'trending-up' },
      { name: 'Cash Flow Statement', description: 'Cash flow analysis using direct or indirect method.', path: '/reports/cash-flow', icon: 'activity' },
    ],
  },
  {
    title: 'Construction Reports',
    description: 'Job costing and project performance reports for construction operations.',
    reports: [
      { name: 'WIP Schedule', description: 'Work-in-progress schedule using cost, units, or efforts method for percentage of completion.', path: '/reports/wip', icon: 'clipboard' },
      { name: 'Job Cost Reports', description: 'Job cost detail and summary with budget vs. actual analysis.', path: '/reports/job-cost', icon: 'hard-hat' },
      { name: 'Bonding Capacity', description: 'Surety bonding capacity analysis with working capital, backlog, and limit calculations.', path: '/reports/bonding', icon: 'shield' },
    ],
  },
  {
    title: 'Accounts Payable / Receivable',
    description: 'Aging reports for accounts payable and receivable management.',
    reports: [
      { name: 'Aging Reports', description: 'Aged AP and AR reports with current, 30, 60, 90, and 120+ day buckets.', path: '/reports/aging', icon: 'clock' },
    ],
  },
  {
    title: 'Payroll & Equipment',
    description: 'Payroll summaries and equipment utilization tracking.',
    reports: [
      { name: 'Payroll Reports', description: 'Payroll summary and detail reports by employee, department, and period.', path: '/reports/payroll', icon: 'users' },
      { name: 'Equipment Reports', description: 'Equipment utilization rates, cost analysis, and job allocation.', path: '/reports/equipment', icon: 'truck' },
    ],
  },
  {
    title: 'Custom & Templates',
    description: 'Build custom reports or use saved templates.',
    reports: [
      { name: 'Report Templates', description: 'Manage saved report templates for quick access to commonly used configurations.', path: '/reports/templates', icon: 'file-text' },
      { name: 'Custom Report Builder', description: 'Drag-and-drop columns, filters, and grouping to build custom reports.', path: '/reports/custom', icon: 'sliders' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Report Card
// ---------------------------------------------------------------------------

function buildReportCard(report: { name: string; description: string; path: string; icon: string }): HTMLElement {
  const card = el('a', 'block p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer no-underline') as HTMLAnchorElement;
  card.href = `#${report.path}`;

  const header = el('div', 'flex items-center gap-2 mb-2');
  header.appendChild(el('span', 'text-[var(--accent)] text-lg font-semibold', report.name));
  card.appendChild(header);

  card.appendChild(el('p', 'text-sm text-[var(--text-muted)] leading-relaxed', report.description));

  return card;
}

// ---------------------------------------------------------------------------
// Category Section
// ---------------------------------------------------------------------------

function buildCategory(category: ReportCategory): HTMLElement {
  const section = el('div', 'mb-8');

  const titleRow = el('div', 'mb-3');
  titleRow.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', category.title));
  titleRow.appendChild(el('p', 'text-sm text-[var(--text-muted)]', category.description));
  section.appendChild(titleRow);

  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');
  for (const report of category.reports) {
    grid.appendChild(buildReportCard(report));
  }
  section.appendChild(grid);

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Financial Reports'));

    const actionsRow = el('div', 'flex items-center gap-3');

    const customBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    customBtn.href = '#/reports/custom';
    customBtn.textContent = 'Custom Report';
    actionsRow.appendChild(customBtn);

    const templatesBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]') as HTMLAnchorElement;
    templatesBtn.href = '#/reports/templates';
    templatesBtn.textContent = 'Templates';
    actionsRow.appendChild(templatesBtn);

    headerRow.appendChild(actionsRow);
    wrapper.appendChild(headerRow);

    for (const category of REPORT_CATEGORIES) {
      wrapper.appendChild(buildCategory(category));
    }

    container.appendChild(wrapper);
  },
};

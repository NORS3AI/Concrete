/**
 * Rate Lookup view.
 * Interactive tool to look up union rates and prevailing wage rates
 * by union, classification, jurisdiction, and date.
 * Wired to UnionService for live data.
 */

import { getUnionService } from '../service-accessor';

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

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
const LABEL_CLS = 'block text-sm font-medium text-[var(--text-muted)] mb-1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnionOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Union Rate Lookup Panel
// ---------------------------------------------------------------------------

function buildUnionLookupPanel(unions: UnionOption[], wrapper: HTMLElement): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Union Rate Lookup'));

  const formRow = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const unionGroup = el('div');
  unionGroup.appendChild(el('label', LABEL_CLS, 'Union'));
  const unionSelect = el('select', FIELD_CLS) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select a union...') as HTMLOptionElement;
  defaultOpt.value = '';
  unionSelect.appendChild(defaultOpt);
  for (const u of unions) {
    const o = el('option', '', u.name) as HTMLOptionElement;
    o.value = u.id;
    unionSelect.appendChild(o);
  }
  unionGroup.appendChild(unionSelect);
  formRow.appendChild(unionGroup);

  const classGroup = el('div');
  classGroup.appendChild(el('label', LABEL_CLS, 'Classification'));
  const classInput = el('input', FIELD_CLS) as HTMLInputElement;
  classInput.type = 'text';
  classInput.placeholder = 'e.g., Journeyman Electrician';
  classGroup.appendChild(classInput);
  formRow.appendChild(classGroup);

  const dateGroup = el('div');
  dateGroup.appendChild(el('label', LABEL_CLS, 'As Of Date'));
  const dateInput = el('input', FIELD_CLS) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.value = new Date().toISOString().split('T')[0];
  dateGroup.appendChild(dateInput);
  formRow.appendChild(dateGroup);

  const btnGroup = el('div', 'flex items-end');
  const lookupBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 w-full', 'Look Up Rates');
  btnGroup.appendChild(lookupBtn);
  formRow.appendChild(btnGroup);

  section.appendChild(formRow);

  // Result area
  const resultArea = el('div', 'mt-4');
  resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Select a union, classification, and date to look up rates.'));
  section.appendChild(resultArea);

  // Lookup handler
  lookupBtn.addEventListener('click', () => {
    const unionId = unionSelect.value;
    const classification = classInput.value.trim();
    const asOfDate = dateInput.value;

    if (!unionId || !classification || !asOfDate) {
      showMsg(wrapper, 'Please fill in all fields for union rate lookup.', true);
      return;
    }

    void (async () => {
      try {
        const svc = getUnionService();
        const result = await svc.lookupRate(unionId, classification, asOfDate);

        resultArea.innerHTML = '';

        if (!result) {
          resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No results found for the given criteria.'));
          return;
        }

        // Summary info
        const infoCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 mb-4');
        const infoGrid = el('div', 'grid grid-cols-3 gap-4');

        const col1 = el('div');
        col1.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Rate Table'));
        col1.appendChild(el('p', 'text-sm font-medium text-[var(--text)]', result.rateTableName));
        infoGrid.appendChild(col1);

        const col2 = el('div');
        col2.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Classification'));
        col2.appendChild(el('p', 'text-sm font-medium text-[var(--text)]', result.classification));
        infoGrid.appendChild(col2);

        const col3 = el('div');
        col3.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Effective Date'));
        col3.appendChild(el('p', 'text-sm font-medium text-[var(--text)]', result.effectiveDate));
        infoGrid.appendChild(col3);

        const col4 = el('div');
        col4.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Expiration Date'));
        col4.appendChild(el('p', 'text-sm font-medium text-[var(--text)]', result.expirationDate ?? '--'));
        infoGrid.appendChild(col4);

        const col5 = el('div');
        col5.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Journeyman Rate'));
        col5.appendChild(el('p', 'text-sm font-medium font-mono text-[var(--text)]', fmtCurrency(result.journeymanRate)));
        infoGrid.appendChild(col5);

        infoCard.appendChild(infoGrid);
        resultArea.appendChild(infoCard);

        // Line items table
        if (result.lines.length > 0) {
          const tableWrap = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden mb-4');
          const table = el('table', 'w-full text-sm');

          const thead = el('thead');
          const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
          for (const col of ['Category', 'Description', 'Rate', 'Method', 'Payable To', 'Fund']) {
            const align = col === 'Rate' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
            headRow.appendChild(el('th', align, col));
          }
          thead.appendChild(headRow);
          table.appendChild(thead);

          const tbody = el('tbody');
          for (const line of result.lines) {
            const tr = el('tr', 'border-b border-[var(--border)]');
            tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', line.category));
            tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', line.description ?? '--'));
            tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(line.rate)));
            tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', line.method));
            tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', line.payableTo));
            tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', line.fundName ?? '--'));
            tbody.appendChild(tr);
          }

          table.appendChild(tbody);
          tableWrap.appendChild(table);
          resultArea.appendChild(tableWrap);
        }

        // Totals
        const totalsCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4');
        const totalsGrid = el('div', 'grid grid-cols-2 gap-4');

        const totalHourly = el('div');
        totalHourly.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Total Hourly Rate'));
        totalHourly.appendChild(el('p', 'text-lg font-semibold font-mono text-[var(--text)]', fmtCurrency(result.totalHourlyRate)));
        totalsGrid.appendChild(totalHourly);

        const totalFringe = el('div');
        totalFringe.appendChild(el('p', 'text-xs text-[var(--text-muted)]', 'Total Fringe Rate'));
        totalFringe.appendChild(el('p', 'text-lg font-semibold font-mono text-[var(--text)]', fmtCurrency(result.totalFringeRate)));
        totalsGrid.appendChild(totalFringe);

        totalsCard.appendChild(totalsGrid);
        resultArea.appendChild(totalsCard);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to look up union rate';
        showMsg(wrapper, message, true);
      }
    })();
  });

  return section;
}

// ---------------------------------------------------------------------------
// Prevailing Wage Lookup Panel
// ---------------------------------------------------------------------------

function buildPrevailingWageLookupPanel(wrapper: HTMLElement): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Prevailing Wage Lookup'));

  const formRow = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const jurisdictionGroup = el('div');
  jurisdictionGroup.appendChild(el('label', LABEL_CLS, 'Jurisdiction'));
  const jurisdictionInput = el('input', FIELD_CLS) as HTMLInputElement;
  jurisdictionInput.type = 'text';
  jurisdictionInput.placeholder = 'e.g., Cook County, IL';
  jurisdictionGroup.appendChild(jurisdictionInput);
  formRow.appendChild(jurisdictionGroup);

  const classGroup = el('div');
  classGroup.appendChild(el('label', LABEL_CLS, 'Classification'));
  const classInput = el('input', FIELD_CLS) as HTMLInputElement;
  classInput.type = 'text';
  classInput.placeholder = 'e.g., Electrician';
  classGroup.appendChild(classInput);
  formRow.appendChild(classGroup);

  const dateGroup = el('div');
  dateGroup.appendChild(el('label', LABEL_CLS, 'As Of Date'));
  const dateInput = el('input', FIELD_CLS) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.value = new Date().toISOString().split('T')[0];
  dateGroup.appendChild(dateInput);
  formRow.appendChild(dateGroup);

  const btnGroup = el('div', 'flex items-end');
  const lookupBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 w-full', 'Look Up Rates');
  btnGroup.appendChild(lookupBtn);
  formRow.appendChild(btnGroup);

  section.appendChild(formRow);

  // Result area
  const resultArea = el('div', 'mt-4');
  resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Enter jurisdiction, classification, and date to look up prevailing wage rates.'));
  section.appendChild(resultArea);

  // Lookup handler
  lookupBtn.addEventListener('click', () => {
    const jurisdiction = jurisdictionInput.value.trim();
    const classification = classInput.value.trim();
    const asOfDate = dateInput.value;

    if (!jurisdiction || !classification || !asOfDate) {
      showMsg(wrapper, 'Please fill in all fields for prevailing wage lookup.', true);
      return;
    }

    void (async () => {
      try {
        const svc = getUnionService();
        const result = await svc.lookupPrevailingWage(jurisdiction, classification, asOfDate);

        resultArea.innerHTML = '';

        if (!result) {
          resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No results found for the given criteria.'));
          return;
        }

        // Result details
        const infoCard = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4');
        const infoGrid = el('div', 'grid grid-cols-3 gap-4');

        const fields: [string, string][] = [
          ['Jurisdiction', result.jurisdiction],
          ['State', result.state],
          ['County', result.county ?? '--'],
          ['Project Type', result.projectType],
          ['Classification', result.classification],
          ['Trade', result.trade],
          ['Base Rate', fmtCurrency(result.baseRate)],
          ['Fringe Rate', fmtCurrency(result.fringeRate)],
          ['Total Rate', fmtCurrency(result.totalRate)],
          ['Effective Date', result.effectiveDate],
          ['Expiration Date', result.expirationDate ?? '--'],
          ['Source', result.source],
        ];

        for (const [label, value] of fields) {
          const col = el('div');
          col.appendChild(el('p', 'text-xs text-[var(--text-muted)]', label));
          const isCurrency = label === 'Base Rate' || label === 'Fringe Rate' || label === 'Total Rate';
          const valCls = isCurrency
            ? 'text-sm font-medium font-mono text-[var(--text)]'
            : 'text-sm font-medium text-[var(--text)]';
          col.appendChild(el('p', valCls, value));
          infoGrid.appendChild(col);
        }

        infoCard.appendChild(infoGrid);
        resultArea.appendChild(infoCard);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to look up prevailing wage';
        showMsg(wrapper, message, true);
      }
    })();
  });

  return section;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Rate Lookup'));
    headerRow.appendChild(el('p', 'text-sm text-[var(--text-muted)] mt-1', 'Look up union pay scale rates and prevailing wage rates by classification, jurisdiction, and date.'));
    wrapper.appendChild(headerRow);

    // Load unions for the union rate lookup panel, then build both panels
    void (async () => {
      try {
        const svc = getUnionService();
        const unions = await svc.getUnions();
        const opts: UnionOption[] = unions.map((u) => ({ id: u.id, name: u.name }));

        const panelsRow = el('div', 'grid grid-cols-2 gap-6');
        panelsRow.appendChild(buildUnionLookupPanel(opts, wrapper));
        panelsRow.appendChild(buildPrevailingWageLookupPanel(wrapper));
        wrapper.appendChild(panelsRow);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load unions';
        showMsg(wrapper, message, true);
      }
    })();

    container.appendChild(wrapper);
  },
};

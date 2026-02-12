/**
 * Rate Lookup view.
 * Interactive tool to look up union rates and prevailing wage rates
 * by union, classification, jurisdiction, and date.
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

const FIELD_CLS = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] w-full';
const LABEL_CLS = 'block text-sm font-medium text-[var(--text-muted)] mb-1';

// ---------------------------------------------------------------------------
// Union Rate Lookup Form
// ---------------------------------------------------------------------------

function buildUnionLookupForm(): HTMLElement {
  const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-6');
  section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Union Rate Lookup'));

  const formRow = el('div', 'grid grid-cols-4 gap-4 mb-4');

  const unionGroup = el('div');
  unionGroup.appendChild(el('label', LABEL_CLS, 'Union'));
  const unionSelect = el('select', FIELD_CLS) as HTMLSelectElement;
  const defaultOpt = el('option', '', 'Select a union...') as HTMLOptionElement;
  defaultOpt.value = '';
  unionSelect.appendChild(defaultOpt);
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
  resultArea.setAttribute('id', 'union-rate-result');
  resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Select a union, classification, and date to look up rates.'));
  section.appendChild(resultArea);

  return section;
}

// ---------------------------------------------------------------------------
// Prevailing Wage Lookup Form
// ---------------------------------------------------------------------------

function buildPrevailingWageLookupForm(): HTMLElement {
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
  resultArea.setAttribute('id', 'prevailing-wage-result');
  resultArea.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'Enter jurisdiction, classification, and date to look up prevailing wage rates.'));
  section.appendChild(resultArea);

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

    wrapper.appendChild(buildUnionLookupForm());
    wrapper.appendChild(buildPrevailingWageLookupForm());

    container.appendChild(wrapper);
  },
};

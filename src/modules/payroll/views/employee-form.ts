/**
 * Employee create/edit form view.
 * Full employee details with all fields for creating or editing an employee.
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
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

const PAY_TYPE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'salary', label: 'Salary' },
];

const PAY_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'semimonthly', label: 'Semi-Monthly' },
  { value: 'monthly', label: 'Monthly' },
];

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married Filing Jointly' },
  { value: 'married_separate', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
];

const STATE_OPTIONS = [
  { value: '', label: 'Select State' },
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// ---------------------------------------------------------------------------
// Form Builder
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
  colSpan?: number,
): HTMLElement {
  const group = el('div', colSpan === 2 ? 'col-span-2' : '');
  group.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', label));
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'text';
  input.name = name;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'date';
  input.name = name;
  return input;
}

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
  input.type = 'number';
  input.name = name;
  input.step = '0.01';
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(name: string, options: { value: string; label: string }[]): HTMLSelectElement {
  const select = el('select', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLSelectElement;
  select.name = name;
  for (const opt of options) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    select.appendChild(o);
  }
  return select;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Employee Details'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Employees') as HTMLAnchorElement;
    backLink.href = '#/payroll/employees';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Personal Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Personal Information'));
    const personalGrid = el('div', 'grid grid-cols-2 gap-4');
    personalGrid.appendChild(buildField('First Name', textInput('firstName', 'First name')));
    personalGrid.appendChild(buildField('Last Name', textInput('lastName', 'Last name')));
    personalGrid.appendChild(buildField('Middle Name', textInput('middleName', 'Middle name')));
    personalGrid.appendChild(buildField('SSN', textInput('ssn', 'XXX-XX-XXXX')));
    personalGrid.appendChild(buildField('Phone', textInput('phone', '(555) 555-5555')));
    personalGrid.appendChild(buildField('Email', textInput('email', 'email@example.com')));
    personalGrid.appendChild(buildField('Emergency Contact', textInput('emergencyContact', 'Name and phone'), 2));
    form.appendChild(personalGrid);

    // Section: Address
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Address'));
    const addrGrid = el('div', 'grid grid-cols-2 gap-4');
    addrGrid.appendChild(buildField('Address', textInput('address', 'Street address'), 2));
    addrGrid.appendChild(buildField('City', textInput('city', 'City')));
    addrGrid.appendChild(buildField('State', selectInput('state', STATE_OPTIONS)));
    addrGrid.appendChild(buildField('ZIP Code', textInput('zip', 'ZIP code')));
    form.appendChild(addrGrid);

    // Section: Employment Details
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Employment Details'));
    const empGrid = el('div', 'grid grid-cols-2 gap-4');
    empGrid.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));
    empGrid.appendChild(buildField('Hire Date', dateInput('hireDate')));
    empGrid.appendChild(buildField('Termination Date', dateInput('terminationDate')));
    empGrid.appendChild(buildField('Department', textInput('department', 'Department')));
    empGrid.appendChild(buildField('Job Title', textInput('jobTitle', 'Job title')));
    empGrid.appendChild(buildField('Union Affiliation', textInput('unionId', 'Union ID')));
    empGrid.appendChild(buildField('WC Class Code', textInput('wcClassCode', 'Class code')));
    form.appendChild(empGrid);

    // Section: Pay Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Pay Information'));
    const payGrid = el('div', 'grid grid-cols-2 gap-4');
    payGrid.appendChild(buildField('Pay Type', selectInput('payType', PAY_TYPE_OPTIONS)));
    payGrid.appendChild(buildField('Pay Rate', numberInput('payRate', '0.00')));
    payGrid.appendChild(buildField('Pay Frequency', selectInput('payFrequency', PAY_FREQUENCY_OPTIONS)));
    form.appendChild(payGrid);

    // Section: Tax Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Tax Information'));
    const taxGrid = el('div', 'grid grid-cols-2 gap-4');
    taxGrid.appendChild(buildField('Federal Filing Status', selectInput('federalFilingStatus', FILING_STATUS_OPTIONS)));
    taxGrid.appendChild(buildField('State Filing Status', selectInput('stateFilingStatus', FILING_STATUS_OPTIONS)));
    taxGrid.appendChild(buildField('Allowances', numberInput('allowances', '0')));
    form.appendChild(taxGrid);

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Employee');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => { /* save placeholder */ });
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/payroll/employees';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  },
};

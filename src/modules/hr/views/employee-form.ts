/**
 * Employee create / edit form view.
 * Full employee detail form for creating or editing HR employees.
 * Parses employee ID from location.hash, loads existing data when editing.
 * Wired to HRService for create, update, and pre-fill.
 */

import { getHRService } from '../service-accessor';
import type { EmployeeType } from '../hr-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function el(
  tag: string,
  attrs?: Record<string, string>,
  ...children: (string | HTMLElement)[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
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
  const existing = container.querySelector('[data-toast]');
  if (existing) existing.remove();
  const cls =
    type === 'error'
      ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
      : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const toast = el('div', { className: cls, 'data-toast': '1' }, msg);
  container.prepend(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Parse employee ID from hash
// ---------------------------------------------------------------------------

function getEmployeeIdFromHash(): string | null {
  const match = window.location.hash.match(/\/hr\/employees\/([^/?]+)/);
  if (match && match[1] !== 'new') return match[1];
  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'temp', label: 'Temp' },
];

const PAY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'salary', label: 'Salary' },
];

// ---------------------------------------------------------------------------
// Form Field Builders
// ---------------------------------------------------------------------------

function buildField(
  label: string,
  inputEl: HTMLElement,
  colSpan?: number,
): HTMLElement {
  const group = el('div', { className: colSpan === 2 ? 'col-span-2' : '' });
  group.appendChild(
    el('label', { className: 'block text-sm font-medium text-[var(--text-muted)] mb-1' }, label),
  );
  group.appendChild(inputEl);
  return group;
}

function textInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', {
    className:
      'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]',
    type: 'text',
    name,
  }) as HTMLInputElement;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function dateInput(name: string): HTMLInputElement {
  const input = el('input', {
    className:
      'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]',
    type: 'date',
    name,
  }) as HTMLInputElement;
  return input;
}

function numberInput(name: string, placeholder?: string): HTMLInputElement {
  const input = el('input', {
    className:
      'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]',
    type: 'number',
    name,
    step: '0.01',
  }) as HTMLInputElement;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function selectInput(
  name: string,
  options: { value: string; label: string }[],
): HTMLSelectElement {
  const select = el('select', {
    className:
      'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]',
    name,
  }) as HTMLSelectElement;
  for (const opt of options) {
    const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
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
    const wrapper = el('div', { className: 'space-y-0' });

    const employeeId = getEmployeeIdFromHash();
    const isEdit = employeeId !== null;

    // Header
    const headerRow = el('div', { className: 'flex items-center justify-between mb-6' });
    headerRow.appendChild(
      el(
        'h1',
        { className: 'text-2xl font-bold text-[var(--text)]' },
        isEdit ? 'Edit Employee' : 'New Employee',
      ),
    );
    const backLink = el(
      'a',
      {
        className: 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]',
        href: '#/hr/employees',
      },
      'Back to Employees',
    );
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Loading state for edit mode
    if (isEdit) {
      const loadingEl = el(
        'div',
        { className: 'py-12 text-center text-[var(--text-muted)]', 'data-loading': '1' },
        'Loading employee data...',
      );
      wrapper.appendChild(loadingEl);
    }

    // Card
    const card = el('div', {
      className: 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6',
    });
    const form = el('form', { className: 'space-y-6' });

    // Section: Identification
    form.appendChild(
      el('h2', { className: 'text-lg font-semibold text-[var(--text)] mb-2' }, 'Identification'),
    );
    const idGrid = el('div', { className: 'grid grid-cols-2 gap-4' });
    idGrid.appendChild(buildField('Employee ID', textInput('employeeId', 'EMP-001')));
    idGrid.appendChild(buildField('SSN', textInput('ssn', 'XXX-XX-XXXX')));
    form.appendChild(idGrid);

    // Section: Personal Information
    form.appendChild(
      el(
        'h2',
        { className: 'text-lg font-semibold text-[var(--text)] mt-6 mb-2' },
        'Personal Information',
      ),
    );
    const personalGrid = el('div', { className: 'grid grid-cols-2 gap-4' });
    personalGrid.appendChild(buildField('First Name', textInput('firstName', 'First name')));
    personalGrid.appendChild(buildField('Last Name', textInput('lastName', 'Last name')));
    personalGrid.appendChild(buildField('Middle Name', textInput('middleName', 'Middle name')));
    personalGrid.appendChild(buildField('Email', textInput('email', 'email@example.com')));
    personalGrid.appendChild(buildField('Phone', textInput('phone', '(555) 555-5555')));
    personalGrid.appendChild(buildField('Date of Birth', dateInput('dateOfBirth')));
    form.appendChild(personalGrid);

    // Section: Address
    form.appendChild(
      el('h2', { className: 'text-lg font-semibold text-[var(--text)] mt-6 mb-2' }, 'Address'),
    );
    const addrGrid = el('div', { className: 'grid grid-cols-2 gap-4' });
    addrGrid.appendChild(buildField('Address', textInput('address', 'Street address'), 2));
    addrGrid.appendChild(buildField('City', textInput('city', 'City')));
    addrGrid.appendChild(buildField('State', textInput('state', 'State')));
    addrGrid.appendChild(buildField('ZIP', textInput('zip', 'ZIP code')));
    form.appendChild(addrGrid);

    // Section: Employment Details
    form.appendChild(
      el(
        'h2',
        { className: 'text-lg font-semibold text-[var(--text)] mt-6 mb-2' },
        'Employment Details',
      ),
    );
    const empGrid = el('div', { className: 'grid grid-cols-2 gap-4' });
    empGrid.appendChild(buildField('Type', selectInput('type', TYPE_OPTIONS)));
    empGrid.appendChild(buildField('Pay Rate', numberInput('payRate', '0.00')));
    empGrid.appendChild(buildField('Pay Type', selectInput('payType', PAY_TYPE_OPTIONS)));
    empGrid.appendChild(buildField('Department ID', textInput('departmentId', 'Department ID')));
    empGrid.appendChild(buildField('Supervisor ID', textInput('supervisorId', 'Supervisor ID')));
    empGrid.appendChild(buildField('Position ID', textInput('positionId', 'Position ID')));
    form.appendChild(empGrid);

    // Form value helpers
    function getVal(name: string): string {
      const input = form.querySelector(`[name="${name}"]`) as
        | HTMLInputElement
        | HTMLSelectElement
        | null;
      return input?.value?.trim() ?? '';
    }

    function getNumVal(name: string): number {
      return parseFloat(getVal(name)) || 0;
    }

    function setVal(name: string, value: string): void {
      const input = form.querySelector(`[name="${name}"]`) as
        | HTMLInputElement
        | HTMLSelectElement
        | null;
      if (input) input.value = value;
    }

    // Action buttons
    const btnRow = el('div', { className: 'flex items-center gap-3 mt-6' });

    const saveBtn = el(
      'button',
      {
        className:
          'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90',
        type: 'button',
      },
      'Save Employee',
    );

    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getHRService();

          const data = {
            employeeId: getVal('employeeId'),
            firstName: getVal('firstName'),
            lastName: getVal('lastName'),
            middleName: getVal('middleName') || undefined,
            email: getVal('email') || undefined,
            phone: getVal('phone') || undefined,
            address: getVal('address') || undefined,
            city: getVal('city') || undefined,
            state: getVal('state') || undefined,
            zip: getVal('zip') || undefined,
            dateOfBirth: getVal('dateOfBirth') || undefined,
            ssn: getVal('ssn') || undefined,
            type: (getVal('type') || 'full_time') as EmployeeType,
            payRate: getNumVal('payRate') || undefined,
            payType: (getVal('payType') || 'hourly') as 'hourly' | 'salary',
            departmentId: getVal('departmentId') || undefined,
            supervisorId: getVal('supervisorId') || undefined,
            positionId: getVal('positionId') || undefined,
          };

          // Validation
          if (!data.employeeId) {
            showMsg(wrapper, 'Employee ID is required.', 'error');
            return;
          }
          if (!data.firstName) {
            showMsg(wrapper, 'First name is required.', 'error');
            return;
          }
          if (!data.lastName) {
            showMsg(wrapper, 'Last name is required.', 'error');
            return;
          }

          if (isEdit && employeeId) {
            // Update: strip employeeId from changes since it's an identifier
            const { employeeId: _eid, ...changes } = data;
            await svc.updateEmployee(employeeId, changes);
            showMsg(wrapper, 'Employee updated successfully.', 'success');
            setTimeout(() => {
              window.location.hash = '#/hr/employees';
            }, 1000);
          } else {
            await svc.createEmployee(data);
            showMsg(wrapper, 'Employee created successfully.', 'success');
            setTimeout(() => {
              window.location.hash = '#/hr/employees';
            }, 1000);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save employee';
          showMsg(wrapper, message, 'error');
        }
      })();
    });
    btnRow.appendChild(saveBtn);

    const cancelLink = el(
      'a',
      {
        className:
          'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]',
        href: '#/hr/employees',
      },
      'Cancel',
    );
    btnRow.appendChild(cancelLink);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // If editing, load existing employee data
    if (isEdit && employeeId) {
      void (async () => {
        try {
          const svc = getHRService();
          const emp = await svc.getEmployee(employeeId);

          // Remove loading indicator
          const loadingEl = wrapper.querySelector('[data-loading]');
          if (loadingEl) loadingEl.remove();

          if (!emp) {
            showMsg(wrapper, 'Employee not found.', 'error');
            return;
          }

          setVal('employeeId', emp.employeeId);
          setVal('firstName', emp.firstName);
          setVal('lastName', emp.lastName);
          setVal('middleName', emp.middleName ?? '');
          setVal('email', emp.email ?? '');
          setVal('phone', emp.phone ?? '');
          setVal('address', emp.address ?? '');
          setVal('city', emp.city ?? '');
          setVal('state', emp.state ?? '');
          setVal('zip', emp.zip ?? '');
          setVal('dateOfBirth', emp.dateOfBirth ?? '');
          setVal('ssn', emp.ssn ?? '');
          setVal('type', emp.type);
          setVal('payRate', String(emp.payRate ?? 0));
          setVal('payType', emp.payType ?? 'hourly');
          setVal('departmentId', emp.departmentId ?? '');
          setVal('supervisorId', emp.supervisorId ?? '');
          setVal('positionId', emp.positionId ?? '');
        } catch (err: unknown) {
          const loadingEl = wrapper.querySelector('[data-loading]');
          if (loadingEl) loadingEl.remove();
          const message = err instanceof Error ? err.message : 'Failed to load employee';
          showMsg(wrapper, message, 'error');
        }
      })();
    }
  },
};

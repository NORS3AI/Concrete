/**
 * Union Form view.
 * Create/edit form for union master file records.
 * Wired to UnionService for load, save, and delete.
 */

import { getUnionService } from '../service-accessor';
import type { UnionStatus } from '../union-service';

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

function getIdFromHash(pattern: RegExp): string | null {
  const match = window.location.hash.match(pattern);
  if (match && match[1] !== 'new') return match[1];
  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
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

    const unionId = getIdFromHash(/\/union\/unions\/([^/?]+)/);
    const isEdit = unionId !== null;

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Union' : 'New Union'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Unions') as HTMLAnchorElement;
    backLink.href = '#/union/unions';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // Section: Union Details
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Union Details'));
    const row1 = el('div', 'grid grid-cols-2 gap-4');
    row1.appendChild(buildField('Union Name *', textInput('name', 'e.g., IBEW')));
    row1.appendChild(buildField('Local Number *', textInput('localNumber', 'e.g., Local 134')));
    form.appendChild(row1);

    const row2 = el('div', 'grid grid-cols-2 gap-4');
    row2.appendChild(buildField('Trade *', textInput('trade', 'e.g., Electrician')));
    row2.appendChild(buildField('Jurisdiction', textInput('jurisdiction', 'e.g., Cook County, IL')));
    form.appendChild(row2);

    form.appendChild(buildField('Status', selectInput('status', STATUS_OPTIONS)));

    // Section: Contact Information
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Contact Information'));
    const row3 = el('div', 'grid grid-cols-3 gap-4');
    row3.appendChild(buildField('Contact Name', textInput('contactName')));
    row3.appendChild(buildField('Phone', textInput('contactPhone')));
    row3.appendChild(buildField('Email', textInput('contactEmail')));
    form.appendChild(row3);

    // Section: Address
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Address'));
    form.appendChild(buildField('Address', textInput('address'), 2));

    const row4 = el('div', 'grid grid-cols-3 gap-4');
    row4.appendChild(buildField('City', textInput('city')));
    row4.appendChild(buildField('State', textInput('state')));
    row4.appendChild(buildField('ZIP', textInput('zip')));
    form.appendChild(row4);

    // Helper to get a form value
    function getVal(name: string): string {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
      return input?.value?.trim() ?? '';
    }

    // Helper to set form values
    function setVal(name: string, value: string): void {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
      if (input) input.value = value;
    }

    // Action buttons
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Save Union');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getUnionService();

          const data = {
            name: getVal('name'),
            localNumber: getVal('localNumber'),
            trade: getVal('trade'),
            jurisdiction: getVal('jurisdiction') || undefined,
            status: (getVal('status') || 'active') as UnionStatus,
            contactName: getVal('contactName') || undefined,
            contactPhone: getVal('contactPhone') || undefined,
            contactEmail: getVal('contactEmail') || undefined,
            address: getVal('address') || undefined,
            city: getVal('city') || undefined,
            state: getVal('state') || undefined,
            zip: getVal('zip') || undefined,
          };

          if (!data.name) {
            showMsg(wrapper, 'Union name is required.', true);
            return;
          }
          if (!data.localNumber) {
            showMsg(wrapper, 'Local number is required.', true);
            return;
          }
          if (!data.trade) {
            showMsg(wrapper, 'Trade is required.', true);
            return;
          }

          if (isEdit && unionId) {
            await svc.updateUnion(unionId, data);
            showMsg(wrapper, 'Union updated successfully.', false);
          } else {
            const created = await svc.createUnion(data);
            showMsg(wrapper, 'Union created successfully.', false);
            window.location.hash = `#/union/unions/${created.id}`;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save union';
          showMsg(wrapper, message, true);
        }
      })();
    });
    btnRow.appendChild(saveBtn);

    if (isEdit) {
      const deleteBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:opacity-90', 'Delete');
      deleteBtn.type = 'button';
      deleteBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete this union?')) return;
        void (async () => {
          try {
            const svc = getUnionService();
            await svc.deleteUnion(unionId!);
            showMsg(wrapper, 'Union deleted.', false);
            window.location.hash = '#/union/unions';
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete union';
            showMsg(wrapper, message, true);
          }
        })();
      });
      btnRow.appendChild(deleteBtn);
    }

    const cancelBtn = el('a', 'px-6 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/union/unions';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // If editing, load existing union data
    if (isEdit && unionId) {
      void (async () => {
        try {
          const svc = getUnionService();
          const union = await svc.getUnion(unionId);
          if (!union) {
            showMsg(wrapper, 'Union not found.', true);
            return;
          }

          setVal('name', union.name);
          setVal('localNumber', union.localNumber);
          setVal('trade', union.trade);
          setVal('jurisdiction', union.jurisdiction ?? '');
          setVal('status', union.status);
          setVal('contactName', union.contactName ?? '');
          setVal('contactPhone', union.contactPhone ?? '');
          setVal('contactEmail', union.contactEmail ?? '');
          setVal('address', union.address ?? '');
          setVal('city', union.city ?? '');
          setVal('state', union.state ?? '');
          setVal('zip', union.zip ?? '');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load union';
          showMsg(wrapper, message, true);
        }
      })();
    }
  },
};

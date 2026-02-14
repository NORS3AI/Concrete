/**
 * Workers' Compensation Class Codes view.
 * CRUD table for WC class codes with rates, state codes, and effective dates.
 * Wired to PayrollService for live data.
 */

import { getPayrollService } from '../service-accessor';

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WCCodeRow {
  id: string;
  classCode: string;
  description: string;
  rate: number;
  stateCode: string;
  effectiveDate: string;
  expirationDate: string;
}

// ---------------------------------------------------------------------------
// New WC Code Form
// ---------------------------------------------------------------------------

function buildNewForm(onAdd: (data: {
  classCode: string;
  description: string;
  rate: number;
  stateCode: string;
  effectiveDate: string;
  expirationDate: string;
}) => void): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 mb-4');
  card.appendChild(el('h3', 'text-sm font-semibold text-[var(--text)] mb-3', 'Add WC Class Code'));

  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
  const grid = el('div', 'grid grid-cols-4 gap-3');

  const codeInput = el('input', inputCls) as HTMLInputElement;
  codeInput.placeholder = 'Class Code (e.g., 5403)';
  codeInput.name = 'classCode';
  grid.appendChild(codeInput);

  const descInput = el('input', inputCls) as HTMLInputElement;
  descInput.placeholder = 'Description';
  descInput.name = 'description';
  grid.appendChild(descInput);

  const rateInput = el('input', inputCls) as HTMLInputElement;
  rateInput.type = 'number';
  rateInput.step = '0.01';
  rateInput.placeholder = 'Rate per $100';
  rateInput.name = 'rate';
  grid.appendChild(rateInput);

  const stateInput = el('input', inputCls) as HTMLInputElement;
  stateInput.placeholder = 'State Code (e.g., CA)';
  stateInput.name = 'stateCode';
  grid.appendChild(stateInput);

  const effDateInput = el('input', inputCls) as HTMLInputElement;
  effDateInput.type = 'date';
  effDateInput.name = 'effectiveDate';
  effDateInput.title = 'Effective Date';
  grid.appendChild(effDateInput);

  const expDateInput = el('input', inputCls) as HTMLInputElement;
  expDateInput.type = 'date';
  expDateInput.name = 'expirationDate';
  expDateInput.title = 'Expiration Date';
  grid.appendChild(expDateInput);

  const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Code');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => {
    const classCode = codeInput.value.trim();
    const rate = parseFloat(rateInput.value) || 0;
    if (!classCode || rate <= 0) return;

    onAdd({
      classCode,
      description: descInput.value.trim(),
      rate,
      stateCode: stateInput.value.trim(),
      effectiveDate: effDateInput.value,
      expirationDate: expDateInput.value,
    });

    // Clear form
    codeInput.value = '';
    descInput.value = '';
    rateInput.value = '';
    stateInput.value = '';
    effDateInput.value = '';
    expDateInput.value = '';
  });
  grid.appendChild(addBtn);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(
  codes: WCCodeRow[],
  onEdit: (code: WCCodeRow) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Class Code', 'Description', 'Rate/$100', 'State', 'Effective', 'Expiration', 'Actions']) {
    const align = col === 'Rate/$100' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (codes.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No WC class codes configured. Add one above to get started.');
    td.setAttribute('colspan', '7');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const code of codes) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    tr.appendChild(el('td', 'py-2 px-3 font-mono font-medium text-[var(--text)]', code.classCode));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.description));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', code.rate.toFixed(2)));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.stateCode));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.effectiveDate || '-'));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', code.expirationDate || '-'));

    const tdActions = el('td', 'py-2 px-3 flex gap-2');
    const editBtn = el('button', 'text-[var(--accent)] hover:underline text-sm', 'Edit');
    editBtn.addEventListener('click', () => onEdit(code));
    tdActions.appendChild(editBtn);
    const deleteBtn = el('button', 'text-red-400 hover:underline text-sm', 'Delete');
    deleteBtn.addEventListener('click', () => onDelete(code.id));
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Workers\' Compensation Class Codes'));
    wrapper.appendChild(headerRow);

    const tableContainer = el('div', '');

    async function loadCodes(): Promise<void> {
      try {
        const svc = getPayrollService();
        const codes = await svc.getWorkerComps();

        const rows: WCCodeRow[] = codes.map((c) => ({
          id: c.id,
          classCode: c.classCode,
          description: c.description ?? '',
          rate: c.rate,
          stateCode: c.stateCode ?? '',
          effectiveDate: c.effectiveDate ?? '',
          expirationDate: c.expirationDate ?? '',
        }));

        tableContainer.innerHTML = '';
        tableContainer.appendChild(buildTable(
          rows,
          (code) => {
            // Inline edit via prompt
            const newRate = prompt('Enter new rate per $100:', String(code.rate));
            if (newRate === null) return;
            const newDesc = prompt('Enter new description:', code.description);
            if (newDesc === null) return;
            void (async () => {
              try {
                const svcInner = getPayrollService();
                await svcInner.updateWorkerComp(code.id, {
                  rate: parseFloat(newRate) || code.rate,
                  description: newDesc,
                });
                showMsg(wrapper, 'WC code updated.', false);
                void loadCodes();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to update WC code';
                showMsg(wrapper, message, true);
              }
            })();
          },
          (id) => {
            if (!confirm('Are you sure you want to delete this WC code?')) return;
            void (async () => {
              try {
                const svcInner = getPayrollService();
                await svcInner.deleteWorkerComp(id);
                showMsg(wrapper, 'WC code deleted.', false);
                void loadCodes();
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to delete WC code';
                showMsg(wrapper, message, true);
              }
            })();
          },
        ));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load WC codes';
        showMsg(wrapper, message, true);
      }
    }

    wrapper.appendChild(buildNewForm((data) => {
      void (async () => {
        try {
          const svc = getPayrollService();
          await svc.createWorkerComp({
            classCode: data.classCode,
            description: data.description || undefined,
            rate: data.rate,
            stateCode: data.stateCode || undefined,
            effectiveDate: data.effectiveDate || undefined,
            expirationDate: data.expirationDate || undefined,
          });
          showMsg(wrapper, 'WC code created.', false);
          void loadCodes();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create WC code';
          showMsg(wrapper, message, true);
        }
      })();
    }));

    wrapper.appendChild(tableContainer);
    container.appendChild(wrapper);

    // Initial load
    void loadCodes();
  },
};

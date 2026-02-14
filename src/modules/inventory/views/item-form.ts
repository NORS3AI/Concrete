/**
 * Item create/edit form view.
 * Full inventory item form with all fields for creating or editing items.
 * Parses item ID from location.hash to determine create vs edit mode.
 * Wired to InventoryService for CRUD operations.
 */

import { getInventoryService } from '../service-accessor';
import type { ItemCategory, ItemUnit } from '../inventory-service';

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

const UNIT_OPTIONS: { value: ItemUnit; label: string }[] = [
  { value: 'each', label: 'Each' },
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'lf', label: 'Linear Feet (lf)' },
  { value: 'sf', label: 'Square Feet (sf)' },
  { value: 'sy', label: 'Square Yards (sy)' },
  { value: 'cy', label: 'Cubic Yards (cy)' },
  { value: 'ton', label: 'Ton' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'gal', label: 'Gallons (gal)' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'roll', label: 'Roll' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'pallet', label: 'Pallet' },
];

const CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'finished_good', label: 'Finished Good' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'safety', label: 'Safety' },
  { value: 'tool', label: 'Tool' },
  { value: 'equipment_part', label: 'Equipment Part' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Form Builder Helpers
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
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const editId = getIdFromHash(/inventory\/items\/(.+)/);
    const isEdit = editId !== null;

    // Header row
    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', isEdit ? 'Edit Item' : 'New Item'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Item Master') as HTMLAnchorElement;
    backLink.href = '#/inventory/items';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Form card
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
    const form = el('form', 'space-y-6');

    // --- Section: Item Details ---
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-2', 'Item Details'));
    const detailsGrid = el('div', 'grid grid-cols-2 gap-4');

    const fNumber = textInput('number', 'e.g. MAT-001');
    const fDescription = textInput('description', 'Item description');
    const fUnit = selectInput('unit', UNIT_OPTIONS);
    const fCategory = selectInput('category', CATEGORY_OPTIONS);
    const fVendorName = textInput('preferredVendorName', 'Vendor name');

    detailsGrid.appendChild(buildField('Number', fNumber));
    detailsGrid.appendChild(buildField('Description', fDescription));
    detailsGrid.appendChild(buildField('Unit', fUnit));
    detailsGrid.appendChild(buildField('Category', fCategory));
    detailsGrid.appendChild(buildField('Preferred Vendor Name', fVendorName, 2));
    form.appendChild(detailsGrid);

    // --- Section: Reorder & Cost ---
    form.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mt-6 mb-2', 'Reorder & Cost'));
    const costGrid = el('div', 'grid grid-cols-2 gap-4');

    const fReorderPoint = numberInput('reorderPoint', '0');
    const fReorderQuantity = numberInput('reorderQuantity', '0');
    const fUnitCost = numberInput('unitCost', '0.00');

    costGrid.appendChild(buildField('Reorder Point', fReorderPoint));
    costGrid.appendChild(buildField('Reorder Quantity', fReorderQuantity));
    costGrid.appendChild(buildField('Unit Cost', fUnitCost));
    form.appendChild(costGrid);

    // --- Action buttons ---
    const btnRow = el('div', 'flex items-center gap-3 mt-6');
    const saveBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', isEdit ? 'Update Item' : 'Create Item');
    saveBtn.type = 'button';
    btnRow.appendChild(saveBtn);

    const cancelBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]', 'Cancel') as HTMLAnchorElement;
    cancelBtn.href = '#/inventory/items';
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    card.appendChild(form);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // -----------------------------------------------------------------------
    // Helper to collect form data
    // -----------------------------------------------------------------------

    function collectFormData(): {
      number: string;
      description: string;
      unit: ItemUnit;
      category: ItemCategory;
      preferredVendorName?: string;
      reorderPoint?: number;
      reorderQuantity?: number;
      unitCost?: number;
    } {
      return {
        number: fNumber.value.trim(),
        description: fDescription.value.trim(),
        unit: fUnit.value as ItemUnit,
        category: fCategory.value as ItemCategory,
        preferredVendorName: fVendorName.value.trim() || undefined,
        reorderPoint: fReorderPoint.value ? parseFloat(fReorderPoint.value) : undefined,
        reorderQuantity: fReorderQuantity.value ? parseFloat(fReorderQuantity.value) : undefined,
        unitCost: fUnitCost.value ? parseFloat(fUnitCost.value) : undefined,
      };
    }

    // -----------------------------------------------------------------------
    // Helper to populate form from existing data
    // -----------------------------------------------------------------------

    function populateForm(item: Record<string, unknown>): void {
      fNumber.value = (item.number as string) ?? '';
      fDescription.value = (item.description as string) ?? '';
      fUnit.value = (item.unit as string) ?? 'each';
      fCategory.value = (item.category as string) ?? 'raw_material';
      fVendorName.value = (item.preferredVendorName as string) ?? '';
      fReorderPoint.value = item.reorderPoint != null ? String(item.reorderPoint) : '';
      fReorderQuantity.value = item.reorderQuantity != null ? String(item.reorderQuantity) : '';
      fUnitCost.value = item.unitCost != null ? String(item.unitCost) : '';
    }

    // -----------------------------------------------------------------------
    // Save handler
    // -----------------------------------------------------------------------

    saveBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const svc = getInventoryService();
          const data = collectFormData();

          if (!data.number) {
            showMsg(wrapper, 'Item Number is required.', true);
            return;
          }
          if (!data.description) {
            showMsg(wrapper, 'Description is required.', true);
            return;
          }

          if (isEdit && editId) {
            await svc.updateItem(editId, data);
            showMsg(wrapper, 'Item updated successfully.', false);
          } else {
            const created = await svc.createItem(data);
            showMsg(wrapper, 'Item created successfully.', false);
            // Navigate to edit mode for the new item
            window.location.hash = `#/inventory/items/${(created as any).id}`;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to save item';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // -----------------------------------------------------------------------
    // Load existing data if editing
    // -----------------------------------------------------------------------

    if (isEdit && editId) {
      void (async () => {
        try {
          const svc = getInventoryService();
          const item = await svc.getItem(editId);
          if (!item) {
            showMsg(wrapper, 'Item not found.', true);
            return;
          }
          populateForm(item as unknown as Record<string, unknown>);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load item';
          showMsg(wrapper, message, true);
        }
      })();
    }
  },
};

/**
 * Material Receipts view.
 * Tracks materials received against purchase orders with line-level detail.
 * Wired to POService for live data.
 */

import { getPOService } from '../service-accessor';

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

const RECEIPT_STATUS_BADGE: Record<string, string> = {
  partial: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  complete: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

const CONDITION_BADGE: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  damaged: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'rejected', label: 'Rejected' },
];

const INPUT_CLS = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const wrapper = el('div', 'space-y-0');

void (async () => {
  try {
    const svc = getPOService();

    // Header
    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Material Receipts'));
    wrapper.appendChild(headerRow);

    // Search bar
    const searchBar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const searchInput = el('input', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]') as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by PO number...';
    searchBar.appendChild(searchInput);

    const newReceiptBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'New Receipt');
    newReceiptBtn.type = 'button';
    searchBar.appendChild(newReceiptBtn);
    wrapper.appendChild(searchBar);

    // Receipts table container
    const tableContainer = el('div');
    wrapper.appendChild(tableContainer);

    // New receipt form container (hidden by default)
    const formContainer = el('div');
    formContainer.style.display = 'none';
    wrapper.appendChild(formContainer);

    // ---- PO map for lookups ----
    const allPOs = await svc.getPurchaseOrders();
    const poMap = new Map<string, { poNumber: string; id: string }>();
    for (const po of allPOs) {
      poMap.set(po.id as string, { poNumber: po.poNumber, id: po.id as string });
    }

    // ---- Load and render receipts ----
    const loadAndRenderReceipts = async (searchTerm?: string) => {
      tableContainer.innerHTML = '';

      // Gather all receipts from all POs
      interface ReceiptDisplay {
        id: string;
        receiptNumber: string;
        poNumber: string;
        purchaseOrderId: string;
        receivedDate: string;
        receivedBy: string;
        status: string;
        notes: string;
      }

      const allReceipts: ReceiptDisplay[] = [];
      for (const po of allPOs) {
        const receipts = await svc.getReceipts(po.id as string);
        for (const r of receipts) {
          allReceipts.push({
            id: r.id as string,
            receiptNumber: r.receiptNumber,
            poNumber: po.poNumber,
            purchaseOrderId: r.purchaseOrderId,
            receivedDate: r.receivedDate,
            receivedBy: r.receivedBy ?? '',
            status: r.status,
            notes: r.notes ?? '',
          });
        }
      }

      // Filter by search
      let filtered = allReceipts;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = allReceipts.filter((r) =>
          r.poNumber.toLowerCase().includes(term) ||
          r.receiptNumber.toLowerCase().includes(term),
        );
      }

      // Build table
      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
      for (const col of ['Receipt #', 'PO #', 'Received Date', 'Received By', 'Lines', 'Status', 'Notes']) {
        headRow.appendChild(el('th', 'py-2 px-3 font-medium', col));
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (filtered.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No receipts found. Create a receipt from a purchase order to track material deliveries.');
        td.setAttribute('colspan', '7');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const receipt of filtered) {
        // Main receipt row
        const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors cursor-pointer');

        tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--accent)]', receipt.receiptNumber));
        tr.appendChild(el('td', 'py-2 px-3 font-mono', receipt.poNumber));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', receipt.receivedDate));
        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', receipt.receivedBy));

        // Lines count - load lines to get count
        const receiptLines = await svc.getReceiptLines(receipt.id);
        tr.appendChild(el('td', 'py-2 px-3 font-mono', String(receiptLines.length)));

        const tdStatus = el('td', 'py-2 px-3');
        const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${RECEIPT_STATUS_BADGE[receipt.status] ?? RECEIPT_STATUS_BADGE.partial}`,
          receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1));
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);

        tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)] truncate max-w-[200px]', receipt.notes));

        tbody.appendChild(tr);

        // Expandable detail row (hidden by default)
        const detailRow = el('tr', 'border-b border-[var(--border)] bg-[var(--surface)]');
        detailRow.style.display = 'none';
        const detailTd = el('td', 'py-3 px-6');
        detailTd.setAttribute('colspan', '7');

        if (receiptLines.length > 0) {
          const detailTable = el('table', 'w-full text-sm');
          const detailHead = el('thead');
          const detailHeadRow = el('tr', 'text-left text-[var(--text-muted)]');
          for (const col of ['PO Line', 'Quantity', 'Description', 'Condition']) {
            detailHeadRow.appendChild(el('th', 'py-1 px-2 font-medium text-xs', col));
          }
          detailHead.appendChild(detailHeadRow);
          detailTable.appendChild(detailHead);

          const detailBody = el('tbody');
          for (const rl of receiptLines) {
            const dlTr = el('tr', 'border-t border-[var(--border)]/50');
            dlTr.appendChild(el('td', 'py-1 px-2 font-mono text-xs', rl.poLineId as string));
            dlTr.appendChild(el('td', 'py-1 px-2 font-mono text-xs', String(rl.quantity)));
            dlTr.appendChild(el('td', 'py-1 px-2 text-xs', rl.description ?? ''));

            const condTd = el('td', 'py-1 px-2');
            const condBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_BADGE[rl.condition] ?? CONDITION_BADGE.good}`,
              rl.condition.charAt(0).toUpperCase() + rl.condition.slice(1));
            condTd.appendChild(condBadge);
            dlTr.appendChild(condTd);
            detailBody.appendChild(dlTr);
          }
          detailTable.appendChild(detailBody);
          detailTd.appendChild(detailTable);
        } else {
          detailTd.appendChild(el('p', 'text-sm text-[var(--text-muted)]', 'No receipt lines.'));
        }

        detailRow.appendChild(detailTd);
        tbody.appendChild(detailRow);

        // Toggle detail on click
        tr.addEventListener('click', () => {
          detailRow.style.display = detailRow.style.display === 'none' ? '' : 'none';
        });
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      tableContainer.appendChild(wrap);
    };

    // Wire search
    searchInput.addEventListener('input', () => {
      void loadAndRenderReceipts(searchInput.value.trim());
    });

    // ---- New Receipt Form ----
    let formVisible = false;
    newReceiptBtn.addEventListener('click', () => {
      formVisible = !formVisible;
      formContainer.style.display = formVisible ? '' : 'none';
      newReceiptBtn.textContent = formVisible ? 'Hide Form' : 'New Receipt';
    });

    const buildReceiptForm = async () => {
      formContainer.innerHTML = '';
      const section = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mt-4');
      section.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'New Receipt'));

      const grid = el('div', 'grid grid-cols-3 gap-4');

      // PO Selector - load approved and partial_receipt POs
      const receivablePOs = allPOs.filter((po) => po.status === 'approved' || po.status === 'partial_receipt');

      const poGroup = el('div');
      poGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Purchase Order'));
      const poSelect = el('select', INPUT_CLS) as HTMLSelectElement;
      poSelect.name = 'purchaseOrderId';
      const emptyOpt = el('option', '', 'Select a PO...') as HTMLOptionElement;
      emptyOpt.value = '';
      poSelect.appendChild(emptyOpt);
      for (const po of receivablePOs) {
        const o = el('option', '', `${po.poNumber} - ${po.description ?? po.vendorId}`) as HTMLOptionElement;
        o.value = po.id as string;
        poSelect.appendChild(o);
      }
      poGroup.appendChild(poSelect);
      grid.appendChild(poGroup);

      // Receipt Number
      const rcptNumGroup = el('div');
      rcptNumGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Receipt Number'));
      const rcptNumInput = el('input', INPUT_CLS) as HTMLInputElement;
      rcptNumInput.type = 'text';
      rcptNumInput.name = 'receiptNumber';
      rcptNumInput.placeholder = 'RCV-0001';
      rcptNumGroup.appendChild(rcptNumInput);
      grid.appendChild(rcptNumGroup);

      // Received Date
      const dateGroup = el('div');
      dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Received Date'));
      const dateIn = el('input', INPUT_CLS) as HTMLInputElement;
      dateIn.type = 'date';
      dateIn.name = 'receivedDate';
      dateIn.value = new Date().toISOString().split('T')[0];
      dateGroup.appendChild(dateIn);
      grid.appendChild(dateGroup);

      // Received By
      const byGroup = el('div');
      byGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Received By'));
      const byInput = el('input', INPUT_CLS) as HTMLInputElement;
      byInput.type = 'text';
      byInput.name = 'receivedBy';
      byInput.placeholder = 'Name';
      byGroup.appendChild(byInput);
      grid.appendChild(byGroup);

      // Notes
      const notesGroup = el('div', 'col-span-2');
      notesGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Notes'));
      const notesInput = el('textarea', INPUT_CLS) as HTMLTextAreaElement;
      notesInput.name = 'notes';
      notesInput.rows = 2;
      notesGroup.appendChild(notesInput);
      grid.appendChild(notesGroup);

      section.appendChild(grid);

      // PO Lines section (populated when PO is selected)
      section.appendChild(el('h3', 'text-md font-semibold text-[var(--text)] mt-4 mb-2', 'Receipt Lines'));
      const linesContainer = el('div');
      linesContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Select a PO above to load line items for receipt.'));
      section.appendChild(linesContainer);

      // Track line inputs for form submission
      interface LineInput {
        poLineId: string;
        qtyInput: HTMLInputElement;
        conditionSelect: HTMLSelectElement;
        descInput: HTMLInputElement;
      }
      let lineInputs: LineInput[] = [];

      // When PO is selected, load its lines
      poSelect.addEventListener('change', async () => {
        linesContainer.innerHTML = '';
        lineInputs = [];

        const poId = poSelect.value;
        if (!poId) {
          linesContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Select a PO above to load line items for receipt.'));
          return;
        }

        try {
          const poLines = await svc.getPOLines(poId);
          if (poLines.length === 0) {
            linesContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'No line items on this PO.'));
            return;
          }

          const lineTable = el('table', 'w-full text-sm');
          const lHead = el('thead');
          const lHeadRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
          for (const col of ['Line #', 'Description', 'Ordered', 'Already Received', 'Remaining', 'Receive Qty', 'Condition', 'Notes']) {
            lHeadRow.appendChild(el('th', 'py-2 px-2 font-medium text-xs', col));
          }
          lHead.appendChild(lHeadRow);
          lineTable.appendChild(lHead);

          const lBody = el('tbody');
          for (const line of poLines) {
            const remaining = line.quantity - line.receivedQuantity;
            if (remaining <= 0) continue; // Skip fully received lines

            const lTr = el('tr', 'border-b border-[var(--border)]');
            lTr.appendChild(el('td', 'py-2 px-2 font-mono text-xs', String(line.lineNumber)));
            lTr.appendChild(el('td', 'py-2 px-2 text-xs', line.description));
            lTr.appendChild(el('td', 'py-2 px-2 font-mono text-xs', String(line.quantity)));
            lTr.appendChild(el('td', 'py-2 px-2 font-mono text-xs', String(line.receivedQuantity)));
            lTr.appendChild(el('td', 'py-2 px-2 font-mono text-xs font-medium', String(remaining)));

            // Qty input
            const qtyTd = el('td', 'py-2 px-2');
            const qtyIn = el('input', 'w-20 bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text)]') as HTMLInputElement;
            qtyIn.type = 'number';
            qtyIn.step = '1';
            qtyIn.min = '0';
            qtyIn.max = String(remaining);
            qtyIn.value = String(remaining);
            qtyTd.appendChild(qtyIn);
            lTr.appendChild(qtyTd);

            // Condition select
            const condTd = el('td', 'py-2 px-2');
            const condSel = el('select', 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text)]') as HTMLSelectElement;
            for (const opt of CONDITION_OPTIONS) {
              const o = el('option', '', opt.label) as HTMLOptionElement;
              o.value = opt.value;
              condSel.appendChild(o);
            }
            condTd.appendChild(condSel);
            lTr.appendChild(condTd);

            // Description/notes input
            const descTd = el('td', 'py-2 px-2');
            const descIn = el('input', 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-xs text-[var(--text)]') as HTMLInputElement;
            descIn.type = 'text';
            descIn.placeholder = 'Notes...';
            descTd.appendChild(descIn);
            lTr.appendChild(descTd);

            lBody.appendChild(lTr);

            lineInputs.push({
              poLineId: line.id as string,
              qtyInput: qtyIn,
              conditionSelect: condSel,
              descInput: descIn,
            });
          }

          lineTable.appendChild(lBody);
          linesContainer.appendChild(el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden mb-3').appendChild(lineTable).parentElement!);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load PO lines';
          showMsg(wrapper, message, true);
        }
      });

      // Submit button
      const btnRow = el('div', 'flex items-center gap-3 mt-4');
      const saveBtn = el('button', 'px-6 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Create Receipt');
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', async () => {
        const purchaseOrderId = poSelect.value;
        const receiptNumber = rcptNumInput.value.trim();
        const receivedDate = dateIn.value;
        const receivedBy = byInput.value.trim();
        const notes = notesInput.value.trim();

        if (!purchaseOrderId) {
          showMsg(wrapper, 'Please select a purchase order.', true);
          return;
        }
        if (!receiptNumber) {
          showMsg(wrapper, 'Receipt number is required.', true);
          return;
        }
        if (!receivedDate) {
          showMsg(wrapper, 'Received date is required.', true);
          return;
        }

        // Build receipt lines from inputs
        const lines: { poLineId: string; quantity: number; description?: string; condition: 'good' | 'damaged' | 'rejected' }[] = [];
        for (const li of lineInputs) {
          const qty = parseFloat(li.qtyInput.value) || 0;
          if (qty > 0) {
            lines.push({
              poLineId: li.poLineId,
              quantity: qty,
              description: li.descInput.value.trim() || undefined,
              condition: li.conditionSelect.value as 'good' | 'damaged' | 'rejected',
            });
          }
        }

        if (lines.length === 0) {
          showMsg(wrapper, 'At least one line must have a quantity greater than zero.', true);
          return;
        }

        try {
          await svc.createReceipt({
            purchaseOrderId,
            receiptNumber,
            receivedDate,
            receivedBy: receivedBy || undefined,
            notes: notes || undefined,
            lines,
          });

          showMsg(wrapper, `Receipt ${receiptNumber} created successfully.`, false);

          // Reset form
          poSelect.value = '';
          rcptNumInput.value = '';
          dateIn.value = new Date().toISOString().split('T')[0];
          byInput.value = '';
          notesInput.value = '';
          linesContainer.innerHTML = '';
          linesContainer.appendChild(el('p', 'text-sm text-[var(--text-muted)] mb-3', 'Select a PO above to load line items for receipt.'));
          lineInputs = [];

          // Hide form and refresh table
          formVisible = false;
          formContainer.style.display = 'none';
          newReceiptBtn.textContent = 'New Receipt';

          await loadAndRenderReceipts(searchInput.value.trim());
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create receipt';
          showMsg(wrapper, message, true);
        }
      });
      btnRow.appendChild(saveBtn);
      section.appendChild(btnRow);

      formContainer.appendChild(section);
    };

    // Build form and initial table
    await buildReceiptForm();
    await loadAndRenderReceipts();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    showMsg(wrapper, message, true);
  }
})();

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    container.appendChild(wrapper);
  },
};

/**
 * TRIR / DART / EMR view.
 * Calculates and displays Total Recordable Incident Rate, Days Away
 * Restricted or Transferred rate, and Experience Modification Rate.
 * Includes EMR history table with add capability. Wired to SafetyService.
 */

import { getSafetyService } from '../service-accessor';
import type { TRIRResult, DARTResult, EMRRecord } from '../safety-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string> | string,
  ...children: Array<string | HTMLElement>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (typeof attrs === 'string') {
    node.className = attrs;
  } else if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class' || k === 'className') {
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

function showMsg(container: HTMLElement, text: string, isError: boolean): void {
  const existing = container.querySelector('[data-msg]');
  if (existing) existing.remove();
  const cls = isError
    ? 'p-3 mb-4 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20'
    : 'p-3 mb-4 rounded-md text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  const msg = el('div', cls, text);
  msg.setAttribute('data-msg', '1');
  container.prepend(msg);
  setTimeout(() => msg.remove(), 3000);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'max-w-7xl mx-auto');

    const inputCls =
      'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';
    const btnCls =
      'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90';

    // ---- Header ----
    wrapper.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)] mb-4', 'TRIR / DART / EMR'));

    // ---- Input Bar ----
    const inputBar = el('div', 'flex flex-wrap items-end gap-4 mb-6');

    const yearGroup = el('div');
    yearGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Year'));
    const yearInput = el('input', inputCls + ' w-28') as HTMLInputElement;
    yearInput.type = 'number';
    yearInput.value = String(new Date().getFullYear());
    yearInput.min = '2000';
    yearInput.max = '2099';
    yearGroup.appendChild(yearInput);
    inputBar.appendChild(yearGroup);

    const hoursGroup = el('div');
    hoursGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)] mb-1', 'Total Hours Worked'));
    const hoursInput = el('input', inputCls + ' w-40') as HTMLInputElement;
    hoursInput.type = 'number';
    hoursInput.placeholder = 'e.g. 300000';
    hoursInput.min = '0';
    hoursGroup.appendChild(hoursInput);
    inputBar.appendChild(hoursGroup);

    const calcBtn = el('button', btnCls, 'Calculate');
    calcBtn.type = 'button';
    inputBar.appendChild(calcBtn);

    wrapper.appendChild(inputBar);

    // ---- Rate Cards Container ----
    const rateCardsContainer = el('div', 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-8');
    wrapper.appendChild(rateCardsContainer);

    // ---- EMR History Section ----
    const emrSection = el('div', 'mb-6');
    const emrHeader = el('div', 'flex items-center justify-between mb-3');
    emrHeader.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)]', 'EMR History'));
    const addEmrBtn = el('button', btnCls, 'Add EMR');
    addEmrBtn.type = 'button';
    emrHeader.appendChild(addEmrBtn);
    emrSection.appendChild(emrHeader);

    const emrTableContainer = el('div');
    emrSection.appendChild(emrTableContainer);
    wrapper.appendChild(emrSection);

    container.appendChild(wrapper);

    // -------------------------------------------------------------------
    // Rendering helpers
    // -------------------------------------------------------------------

    function renderRateCard(
      title: string,
      rateValue: string,
      details: { label: string; value: string }[],
    ): HTMLElement {
      const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6');
      card.appendChild(el('div', 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2', title));
      card.appendChild(el('div', 'text-3xl font-bold text-[var(--text)] mb-3', rateValue));
      for (const detail of details) {
        const row = el('div', 'flex items-center justify-between text-sm mb-1');
        row.appendChild(el('span', 'text-[var(--text-muted)]', detail.label));
        row.appendChild(el('span', 'text-[var(--text)] font-mono', detail.value));
        card.appendChild(row);
      }
      return card;
    }

    function renderRateCards(
      trirResult: TRIRResult | null,
      dartResult: DARTResult | null,
      currentEmr: number,
    ): void {
      rateCardsContainer.innerHTML = '';

      // TRIR Card
      if (trirResult) {
        rateCardsContainer.appendChild(
          renderRateCard('TRIR', trirResult.trir.toFixed(4), [
            { label: 'Recordable Incidents', value: String(trirResult.totalRecordableIncidents) },
            { label: 'Total Hours', value: trirResult.totalHoursWorked.toLocaleString() },
            { label: 'Period', value: trirResult.period },
          ]),
        );
      } else {
        rateCardsContainer.appendChild(
          renderRateCard('TRIR', '--', [
            { label: 'Recordable Incidents', value: '--' },
            { label: 'Total Hours', value: '--' },
            { label: 'Period', value: '--' },
          ]),
        );
      }

      // DART Card
      if (dartResult) {
        rateCardsContainer.appendChild(
          renderRateCard('DART', dartResult.dart.toFixed(4), [
            { label: 'DART Cases', value: String(dartResult.daysAwayRestrictedCases) },
            { label: 'Total Hours', value: dartResult.totalHoursWorked.toLocaleString() },
            { label: 'Period', value: dartResult.period },
          ]),
        );
      } else {
        rateCardsContainer.appendChild(
          renderRateCard('DART', '--', [
            { label: 'DART Cases', value: '--' },
            { label: 'Total Hours', value: '--' },
            { label: 'Period', value: '--' },
          ]),
        );
      }

      // EMR Card
      rateCardsContainer.appendChild(
        renderRateCard('Current EMR', currentEmr.toFixed(4), [
          { label: 'Source', value: 'Latest record' },
        ]),
      );
    }

    function renderEmrTable(records: (EMRRecord & { id?: string })[]): void {
      emrTableContainer.innerHTML = '';

      const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
      const table = el('table', 'w-full text-sm');

      const thead = el('thead');
      const headRow = el('tr', 'border-b border-[var(--border)]');
      for (const col of ['Year', 'EMR Value', 'Carrier', 'Effective Date', 'Expiration Date', 'Notes']) {
        headRow.appendChild(
          el('th', 'text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 py-3', col),
        );
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (records.length === 0) {
        const tr = el('tr');
        const td = el('td', 'py-8 px-4 text-center text-[var(--text-muted)]', 'No EMR records found. Add your first EMR record.');
        td.setAttribute('colspan', '6');
        tr.appendChild(td);
        tbody.appendChild(tr);
      }

      for (const rec of records) {
        const tr = el('tr', 'border-t border-[var(--border)] hover:bg-[var(--surface)]');

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)] font-mono', String(rec.year)));

        // EMR value with color coding
        const tdVal = el('td', 'px-4 py-3 text-sm font-mono font-semibold');
        let emrColor = 'text-zinc-400';
        if (rec.emrValue < 1.0) emrColor = 'text-emerald-400';
        else if (rec.emrValue > 1.0) emrColor = 'text-red-400';
        tdVal.appendChild(el('span', emrColor, rec.emrValue.toFixed(4)));
        tr.appendChild(tdVal);

        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', rec.carrier ?? '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', rec.effectiveDate));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text)]', rec.expirationDate ?? '-'));
        tr.appendChild(el('td', 'px-4 py-3 text-sm text-[var(--text-muted)]', rec.notes ?? '-'));

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      emrTableContainer.appendChild(wrap);
    }

    // -------------------------------------------------------------------
    // Data loading
    // -------------------------------------------------------------------

    async function loadEmrData(): Promise<void> {
      emrTableContainer.innerHTML = '';
      const loading = el('div', 'py-8 text-center text-[var(--text-muted)]', 'Loading EMR records...');
      emrTableContainer.appendChild(loading);

      try {
        const svc = getSafetyService();
        const emrRecords = await svc.listEMR();
        const currentEmr = emrRecords.length > 0 ? emrRecords[0].emrValue : 1.0;

        renderEmrTable(emrRecords as (EMRRecord & { id?: string })[]);

        // Update EMR card if rate cards are showing placeholders
        const emrCard = rateCardsContainer.children[2];
        if (emrCard) {
          const valueEl = emrCard.querySelector('.text-3xl');
          if (valueEl && valueEl.textContent === '--') {
            valueEl.textContent = currentEmr.toFixed(4);
          }
        }
      } catch (err: unknown) {
        emrTableContainer.innerHTML = '';
        const message = err instanceof Error ? err.message : 'Failed to load EMR records.';
        showMsg(wrapper, message, true);
      }
    }

    // ---- Calculate Rates ----
    calcBtn.addEventListener('click', () => {
      const year = parseInt(yearInput.value, 10);
      if (isNaN(year) || year < 2000 || year > 2099) {
        showMsg(wrapper, 'Please enter a valid year (2000-2099).', true);
        return;
      }
      const totalHours = parseFloat(hoursInput.value);
      if (isNaN(totalHours) || totalHours <= 0) {
        showMsg(wrapper, 'Please enter a valid positive number for Total Hours Worked.', true);
        return;
      }

      rateCardsContainer.innerHTML = '';
      const loading = el('div', 'col-span-3 py-8 text-center text-[var(--text-muted)]', 'Calculating rates...');
      rateCardsContainer.appendChild(loading);

      void (async () => {
        try {
          const svc = getSafetyService();
          const [trirResult, dartResult, emrRecords] = await Promise.all([
            svc.calculateTRIR(totalHours, year),
            svc.calculateDART(totalHours, year),
            svc.listEMR(),
          ]);

          const currentEmr = emrRecords.length > 0 ? emrRecords[0].emrValue : 1.0;
          renderRateCards(trirResult, dartResult, currentEmr);
        } catch (err: unknown) {
          rateCardsContainer.innerHTML = '';
          const message = err instanceof Error ? err.message : 'Failed to calculate rates.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Add EMR ----
    addEmrBtn.addEventListener('click', () => {
      const yearStr = prompt('EMR Year:', String(new Date().getFullYear()));
      if (!yearStr) return;
      const emrYear = parseInt(yearStr, 10);
      if (isNaN(emrYear)) {
        showMsg(wrapper, 'Invalid year.', true);
        return;
      }

      const emrValueStr = prompt('EMR Value (e.g. 0.85):');
      if (!emrValueStr) return;
      const emrValue = parseFloat(emrValueStr);
      if (isNaN(emrValue)) {
        showMsg(wrapper, 'Invalid EMR value.', true);
        return;
      }

      const carrier = prompt('Insurance Carrier (optional):') ?? '';
      const effectiveDate = prompt('Effective Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      if (!effectiveDate) return;

      void (async () => {
        try {
          const svc = getSafetyService();
          await svc.addEMR({
            year: emrYear,
            emrValue,
            carrier: carrier || undefined,
            effectiveDate,
          });
          showMsg(wrapper, `EMR record for ${emrYear} added successfully.`, false);
          await loadEmrData();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add EMR record.';
          showMsg(wrapper, message, true);
        }
      })();
    });

    // ---- Initial Load ----
    renderRateCards(null, null, 1.0);
    void loadEmrData();
  },
};

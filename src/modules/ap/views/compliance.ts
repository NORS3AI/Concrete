/**
 * Compliance Certificate Tracking view.
 * Track insurance certificates, licenses, bonds, and other compliance documents by vendor.
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
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_required', label: 'Not Required' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'general_liability', label: 'General Liability' },
  { value: 'workers_comp', label: 'Workers Comp' },
  { value: 'auto_liability', label: 'Auto Liability' },
  { value: 'umbrella', label: 'Umbrella/Excess' },
  { value: 'professional_liability', label: 'Professional Liability' },
  { value: 'builders_risk', label: "Builder's Risk" },
  { value: 'bond', label: 'Bond' },
  { value: 'license', label: 'License' },
  { value: 'w9', label: 'W-9' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  expiring_soon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border border-red-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  not_required: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  pending: 'Pending',
  not_required: 'Not Required',
};

const TYPE_LABELS: Record<string, string> = {
  general_liability: 'General Liability',
  workers_comp: 'Workers Comp',
  auto_liability: 'Auto Liability',
  umbrella: 'Umbrella/Excess',
  professional_liability: 'Professional Liability',
  builders_risk: "Builder's Risk",
  bond: 'Bond',
  license: 'License',
  w9: 'W-9',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceCertRow {
  id: string;
  vendorName: string;
  vendorCode: string;
  certType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  coverageAmount: string;
  status: string;
  daysUntilExpiry: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function buildFilterBar(
  onFilter: (status: string, type: string, search: string) => void,
): HTMLElement {
  const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
  const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const searchInput = el('input', inputCls) as HTMLInputElement;
  searchInput.type = 'text';
  searchInput.placeholder = 'Search vendors...';
  bar.appendChild(searchInput);

  const statusSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of STATUS_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    statusSelect.appendChild(o);
  }
  bar.appendChild(statusSelect);

  const typeSelect = el('select', inputCls) as HTMLSelectElement;
  for (const opt of TYPE_OPTIONS) {
    const o = el('option', '', opt.label) as HTMLOptionElement;
    o.value = opt.value;
    typeSelect.appendChild(o);
  }
  bar.appendChild(typeSelect);

  const fire = () => onFilter(statusSelect.value, typeSelect.value, searchInput.value);
  statusSelect.addEventListener('change', fire);
  typeSelect.addEventListener('change', fire);
  searchInput.addEventListener('input', fire);

  return bar;
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function buildSummaryCards(): HTMLElement {
  const row = el('div', 'grid grid-cols-5 gap-3 mb-4');

  const buildCard = (label: string, value: string, colorCls?: string): HTMLElement => {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-center');
    card.appendChild(el('div', 'text-xs text-[var(--text-muted)] mb-1', label));
    card.appendChild(el('div', `text-lg font-bold ${colorCls ?? 'text-[var(--text)]'}`, value));
    return card;
  };

  row.appendChild(buildCard('Active', '0', 'text-emerald-400'));
  row.appendChild(buildCard('Expiring Soon', '0', 'text-amber-400'));
  row.appendChild(buildCard('Expired', '0', 'text-red-400'));
  row.appendChild(buildCard('Pending', '0', 'text-blue-400'));
  row.appendChild(buildCard('Total Tracked', '0'));

  return row;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function buildTable(certs: ComplianceCertRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Vendor', 'Type', 'Carrier', 'Policy #', 'Effective', 'Expiration', 'Coverage', 'Status', 'Days Left', 'Actions']) {
    const align = col === 'Days Left' ? 'py-2 px-3 font-medium text-center' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (certs.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No compliance certificates found. Add vendor insurance, license, or bond records to track them here.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const cert of certs) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdVendor = el('td', 'py-2 px-3');
    const vendorLink = el('a', 'text-[var(--accent)] hover:underline', cert.vendorName) as HTMLAnchorElement;
    vendorLink.href = `#/ap/vendors/${cert.id}`;
    tdVendor.appendChild(vendorLink);
    tdVendor.appendChild(el('div', 'text-xs text-[var(--text-muted)] font-mono', cert.vendorCode));
    tr.appendChild(tdVendor);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', TYPE_LABELS[cert.certType] ?? cert.certType));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', cert.carrier));
    tr.appendChild(el('td', 'py-2 px-3 font-mono text-[var(--text-muted)]', cert.policyNumber));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', cert.effectiveDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', cert.expirationDate));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text)]', cert.coverageAmount));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[cert.status] ?? STATUS_BADGE.active}`,
      STATUS_LABELS[cert.status] ?? cert.status);
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const daysColor = cert.daysUntilExpiry <= 0 ? 'text-red-400'
      : cert.daysUntilExpiry <= 30 ? 'text-amber-400'
      : 'text-[var(--text-muted)]';
    tr.appendChild(el('td', `py-2 px-3 text-center font-mono ${daysColor}`,
      cert.daysUntilExpiry <= 0 ? 'Expired' : String(cert.daysUntilExpiry)));

    const tdActions = el('td', 'py-2 px-3');
    const renewBtn = el('button', 'text-[var(--accent)] hover:underline text-sm mr-2', 'Renew');
    renewBtn.type = 'button';
    tdActions.appendChild(renewBtn);
    const editBtn = el('button', 'text-[var(--text-muted)] hover:underline text-sm', 'Edit');
    editBtn.type = 'button';
    tdActions.appendChild(editBtn);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Compliance Certificates'));
    const btnGroup = el('div', 'flex items-center gap-2');
    const addBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Certificate');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => { /* add placeholder */ });
    btnGroup.appendChild(addBtn);
    const exportBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', 'Export');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', () => { /* export placeholder */ });
    btnGroup.appendChild(exportBtn);
    headerRow.appendChild(btnGroup);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildSummaryCards());
    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const certs: ComplianceCertRow[] = [];
    wrapper.appendChild(buildTable(certs));

    container.appendChild(wrapper);
  },
};

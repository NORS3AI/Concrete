/**
 * Vendor List view.
 * Filterable table of vendors with status and type dropdowns.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (v: number): string =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'blocked', label: 'Blocked' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'utility', label: 'Utility' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  blocked: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorRow {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  contactName: string;
  phone: string;
  email: string;
  balance: number;
  is1099: boolean;
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
// Table
// ---------------------------------------------------------------------------

function buildTable(vendors: VendorRow[]): HTMLElement {
  const wrap = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');
  const table = el('table', 'w-full text-sm');

  const thead = el('thead');
  const headRow = el('tr', 'text-left text-[var(--text-muted)] border-b border-[var(--border)]');
  for (const col of ['Code', 'Name', 'Type', 'Status', 'Contact', 'Phone', 'Email', 'Balance', '1099', 'Actions']) {
    const align = col === 'Balance' ? 'py-2 px-3 font-medium text-right' : 'py-2 px-3 font-medium';
    headRow.appendChild(el('th', align, col));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  if (vendors.length === 0) {
    const tr = el('tr');
    const td = el('td', 'py-8 px-3 text-center text-[var(--text-muted)]', 'No vendors found. Create your first vendor to get started.');
    td.setAttribute('colspan', '10');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const vendor of vendors) {
    const tr = el('tr', 'border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors');

    const tdCode = el('td', 'py-2 px-3 font-mono');
    const link = el('a', 'text-[var(--accent)] hover:underline', vendor.code) as HTMLAnchorElement;
    link.href = `#/ap/vendors/${vendor.id}`;
    tdCode.appendChild(link);
    tr.appendChild(tdCode);

    tr.appendChild(el('td', 'py-2 px-3 font-medium text-[var(--text)]', vendor.name));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', vendor.type));

    const tdStatus = el('td', 'py-2 px-3');
    const badge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[vendor.status] ?? STATUS_BADGE.active}`,
      vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1));
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', vendor.contactName));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', vendor.phone));
    tr.appendChild(el('td', 'py-2 px-3 text-[var(--text-muted)]', vendor.email));
    tr.appendChild(el('td', 'py-2 px-3 text-right font-mono', fmtCurrency(vendor.balance)));

    const td1099 = el('td', 'py-2 px-3');
    if (vendor.is1099) {
      td1099.appendChild(el('span', 'px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20', 'Yes'));
    } else {
      td1099.appendChild(el('span', 'text-[var(--text-muted)] text-xs', 'No'));
    }
    tr.appendChild(td1099);

    const tdActions = el('td', 'py-2 px-3');
    const editLink = el('a', 'text-[var(--accent)] hover:underline text-sm', 'Edit') as HTMLAnchorElement;
    editLink.href = `#/ap/vendors/${vendor.id}`;
    tdActions.appendChild(editLink);
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
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Vendors'));
    const newBtn = el('a', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90') as HTMLAnchorElement;
    newBtn.href = '#/ap/vendors/new';
    newBtn.textContent = 'New Vendor';
    headerRow.appendChild(newBtn);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildFilterBar((_status, _type, _search) => { /* filter placeholder */ }));

    const vendors: VendorRow[] = [];
    wrapper.appendChild(buildTable(vendors));

    container.appendChild(wrapper);
  },
};

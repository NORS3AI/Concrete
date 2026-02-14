/**
 * Subscription view.
 * Plan selection, billing details, payment method, usage vs limits.
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

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    maxUsers: 3,
    maxEntities: 5,
    storageMb: 100,
    features: ['Basic reporting', 'Single entity', 'Email support'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    maxUsers: 10,
    maxEntities: 25,
    storageMb: 1000,
    features: ['Advanced reporting', 'Multi-entity', 'Priority support', 'CSV import/export'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    maxUsers: 50,
    maxEntities: 100,
    storageMb: 10000,
    features: ['Custom dashboards', 'API access', 'Workflow automation', 'Audit trail', 'Phone support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    maxUsers: 500,
    maxEntities: 1000,
    storageMb: 100000,
    features: ['White-label', 'SSO/SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'Data residency'],
  },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  past_due: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
  trialing: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

// ---------------------------------------------------------------------------
// Plan Cards
// ---------------------------------------------------------------------------

function buildPlanCards(currentPlan: string): HTMLElement {
  const grid = el('div', 'grid grid-cols-4 gap-4 mb-6');

  for (const plan of PLANS) {
    const isCurrent = plan.id === currentPlan;
    const borderCls = isCurrent ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]';
    const card = el('div', `bg-[var(--surface-raised)] border ${borderCls} rounded-lg p-5 relative`);

    if (isCurrent) {
      const currentTag = el('div', 'absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[var(--accent)] text-white text-xs font-medium rounded-full', 'Current Plan');
      card.appendChild(currentTag);
    }

    card.appendChild(el('h3', 'text-lg font-bold text-[var(--text)] mb-1', plan.name));
    const priceRow = el('div', 'mb-4');
    if (plan.price === 0) {
      priceRow.appendChild(el('span', 'text-2xl font-bold text-[var(--text)]', 'Free'));
    } else {
      priceRow.appendChild(el('span', 'text-2xl font-bold text-[var(--text)]', `$${plan.price}`));
      priceRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', '/mo'));
    }
    card.appendChild(priceRow);

    const limits = el('div', 'space-y-1 mb-4 text-sm');
    limits.appendChild(el('div', 'text-[var(--text-muted)]', `Up to ${plan.maxUsers} users`));
    limits.appendChild(el('div', 'text-[var(--text-muted)]', `Up to ${plan.maxEntities} entities`));
    limits.appendChild(el('div', 'text-[var(--text-muted)]', `${plan.storageMb >= 1000 ? `${plan.storageMb / 1000} GB` : `${plan.storageMb} MB`} storage`));
    card.appendChild(limits);

    const featureList = el('ul', 'space-y-1 text-sm');
    for (const feature of plan.features) {
      featureList.appendChild(el('li', 'text-[var(--text-muted)]', `- ${feature}`));
    }
    card.appendChild(featureList);

    if (!isCurrent) {
      const selectBtn = el('button', 'w-full mt-4 px-4 py-2 rounded-md text-sm font-medium border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors', 'Select Plan');
      selectBtn.type = 'button';
      selectBtn.addEventListener('click', () => { /* select plan placeholder */ });
      card.appendChild(selectBtn);
    }

    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Billing Details
// ---------------------------------------------------------------------------

function buildBillingDetails(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Billing Details'));

  const grid = el('div', 'grid grid-cols-2 gap-6');

  // Current subscription info
  const infoSection = el('div', 'space-y-3');

  const statusRow = el('div', 'flex items-center justify-between');
  statusRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Status'));
  const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE.trialing}`, 'Trialing');
  statusRow.appendChild(statusBadge);
  infoSection.appendChild(statusRow);

  const periodRow = el('div', 'flex items-center justify-between');
  periodRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Current Period'));
  periodRow.appendChild(el('span', 'text-sm text-[var(--text)]', '-'));
  infoSection.appendChild(periodRow);

  const amountRow = el('div', 'flex items-center justify-between');
  amountRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Amount'));
  amountRow.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', fmtCurrency(0)));
  infoSection.appendChild(amountRow);

  grid.appendChild(infoSection);

  // Payment method
  const paymentSection = el('div', '');
  paymentSection.appendChild(el('h3', 'text-sm font-medium text-[var(--text-muted)] mb-2', 'Payment Method'));
  const noPayment = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');
  noPayment.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-2', 'No payment method on file'));
  const addPaymentBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Payment Method');
  addPaymentBtn.type = 'button';
  addPaymentBtn.addEventListener('click', () => { /* add payment placeholder */ });
  noPayment.appendChild(addPaymentBtn);
  paymentSection.appendChild(noPayment);
  grid.appendChild(paymentSection);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Usage vs Limits
// ---------------------------------------------------------------------------

function buildUsageLimits(): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Usage vs Limits'));

  const metrics = [
    { label: 'Users', used: 0, limit: 3, unit: '' },
    { label: 'Entities', used: 0, limit: 5, unit: '' },
    { label: 'Storage', used: 0, limit: 100, unit: 'MB' },
  ];

  const grid = el('div', 'space-y-4');

  for (const metric of metrics) {
    const row = el('div', '');
    const labelRow = el('div', 'flex items-center justify-between mb-1');
    labelRow.appendChild(el('span', 'text-sm text-[var(--text)]', metric.label));
    const valueText = metric.unit
      ? `${metric.used} / ${metric.limit} ${metric.unit}`
      : `${metric.used} / ${metric.limit}`;
    labelRow.appendChild(el('span', 'text-sm font-mono text-[var(--text-muted)]', valueText));
    row.appendChild(labelRow);

    const pct = metric.limit > 0 ? Math.round((metric.used / metric.limit) * 100) : 0;
    const barColorCls = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-[var(--accent)]';

    const progressOuter = el('div', 'w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden');
    const progressInner = el('div', `h-full ${barColorCls} rounded-full`);
    progressInner.style.width = `${pct}%`;
    progressOuter.appendChild(progressInner);
    row.appendChild(progressOuter);

    grid.appendChild(row);
  }

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Action Buttons
// ---------------------------------------------------------------------------

function buildActions(): HTMLElement {
  const row = el('div', 'flex items-center gap-3');

  const cancelBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10', 'Cancel Subscription');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => { /* cancel placeholder */ });
  row.appendChild(cancelBtn);

  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subscription'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    wrapper.appendChild(buildPlanCards('free'));
    wrapper.appendChild(buildBillingDetails());
    wrapper.appendChild(buildUsageLimits());
    wrapper.appendChild(buildActions());

    container.appendChild(wrapper);
  },
};

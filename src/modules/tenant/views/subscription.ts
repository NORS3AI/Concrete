/**
 * Subscription view.
 * Plan selection, billing details, payment method, usage vs limits.
 * Wired to TenantService for live data.
 */

import { getTenantService } from '../service-accessor';

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

/** Extract tenantId from hash: #/tenant/{id}/subscription */
function parseTenantId(): string {
  const hash = window.location.hash; // e.g. #/tenant/abc123/subscription
  const parts = hash.replace(/^#\/?/, '').split('/');
  // Expected: ['tenant', '{id}', 'subscription']
  if (parts.length >= 3 && parts[0] === 'tenant') {
    return parts[1];
  }
  return '';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 0,
    maxUsers: 3,
    maxEntities: 5,
    storageMb: 100,
    features: ['Basic reporting', 'Single entity', 'Email support'],
  },
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 49,
    maxUsers: 10,
    maxEntities: 25,
    storageMb: 1000,
    features: ['Advanced reporting', 'Multi-entity', 'Priority support', 'CSV import/export'],
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    price: 149,
    maxUsers: 50,
    maxEntities: 100,
    storageMb: 10000,
    features: ['Custom dashboards', 'API access', 'Workflow automation', 'Audit trail', 'Phone support'],
  },
  {
    id: 'enterprise' as const,
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

function buildPlanCards(
  currentPlan: string,
  tenantId: string,
  wrapper: HTMLElement,
): HTMLElement {
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
      selectBtn.addEventListener('click', async () => {
        try {
          const svc = getTenantService();
          await svc.updatePlan(tenantId, plan.id, plan.price);
          showMsg(wrapper, `Plan updated to ${plan.name} successfully.`, false);
          // Re-render after short delay so user sees the message
          setTimeout(() => {
            subscriptionView.render(wrapper.parentElement ?? wrapper);
          }, 600);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          showMsg(wrapper, `Failed to update plan: ${message}`, true);
        }
      });
      card.appendChild(selectBtn);
    }

    grid.appendChild(card);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Billing Details
// ---------------------------------------------------------------------------

function buildBillingDetails(
  subscription: { status: string; currentPeriodStart: string; currentPeriodEnd: string; amount: number; paymentMethod?: string } | null,
  wrapper: HTMLElement,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Billing Details'));

  const grid = el('div', 'grid grid-cols-2 gap-6');

  // Current subscription info
  const infoSection = el('div', 'space-y-3');

  const statusRow = el('div', 'flex items-center justify-between');
  statusRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Status'));
  const status = subscription?.status ?? 'trialing';
  const badgeCls = STATUS_BADGE[status] ?? STATUS_BADGE.trialing;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  const statusBadge = el('span', `px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`, statusLabel);
  statusRow.appendChild(statusBadge);
  infoSection.appendChild(statusRow);

  const periodRow = el('div', 'flex items-center justify-between');
  periodRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Current Period'));
  const periodText = subscription
    ? `${subscription.currentPeriodStart} - ${subscription.currentPeriodEnd}`
    : '-';
  periodRow.appendChild(el('span', 'text-sm text-[var(--text)]', periodText));
  infoSection.appendChild(periodRow);

  const amountRow = el('div', 'flex items-center justify-between');
  amountRow.appendChild(el('span', 'text-sm text-[var(--text-muted)]', 'Amount'));
  amountRow.appendChild(el('span', 'text-sm font-mono text-[var(--text)]', fmtCurrency(subscription?.amount ?? 0)));
  infoSection.appendChild(amountRow);

  grid.appendChild(infoSection);

  // Payment method
  const paymentSection = el('div', '');
  paymentSection.appendChild(el('h3', 'text-sm font-medium text-[var(--text-muted)] mb-2', 'Payment Method'));
  const noPayment = el('div', 'bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 text-center');

  if (subscription?.paymentMethod) {
    noPayment.appendChild(el('div', 'text-sm text-[var(--text)] mb-2', subscription.paymentMethod));
  } else {
    noPayment.appendChild(el('div', 'text-sm text-[var(--text-muted)] mb-2', 'No payment method on file'));
  }

  const addPaymentBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Payment Method');
  addPaymentBtn.type = 'button';
  addPaymentBtn.addEventListener('click', () => {
    showMsg(wrapper, 'Payment methods require cloud deployment integration.', false);
  });
  noPayment.appendChild(addPaymentBtn);
  paymentSection.appendChild(noPayment);
  grid.appendChild(paymentSection);

  card.appendChild(grid);
  return card;
}

// ---------------------------------------------------------------------------
// Usage vs Limits
// ---------------------------------------------------------------------------

function buildUsageLimits(
  stats: { userCount: number; maxUsers: number; entityCount: number; maxEntities: number; storageUsedMb: number; storageLimitMb: number } | null,
): HTMLElement {
  const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-6 mb-4');
  card.appendChild(el('h2', 'text-lg font-semibold text-[var(--text)] mb-4', 'Usage vs Limits'));

  const metrics = stats
    ? [
        { label: 'Users', used: stats.userCount, limit: stats.maxUsers, unit: '' },
        { label: 'Entities', used: stats.entityCount, limit: stats.maxEntities, unit: '' },
        { label: 'Storage', used: stats.storageUsedMb, limit: stats.storageLimitMb, unit: 'MB' },
      ]
    : [
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

function buildActions(
  tenantId: string,
  subscriptionStatus: string | null,
  wrapper: HTMLElement,
): HTMLElement {
  const row = el('div', 'flex items-center gap-3');

  if (subscriptionStatus === 'cancelled') {
    const resumeBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10', 'Resume Subscription');
    resumeBtn.type = 'button';
    resumeBtn.addEventListener('click', async () => {
      try {
        const svc = getTenantService();
        const result = await svc.resumeSubscription(tenantId);
        showMsg(wrapper, `Subscription resumed successfully. Status: ${result.status}`, false);
        setTimeout(() => {
          subscriptionView.render(wrapper.parentElement ?? wrapper);
        }, 600);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to resume subscription: ${message}`, true);
      }
    });
    row.appendChild(resumeBtn);
  } else {
    const cancelBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10', 'Cancel Subscription');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Are you sure you want to cancel your subscription? This will downgrade your access.',
      );
      if (!confirmed) return;

      try {
        const svc = getTenantService();
        const result = await svc.cancelSubscription(tenantId);
        showMsg(wrapper, `Subscription cancelled. Status: ${result.status}`, false);
        setTimeout(() => {
          subscriptionView.render(wrapper.parentElement ?? wrapper);
        }, 600);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to cancel subscription: ${message}`, true);
      }
    });
    row.appendChild(cancelBtn);
  }

  return row;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const subscriptionView = {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-0');

    const headerRow = el('div', 'flex items-center justify-between mb-6');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Subscription'));
    const backLink = el('a', 'text-sm text-[var(--text-muted)] hover:text-[var(--text)]', 'Back to Tenants') as HTMLAnchorElement;
    backLink.href = '#/tenant/list';
    headerRow.appendChild(backLink);
    wrapper.appendChild(headerRow);

    // Show loading state
    const loadingEl = el('div', 'text-sm text-[var(--text-muted)] py-8 text-center', 'Loading subscription data...');
    wrapper.appendChild(loadingEl);
    container.appendChild(wrapper);

    const tenantId = parseTenantId();
    if (!tenantId) {
      loadingEl.remove();
      showMsg(wrapper, 'Could not determine tenant ID from the URL.', true);
      return;
    }

    const svc = getTenantService();

    // Load data from service
    Promise.all([
      svc.getSubscription(tenantId),
      svc.getTenant(tenantId),
      svc.getUsageStats(tenantId),
    ])
      .then(([subscription, tenant, usageStats]) => {
        loadingEl.remove();

        const currentPlan = subscription?.plan ?? tenant?.plan ?? 'free';

        wrapper.appendChild(buildPlanCards(currentPlan, tenantId, wrapper));
        wrapper.appendChild(
          buildBillingDetails(
            subscription
              ? {
                  status: subscription.status,
                  currentPeriodStart: subscription.currentPeriodStart,
                  currentPeriodEnd: subscription.currentPeriodEnd,
                  amount: subscription.amount,
                  paymentMethod: subscription.paymentMethod,
                }
              : null,
            wrapper,
          ),
        );
        wrapper.appendChild(
          buildUsageLimits(
            usageStats
              ? {
                  userCount: usageStats.userCount,
                  maxUsers: usageStats.maxUsers,
                  entityCount: usageStats.entityCount,
                  maxEntities: usageStats.maxEntities,
                  storageUsedMb: usageStats.storageUsedMb,
                  storageLimitMb: usageStats.storageLimitMb,
                }
              : null,
          ),
        );
        wrapper.appendChild(
          buildActions(tenantId, subscription?.status ?? null, wrapper),
        );
      })
      .catch((err: unknown) => {
        loadingEl.remove();
        const message = err instanceof Error ? err.message : String(err);
        showMsg(wrapper, `Failed to load subscription data: ${message}`, true);

        // Fallback: render with defaults
        wrapper.appendChild(buildPlanCards('free', tenantId, wrapper));
        wrapper.appendChild(buildBillingDetails(null, wrapper));
        wrapper.appendChild(buildUsageLimits(null));
        wrapper.appendChild(buildActions(tenantId, null, wrapper));
      });
  },
};

export default subscriptionView;

/**
 * Phase Zed.7 - Badge
 * Badge/Tag component with variant coloring.
 */

const VARIANT_CLASSES: Record<string, string> = {
  default:
    'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
  info: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
};

export class Badge {
  static render(
    text: string,
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  ): HTMLElement {
    const el = document.createElement('span');
    const variantClass = VARIANT_CLASSES[variant ?? 'default'];
    el.className = `inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${variantClass}`;
    el.textContent = text;
    return el;
  }
}

/**
 * Phase Zed.7 - FormSection
 * Groups form fields under a collapsible section header.
 */

export interface FormSectionConfig {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export class FormSection {
  static render(config: FormSectionConfig, children: HTMLElement[]): HTMLElement {
    const section = document.createElement('fieldset');
    section.className =
      'border border-[var(--border)] rounded-lg p-4 space-y-4';

    let isCollapsed = config.defaultCollapsed ?? false;

    // Header
    const header = document.createElement('legend');
    header.className = 'flex items-center gap-2 px-2 -ml-1';

    if (config.collapsible) {
      const chevron = document.createElement('span');
      chevron.className = 'text-[var(--text-muted)] transition-transform text-xs';
      chevron.textContent = isCollapsed ? '\u25B6' : '\u25BC';

      header.className += ' cursor-pointer';
      header.appendChild(chevron);

      header.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        chevron.textContent = isCollapsed ? '\u25B6' : '\u25BC';
        contentWrapper.classList.toggle('hidden', isCollapsed);
      });
    }

    const title = document.createElement('span');
    title.className = 'text-sm font-semibold text-[var(--text)]';
    title.textContent = config.title;
    header.appendChild(title);

    section.appendChild(header);

    if (config.description) {
      const desc = document.createElement('p');
      desc.className = 'text-xs text-[var(--text-muted)] -mt-2';
      desc.textContent = config.description;
      section.appendChild(desc);
    }

    // Content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = `space-y-4 ${isCollapsed ? 'hidden' : ''}`;

    for (const child of children) {
      contentWrapper.appendChild(child);
    }

    section.appendChild(contentWrapper);

    return section;
  }
}

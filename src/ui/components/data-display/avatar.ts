/**
 * Phase Zed.7 - Avatar
 * User/entity avatar with initials fallback.
 */

export interface AvatarConfig {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<string, { wrapper: string; text: string }> = {
  sm: { wrapper: 'w-6 h-6', text: 'text-2xs' },
  md: { wrapper: 'w-8 h-8', text: 'text-xs' },
  lg: { wrapper: 'w-10 h-10', text: 'text-sm' },
};

export class Avatar {
  static render(config: AvatarConfig): HTMLElement {
    const sizeClass = SIZE_CLASSES[config.size ?? 'md'];

    const wrapper = document.createElement('div');
    wrapper.className = `${sizeClass.wrapper} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`;
    wrapper.setAttribute('title', config.name);

    if (config.imageUrl) {
      const img = document.createElement('img');
      img.src = config.imageUrl;
      img.alt = config.name;
      img.className = 'w-full h-full object-cover';
      img.onerror = () => {
        wrapper.removeChild(img);
        Avatar.appendInitials(wrapper, config.name, sizeClass.text);
      };
      wrapper.appendChild(img);
    } else {
      Avatar.appendInitials(wrapper, config.name, sizeClass.text);
    }

    return wrapper;
  }

  private static appendInitials(
    wrapper: HTMLElement,
    name: string,
    textClass: string
  ): void {
    wrapper.className += ' bg-[var(--accent)]/20 text-[var(--accent)]';
    const initials = document.createElement('span');
    initials.className = `font-medium ${textClass}`;
    initials.textContent = name
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
    wrapper.appendChild(initials);
  }
}

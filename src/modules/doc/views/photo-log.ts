/**
 * Photo Log view.
 * Grid and list display of construction photos with date, location,
 * job stamping, and GPS coordinates.
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
// Types
// ---------------------------------------------------------------------------

interface PhotoRow {
  id: string;
  documentId: string;
  title: string;
  fileName: string;
  jobId: string;
  dateTaken: string;
  location: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  takenBy: string;
}

// ---------------------------------------------------------------------------
// Photo Grid
// ---------------------------------------------------------------------------

function buildPhotoGrid(photos: PhotoRow[]): HTMLElement {
  const wrap = el('div', 'space-y-4');

  if (photos.length === 0) {
    const empty = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-8 text-center');
    empty.appendChild(el('p', 'text-[var(--text-muted)]', 'No photos found. Add your first photo below.'));
    wrap.appendChild(empty);
    return wrap;
  }

  const grid = el('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

  for (const photo of photos) {
    const card = el('div', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg overflow-hidden');

    // Photo placeholder
    const imgPlaceholder = el('div', 'bg-[var(--surface)] h-48 flex items-center justify-center');
    imgPlaceholder.appendChild(el('span', 'text-[var(--text-muted)] text-sm', photo.fileName || 'No file'));
    card.appendChild(imgPlaceholder);

    // Photo details
    const details = el('div', 'p-3 space-y-1');
    details.appendChild(el('h3', 'font-medium text-[var(--text)] text-sm', photo.title));

    if (photo.description) {
      details.appendChild(el('p', 'text-xs text-[var(--text-muted)]', photo.description));
    }

    const metaRow = el('div', 'flex flex-wrap gap-2 text-xs text-[var(--text-muted)]');

    if (photo.dateTaken) {
      const dateTag = el('span', 'inline-flex items-center gap-1');
      dateTag.appendChild(el('span', '', 'Date:'));
      dateTag.appendChild(el('span', 'font-mono', photo.dateTaken));
      metaRow.appendChild(dateTag);
    }

    if (photo.location) {
      const locTag = el('span', 'inline-flex items-center gap-1');
      locTag.appendChild(el('span', '', 'Loc:'));
      locTag.appendChild(el('span', '', photo.location));
      metaRow.appendChild(locTag);
    }

    if (photo.jobId) {
      const jobTag = el('span', 'inline-flex items-center gap-1');
      jobTag.appendChild(el('span', '', 'Job:'));
      jobTag.appendChild(el('span', 'font-mono', photo.jobId));
      metaRow.appendChild(jobTag);
    }

    if (photo.takenBy) {
      const byTag = el('span', 'inline-flex items-center gap-1');
      byTag.appendChild(el('span', '', 'By:'));
      byTag.appendChild(el('span', '', photo.takenBy));
      metaRow.appendChild(byTag);
    }

    details.appendChild(metaRow);

    if (photo.latitude !== null && photo.longitude !== null) {
      const gps = el('p', 'text-xs text-[var(--text-muted)] font-mono',
        `GPS: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`);
      details.appendChild(gps);
    }

    card.appendChild(details);
    grid.appendChild(card);
  }

  wrap.appendChild(grid);
  return wrap;
}

// ---------------------------------------------------------------------------
// Add Photo Form
// ---------------------------------------------------------------------------

function buildAddPhotoForm(): HTMLElement {
  const form = el('form', 'bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-4 space-y-3');
  form.appendChild(el('h3', 'text-lg font-semibold text-[var(--text)]', 'Add Photo'));

  const inputCls = 'w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

  const titleGroup = el('div', 'space-y-1');
  titleGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Title'));
  const titleInput = el('input', inputCls) as HTMLInputElement;
  titleInput.type = 'text';
  titleInput.name = 'title';
  titleInput.placeholder = 'Photo title / description';
  titleInput.required = true;
  titleGroup.appendChild(titleInput);
  form.appendChild(titleGroup);

  const row1 = el('div', 'grid grid-cols-2 gap-4');

  const dateGroup = el('div', 'space-y-1');
  dateGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Date Taken'));
  const dateInput = el('input', inputCls) as HTMLInputElement;
  dateInput.type = 'date';
  dateInput.name = 'dateTaken';
  dateInput.required = true;
  dateGroup.appendChild(dateInput);
  row1.appendChild(dateGroup);

  const jobGroup = el('div', 'space-y-1');
  jobGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Job ID'));
  const jobInput = el('input', inputCls) as HTMLInputElement;
  jobInput.type = 'text';
  jobInput.name = 'jobId';
  jobInput.placeholder = 'Job reference';
  jobGroup.appendChild(jobInput);
  row1.appendChild(jobGroup);

  form.appendChild(row1);

  const row2 = el('div', 'grid grid-cols-2 gap-4');

  const locGroup = el('div', 'space-y-1');
  locGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Location'));
  const locInput = el('input', inputCls) as HTMLInputElement;
  locInput.type = 'text';
  locInput.name = 'location';
  locInput.placeholder = 'e.g., Building A, Floor 3';
  locGroup.appendChild(locInput);
  row2.appendChild(locGroup);

  const byGroup = el('div', 'space-y-1');
  byGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Taken By'));
  const byInput = el('input', inputCls) as HTMLInputElement;
  byInput.type = 'text';
  byInput.name = 'takenBy';
  byInput.placeholder = 'Photographer name';
  byGroup.appendChild(byInput);
  row2.appendChild(byGroup);

  form.appendChild(row2);

  const row3 = el('div', 'grid grid-cols-2 gap-4');

  const latGroup = el('div', 'space-y-1');
  latGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Latitude'));
  const latInput = el('input', inputCls) as HTMLInputElement;
  latInput.type = 'number';
  latInput.name = 'latitude';
  latInput.placeholder = '0.000000';
  latInput.step = '0.000001';
  latGroup.appendChild(latInput);
  row3.appendChild(latGroup);

  const lonGroup = el('div', 'space-y-1');
  lonGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Longitude'));
  const lonInput = el('input', inputCls) as HTMLInputElement;
  lonInput.type = 'number';
  lonInput.name = 'longitude';
  lonInput.placeholder = '0.000000';
  lonInput.step = '0.000001';
  lonGroup.appendChild(lonInput);
  row3.appendChild(lonGroup);

  form.appendChild(row3);

  const fileGroup = el('div', 'space-y-1');
  fileGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'File Name'));
  const fileInput = el('input', inputCls) as HTMLInputElement;
  fileInput.type = 'text';
  fileInput.name = 'fileName';
  fileInput.placeholder = 'photo.jpg';
  fileGroup.appendChild(fileInput);
  form.appendChild(fileGroup);

  const descGroup = el('div', 'space-y-1');
  descGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Description'));
  const descArea = el('textarea', inputCls) as HTMLTextAreaElement;
  descArea.name = 'description';
  descArea.rows = 2;
  descArea.placeholder = 'Describe what this photo shows';
  descGroup.appendChild(descArea);
  form.appendChild(descGroup);

  const tagsGroup = el('div', 'space-y-1');
  tagsGroup.appendChild(el('label', 'block text-sm font-medium text-[var(--text-muted)]', 'Tags (comma-separated)'));
  const tagsInput = el('input', inputCls) as HTMLInputElement;
  tagsInput.type = 'text';
  tagsInput.name = 'tags';
  tagsInput.placeholder = 'foundation, concrete, inspection';
  tagsGroup.appendChild(tagsInput);
  form.appendChild(tagsGroup);

  const submitBtn = el('button', 'px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90', 'Add Photo');
  submitBtn.type = 'submit';
  form.appendChild(submitBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    /* add photo placeholder */
  });

  return form;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default {
  render(container: HTMLElement): void {
    container.innerHTML = '';
    const wrapper = el('div', 'space-y-6');

    const headerRow = el('div', 'flex items-center justify-between mb-4');
    headerRow.appendChild(el('h1', 'text-2xl font-bold text-[var(--text)]', 'Photo Log'));
    wrapper.appendChild(headerRow);

    // Filter bar
    const bar = el('div', 'flex flex-wrap items-center gap-3 mb-4');
    const inputCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)]';

    const jobFilter = el('input', inputCls) as HTMLInputElement;
    jobFilter.type = 'text';
    jobFilter.placeholder = 'Filter by job...';
    bar.appendChild(jobFilter);

    const dateFrom = el('input', inputCls) as HTMLInputElement;
    dateFrom.type = 'date';
    dateFrom.placeholder = 'From date';
    bar.appendChild(dateFrom);

    const dateTo = el('input', inputCls) as HTMLInputElement;
    dateTo.type = 'date';
    dateTo.placeholder = 'To date';
    bar.appendChild(dateTo);

    wrapper.appendChild(bar);

    const photos: PhotoRow[] = [];
    wrapper.appendChild(buildPhotoGrid(photos));
    wrapper.appendChild(buildAddPhotoForm());

    container.appendChild(wrapper);
  },
};

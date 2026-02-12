/**
 * Phase Zed.7 - DataTable
 * Full-featured data table with sorting, filtering, pagination, and row selection.
 */

import { applySorting } from '../../../core/store/query-utils';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  format?: (value: unknown, row: T) => string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableConfig<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  pageSize?: number;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  emptyMessage?: string;
}

export class DataTable<T extends Record<string, unknown>> {
  private config: DataTableConfig<T>;
  private container: HTMLElement | null = null;
  private currentPage: number = 0;
  private sortKey: string | null = null;
  private sortDir: 'asc' | 'desc' = 'asc';
  private selectedRows: Set<number> = new Set();
  private filterText: string = '';

  constructor(config: DataTableConfig<T>) {
    this.config = config;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  updateData(data: T[]): void {
    this.config.data = data;
    this.currentPage = 0;
    this.selectedRows.clear();
    this.render();
  }

  setPage(page: number): void {
    this.currentPage = page;
    this.render();
  }

  getSelectedRows(): T[] {
    const processed = this.sortData(this.filterData(this.config.data));
    return processed.filter((_, i) => this.selectedRows.has(i));
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.className = 'flex flex-col gap-3';

    // Filter input
    if (this.config.filterable) {
      const filterWrapper = document.createElement('div');
      filterWrapper.className = 'flex items-center gap-2';

      const filterInput = document.createElement('input');
      filterInput.type = 'text';
      filterInput.placeholder = 'Filter rows...';
      filterInput.value = this.filterText;
      filterInput.className =
        'w-full max-w-xs px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';
      filterInput.addEventListener('input', () => {
        this.filterText = filterInput.value;
        this.currentPage = 0;
        this.renderTable();
        this.renderPaginationInto();
      });
      filterWrapper.appendChild(filterInput);

      if (this.config.selectable && this.selectedRows.size > 0) {
        const selCount = document.createElement('span');
        selCount.className = 'text-xs text-[var(--text-muted)]';
        selCount.textContent = `${this.selectedRows.size} selected`;
        filterWrapper.appendChild(selCount);
      }

      this.container.appendChild(filterWrapper);
    }

    // Table wrapper
    const tableWrapper = document.createElement('div');
    tableWrapper.id = 'data-table-wrapper';
    tableWrapper.className = 'overflow-x-auto rounded-lg border border-[var(--border)]';
    this.container.appendChild(tableWrapper);

    // Pagination wrapper
    const paginationWrapper = document.createElement('div');
    paginationWrapper.id = 'data-table-pagination';
    this.container.appendChild(paginationWrapper);

    this.renderTable();
    this.renderPaginationInto();
  }

  private renderTable(): void {
    const wrapper = this.container?.querySelector('#data-table-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const filtered = this.filterData(this.config.data);
    const sorted = this.sortData(filtered);
    const paginated = this.paginateData(sorted);

    const table = document.createElement('table');
    table.className = 'w-full text-sm';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'bg-[var(--surface)] border-b border-[var(--border)]';

    if (this.config.selectable) {
      const thCheck = document.createElement('th');
      thCheck.className = 'w-10 px-3 py-2';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'rounded border-[var(--border)]';
      checkbox.checked =
        paginated.length > 0 &&
        paginated.every((_, i) =>
          this.selectedRows.has(this.currentPage * (this.config.pageSize ?? 25) + i)
        );
      checkbox.addEventListener('change', () => {
        const offset = this.currentPage * (this.config.pageSize ?? 25);
        paginated.forEach((_, i) => {
          if (checkbox.checked) {
            this.selectedRows.add(offset + i);
          } else {
            this.selectedRows.delete(offset + i);
          }
        });
        this.renderTable();
      });
      thCheck.appendChild(checkbox);
      headerRow.appendChild(thCheck);
    }

    for (const col of this.config.columns) {
      const th = document.createElement('th');
      const alignClass =
        col.align === 'right'
          ? 'text-right'
          : col.align === 'center'
            ? 'text-center'
            : 'text-left';
      th.className = `px-3 py-2 font-medium text-[var(--text-muted)] ${alignClass} select-none`;
      if (col.width) th.style.width = col.width;

      const canSort =
        col.sortable ?? this.config.sortable ?? false;

      if (canSort) {
        th.className += ' cursor-pointer hover:text-[var(--text)]';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'inline-flex items-center gap-1';
        labelSpan.textContent = col.label;

        if (this.sortKey === col.key) {
          const arrow = document.createElement('span');
          arrow.className = 'text-[var(--accent)]';
          arrow.textContent = this.sortDir === 'asc' ? ' \u2191' : ' \u2193';
          labelSpan.appendChild(arrow);
        }

        th.appendChild(labelSpan);
        th.addEventListener('click', () => {
          if (this.sortKey === col.key) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            this.sortKey = col.key;
            this.sortDir = 'asc';
          }
          this.config.onSort?.(this.sortKey, this.sortDir);
          this.renderTable();
        });
      } else {
        th.textContent = col.label;
      }

      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    if (paginated.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      const colSpan =
        this.config.columns.length + (this.config.selectable ? 1 : 0);
      emptyCell.colSpan = colSpan;
      emptyCell.className =
        'px-3 py-8 text-center text-[var(--text-muted)]';
      emptyCell.textContent =
        this.config.emptyMessage ?? 'No data available';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      const offset = this.currentPage * (this.config.pageSize ?? 25);
      paginated.forEach((row, localIdx) => {
        const globalIdx = offset + localIdx;
        const tr = document.createElement('tr');
        tr.className =
          'border-b border-[var(--border)] hover:bg-[var(--surface)]/50 transition-colors';

        if (this.config.onRowClick) {
          tr.className += ' cursor-pointer';
          tr.addEventListener('click', (e) => {
            // Don't trigger row click on checkbox click
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            this.config.onRowClick?.(row);
          });
        }

        if (this.config.selectable) {
          const tdCheck = document.createElement('td');
          tdCheck.className = 'w-10 px-3 py-2';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'rounded border-[var(--border)]';
          checkbox.checked = this.selectedRows.has(globalIdx);
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              this.selectedRows.add(globalIdx);
            } else {
              this.selectedRows.delete(globalIdx);
            }
          });
          tdCheck.appendChild(checkbox);
          tr.appendChild(tdCheck);
        }

        for (const col of this.config.columns) {
          const td = document.createElement('td');
          const alignClass =
            col.align === 'right'
              ? 'text-right'
              : col.align === 'center'
                ? 'text-center'
                : 'text-left';
          td.className = `px-3 py-2 text-[var(--text)] ${alignClass}`;

          const rawValue = row[col.key];
          td.textContent = col.format
            ? col.format(rawValue, row)
            : String(rawValue ?? '');

          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
  }

  private renderPaginationInto(): void {
    const paginationEl = this.container?.querySelector(
      '#data-table-pagination'
    );
    if (!paginationEl) return;
    paginationEl.innerHTML = '';

    const pageSize = this.config.pageSize ?? 25;
    const filtered = this.filterData(this.config.data);
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) return;

    const nav = document.createElement('div');
    nav.className =
      'flex items-center justify-between text-sm text-[var(--text-muted)]';

    const info = document.createElement('span');
    const start = this.currentPage * pageSize + 1;
    const end = Math.min((this.currentPage + 1) * pageSize, totalItems);
    info.textContent = `${start}-${end} of ${totalItems}`;
    nav.appendChild(info);

    const buttons = document.createElement('div');
    buttons.className = 'flex items-center gap-1';

    // Previous
    const prevBtn = document.createElement('button');
    prevBtn.className =
      'px-2 py-1 rounded-md btn-ghost disabled:opacity-30';
    prevBtn.textContent = '\u2190';
    prevBtn.disabled = this.currentPage === 0;
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.renderTable();
        this.renderPaginationInto();
      }
    });
    buttons.appendChild(prevBtn);

    // Page numbers (show max 5)
    const startPage = Math.max(0, this.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 5);
    for (let i = startPage; i < endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `px-2 py-1 rounded-md ${
        i === this.currentPage
          ? 'bg-[var(--accent)] text-white'
          : 'btn-ghost'
      }`;
      pageBtn.textContent = String(i + 1);
      pageBtn.addEventListener('click', () => {
        this.currentPage = i;
        this.renderTable();
        this.renderPaginationInto();
      });
      buttons.appendChild(pageBtn);
    }

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.className =
      'px-2 py-1 rounded-md btn-ghost disabled:opacity-30';
    nextBtn.textContent = '\u2192';
    nextBtn.disabled = this.currentPage >= totalPages - 1;
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < totalPages - 1) {
        this.currentPage++;
        this.renderTable();
        this.renderPaginationInto();
      }
    });
    buttons.appendChild(nextBtn);

    nav.appendChild(buttons);
    paginationEl.appendChild(nav);
  }

  private sortData(data: T[]): T[] {
    if (!this.sortKey) return data;
    return applySorting(data, [{ field: this.sortKey, direction: this.sortDir }]) as T[];
  }

  private filterData(data: T[]): T[] {
    if (!this.filterText) return data;
    const lower = this.filterText.toLowerCase();
    return data.filter((row) =>
      this.config.columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(lower);
      })
    );
  }

  private paginateData(data: T[]): T[] {
    const pageSize = this.config.pageSize ?? 25;
    const start = this.currentPage * pageSize;
    return data.slice(start, start + pageSize);
  }
}

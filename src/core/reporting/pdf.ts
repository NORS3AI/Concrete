/**
 * Concrete -- PDF Generator
 * Phase Zed.11 Reporting & PDF Engine
 *
 * Generates PDF documents from report results. Uses a built-in
 * text-based PDF renderer that creates valid PDF 1.4 files without
 * external dependencies. Supports:
 *   - Company header, report title, and date
 *   - Tabular data with column headers
 *   - Automatic pagination
 *   - Portrait and landscape orientations
 *   - Letter and A4 page sizes
 */

import type { ReportResult, PdfTemplate, ReportColumn } from '../types/reporting';

// ---------------------------------------------------------------------------
// PDF Constants (points: 1pt = 1/72 inch)
// ---------------------------------------------------------------------------

interface PageDimensions {
  width: number;
  height: number;
}

const PAGE_SIZES: Record<string, PageDimensions> = {
  letter:  { width: 612, height: 792 },
  a4:      { width: 595, height: 842 },
  legal:   { width: 612, height: 1008 },
  tabloid: { width: 792, height: 1224 },
};

const DEFAULT_FONT_SIZE = 9;
const HEADER_FONT_SIZE = 14;
const SUB_HEADER_FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const CELL_PADDING = 4;
const TABLE_HEADER_HEIGHT = 18;

// ---------------------------------------------------------------------------
// PdfGenerator
// ---------------------------------------------------------------------------

export class PdfGenerator {

  // -----------------------------------------------------------------------
  // Generate PDF from report result
  // -----------------------------------------------------------------------

  async generateReport(result: ReportResult, template?: PdfTemplate): Promise<Blob> {
    const orientation = template?.orientation ?? 'portrait';
    const pageSizeKey = template?.pageSize ?? 'letter';
    const baseSize = PAGE_SIZES[pageSizeKey] ?? PAGE_SIZES['letter'];

    const page: PageDimensions = orientation === 'landscape'
      ? { width: baseSize.height, height: baseSize.width }
      : { ...baseSize };

    const margins = template?.margins ?? { top: 50, right: 40, bottom: 50, left: 40 };
    const contentWidth = page.width - margins.left - margins.right;

    const columns = result.definition.columns;
    const columnWidths = this.calculateColumnWidths(columns, contentWidth);

    // Build PDF content
    const objects: string[] = [];
    const pageRefs: number[] = [];
    let objectCounter = 0;

    const addObject = (content: string): number => {
      objectCounter++;
      objects.push(content);
      return objectCounter;
    };

    // Object 1: Catalog (placeholder, will reference page tree)
    addObject(''); // placeholder
    // Object 2: Page tree (placeholder)
    addObject(''); // placeholder

    // Object 3: Font (Helvetica)
    const fontObjId = addObject(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
    );

    // Object 4: Bold font
    const boldFontObjId = addObject(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`
    );

    // Generate pages
    const rows = result.data;
    let rowIndex = 0;
    let pageNumber = 0;
    const streamContents: string[] = [];

    while (rowIndex <= rows.length) {
      pageNumber++;
      let y = page.height - margins.top;
      const lines: string[] = [];

      // Header on each page
      if (template?.header) {
        lines.push(`BT /F2 ${HEADER_FONT_SIZE} Tf ${margins.left} ${y} Td (${this.escPdf(template.header)}) Tj ET`);
        y -= HEADER_FONT_SIZE + 6;
      }

      // Report title
      lines.push(`BT /F2 ${HEADER_FONT_SIZE} Tf ${margins.left} ${y} Td (${this.escPdf(result.definition.title)}) Tj ET`);
      y -= HEADER_FONT_SIZE + 4;

      // Subtitle
      if (result.definition.subtitle) {
        lines.push(`BT /F1 ${SUB_HEADER_FONT_SIZE} Tf ${margins.left} ${y} Td (${this.escPdf(result.definition.subtitle)}) Tj ET`);
        y -= SUB_HEADER_FONT_SIZE + 4;
      }

      // Date line
      const genDate = result.metadata['generatedAt'] as string ?? new Date().toISOString();
      lines.push(`BT /F1 8 Tf ${margins.left} ${y} Td (Generated: ${this.escPdf(this.formatDate(genDate))} | ${result.data.length} records) Tj ET`);
      y -= 16;

      // Horizontal rule
      lines.push(`${margins.left} ${y} m ${margins.left + contentWidth} ${y} l S`);
      y -= 8;

      // Table header
      lines.push(...this.renderTableHeader(columns, columnWidths, margins.left, y, boldFontObjId));
      y -= TABLE_HEADER_HEIGHT;

      // Table header underline
      lines.push(`${margins.left} ${y} m ${margins.left + contentWidth} ${y} l S`);
      y -= 4;

      // Table rows
      const minY = margins.bottom + 30; // Reserve space for footer

      while (rowIndex < rows.length && y > minY) {
        const row = rows[rowIndex];
        lines.push(...this.renderTableRow(row, columns, columnWidths, margins.left, y));
        y -= LINE_HEIGHT;
        rowIndex++;
      }

      // Totals row (on last page)
      if (rowIndex >= rows.length && result.totals && y > minY) {
        y -= 4;
        lines.push(`${margins.left} ${y + LINE_HEIGHT - 2} m ${margins.left + contentWidth} ${y + LINE_HEIGHT - 2} l S`);
        lines.push(...this.renderTotalsRow(result.totals, columns, columnWidths, margins.left, y));
        y -= LINE_HEIGHT;
      }

      // Footer
      const footerText = template?.footer
        ? `${template.footer} | Page ${pageNumber}`
        : `Concrete Construction Platform | ${result.definition.title} | Page ${pageNumber}`;
      lines.push(`BT /F1 7 Tf ${margins.left} ${margins.bottom - 10} Td (${this.escPdf(footerText)}) Tj ET`);

      streamContents.push(lines.join('\n'));

      // Break if all rows have been rendered
      if (rowIndex >= rows.length) break;
    }

    // Create page objects
    for (const content of streamContents) {
      // Stream object
      const streamObjId = addObject(
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
      );

      // Page object
      const pageObjId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
        `/Contents ${streamObjId} 0 R ` +
        `/Resources << /Font << /F1 ${fontObjId} 0 R /F2 ${boldFontObjId} 0 R >> >> >>`
      );
      pageRefs.push(pageObjId);
    }

    // Fix up catalog and page tree
    objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((r) => `${r} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;

    // Build the final PDF
    const pdf = this.buildPdf(objects);
    return new Blob([pdf], { type: 'application/pdf' });
  }

  // -----------------------------------------------------------------------
  // Generate PDF from HTML element (simplified text extraction)
  // -----------------------------------------------------------------------

  async generateFromHTML(
    element: HTMLElement,
    options?: { orientation?: 'portrait' | 'landscape'; pageSize?: string }
  ): Promise<Blob> {
    const orientation = options?.orientation ?? 'portrait';
    const pageSizeKey = options?.pageSize ?? 'letter';
    const baseSize = PAGE_SIZES[pageSizeKey] ?? PAGE_SIZES['letter'];

    const page: PageDimensions = orientation === 'landscape'
      ? { width: baseSize.height, height: baseSize.width }
      : { ...baseSize };

    const margins = { top: 50, right: 40, bottom: 50, left: 40 };

    // Extract text content from the HTML element
    const textContent = element.textContent ?? '';
    const textLines = this.wrapText(textContent, page.width - margins.left - margins.right, DEFAULT_FONT_SIZE);

    // Build PDF
    const objects: string[] = [];
    let objectCounter = 0;

    const addObject = (content: string): number => {
      objectCounter++;
      objects.push(content);
      return objectCounter;
    };

    addObject(''); // catalog placeholder
    addObject(''); // page tree placeholder

    const fontObjId = addObject(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
    );

    const pageRefs: number[] = [];
    let lineIndex = 0;
    let pageNumber = 0;
    const linesPerPage = Math.floor((page.height - margins.top - margins.bottom) / LINE_HEIGHT);

    while (lineIndex < textLines.length || pageNumber === 0) {
      pageNumber++;
      const pageLines: string[] = [];
      let y = page.height - margins.top;
      let linesOnPage = 0;

      while (lineIndex < textLines.length && linesOnPage < linesPerPage) {
        const line = textLines[lineIndex];
        pageLines.push(
          `BT /F1 ${DEFAULT_FONT_SIZE} Tf ${margins.left} ${y} Td (${this.escPdf(line)}) Tj ET`
        );
        y -= LINE_HEIGHT;
        lineIndex++;
        linesOnPage++;
      }

      // Footer
      pageLines.push(
        `BT /F1 7 Tf ${margins.left} ${margins.bottom - 10} Td (Page ${pageNumber}) Tj ET`
      );

      const content = pageLines.join('\n');
      const streamObjId = addObject(
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
      );

      const pageObjId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
        `/Contents ${streamObjId} 0 R ` +
        `/Resources << /Font << /F1 ${fontObjId} 0 R >> >> >>`
      );
      pageRefs.push(pageObjId);

      if (lineIndex >= textLines.length) break;
    }

    objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((r) => `${r} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;

    const pdf = this.buildPdf(objects);
    return new Blob([pdf], { type: 'application/pdf' });
  }

  // -----------------------------------------------------------------------
  // Private: PDF rendering helpers
  // -----------------------------------------------------------------------

  private renderTableHeader(
    columns: ReportColumn[],
    widths: number[],
    startX: number,
    y: number,
    _boldFontId: number
  ): string[] {
    const lines: string[] = [];
    let x = startX;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const text = this.truncateText(col.label, widths[i], SUB_HEADER_FONT_SIZE);
      const textX = this.alignText(text, x, widths[i], col.align ?? 'left', SUB_HEADER_FONT_SIZE);
      lines.push(`BT /F2 ${SUB_HEADER_FONT_SIZE} Tf ${textX} ${y} Td (${this.escPdf(text)}) Tj ET`);
      x += widths[i];
    }

    return lines;
  }

  private renderTableRow(
    record: Record<string, unknown>,
    columns: ReportColumn[],
    widths: number[],
    startX: number,
    y: number
  ): string[] {
    const lines: string[] = [];
    let x = startX;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const rawValue = record[col.field];
      const formatted = this.formatCellValue(rawValue, col);
      const text = this.truncateText(formatted, widths[i], DEFAULT_FONT_SIZE);
      const textX = this.alignText(text, x, widths[i], col.align ?? 'left', DEFAULT_FONT_SIZE);
      lines.push(`BT /F1 ${DEFAULT_FONT_SIZE} Tf ${textX} ${y} Td (${this.escPdf(text)}) Tj ET`);
      x += widths[i];
    }

    return lines;
  }

  private renderTotalsRow(
    totals: Record<string, unknown>,
    columns: ReportColumn[],
    widths: number[],
    startX: number,
    y: number
  ): string[] {
    const lines: string[] = [];
    let x = startX;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      let text = '';

      if (i === 0 && !(col.field in totals)) {
        text = 'TOTALS';
      } else if (col.field in totals) {
        text = this.formatCellValue(totals[col.field], col);
      }

      if (text) {
        const truncated = this.truncateText(text, widths[i], DEFAULT_FONT_SIZE);
        const textX = this.alignText(truncated, x, widths[i], col.align ?? 'left', DEFAULT_FONT_SIZE);
        lines.push(`BT /F2 ${DEFAULT_FONT_SIZE} Tf ${textX} ${y} Td (${this.escPdf(truncated)}) Tj ET`);
      }
      x += widths[i];
    }

    return lines;
  }

  // -----------------------------------------------------------------------
  // Private: Column width calculation
  // -----------------------------------------------------------------------

  private calculateColumnWidths(columns: ReportColumn[], totalWidth: number): number[] {
    const widths: number[] = [];
    let fixedWidth = 0;
    let flexCount = 0;

    for (const col of columns) {
      if (col.width) {
        widths.push(col.width);
        fixedWidth += col.width;
      } else {
        widths.push(0); // placeholder
        flexCount++;
      }
    }

    // Distribute remaining width to flex columns
    const remainingWidth = totalWidth - fixedWidth;
    const flexWidth = flexCount > 0 ? remainingWidth / flexCount : 0;

    for (let i = 0; i < widths.length; i++) {
      if (widths[i] === 0) {
        widths[i] = Math.max(flexWidth, 40); // minimum 40pt
      }
    }

    return widths;
  }

  // -----------------------------------------------------------------------
  // Private: Text formatting
  // -----------------------------------------------------------------------

  private formatCellValue(value: unknown, column: ReportColumn): string {
    if (value === null || value === undefined) return '';

    switch (column.format) {
      case 'currency': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        const sign = num < 0 ? '-' : '';
        return `${sign}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      case 'percentage': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return `${(num * 100).toFixed(1)}%`;
      }
      case 'date':
        return this.formatDate(String(value));
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) return String(value);
        return num.toLocaleString('en-US');
      }
      default:
        return String(value);
    }
  }

  private formatDate(value: string): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return value;
    }
  }

  /**
   * Escape special PDF string characters.
   */
  private escPdf(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '')
      .replace(/\n/g, ' ');
  }

  /**
   * Truncate text to fit within a given width (approximate).
   */
  private truncateText(text: string, width: number, fontSize: number): string {
    // Approximate: average character width ~ 0.5 * fontSize
    const charWidth = fontSize * 0.5;
    const maxChars = Math.floor((width - CELL_PADDING * 2) / charWidth);
    if (text.length <= maxChars) return text;
    return text.slice(0, Math.max(maxChars - 2, 1)) + '..';
  }

  /**
   * Calculate X position for text alignment within a cell.
   */
  private alignText(
    text: string,
    cellX: number,
    cellWidth: number,
    align: 'left' | 'center' | 'right',
    fontSize: number
  ): number {
    const charWidth = fontSize * 0.5;
    const textWidth = text.length * charWidth;

    switch (align) {
      case 'right':
        return cellX + cellWidth - textWidth - CELL_PADDING;
      case 'center':
        return cellX + (cellWidth - textWidth) / 2;
      case 'left':
      default:
        return cellX + CELL_PADDING;
    }
  }

  /**
   * Wrap text into lines that fit a given width.
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const charWidth = fontSize * 0.5;
    const maxChars = Math.floor(maxWidth / charWidth);
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.length > 0 ? lines : [''];
  }

  // -----------------------------------------------------------------------
  // Private: PDF file assembly
  // -----------------------------------------------------------------------

  /**
   * Build a valid PDF 1.4 file from an array of object bodies.
   * Objects are 1-indexed (objects[0] = object 1).
   */
  private buildPdf(objects: string[]): string {
    const lines: string[] = [];
    const offsets: number[] = [];
    let offset = 0;

    const addLine = (line: string): void => {
      lines.push(line);
      offset += line.length + 1; // +1 for newline
    };

    // Header
    addLine('%PDF-1.4');
    addLine('%\xE2\xE3\xCF\xD3'); // binary marker

    // Objects
    for (let i = 0; i < objects.length; i++) {
      offsets.push(offset);
      addLine(`${i + 1} 0 obj`);
      addLine(objects[i]);
      addLine('endobj');
    }

    // Cross-reference table
    const xrefOffset = offset;
    addLine('xref');
    addLine(`0 ${objects.length + 1}`);
    addLine('0000000000 65535 f ');

    for (const off of offsets) {
      addLine(`${String(off).padStart(10, '0')} 00000 n `);
    }

    // Trailer
    addLine('trailer');
    addLine(`<< /Size ${objects.length + 1} /Root 1 0 R >>`);
    addLine('startxref');
    addLine(String(xrefOffset));
    addLine('%%EOF');

    return lines.join('\n');
  }
}

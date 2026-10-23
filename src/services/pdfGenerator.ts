/**
 * src/services/pdfGenerator.ts
 *
 * Deterministic Pure-TypeScript Binary PDF 1.4 Compiler for Hijin AI Workstation.
 * Generates genuine, Adobe Acrobat-compliant, multi-page binary PDF deliverables
 * with zero external dependencies and 100% offline air-gapped security.
 *
 * Features:
 * - Valid PDF 1.4 binary structure (%PDF-1.4, xref table, trailer, /Catalog, /Pages)
 * - Professional financial typography (Helvetica, Helvetica-Bold, Helvetica-Oblique)
 * - Multi-page pagination with running headers and dynamic "Page X of Y" footers
 * - Financial tables with repeated column headers across page breaks
 * - Status pills, audit variance callout boxes, and right-aligned tabular currency numbers
 * - Text wrapping and automatic line breaking to prevent clipping
 */

export interface PdfTableColumn {
  header: string;
  width?: number; // points (total available is ~532pt on 612pt Letter)
  align?: 'left' | 'center' | 'right';
}

export interface PdfTableData {
  title?: string;
  columns: PdfTableColumn[];
  rows: string[][];
}

export interface PdfCalloutBox {
  type: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  text: string;
}

export interface PdfSection {
  heading?: string;
  subheading?: string;
  paragraphs?: string[];
  bullets?: string[];
  callouts?: PdfCalloutBox[];
  table?: PdfTableData;
}

export interface PdfReportSpec {
  title: string;
  subtitle?: string;
  metadata?: {
    organization?: string;
    generatedAt?: string;
    workspace?: string;
    confidentiality?: string;
  };
  sections: PdfSection[];
}

// -----------------------------------------------------------------------------
// PDF 1.4 Binary Builder
// -----------------------------------------------------------------------------

class Pdf14Document {
  private objects: string[] = [];
  private offsets: number[] = [];
  private currentBuffer: string = '';

  // Page tracking
  private pageObjectIds: number[] = [];
  private fontRegularId: number = 0;
  private fontBoldId: number = 0;
  private fontObliqueId: number = 0;
  private catalogId: number = 0;
  private pagesRootId: number = 0;

  constructor() {
    this.currentBuffer = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  }

  public allocateId(): number {
    this.objects.push('');
    return this.objects.length; // 1-based index
  }

  public setObject(id: number, content: string): void {
    this.objects[id - 1] = content;
  }

  public createStream(content: string): string {
    const len = content.length;
    return `<< /Length ${len} >>\nstream\n${content}\nendstream`;
  }

  public buildBinary(): Uint8Array {
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [0];

    for (let i = 0; i < this.objects.length; i++) {
      const objId = i + 1;
      offsets.push(out.length);
      out += `${objId} 0 obj\n${this.objects[i]}\nendobj\n`;
    }

    const startXref = out.length;
    out += `xref\n0 ${this.objects.length + 1}\n`;
    out += '0000000000 65535 f \n';
    for (let i = 1; i <= this.objects.length; i++) {
      const off = offsets[i].toString().padStart(10, '0');
      out += `${off} 00000 n \n`;
    }

    out += `trailer\n<< /Size ${this.objects.length + 1} /Root ${this.catalogId} 0 R >>\n`;
    out += `startxref\n${startXref}\n%%EOF\n`;

    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) {
      bytes[i] = out.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
}

// -----------------------------------------------------------------------------
// Layout & Drawing Engine (Letter 8.5 x 11 in = 612 x 792 pt)
// -----------------------------------------------------------------------------

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 45;
const MARGIN_BOTTOM = 45;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 532 pt

interface DrawPage {
  commands: string[];
}

export class PureBinaryPdfCompiler {
  private pages: DrawPage[] = [];
  private currentPageIdx: number = 0;
  private cursorY: number = PAGE_HEIGHT - MARGIN_TOP;

  constructor() {
    this.addNewPage();
  }

  private addNewPage(): void {
    this.pages.push({ commands: [] });
    this.currentPageIdx = this.pages.length - 1;
    this.cursorY = PAGE_HEIGHT - MARGIN_TOP;
  }

  private ensureSpace(requiredHeight: number): void {
    if (this.cursorY - requiredHeight < MARGIN_BOTTOM) {
      this.addNewPage();
    }
  }

  private escapePdfText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n]+/g, ' ');
  }

  /**
   * Approximate character width for Helvetica
   */
  private getTextWidth(text: string, fontSize: number): number {
    return text.length * fontSize * 0.52;
  }

  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (this.getTextWidth(testLine, fontSize) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  }

  public compileReport(spec: PdfReportSpec): Uint8Array {
    // 1. Title Banner
    this.renderHeaderBanner(spec);

    // 2. Sections
    for (const section of spec.sections) {
      this.renderSection(section);
    }

    // 3. Render Running Headers and Footers on all pages
    this.renderRunningDecorations(spec);

    // 4. Assemble standard PDF 1.4 object structure
    const doc = new Pdf14Document();

    const catalogId = doc.allocateId();
    const pagesRootId = doc.allocateId();
    const fontRegularId = doc.allocateId();
    const fontBoldId = doc.allocateId();
    const fontObliqueId = doc.allocateId();

    doc.setObject(
      catalogId,
      `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`
    );

    doc.setObject(
      fontRegularId,
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
    );

    doc.setObject(
      fontBoldId,
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
    );

    doc.setObject(
      fontObliqueId,
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`
    );

    const pageObjIds: number[] = [];

    for (const p of this.pages) {
      const pageId = doc.allocateId();
      const contentId = doc.allocateId();
      pageObjIds.push(pageId);

      const contentStream = p.commands.join('\n');
      doc.setObject(contentId, doc.createStream(contentStream));

      doc.setObject(
        pageId,
        `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontObliqueId} 0 R >> >> >>`
      );
    }

    doc.setObject(
      pagesRootId,
      `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`
    );

    // Set Root reference
    (doc as any).catalogId = catalogId;

    return doc.buildBinary();
  }

  public compileReportToBlob(spec: PdfReportSpec): Blob {
    const bytes = this.compileReport(spec);
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  }

  // ---------------------------------------------------------------------------
  // Rendering Components
  // ---------------------------------------------------------------------------

  private renderHeaderBanner(spec: PdfReportSpec): void {
    const cur = this.pages[this.currentPageIdx].commands;

    // Header container background
    const bannerHeight = 85;
    this.ensureSpace(bannerHeight + 15);

    // Background accent bar
    cur.push('q');
    cur.push('0.06 0.09 0.16 rg'); // Deep slate navy (#0f172a)
    cur.push(`${MARGIN_LEFT} ${this.cursorY - bannerHeight} ${CONTENT_WIDTH} ${bannerHeight} re f`);

    // Top accent border
    cur.push('0.39 0.40 0.95 rg'); // Indigo 500
    cur.push(`${MARGIN_LEFT} ${this.cursorY - 3} ${CONTENT_WIDTH} 3 re f`);

    // Document Title
    cur.push('BT');
    cur.push('/F2 16 Tf');
    cur.push('1 1 1 rg'); // White
    cur.push(`${MARGIN_LEFT + 16} ${this.cursorY - 26} Td`);
    cur.push(`(${this.escapePdfText(spec.title)}) Tj`);
    cur.push('ET');

    // Subtitle
    if (spec.subtitle) {
      cur.push('BT');
      cur.push('/F1 9.5 Tf');
      cur.push('0.79 0.83 0.90 rg'); // Slate 300
      cur.push(`${MARGIN_LEFT + 16} ${this.cursorY - 42} Td`);
      cur.push(`(${this.escapePdfText(spec.subtitle)}) Tj`);
      cur.push('ET');
    }

    // Metadata line (Generated, Workspace, Seal)
    const metaParts = [];
    if (spec.metadata?.generatedAt) metaParts.push(`Generated: ${spec.metadata.generatedAt}`);
    if (spec.metadata?.workspace) metaParts.push(`Workspace: ${spec.metadata.workspace}`);
    metaParts.push('Engine: Hijin Autonomous 28-Digit Decimal');
    metaParts.push('Status: 100% Offline Air-Gapped');

    cur.push('BT');
    cur.push('/F3 8 Tf');
    cur.push('0.58 0.64 0.72 rg'); // Slate 400
    cur.push(`${MARGIN_LEFT + 16} ${this.cursorY - 68} Td`);
    cur.push(`(${this.escapePdfText(metaParts.join('  |  '))}) Tj`);
    cur.push('ET');

    cur.push('Q');
    this.cursorY -= bannerHeight + 18;
  }

  private renderSection(sec: PdfSection): void {
    const cur = this.pages[this.currentPageIdx].commands;

    // Heading (H1)
    if (sec.heading) {
      this.ensureSpace(32);
      cur.push('q');
      // Section accent indicator
      cur.push('0.25 0.35 0.85 rg');
      cur.push(`${MARGIN_LEFT} ${this.cursorY - 14} 3 14 re f`);

      cur.push('BT');
      cur.push('/F2 12.5 Tf');
      cur.push('0.09 0.13 0.24 rg'); // Dark slate
      cur.push(`${MARGIN_LEFT + 8} ${this.cursorY - 12} Td`);
      cur.push(`(${this.escapePdfText(sec.heading)}) Tj`);
      cur.push('ET');
      cur.push('Q');
      this.cursorY -= 22;
    }

    // Subheading (H2)
    if (sec.subheading) {
      this.ensureSpace(22);
      cur.push('BT');
      cur.push('/F2 10 Tf');
      cur.push('0.20 0.25 0.35 rg');
      cur.push(`${MARGIN_LEFT} ${this.cursorY - 10} Td`);
      cur.push(`(${this.escapePdfText(sec.subheading)}) Tj`);
      cur.push('ET');
      this.cursorY -= 16;
    }

    // Paragraphs
    if (sec.paragraphs) {
      for (const p of sec.paragraphs) {
        if (!p.trim()) continue;
        const lines = this.wrapText(p, CONTENT_WIDTH, 9);
        const height = lines.length * 13 + 6;
        this.ensureSpace(height);

        const activeCur = this.pages[this.currentPageIdx].commands;
        activeCur.push('BT');
        activeCur.push('/F1 9 Tf');
        activeCur.push('0.15 0.18 0.25 rg');
        let y = this.cursorY - 9;
        for (const line of lines) {
          activeCur.push(`1 0 0 1 ${MARGIN_LEFT} ${y} Tm`);
          activeCur.push(`(${this.escapePdfText(line)}) Tj`);
          y -= 13;
        }
        activeCur.push('ET');
        this.cursorY -= height;
      }
    }

    // Callouts
    if (sec.callouts) {
      for (const c of sec.callouts) {
        this.renderCallout(c);
      }
    }

    // Bullets
    if (sec.bullets && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        const lines = this.wrapText(b, CONTENT_WIDTH - 14, 9);
        const height = lines.length * 13 + 4;
        this.ensureSpace(height);

        const activeCur = this.pages[this.currentPageIdx].commands;
        activeCur.push('q');
        activeCur.push('0.30 0.35 0.50 rg');
        activeCur.push(`${MARGIN_LEFT + 3} ${this.cursorY - 7} 3 3 re f`); // Bullet square
        activeCur.push('Q');

        activeCur.push('BT');
        activeCur.push('/F1 9 Tf');
        activeCur.push('0.15 0.18 0.25 rg');
        let y = this.cursorY - 9;
        for (const line of lines) {
          activeCur.push(`1 0 0 1 ${MARGIN_LEFT + 14} ${y} Tm`);
          activeCur.push(`(${this.escapePdfText(line)}) Tj`);
          y -= 13;
        }
        activeCur.push('ET');
        this.cursorY -= height;
      }
      this.cursorY -= 4;
    }

    // Table
    if (sec.table && sec.table.rows.length > 0) {
      this.renderTable(sec.table);
    }

    this.cursorY -= 10;
  }

  private renderCallout(callout: PdfCalloutBox): void {
    const lines = this.wrapText(callout.text, CONTENT_WIDTH - 24, 8.5);
    const boxHeight = lines.length * 12 + (callout.title ? 24 : 16);
    this.ensureSpace(boxHeight + 8);

    const cur = this.pages[this.currentPageIdx].commands;
    cur.push('q');

    // Colors by type
    let bg = '0.96 0.97 0.99 rg';
    let border = '0.78 0.82 0.90 RG';
    let bar = '0.35 0.40 0.60 rg';
    let titleColor = '0.15 0.20 0.35 rg';

    if (callout.type === 'danger' || callout.type === 'warning') {
      bg = '0.99 0.95 0.95 rg';
      border = '0.95 0.75 0.75 RG';
      bar = '0.85 0.20 0.20 rg';
      titleColor = '0.70 0.10 0.10 rg';
    } else if (callout.type === 'success') {
      bg = '0.95 0.99 0.96 rg';
      border = '0.75 0.90 0.80 RG';
      bar = '0.15 0.65 0.30 rg';
      titleColor = '0.10 0.50 0.20 rg';
    }

    // Box background and border
    cur.push(bg);
    cur.push(`${MARGIN_LEFT} ${this.cursorY - boxHeight} ${CONTENT_WIDTH} ${boxHeight} re f`);
    cur.push(border);
    cur.push('0.5 w');
    cur.push(`${MARGIN_LEFT} ${this.cursorY - boxHeight} ${CONTENT_WIDTH} ${boxHeight} re s`);

    // Left accent bar
    cur.push(bar);
    cur.push(`${MARGIN_LEFT} ${this.cursorY - boxHeight} 3.5 ${boxHeight} re f`);

    // Title if present
    let textY = this.cursorY - 14;
    if (callout.title) {
      cur.push('BT');
      cur.push('/F2 9 Tf');
      cur.push(titleColor);
      cur.push(`${MARGIN_LEFT + 12} ${textY} Td`);
      cur.push(`(${this.escapePdfText(callout.title)}) Tj`);
      cur.push('ET');
      textY -= 14;
    }

    // Text content
    cur.push('BT');
    cur.push('/F1 8.5 Tf');
    cur.push('0.15 0.18 0.25 rg');
    for (const l of lines) {
      cur.push(`1 0 0 1 ${MARGIN_LEFT + 12} ${textY} Tm`);
      cur.push(`(${this.escapePdfText(l)}) Tj`);
      textY -= 12;
    }
    cur.push('ET');

    cur.push('Q');
    this.cursorY -= boxHeight + 8;
  }

  private renderTable(table: PdfTableData): void {
    if (!table.columns || table.columns.length === 0) return;

    // Distribute column widths
    const colCount = table.columns.length;
    let explicitWidthSum = table.columns.reduce((acc, c) => acc + (c.width || 0), 0);
    const unassignedCount = table.columns.filter((c) => !c.width).length;
    const remainingWidth = Math.max(CONTENT_WIDTH - explicitWidthSum, 50);
    const defaultColWidth = unassignedCount > 0 ? remainingWidth / unassignedCount : CONTENT_WIDTH / colCount;

    const widths = table.columns.map((c) => c.width || defaultColWidth);

    // Normalize so sum equals CONTENT_WIDTH
    const totalW = widths.reduce((a, b) => a + b, 0);
    const normalizedWidths = widths.map((w) => (w / totalW) * CONTENT_WIDTH);

    const rowHeight = 18;
    const headerHeight = 22;

    // Table title if present
    if (table.title) {
      this.ensureSpace(20);
      const cur = this.pages[this.currentPageIdx].commands;
      cur.push('BT');
      cur.push('/F2 9.5 Tf');
      cur.push('0.20 0.25 0.40 rg');
      cur.push(`${MARGIN_LEFT} ${this.cursorY - 10} Td`);
      cur.push(`(${this.escapePdfText(table.title)}) Tj`);
      cur.push('ET');
      this.cursorY -= 16;
    }

    const drawHeader = () => {
      const cur = this.pages[this.currentPageIdx].commands;
      cur.push('q');
      // Header background
      cur.push('0.12 0.16 0.26 rg'); // Slate 800
      cur.push(`${MARGIN_LEFT} ${this.cursorY - headerHeight} ${CONTENT_WIDTH} ${headerHeight} re f`);

      let currentX = MARGIN_LEFT;
      for (let i = 0; i < colCount; i++) {
        const col = table.columns[i];
        const w = normalizedWidths[i];
        const align = col.align || 'left';
        const txt = this.escapePdfText(col.header);

        cur.push('BT');
        cur.push('/F2 8 Tf');
        cur.push('1 1 1 rg'); // White text

        let textX = currentX + 6;
        if (align === 'right') {
          const tw = this.getTextWidth(col.header, 8);
          textX = currentX + w - tw - 6;
        } else if (align === 'center') {
          const tw = this.getTextWidth(col.header, 8);
          textX = currentX + (w - tw) / 2;
        }

        cur.push(`${textX} ${this.cursorY - 14} Td`);
        cur.push(`(${txt}) Tj`);
        cur.push('ET');

        currentX += w;
      }
      cur.push('Q');
      this.cursorY -= headerHeight;
    };

    // Ensure space for at least header + 2 rows
    this.ensureSpace(headerHeight + rowHeight * 2);
    drawHeader();

    // Draw Data Rows
    for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
      // Check if page break is needed
      if (this.cursorY - rowHeight < MARGIN_BOTTOM + 15) {
        this.addNewPage();
        drawHeader(); // Repeat table header on new page!
      }

      const row = table.rows[rIdx];
      const cur = this.pages[this.currentPageIdx].commands;
      cur.push('q');

      // Alternating row background
      const isEven = rIdx % 2 === 0;
      if (isEven) {
        cur.push('0.98 0.98 0.99 rg');
      } else {
        cur.push('1 1 1 rg');
      }
      cur.push(`${MARGIN_LEFT} ${this.cursorY - rowHeight} ${CONTENT_WIDTH} ${rowHeight} re f`);

      // Row bottom border
      cur.push('0.88 0.90 0.94 RG');
      cur.push('0.4 w');
      cur.push(`${MARGIN_LEFT} ${this.cursorY - rowHeight} m ${MARGIN_LEFT + CONTENT_WIDTH} ${this.cursorY - rowHeight} l S`);

      // Cells
      let currentX = MARGIN_LEFT;
      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const val = row[cIdx] || '';
        const w = normalizedWidths[cIdx];
        const col = table.columns[cIdx];
        const align = col.align || 'left';

        // Check if value is a status pill
        const isStatusPill = ['MATCHED', 'VERIFIED', 'RECONCILED', 'DISCREPANCY', 'UNVERIFIED', 'FLAGGED'].some((s) =>
          val.toUpperCase().includes(s)
        );

        if (isStatusPill) {
          const isError = val.toUpperCase().includes('DISCREPANCY') || val.toUpperCase().includes('FLAGGED');
          const isSuccess = val.toUpperCase().includes('MATCHED') || val.toUpperCase().includes('VERIFIED') || val.toUpperCase().includes('RECONCILED');

          const pillBg = isError ? '0.98 0.88 0.88 rg' : isSuccess ? '0.88 0.96 0.90 rg' : '0.92 0.94 0.96 rg';
          const pillBorder = isError ? '0.90 0.60 0.60 RG' : isSuccess ? '0.60 0.85 0.65 RG' : '0.80 0.84 0.88 RG';
          const pillText = isError ? '0.70 0.10 0.10 rg' : isSuccess ? '0.10 0.50 0.20 rg' : '0.30 0.35 0.45 rg';

          const pillW = Math.min(w - 10, this.getTextWidth(val, 7) + 12);
          const pillH = 12;
          const pillX = currentX + (w - pillW) / 2;
          const pillY = this.cursorY - 15;

          cur.push('q');
          cur.push(pillBg);
          cur.push(`${pillX} ${pillY} ${pillW} ${pillH} re f`);
          cur.push(pillBorder);
          cur.push('0.5 w');
          cur.push(`${pillX} ${pillY} ${pillW} ${pillH} re s`);

          cur.push('BT');
          cur.push('/F2 6.5 Tf');
          cur.push(pillText);
          const txtW = this.getTextWidth(val, 6.5);
          cur.push(`${pillX + (pillW - txtW) / 2} ${pillY + 3.5} Td`);
          cur.push(`(${this.escapePdfText(val)}) Tj`);
          cur.push('ET');
          cur.push('Q');
        } else {
          // Regular text / numeric cell
          const isBold = val.startsWith('**') && val.endsWith('**');
          const cleanVal = val.replace(/\*\*/g, '');
          const font = isBold ? '/F2' : '/F1';
          const fontSize = 8;

          cur.push('BT');
          cur.push(`${font} ${fontSize} Tf`);
          cur.push('0.15 0.18 0.25 rg');

          // Truncate if exceeds column width
          let displayVal = cleanVal;
          while (displayVal.length > 3 && this.getTextWidth(displayVal, fontSize) > w - 12) {
            displayVal = displayVal.slice(0, -4) + '...';
          }

          let textX = currentX + 6;
          if (align === 'right') {
            const tw = this.getTextWidth(displayVal, fontSize);
            textX = currentX + w - tw - 6;
          } else if (align === 'center') {
            const tw = this.getTextWidth(displayVal, fontSize);
            textX = currentX + (w - tw) / 2;
          }

          cur.push(`${textX} ${this.cursorY - 12} Td`);
          cur.push(`(${this.escapePdfText(displayVal)}) Tj`);
          cur.push('ET');
        }

        currentX += w;
      }

      cur.push('Q');
      this.cursorY -= rowHeight;
    }

    this.cursorY -= 8;
  }

  private renderRunningDecorations(spec: PdfReportSpec): void {
    const totalPages = this.pages.length;

    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const cur = this.pages[pIdx].commands;
      const pageNum = pIdx + 1;

      cur.push('q');

      // Running Header (Pages > 1)
      if (pageNum > 1) {
        cur.push('BT');
        cur.push('/F1 7.5 Tf');
        cur.push('0.45 0.50 0.60 rg');
        cur.push(`${MARGIN_LEFT} ${PAGE_HEIGHT - 28} Td`);
        cur.push(`(${this.escapePdfText('Project Hijin AI Workstation — ' + spec.title)}) Tj`);
        cur.push('ET');

        // Header rule
        cur.push('0.85 0.88 0.92 RG');
        cur.push('0.5 w');
        cur.push(`${MARGIN_LEFT} ${PAGE_HEIGHT - 32} m ${PAGE_WIDTH - MARGIN_RIGHT} ${PAGE_HEIGHT - 32} l S`);
      }

      // Running Footer (All Pages)
      // Footer rule
      cur.push('0.85 0.88 0.92 RG');
      cur.push('0.5 w');
      cur.push(`${MARGIN_LEFT} 34 m ${PAGE_WIDTH - MARGIN_RIGHT} 34 l S`);

      // Left Footer: Confidentiality & Provenance
      cur.push('BT');
      cur.push('/F1 7.5 Tf');
      cur.push('0.45 0.50 0.60 rg');
      cur.push(`${MARGIN_LEFT} 22 Td`);
      const confText = spec.metadata?.confidentiality || 'CONFIDENTIAL — Deterministic Mathematical Verification & Audit';
      cur.push(`(${this.escapePdfText(confText)}) Tj`);
      cur.push('ET');

      // Right Footer: Page X of Y
      const pageStr = `Page ${pageNum} of ${totalPages}`;
      const pageW = this.getTextWidth(pageStr, 7.5);
      cur.push('BT');
      cur.push('/F2 7.5 Tf');
      cur.push('0.35 0.40 0.50 rg');
      cur.push(`${PAGE_WIDTH - MARGIN_RIGHT - pageW} 22 Td`);
      cur.push(`(${this.escapePdfText(pageStr)}) Tj`);
      cur.push('ET');

      cur.push('Q');
    }
  }
}

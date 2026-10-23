import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedFileResult, ExtractionResult } from '../types';
import { chunkText } from './chunker';

// Ensure pdfjs worker is configured in local environments if needed
if (typeof window !== 'undefined' && (pdfjsLib as any).GlobalWorkerOptions) {
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
  } catch {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
  }
}

/**
 * Extract Plain Text (.txt)
 * Split into paragraphs.
 * Citation: fileName, para. X
 */
export function extractPlainText(fileName: string, text: string): ExtractedFileResult {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0 && text.trim().length > 0) {
    paragraphs.push(text.trim());
  }

  const sections: ExtractionResult[] = [];

  paragraphs.forEach((para, index) => {
    const paraNum = index + 1;
    const citation = `${fileName}, para. ${paraNum}`;
    const chunks = chunkText(para);

    for (const chunk of chunks) {
      sections.push({
        content: chunk,
        citation_label: citation,
        paragraph_number: paraNum,
      });
    }
  });

  return {
    is_skipped: false,
    sections,
  };
}

/**
 * Extract Markdown (.md)
 * Split by H1, H2, and H3 headings.
 * Citation: fileName, Nearest heading (e.g. "acme-notes.md, ## Project goals")
 */
export function extractMarkdown(fileName: string, text: string): ExtractedFileResult {
  const lines = text.split(/\r?\n/);
  const sections: ExtractionResult[] = [];

  let currentHeading = '';
  let currentBuffer: string[] = [];

  const flush = () => {
    const content = currentBuffer.join('\n').trim();
    if (content.length > 0) {
      const citation = currentHeading
        ? `${fileName}, ${currentHeading}`
        : `${fileName}`;
      const chunks = chunkText(content);
      for (const chunk of chunks) {
        sections.push({
          content: chunk,
          citation_label: citation,
          heading: currentHeading || undefined,
        });
      }
    }
    currentBuffer = [];
  };

  const headingRegex = /^(#{1,3})\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (match) {
      flush();
      currentHeading = `${match[1]} ${match[2].trim()}`;
    } else {
      currentBuffer.push(line);
    }
  }

  flush();

  return {
    is_skipped: false,
    sections,
  };
}

/**
 * Extract DOCX (.docx)
 * Extract document text in reading order.
 * Citation: fileName, para. X
 */
export async function extractDocx(
  fileName: string,
  buffer: ArrayBuffer | Uint8Array
): Promise<ExtractedFileResult> {
  const nodeBuf =
    typeof Buffer !== 'undefined'
      ? Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from(buffer as Uint8Array)
      : undefined;

  const arrayBuffer: any =
    buffer instanceof ArrayBuffer
      ? buffer
      : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const mammothOptions: any = { arrayBuffer };
  if (nodeBuf) {
    mammothOptions.buffer = nodeBuf;
  }

  const result = await mammoth.extractRawText(mammothOptions);
  const rawText = result.value || '';

  const paragraphs = rawText
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sections: ExtractionResult[] = [];

  paragraphs.forEach((para, index) => {
    const paraNum = index + 1;
    const citation = `${fileName}, para. ${paraNum}`;
    const chunks = chunkText(para);

    for (const chunk of chunks) {
      sections.push({
        content: chunk,
        citation_label: citation,
        paragraph_number: paraNum,
      });
    }
  });

  return {
    is_skipped: false,
    sections,
  };
}

/**
 * Extract PDF (.pdf)
 * Extract text page by page.
 * Citation: fileName, p. X
 * Scanned PDF detection: if no extractable text, return skip reason
 */
export async function extractPdf(
  fileName: string,
  data: Uint8Array | ArrayBuffer
): Promise<ExtractedFileResult> {
  const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);

  let doc;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Data,
      useSystemFonts: true,
      disableFontFace: true,
    });
    doc = await loadingTask.promise;
  } catch (err: any) {
    return {
      is_skipped: true,
      skip_reason: 'Scanned PDF; OCR is not available in version 1.',
      sections: [],
    };
  }

  const numPages = doc.numPages;
  let totalExtractedLength = 0;
  const sections: ExtractionResult[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .trim();

    totalExtractedLength += pageText.length;

    if (pageText.length > 0) {
      const citation = `${fileName}, p. ${pageNum}`;
      const chunks = chunkText(pageText);

      for (const chunk of chunks) {
        sections.push({
          content: chunk,
          citation_label: citation,
          page_number: pageNum,
        });
      }
    }
  }

  // If a PDF contains no extractable text, mark it as skipped
  if (totalExtractedLength === 0 || sections.length === 0) {
    return {
      is_skipped: true,
      skip_reason: 'Scanned PDF; OCR is not available in version 1.',
      sections: [],
    };
  }

  return {
    is_skipped: false,
    sections,
  };
}


// Re-export Multi-Format Offline Ingestion Engine
export {
  extractCsv,
  extractSpreadsheet,
  extractImageReceipt,
  ingestMultiFormatFile,
  parseCleanNumber,
  parseCsvRows,
  registerIngestedDocument,
  getIngestedDocument,
  getAllIngestedDocuments,
  clearIngestedDocuments,
} from './multiFormatIngestion';
export type { IngestedDocumentRecord, SupportedFileType, IngestedDocumentSummary } from './multiFormatIngestion';

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export interface ExportData {
  documentTitle: string;
  generationTime: string;
  workspaceName: string;
  content: string;
  citations: string[];
}

/**
 * Builds the Markdown representation of the generated brief or proposal.
 * Includes:
 * - Document title
 * - Generation time
 * - Workspace name
 * - The generated content
 * - Evidence Sources section with readable citations
 */
export function buildMarkdownExport(data: ExportData): string {
  const lines: string[] = [
    `# ${data.documentTitle}`,
    '',
    `**Workspace:** ${data.workspaceName}`,
    `**Generated:** ${data.generationTime}`,
    '',
    '---',
    '',
    data.content.trim(),
    '',
    '## Evidence Sources',
    '',
  ];

  if (data.citations && data.citations.length > 0) {
    for (const citation of data.citations) {
      lines.push(`- ${citation}`);
    }
  } else {
    lines.push('No sources cited.');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Builds the offline DOCX file using the `docx` library.
 * Includes:
 * - Document title
 * - Generation time
 * - Workspace name
 * - The generated content
 * - Evidence Sources section with readable citations
 */
export async function buildDocxExport(data: ExportData): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: data.documentTitle,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Metadata
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Workspace: ', bold: true }),
        new TextRun({ text: data.workspaceName }),
      ],
      spacing: { after: 100 },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Generated: ', bold: true }),
        new TextRun({ text: data.generationTime }),
      ],
      spacing: { after: 300 },
    })
  );

  // Content lines
  const contentLines = data.content.split(/\r?\n/);
  for (const line of contentLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 80 },
        })
      );
    } else if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 60 },
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^[-*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          text: trimmed,
          spacing: { after: 100 },
        })
      );
    }
  }

  // Evidence Sources section
  paragraphs.push(
    new Paragraph({
      text: 'Evidence Sources',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
    })
  );

  if (data.citations && data.citations.length > 0) {
    for (const citation of data.citations) {
      paragraphs.push(
        new Paragraph({
          text: citation,
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    }
  } else {
    paragraphs.push(
      new Paragraph({
        text: 'No sources cited.',
        spacing: { after: 100 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Escapes a cell value conforming to RFC 4180 CSV standard.
 */
function escapeCsvCell(val: string): string {
  const trimmed = val.trim();
  if (trimmed.includes('"') || trimmed.includes(',') || trimmed.includes('\n') || trimmed.includes('\r')) {
    return `"${trimmed.replace(/"/g, '""')}"`;
  }
  return trimmed;
}

/**
 * Builds standard CSV representation of the document or reconciliation report.
 * Supports Markdown tables, sectioned documents, and evidence citations.
 */
export function buildCsvExport(data: ExportData): string {
  const lines: string[] = [
    `# ${escapeCsvCell(data.documentTitle)}`,
    `# Workspace:,${escapeCsvCell(data.workspaceName)}`,
    `# Generated:,${escapeCsvCell(data.generationTime)}`,
    '',
  ];

  const contentLines = data.content.split(/\r?\n/);
  const tableLines = contentLines.filter((l) => l.trim().startsWith('|'));

  if (tableLines.length >= 2) {
    // Content contains a Markdown table: parse and convert to CSV
    for (const rawLine of tableLines) {
      const trimmed = rawLine.trim();
      // Skip markdown separator row |---|---|
      if (/^\|[\s\-:\|]+$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(escapeCsvCell);
      lines.push(cells.join(','));
    }
  } else {
    // Sectioned document: output Section, Detail format
    lines.push('Section,Content');
    let currentSection = 'Overview';
    for (const rawLine of contentLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        currentSection = trimmed.replace(/^#+\s*/, '');
      } else {
        lines.push(`${escapeCsvCell(currentSection)},${escapeCsvCell(trimmed)}`);
      }
    }
  }

  // Evidence Sources section
  lines.push('');
  lines.push('Evidence Sources');
  if (data.citations && data.citations.length > 0) {
    for (const citation of data.citations) {
      lines.push(escapeCsvCell(citation));
    }
  } else {
    lines.push('No sources cited.');
  }

  return lines.join('\n');
}

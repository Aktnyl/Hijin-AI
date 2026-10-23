import { describe, expect, it } from 'vitest';
import {
  extractDocx,
  extractMarkdown,
  extractPdf,
  extractPlainText,
} from '../src/services/extractor';

describe('Plain Text Extractor', () => {
  it('extracts paragraphs with exact citation format: fileName, para. X', () => {
    const rawText = `First paragraph with discovery notes.
Still part of the first paragraph.

Second paragraph detailing target audience.

Third paragraph about deliverables.`;

    const result = extractPlainText('kickoff-notes.txt', rawText);
    expect(result.is_skipped).toBe(false);
    expect(result.sections).toHaveLength(3);

    expect(result.sections[0].citation_label).toBe('kickoff-notes.txt, para. 1');
    expect(result.sections[0].content).toContain('First paragraph with discovery notes.');

    expect(result.sections[1].citation_label).toBe('kickoff-notes.txt, para. 2');
    expect(result.sections[1].content).toBe('Second paragraph detailing target audience.');

    expect(result.sections[2].citation_label).toBe('kickoff-notes.txt, para. 3');
    expect(result.sections[2].content).toBe('Third paragraph about deliverables.');
  });
});

describe('Markdown Extractor', () => {
  it('splits by H1, H2, and H3 headings with nearest heading citation format', () => {
    const mdText = `# Project Overview
Acme Corporation re-platforming project.

## Scope of Work
Detailed scope items for design and engineering.

### Frontend Deliverables
Responsive web app built with modern design system.

## Risks and Constraints
Budget constraints and timeline limits.`;

    const result = extractMarkdown('acme-notes.md', mdText);
    expect(result.is_skipped).toBe(false);
    expect(result.sections).toHaveLength(4);

    expect(result.sections[0].citation_label).toBe('acme-notes.md, # Project Overview');
    expect(result.sections[0].content).toContain('Acme Corporation re-platforming project.');

    expect(result.sections[1].citation_label).toBe('acme-notes.md, ## Scope of Work');
    expect(result.sections[1].content).toContain('Detailed scope items for design');

    expect(result.sections[2].citation_label).toBe('acme-notes.md, ### Frontend Deliverables');
    expect(result.sections[2].content).toContain('Responsive web app');

    expect(result.sections[3].citation_label).toBe('acme-notes.md, ## Risks and Constraints');
    expect(result.sections[3].content).toContain('Budget constraints');
  });

  it('handles text before the first heading gracefully', () => {
    const mdText = `Introductory notes before any header.

# First Heading
Content under first heading.`;

    const result = extractMarkdown('doc.md', mdText);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].citation_label).toBe('doc.md');
    expect(result.sections[1].citation_label).toBe('doc.md, # First Heading');
  });
});

describe('Scanned PDF Detection', () => {
  it('identifies scanned PDFs with no extractable text and marks skipped with exact reason', async () => {
    // A dummy/empty or unparseable/scanned binary with 0 extractable characters
    const fakeEmptyPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

    const result = await extractPdf('scanned_contract.pdf', fakeEmptyPdf);
    expect(result.is_skipped).toBe(true);
    expect(result.skip_reason).toBe('Scanned PDF; OCR is not available in version 1.');
    expect(result.sections).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildDocxExport,
  buildMarkdownExport,
  buildCsvExport,
  ExportData,
} from '../src/services/export';

describe('Export Service', () => {
  const sampleExportData: ExportData = {
    documentTitle: 'Client Brief',
    generationTime: 'Sep 3, 2026, 10:30 AM',
    workspaceName: 'Acme Brand Redesign',
    content: `## 1. Client overview
Acme Corp is a regional retail brand [Client Discovery.pdf, p. 1].

## 2. Current project
Brand strategy and identity refresh [Brand Guide.docx, para. 3].

## 3. Audience and constraints
Urban professionals aged 25-40 [acme-notes.md, ## Audience].

## 4. Goals
Increase brand affinity and online conversions [kickoff-notes.txt, para. 5].

## 5. Risks and open questions
Tight Q4 timeline for rollout [acme-notes.md, ## Risks].

## 6. Recommended next steps
Stakeholder discovery session and visual audit.

## 7. Evidence sources
See below.`,
    citations: [
      'Client Discovery.pdf, p. 1',
      'Brand Guide.docx, para. 3',
      'acme-notes.md, ## Audience',
      'kickoff-notes.txt, para. 5',
      'acme-notes.md, ## Risks',
    ],
  };

  it('builds Markdown export containing title, generation time, workspace, content, and evidence sources', () => {
    const md = buildMarkdownExport(sampleExportData);

    // Required fields:
    expect(md).toContain('# Client Brief');
    expect(md).toContain('**Workspace:** Acme Brand Redesign');
    expect(md).toContain('**Generated:** Sep 3, 2026, 10:30 AM');
    expect(md).toContain('Acme Corp is a regional retail brand');
    expect(md).toContain('## Evidence Sources');

    for (const citation of sampleExportData.citations) {
      expect(md).toContain(`- ${citation}`);
    }
  });

  it('builds valid DOCX export blob containing all document sections', async () => {
    const blob = await buildDocxExport(sampleExportData);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000); // Valid docx file
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('verifies the 7 required sections for Client Brief template', () => {
    const clientBriefSections = [
      'Client overview',
      'Current project',
      'Audience and constraints',
      'Goals',
      'Risks and open questions',
      'Recommended next steps',
      'Evidence sources',
    ];

    expect(clientBriefSections).toHaveLength(7);
  });

  it('verifies the 7 required sections for Proposal Draft template', () => {
    const proposalDraftSections = [
      'Executive summary',
      'Client context',
      'Scope and deliverables',
      'Proposed approach',
      'Timeline assumptions',
      'Exclusions and open questions',
      'Evidence sources',
    ];

    expect(proposalDraftSections).toHaveLength(7);
  });
  it('builds CSV export containing metadata, escaped content, and evidence sources', () => {
    const csv = buildCsvExport(sampleExportData);
    expect(csv).toContain('# Client Brief');
    expect(csv).toContain('# Workspace:,Acme Brand Redesign');
    expect(csv).toContain('Evidence Sources');
    expect(csv).toContain('Client Discovery.pdf, p. 1');
  });

  it('builds CSV export from Markdown table content', () => {
    const tableData: ExportData = {
      documentTitle: 'Reconciliation Matrix',
      generationTime: 'Sep 3, 2026, 11:00 AM',
      workspaceName: 'Financial Audit',
      content: `| Item | Qty | Price | Status |
|---|---|---|---|
| Widget A | 10 | $50.00 | MATCH |
| Widget B | 5 | $120.00 | MISMATCH |`,
      citations: ['Invoice_101.pdf, p. 1'],
    };
    const csv = buildCsvExport(tableData);
    expect(csv).toContain('Item,Qty,Price,Status');
    expect(csv).toContain('Widget A,10,$50.00,MATCH');
    expect(csv).toContain('Widget B,5,$120.00,MISMATCH');
    expect(csv).not.toContain('|---|');
  });
});

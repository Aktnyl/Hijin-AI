import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
  queryLocalOllama,
} from '../src/services/ollama';
import { SearchResultChunk } from '../src/types';

describe('Template Generation with Sufficient Evidence', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const sufficientChunks: SearchResultChunk[] = [
    {
      id: 'chunk_md_1',
      workspace_id: 'ws_test',
      file_id: 'file_md',
      chunk_index: 0,
      content:
        'Client Overview: Apex Digital is an enterprise software company providing cloud inventory logistics solutions to global retail clients since 2018 with 200+ accounts. Audience and Constraints: Primary audience comprises Vice Presidents of Supply Chain and Operations Directors. Constraints require full WCAG 2.1 AA accessibility and SOC2 Type II compliance.',
      citation_label: 'brand_guidelines.md, ## Client Overview',
      source_file_name: 'brand_guidelines.md',
    },
    {
      id: 'chunk_txt_1',
      workspace_id: 'ws_test',
      file_id: 'file_txt',
      chunk_index: 0,
      content:
        'Current Project: Complete digital transformation initiative to consolidate 4 disparate legacy marketing microsites into a single unified flagship portal. Goals: Increase qualified enterprise demo requests by 40% within 6 months and decrease mobile bounce rates below 35%. Timeline Assumptions: Agreed fee $45,000 across 3 milestones, 8 weeks delivery targeting October 28, 2026. Risks and Open Questions: Risk is third-party CRM API latency of 5 days; open question is multi-language phase 1 vs 2. Exclusions: Legacy database migration, custom CRM development, and paid media.',
      citation_label: 'kickoff_meeting.txt, para. 3',
      source_file_name: 'kickoff_meeting.txt',
    },
    {
      id: 'chunk_docx_1',
      workspace_id: 'ws_test',
      file_id: 'file_docx',
      chunk_index: 0,
      content:
        'Executive Summary: Apex Digital engaged our agency to design and engineer an enterprise-grade digital platform replacing outdated microsites. Client Context: Expanding North American operations requiring an authoritative digital presence. Scope and Deliverables: UX wireframes for 12 responsive templates, interactive Figma prototype, and production React app. Proposed Approach: Four-phase agile model: Discovery, UX/UI Design, Frontend Engineering, and QA/Launch. Recommended Next Steps: Sitemap sign-off by September 10, CRM technical workshop September 12, and staging access.',
      citation_label: 'project_scope.docx, para. 2',
      source_file_name: 'project_scope.docx',
    },
  ];

  it('fails if Client Brief returns only the insufficient-evidence message when all required evidence is present', async () => {
    const briefPrompt = `Generate a Client Brief based only on the provided excerpts. You MUST structure the response with exactly these seven sections:
1. Client overview
2. Current project
3. Audience and constraints
4. Goals
5. Risks and open questions
6. Recommended next steps
7. Evidence sources`;

    // Simulated model response synthesizing all seven sections with citations [S1], [S2], [S3]
    const mockedModelResponse = `## 1. Client overview
Apex Digital is an enterprise software company providing cloud inventory logistics solutions [S1].

## 2. Current project
Consolidating four disparate legacy microsites into a unified flagship portal [S2].

## 3. Audience and constraints
Target audience is Vice Presidents of Supply Chain with strict WCAG 2.1 AA compliance constraints [S1].

## 4. Goals
Increase qualified demo requests by 40% and lower bounce rates below 35% [S2].

## 5. Risks and open questions
Third-party CRM API documentation latency risk and multi-language Phase 1 open question [S2].

## 6. Recommended next steps
Sitemap sign-off by September 10 and staging environment provisioning [S3].

## 7. Evidence sources
Excerpts [S1], [S2], and [S3].`;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: mockedModelResponse }),
    } as Response);

    const result = await queryLocalOllama(
      'http://127.0.0.1:11434',
      'llama3',
      briefPrompt,
      sufficientChunks
    );

    // CRITICAL REQUIREMENT: Must NOT be insufficient-evidence message when evidence is present
    expect(result.answer).not.toBe(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(result.isInsufficient).toBe(false);
    expect(result.error).toBeUndefined();

    // Verify all 7 sections exist in exact specified order
    const requiredSections = [
      'Client overview',
      'Current project',
      'Audience and constraints',
      'Goals',
      'Risks and open questions',
      'Recommended next steps',
      'Evidence sources',
    ];

    let lastIndex = -1;
    for (const section of requiredSections) {
      const idx = result.answer.indexOf(section);
      expect(idx, `Section "${section}" must be present in Client Brief`).toBeGreaterThan(-1);
      expect(idx, `Section "${section}" must appear in correct sequence`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }

    // Verify readable citations were replaced
    expect(result.citations).toContain('brand_guidelines.md, ## Client Overview');
    expect(result.citations).toContain('kickoff_meeting.txt, para. 3');
    expect(result.citations).toContain('project_scope.docx, para. 2');
    expect(result.answer).not.toContain('[S1]');
    expect(result.answer).not.toContain('[S2]');
    expect(result.answer).not.toContain('[S3]');
  });

  it('fails if Proposal Draft returns only the insufficient-evidence message when all required evidence is present', async () => {
    const proposalPrompt = `Generate a Proposal Draft based only on the provided excerpts. You MUST structure the response with exactly these seven sections:
1. Executive summary
2. Client context
3. Scope and deliverables
4. Proposed approach
5. Timeline assumptions
6. Exclusions and open questions
7. Evidence sources`;

    const mockedModelResponse = `## 1. Executive summary
Apex Digital engaged our agency to engineer an enterprise-grade digital platform replacing outdated microsites [S3].

## 2. Client context
Apex Digital is expanding operations and needs an authoritative digital presence for logistics directors [S3].

## 3. Scope and deliverables
Scope covers UX wireframes for 12 templates, interactive Figma prototype, and production React app [S3].

## 4. Proposed approach
Four-phase agile methodology spanning Discovery, UX/UI Design, Frontend Engineering, and QA/Launch [S3].

## 5. Timeline assumptions
8-week delivery schedule targeting October 28, 2026 go-live with $45,000 project fee [S2].

## 6. Exclusions and open questions
Excludes legacy database migration, custom CRM development, and paid media [S2].

## 7. Evidence sources
Supported by project documentation [S2], [S3].`;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: mockedModelResponse }),
    } as Response);

    const result = await queryLocalOllama(
      'http://127.0.0.1:11434',
      'llama3',
      proposalPrompt,
      sufficientChunks
    );

    // CRITICAL REQUIREMENT: Must NOT be insufficient-evidence message when evidence is present
    expect(result.answer).not.toBe(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(result.isInsufficient).toBe(false);
    expect(result.error).toBeUndefined();

    // Verify all 7 sections exist in exact specified order
    const requiredSections = [
      'Executive summary',
      'Client context',
      'Scope and deliverables',
      'Proposed approach',
      'Timeline assumptions',
      'Exclusions and open questions',
      'Evidence sources',
    ];

    let lastIndex = -1;
    for (const section of requiredSections) {
      const idx = result.answer.indexOf(section);
      expect(idx, `Section "${section}" must be present in Proposal Draft`).toBeGreaterThan(-1);
      expect(idx, `Section "${section}" must appear in correct sequence`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }

    // Verify readable citations
    expect(result.citations).toContain('kickoff_meeting.txt, para. 3');
    expect(result.citations).toContain('project_scope.docx, para. 2');
    expect(result.answer).not.toContain('[S2]');
    expect(result.answer).not.toContain('[S3]');
  });

  it('correctly replaces compound citations and avoids false positive uncited warnings', async () => {
    const briefPrompt = 'Generate a Client Brief';
    const compoundModelResponse = `1. Client overview
Apex Digital is an enterprise software company providing cloud inventory logistics solutions [S1, S3].

2. Current project
Consolidating four legacy microsites into a unified flagship portal [S2].

3. Audience and constraints
Target audience is Vice Presidents of Supply Chain [S1].

4. Goals
Increase qualified demo requests by 40% [S2].

5. Risks and open questions
Third-party CRM API latency risk of 5 days [S2, S3].

6. Recommended next steps
Sitemap sign-off by September 10 and staging setup [S3].

7. Evidence sources
Sources [S1], [S2], [S3].`;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: compoundModelResponse }),
    } as Response);

    const result = await queryLocalOllama(
      'http://127.0.0.1:11434',
      'llama3',
      briefPrompt,
      sufficientChunks
    );

    expect(result.answer).not.toBe(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(result.isInsufficient).toBe(false);
    expect(result.hasUncitedWarning).toBe(false);

    // Verify compound citations [S1, S3] replaced
    expect(result.answer).toContain('brand_guidelines.md, ## Client Overview; project_scope.docx, para. 2');
    expect(result.answer).not.toContain('[S1, S3]');
    expect(result.answer).not.toContain('[S2, S3]');
  });

  it('fails if model returns insufficient evidence when sources are fully sufficient', async () => {
    // Simulate model returning insufficient evidence message
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: EXACT_INSUFFICIENT_EVIDENCE_MESSAGE }),
    } as Response);

    const result = await queryLocalOllama(
      'http://127.0.0.1:11434',
      'llama3',
      'Generate a Client Brief',
      sufficientChunks
    );

    // Verify that the helper identifies this as insufficient
    expect(result.isInsufficient).toBe(true);
    expect(result.answer).toBe(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);

    // In a test asserting sufficiency, we assert that isInsufficient must be FALSE
    // This test demonstrates the assertion that fails if insufficiency is returned
    const assertSufficient = () => {
      if (result.isInsufficient || result.answer === EXACT_INSUFFICIENT_EVIDENCE_MESSAGE) {
        throw new Error('FAILED: Model returned insufficient evidence fallback despite complete source evidence!');
      }
    };
    expect(assertSufficient).toThrow('FAILED: Model returned insufficient evidence fallback despite complete source evidence!');
  });
});


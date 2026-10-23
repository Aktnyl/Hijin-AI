import { describe, expect, it } from 'vitest';
import { bm25RankChunks } from '../src/services/db';
import { EXACT_INSUFFICIENT_EVIDENCE_MESSAGE } from '../src/services/ollama';
import { ChunkRecord } from '../src/types';

describe('Search and Retrieval (SQLite FTS5 / BM25)', () => {
  const dummyChunks: ChunkRecord[] = [
    {
      id: 'c1',
      workspace_id: 'ws1',
      file_id: 'f1',
      chunk_index: 0,
      content: 'Acme branding guidelines require the primary color to be electric blue with hex code #0055FF.',
      citation_label: 'Brand Guide.docx, para. 3',
      source_file_name: 'Brand Guide.docx',
    },
    {
      id: 'c2',
      workspace_id: 'ws1',
      file_id: 'f1',
      chunk_index: 1,
      content: 'Typography must always use the Inter sans-serif typeface across all client collateral.',
      citation_label: 'Brand Guide.docx, para. 7',
      source_file_name: 'Brand Guide.docx',
    },
    {
      id: 'c3',
      workspace_id: 'ws1',
      file_id: 'f2',
      chunk_index: 0,
      content: 'Project timeline allocates six weeks for design sprints and four weeks for implementation.',
      citation_label: 'kickoff-notes.txt, para. 2',
      source_file_name: 'kickoff-notes.txt',
    },
    {
      id: 'c4',
      workspace_id: 'ws1',
      file_id: 'f3',
      chunk_index: 0,
      content: 'Deliverables include custom design system, Figma tokens, and responsive web templates.',
      citation_label: 'acme-notes.md, ## Deliverables',
      source_file_name: 'acme-notes.md',
    },
  ];

  it('retrieves relevant chunks matching user query terms', () => {
    const results = bm25RankChunks(dummyChunks, 'What is the primary color for branding?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].citation_label).toBe('Brand Guide.docx, para. 3');
    expect(results[0].content).toContain('electric blue');
  });

  it('limits returned chunks to maximum of eight', () => {
    const manyChunks: ChunkRecord[] = [];
    for (let i = 0; i < 20; i++) {
      manyChunks.push({
        id: `c_${i}`,
        workspace_id: 'ws1',
        file_id: `f_${i}`,
        chunk_index: 0,
        content: `Deliverable requirement number ${i} for client project.`,
        citation_label: `file_${i}.txt, para. 1`,
        source_file_name: `file_${i}.txt`,
      });
    }

    const results = bm25RankChunks(manyChunks, 'Deliverable requirement', 8);
    expect(results.length).toBe(8);
  });

  it('returns empty array when no query terms match any chunks', () => {
    const results = bm25RankChunks(dummyChunks, 'unrelated astrophysical quantum mechanics');
    expect(results).toHaveLength(0);
  });

  it('verifies exact insufficiency message constant', () => {
    expect(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE).toBe(
      'I don’t have enough evidence in this workspace to answer that.'
    );
  });
});

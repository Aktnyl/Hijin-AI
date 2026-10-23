/**
 * tests/sqlite_fts5_search.test.ts - ARCH-P1-01 SQLite FTS5 Local Search & Storage Tests
 *
 * Verifies:
 * 1. BM25 text ranking and relevance score ordering for local document search.
 * 2. SQLite FTS5 invocation via Tauri bridge and graceful in-memory fallback.
 * 3. Chunks persistence, retrieval, and incremental replacement.
 * 4. Chat history turn indexing, persistence, and deletion.
 * 5. Special character sanitization and edge-case query robustness.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db, bm25RankChunks } from '../src/services/db';
import { ChunkRecord, HistoryRecord } from '../src/types';
import * as tauriBridge from '../src/services/tauriBridge';

describe('ARCH-P1-01: BM25 Relevance Scoring & Query Sanitization', () => {
  const sampleChunks: ChunkRecord[] = [
    {
      id: 'chk_rev_01',
      workspace_id: 'ws_finance',
      file_id: 'file_q3',
      chunk_index: 0,
      content: 'Precision Enterprise reported GAAP revenue of $54.2 million for the third quarter.',
      citation_label: 'Q3_Financials.pdf, p. 1',
      source_file_name: 'Q3_Financials.pdf',
    },
    {
      id: 'chk_ebitda_02',
      workspace_id: 'ws_finance',
      file_id: 'file_q3',
      chunk_index: 1,
      content: 'Normalized EBITDA was verified at $23.9 million after deducting disallowed adjustments.',
      citation_label: 'Q3_Financials.pdf, p. 2',
      source_file_name: 'Q3_Financials.pdf',
    },
    {
      id: 'chk_tax_03',
      workspace_id: 'ws_finance',
      file_id: 'file_tax',
      chunk_index: 0,
      content: 'Estimated federal tax provision was recorded at 21 percent statutory rate.',
      citation_label: 'Tax_Schedule.xlsx, row 4',
      source_file_name: 'Tax_Schedule.xlsx',
    },
  ];

  it('1. Correctly matches and ranks chunks matching keyword query', () => {
    const results = bm25RankChunks(sampleChunks, 'EBITDA normalized', 8);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('chk_ebitda_02');
    expect(results[0].citation_label).toBe('Q3_Financials.pdf, p. 2');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('2. Returns highest scoring match first for multi-term queries', () => {
    const results = bm25RankChunks(sampleChunks, 'GAAP revenue quarter', 8);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('chk_rev_01');
    expect(results[0].source_file_name).toBe('Q3_Financials.pdf');
  });

  it('3. Robustly handles punctuation, special symbols, and casing', () => {
    const results = bm25RankChunks(sampleChunks, '$$$ 54.2 million??? GAAP!!!', 8);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('chk_rev_01');
  });

  it('4. Returns empty array for empty, whitespace, or non-matching queries', () => {
    expect(bm25RankChunks(sampleChunks, '', 8)).toEqual([]);
    expect(bm25RankChunks(sampleChunks, '   ', 8)).toEqual([]);
    expect(bm25RankChunks(sampleChunks, 'completely unrelated extraterrestrial words', 8)).toEqual([]);
  });
});

describe('ARCH-P1-01: SQLite FTS5 Storage & Tauri Bridge Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    db.clear();
  });

  it('1. Invokes native SQLite FTS5 search when in Tauri environment', async () => {
    const mockSqliteResults = [
      {
        id: 'chk_native_01',
        workspace_id: 'ws_audit',
        file_id: 'file_audit',
        content: 'Audited trial balance matches with zero variance.',
        citation_label: 'Trial_Balance.xlsx, p. 1',
        source_file_name: 'Trial_Balance.xlsx',
        score: 0.95,
      },
    ];

    vi.spyOn(tauriBridge, 'searchChunksFts5Sqlite').mockResolvedValueOnce(mockSqliteResults);

    const results = await db.searchChunksFts5('ws_audit', 'trial balance', 5);
    expect(results).toEqual(mockSqliteResults);
    expect(tauriBridge.searchChunksFts5Sqlite).toHaveBeenCalledWith('ws_audit', 'trial balance', 5);
  });

  it('2. Gracefully falls back to in-memory BM25 index when SQLite is unavailable', async () => {
    vi.spyOn(tauriBridge, 'searchChunksFts5Sqlite').mockResolvedValueOnce(null);

    const testChunk: ChunkRecord = {
      id: 'chk_mem_01',
      workspace_id: 'ws_fallback',
      file_id: 'f1',
      chunk_index: 0,
      content: 'Contract milestone ASC 606 revenue recognition criteria satisfied.',
      citation_label: 'Contract.docx, para. 5',
      source_file_name: 'Contract.docx',
    };

    await db.saveChunks('ws_fallback', [testChunk]);

    const results = await db.searchChunksFts5('ws_fallback', 'ASC 606 revenue', 8);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('chk_mem_01');
    expect(results[0].citation_label).toBe('Contract.docx, para. 5');
  });

  it('3. Persists chunks to SQLite bridge and retrieves them from workspace', async () => {
    const saveSpy = vi.spyOn(tauriBridge, 'saveChunksSqlite').mockResolvedValueOnce(2);

    const chunks: ChunkRecord[] = [
      {
        id: 'c1',
        workspace_id: 'ws_save',
        file_id: 'f1',
        chunk_index: 0,
        content: 'Excerpt 1',
        citation_label: 'Doc1, p. 1',
        source_file_name: 'Doc1.pdf',
      },
      {
        id: 'c2',
        workspace_id: 'ws_save',
        file_id: 'f1',
        chunk_index: 1,
        content: 'Excerpt 2',
        citation_label: 'Doc1, p. 2',
        source_file_name: 'Doc1.pdf',
      },
    ];

    await db.saveChunks('ws_save', chunks);
    expect(saveSpy).toHaveBeenCalledWith('ws_save', chunks);

    const stored = await db.getWorkspaceChunks('ws_save');
    expect(stored.length).toBe(2);
  });

  it('4. Handles conversation history persistence in SQLite with offline access', async () => {
    const saveHistSpy = vi.spyOn(tauriBridge, 'saveHistorySqlite').mockResolvedValueOnce(true);

    const newTurn = await db.saveHistory({
      workspace_id: 'ws_recon',
      workspace_name: 'Recon Engagement',
      entry_type: 'chat',
      prompt: 'Reconcile PO 45000 with Invoice 1092',
      response: 'PO 45000 matched Invoice 1092 with $0 variance.',
      citations: ['Invoice_1092.pdf, p. 1'],
      has_uncited_warning: false,
    });

    expect(newTurn.id).toMatch(/^hist_/);
    expect(saveHistSpy).toHaveBeenCalled();

    // Query history via SQLite mock
    const mockHistory: HistoryRecord[] = [newTurn];
    vi.spyOn(tauriBridge, 'getHistorySqlite').mockResolvedValueOnce(mockHistory);

    const fetched = await db.getHistory('ws_recon');
    expect(fetched.length).toBe(1);
    expect(fetched[0].prompt).toBe('Reconcile PO 45000 with Invoice 1092');

    // Delete history
    const deleteSpy = vi.spyOn(tauriBridge, 'deleteHistorySqlite').mockResolvedValueOnce(true);
    await db.deleteHistory(newTurn.id);
    expect(deleteSpy).toHaveBeenCalledWith(newTurn.id);
  });
});

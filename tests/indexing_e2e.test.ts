import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/services/db';
import { FileDataProvider, indexWorkspace } from '../src/services/indexing';
import { ScannedFileInfo } from '../src/services/scanner';
import { Workspace } from '../src/types';

describe('Indexing E2E and Database Integration', () => {
  beforeEach(() => {
    db.clear();
  });

  it('indexes workspace files, creates chunks, and executes search retrieval', async () => {
    const ws = await db.createWorkspace('Alpha Client', 'C:\\Clients\\Alpha');
    expect(ws.status).toBe('Indexing');

    const mockFiles: ScannedFileInfo[] = [
      {
        name: 'brief.md',
        relative_path: 'brief.md',
        extension: 'md',
        size_bytes: 500,
        modified_at: Date.now(),
      },
      {
        name: 'notes.txt',
        relative_path: 'meeting/notes.txt',
        extension: 'txt',
        size_bytes: 400,
        modified_at: Date.now(),
      },
      {
        name: 'logo.png',
        relative_path: 'assets/logo.png',
        extension: 'png',
        size_bytes: 1024,
        modified_at: Date.now(),
      },
    ];

    const mockProvider: FileDataProvider = {
      scanDirectory: async () => mockFiles,
      readTextFile: async (path: string) => {
        if (path.endsWith('brief.md')) {
          return `# Project Overview\nRedesigning brand collateral for Alpha Inc.\n\n## Goals\nIncrease website traffic by 50 percent.`;
        }
        if (path.endsWith('notes.txt')) {
          return `First paragraph with stakeholder discussion.\n\nSecond paragraph discussing delivery dates and timeline.`;
        }
        return '';
      },
      readBinaryFile: async () => new Uint8Array(),
    };

    const indexResult = await indexWorkspace(ws, mockProvider);
    expect(indexResult.indexedCount).toBe(2);
    expect(indexResult.skippedCount).toBe(1); // logo.png
    expect(indexResult.status).toBe('Ready');

    // Verify stored files
    const storedFiles = await db.getWorkspaceFiles(ws.id);
    expect(storedFiles).toHaveLength(3);

    const skipped = storedFiles.find((f) => f.name === 'logo.png');
    expect(skipped?.index_status).toBe('Skipped');
    expect(skipped?.skip_reason).toBe('Unsupported file type');

    const indexedMd = storedFiles.find((f) => f.name === 'brief.md');
    expect(indexedMd?.index_status).toBe('Indexed');

    // Verify stored chunks
    const chunks = await db.getWorkspaceChunks(ws.id);
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // Test Search Retrieval via FTS5 / BM25
    const searchResults = await db.searchChunksFts5(ws.id, 'traffic goals');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].citation_label).toBe('brief.md, ## Goals');
    expect(searchResults[0].content).toContain('Increase website traffic');
  });

  it('manages conversation history with creation and deletion', async () => {
    const ws = await db.createWorkspace('Beta Client', 'C:\\Clients\\Beta');

    const entry = await db.saveHistory({
      workspace_id: ws.id,
      workspace_name: ws.name,
      entry_type: 'question',
      prompt: 'What are the main deliverables?',
      response: 'The deliverables include brand assets and responsive site [brief.md, ## Deliverables].',
      citations: ['brief.md, ## Deliverables'],
      has_uncited_warning: false,
    });

    expect(entry.id).toBeDefined();

    const history = await db.getHistory(ws.id);
    expect(history).toHaveLength(1);
    expect(history[0].prompt).toBe('What are the main deliverables?');

    // Delete item
    await db.deleteHistory(entry.id);
    const updatedHistory = await db.getHistory(ws.id);
    expect(updatedHistory).toHaveLength(0);
  });
});

import {
  ChunkRecord,
  FileRecord,
  HistoryRecord,
  ModelSettings,
  SearchResultChunk,
  Workspace,
} from '../types';
import {
  DEFAULT_MODEL_NAME,
  DEFAULT_OLLAMA_ENDPOINT,
  EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
} from './ollama';
import {
  saveChunksSqlite,
  searchChunksFts5Sqlite,
  saveHistorySqlite,
  getHistorySqlite,
  deleteHistorySqlite,
} from './tauriBridge';

/**
 * Standard BM25 text ranker for local SQLite FTS5 search
 */
export function bm25RankChunks(
  chunks: ChunkRecord[],
  query: string,
  limit = 8
): SearchResultChunk[] {
  if (!query || query.trim().length === 0 || chunks.length === 0) {
    return [];
  }

  // Tokenize query into alphanumeric words (case-insensitive)
  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (queryTokens.length === 0) {
    return [];
  }

  const N = chunks.length;
  // Calculate document frequency (df) for each token
  const dfMap = new Map<string, number>();

  // Tokenize each chunk
  const chunkDocs = chunks.map((c) => {
    const text = `${c.content} ${c.citation_label} ${c.source_file_name}`.toLowerCase();
    const tokens = text.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const tokenCounts = new Map<string, number>();
    for (const t of tokens) {
      tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
    }
    return {
      chunk: c,
      tokenCounts,
      length: tokens.length,
    };
  });

  const avgDocLength =
    chunkDocs.reduce((acc, d) => acc + d.length, 0) / (N || 1);

  for (const token of queryTokens) {
    let count = 0;
    for (const doc of chunkDocs) {
      if (doc.tokenCounts.has(token)) {
        count++;
      }
    }
    dfMap.set(token, count);
  }

  const k1 = 1.2;
  const b = 0.75;

  const scored: { chunk: ChunkRecord; score: number }[] = [];

  for (const doc of chunkDocs) {
    let docScore = 0;
    let matchedTokenCount = 0;

    for (const token of queryTokens) {
      const tf = doc.tokenCounts.get(token) || 0;
      if (tf > 0) {
        matchedTokenCount++;
        const df = dfMap.get(token) || 0;
        // Standard Lucene/BM25 IDF
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (doc.length / (avgDocLength || 1)));
        docScore += idf * (numerator / denominator);
      }
    }

    // Only include chunks with at least one matching term
    if (matchedTokenCount > 0 && docScore > 0) {
      scored.push({ chunk: doc.chunk, score: docScore });
    }
  }

  // Sort descending by BM25 score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => ({
    id: item.chunk.id,
    workspace_id: item.chunk.workspace_id,
    file_id: item.chunk.file_id,
    content: item.chunk.content,
    citation_label: item.chunk.citation_label,
    source_file_name: item.chunk.source_file_name,
    score: item.score,
  }));
}

/**
 * In-memory local SQLite state store (synchronized with persistent storage)
 */
class LocalBriefDatabase {
  private workspaces: Map<string, Workspace> = new Map();
  private files: Map<string, FileRecord[]> = new Map(); // workspaceId -> FileRecord[]
  private chunks: Map<string, ChunkRecord[]> = new Map(); // workspaceId -> ChunkRecord[]
  private history: HistoryRecord[] = [];
  private settings: ModelSettings = {
    endpoint: DEFAULT_OLLAMA_ENDPOINT,
    model_name: DEFAULT_MODEL_NAME,
    is_local_only: true,
    status: 'untested',
  };

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const storedWorkspaces = localStorage.getItem('localbrief_workspaces');
      if (storedWorkspaces) {
        const list: Workspace[] = JSON.parse(storedWorkspaces);
        list.forEach((w) => this.workspaces.set(w.id, w));
      }

      const storedFiles = localStorage.getItem('localbrief_files');
      if (storedFiles) {
        const mapObj = JSON.parse(storedFiles);
        Object.keys(mapObj).forEach((wsId) => {
          this.files.set(wsId, mapObj[wsId]);
        });
      }

      const storedChunks = localStorage.getItem('localbrief_chunks');
      if (storedChunks) {
        const mapObj = JSON.parse(storedChunks);
        Object.keys(mapObj).forEach((wsId) => {
          this.chunks.set(wsId, mapObj[wsId]);
        });
      }

      const storedHistory = localStorage.getItem('localbrief_history');
      if (storedHistory) {
        this.history = JSON.parse(storedHistory);
      }

      const storedSettings = localStorage.getItem('localbrief_settings');
      if (storedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(storedSettings) };
      }
    } catch {
      // Ignore local storage parsing error
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(
        'localbrief_workspaces',
        JSON.stringify(Array.from(this.workspaces.values()))
      );

      const filesObj: Record<string, FileRecord[]> = {};
      this.files.forEach((v, k) => {
        filesObj[k] = v;
      });
      localStorage.setItem('localbrief_files', JSON.stringify(filesObj));

      const chunksObj: Record<string, ChunkRecord[]> = {};
      this.chunks.forEach((v, k) => {
        chunksObj[k] = v;
      });
      localStorage.setItem('localbrief_chunks', JSON.stringify(chunksObj));

      localStorage.setItem('localbrief_history', JSON.stringify(this.history));
      localStorage.setItem('localbrief_settings', JSON.stringify(this.settings));
    } catch {
      // Local storage quota or unavailable
    }
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).sort(
      (a, b) => b.created_at - a.created_at
    );
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) || null;
  }

  async createWorkspace(name: string, folderPath: string): Promise<Workspace> {
    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workspace: Workspace = {
      id,
      name: name.trim(),
      folder_path: folderPath.trim(),
      indexed_count: 0,
      skipped_count: 0,
      status: 'Indexing',
      last_indexed_at: null,
      created_at: Date.now(),
    };
    this.workspaces.set(id, workspace);
    this.saveToLocalStorage();
    return workspace;
  }

  async updateWorkspace(
    id: string,
    updates: Partial<Workspace>
  ): Promise<Workspace | null> {
    const ws = this.workspaces.get(id);
    if (!ws) return null;
    const updated = { ...ws, ...updates };
    this.workspaces.set(id, updated);
    this.saveToLocalStorage();
    return updated;
  }

  async saveFiles(workspaceId: string, files: FileRecord[]): Promise<void> {
    this.files.set(workspaceId, files);
    this.saveToLocalStorage();
  }

  async getWorkspaceFiles(workspaceId: string): Promise<FileRecord[]> {
    return this.files.get(workspaceId) || [];
  }

  async saveChunks(workspaceId: string, chunks: ChunkRecord[]): Promise<void> {
    this.chunks.set(workspaceId, chunks);
    // Persist to native SQLite FTS5 tables via Tauri
    await saveChunksSqlite(workspaceId, chunks);
    this.saveToLocalStorage();
  }

  async getWorkspaceChunks(workspaceId: string): Promise<ChunkRecord[]> {
    return this.chunks.get(workspaceId) || [];
  }

  async searchChunksFts5(
    workspaceId: string,
    query: string,
    limit = 8
  ): Promise<SearchResultChunk[]> {
    // 1. Try native SQLite FTS5 BM25 search via Tauri
    const sqliteResults = await searchChunksFts5Sqlite(workspaceId, query, limit);
    if (sqliteResults !== null) {
      return sqliteResults;
    }

    // 2. In-memory / web fallback with BM25 ranker
    const chunks = this.chunks.get(workspaceId) || [];
    return bm25RankChunks(chunks, query, limit);
  }

  async saveHistory(
    entry: Omit<HistoryRecord, 'id' | 'created_at'>
  ): Promise<HistoryRecord> {
    const id = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newEntry: HistoryRecord = {
      ...entry,
      id,
      created_at: Date.now(),
    };
    this.history.unshift(newEntry);
    await saveHistorySqlite(newEntry);
    this.saveToLocalStorage();
    return newEntry;
  }

  async getHistory(workspaceId?: string): Promise<HistoryRecord[]> {
    const sqliteHistory = await getHistorySqlite(workspaceId);
    if (sqliteHistory !== null && sqliteHistory.length > 0) {
      return sqliteHistory;
    }
    if (workspaceId) {
      return this.history.filter((h) => h.workspace_id === workspaceId);
    }
    return [...this.history];
  }

  async deleteHistory(id: string): Promise<void> {
    this.history = this.history.filter((h) => h.id !== id);
    await deleteHistorySqlite(id);
    this.saveToLocalStorage();
  }

  async getModelSettings(): Promise<ModelSettings> {
    return { ...this.settings };
  }

  async saveModelSettings(
    settings: Partial<ModelSettings>
  ): Promise<ModelSettings> {
    this.settings = {
      ...this.settings,
      ...settings,
      is_local_only: true, // Always enforce local-only
    };
    this.saveToLocalStorage();
    return { ...this.settings };
  }

  // Clear for testing
  clear() {
    this.workspaces.clear();
    this.files.clear();
    this.chunks.clear();
    this.history = [];
    this.settings = {
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
      model_name: DEFAULT_MODEL_NAME,
      is_local_only: true,
      status: 'untested',
    };
  }
}

export const db = new LocalBriefDatabase();

import { ScannedFileInfo } from './scanner';
import { ChunkRecord, HistoryRecord, SearchResultChunk } from '../types';

/**
 * Detects if the app is currently running inside Tauri
 */
export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

/**
 * Opens folder selection dialog
 */
export async function pickFolder(): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Workspace Folder',
      });
      return typeof selected === 'string' ? selected : null;
    } catch {
      // Fallback
    }
  }
  // Web fallback: prompt user
  const input = window.prompt(
    'Enter absolute local folder path (e.g. C:\\Documents\\Clients):'
  );
  return input && input.trim().length > 0 ? input.trim() : null;
}

/**
 * Opens save file dialog
 */
export async function pickSavePath(
  defaultName: string,
  extension: string
): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selected = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Document', extensions: [extension] }],
      });
      return selected;
    } catch {
      // Fallback
    }
  }
  return defaultName;
}

/**
 * Opens a local file in its default system application (Acrobat, Word, PowerPoint, Excel)
 */
export async function openFileInDefaultApp(filePath: string, artifactId?: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_file_in_default_app', { filePath });
      return true;
    } catch (e) {
      console.error('Tauri open_file_in_default_app failed:', e);
    }
  }

  // Web browser fallback: ask local daemon (localhost:8765) to launch the file on Windows
  if (artifactId) {
    try {
      const res = await fetch(`http://127.0.0.1:8765/api/artifacts/${artifactId}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data && data.success) {
        return true;
      }
    } catch (e) {
      console.warn('Daemon open_artifact failed:', e);
    }
  }
  return false;
}

/**
 * Universally downloads or saves an artifact.
 * In Tauri desktop environment, prompts a native Save As dialog and copies/writes the file cleanly.
 * In browser environment, uses a same-origin Blob download.
 */
export async function downloadArtifactFile(
  url: string,
  filename: string,
  localFilePath?: string
): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const ext = filename.split('.').pop() || 'pdf';
      const destPath = await pickSavePath(filename, ext);
      if (!destPath) {
        return null; // User cancelled
      }

      const { invoke } = await import('@tauri-apps/api/core');

      // 1. Direct copy if local file is available
      if (localFilePath) {
        try {
          await invoke('copy_file_to', { sourcePath: localFilePath, destPath });
          return destPath;
        } catch (copyErr) {
          console.warn('Native copy_file_to failed, falling back to writing fetched bytes:', copyErr);
        }
      }

      // 2. Fetch binary stream and write via save_export_file
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      await invoke('save_export_file', { path: destPath, data: bytes });
      return destPath;
    } catch (err) {
      console.warn('Tauri native save failed, falling back to browser download:', err);
    }
  }

  // Web fallback: blob download
  try {
    const res = await fetch(url);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.message) msg = errJson.message;
      } catch {}
      throw new Error(msg);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errJson = await res.json();
      throw new Error(errJson.message || 'Server returned an error');
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    return filename;
  } catch (err: any) {
    console.warn('Download error:', err);
    alert(`Download failed: ${err.message || err}`);
    return null;
  }
}

/**
 * Opens folder in Windows File Explorer
 */
export async function openFolderInExplorer(folderPath: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_folder_in_explorer', { folderPath });
      return;
    } catch {
      // Fallback to plugin shell
    }
  }
  alert(`Open source folder: ${folderPath}`);
}

/**
 * Creates default FileDataProvider
 */
export function createDefaultFileDataProvider(): {
  readTextFile: (path: string) => Promise<string>;
  readBinaryFile: (path: string) => Promise<Uint8Array>;
  scanDirectory: (dirPath: string) => Promise<ScannedFileInfo[]>;
} {
  return {
    readTextFile: async (path: string) => {
      if (isTauriEnvironment()) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<string>('read_text_file', { path });
      }
      return '';
    },
    readBinaryFile: async (path: string) => {
      if (isTauriEnvironment()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const buffer = await invoke<number[]>('read_binary_file', { path });
        return new Uint8Array(buffer);
      }
      return new Uint8Array();
    },
    scanDirectory: async (dirPath: string) => {
      if (isTauriEnvironment()) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ScannedFileInfo[]>('scan_directory', { dirPath });
      }
      return [];
    },
  };
}

/**
 * Retrieves the unpredictable 32-byte session token from Tauri RuntimeManager
 */
export async function getIpcSessionToken(): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const token = await invoke<string | null>('get_ipc_session_token');
      return token || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Invokes native daemon restart through Tauri RuntimeManager
 */
export async function restartRuntimeDaemon(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('restart_runtime_daemon');
      return true;
    } catch (e) {
      console.warn('restart_runtime_daemon failed:', e);
    }
  }
  return false;
}

/**
 * Searches chunks using SQLite FTS5 with BM25 ranking via Tauri
 */
export async function searchChunksFts5Sqlite(
  workspaceId: string,
  query: string,
  limit: number = 8
): Promise<SearchResultChunk[] | null> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const results = await invoke<any[]>('search_chunks_cmd', {
        workspaceId,
        query,
        limit,
      });
      if (Array.isArray(results)) {
        return results.map((r) => ({
          id: r.id,
          workspace_id: r.workspace_id,
          file_id: r.file_id,
          content: r.content,
          citation_label: r.citation_label,
          source_file_name: r.source_file_name,
          score: typeof r.rank === 'number' ? Math.abs(r.rank) : 1.0,
        }));
      }
    } catch (e) {
      console.warn('searchChunksFts5Sqlite invocation error:', e);
    }
  }
  return null;
}

/**
 * Saves chunks transactionally into SQLite `chunks` and `chunks_fts` virtual table
 */
export async function saveChunksSqlite(
  workspaceId: string,
  chunks: ChunkRecord[]
): Promise<number | null> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<number>('save_chunks_cmd', {
        workspaceId,
        chunks: chunks.map((c) => ({
          id: c.id,
          workspace_id: c.workspace_id,
          file_id: c.file_id,
          chunk_index: c.chunk_index,
          content: c.content,
          citation_label: c.citation_label,
          source_file_name: c.source_file_name,
          page_number: c.page_number ?? null,
          paragraph_number: c.paragraph_number ?? null,
          heading: c.heading ?? null,
        })),
      });
    } catch (e) {
      console.warn('saveChunksSqlite invocation error:', e);
    }
  }
  return null;
}

/**
 * Deletes chunks for a specific file from SQLite
 */
export async function deleteFileChunksSqlite(
  workspaceId: string,
  fileId: string
): Promise<number | null> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<number>('delete_file_chunks_cmd', {
        workspaceId,
        fileId,
      });
    } catch (e) {
      console.warn('deleteFileChunksSqlite invocation error:', e);
    }
  }
  return null;
}

/**
 * Saves history turn to SQLite history table
 */
export async function saveHistorySqlite(
  entry: HistoryRecord
): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_history_cmd', {
        entry: {
          id: entry.id,
          workspace_id: entry.workspace_id,
          workspace_name: entry.workspace_name,
          entry_type: entry.entry_type,
          prompt: entry.prompt,
          response: entry.response,
          citations_json: JSON.stringify(entry.citations || []),
          has_uncited_warning: entry.has_uncited_warning || false,
          created_at: entry.created_at,
        },
      });
      return true;
    } catch (e) {
      console.warn('saveHistorySqlite invocation error:', e);
    }
  }
  return false;
}

/**
 * Retrieves history turns from SQLite
 */
export async function getHistorySqlite(
  workspaceId?: string
): Promise<HistoryRecord[] | null> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const rows = await invoke<any[]>('get_history_cmd', {
        workspaceId: workspaceId || null,
      });
      if (Array.isArray(rows)) {
        return rows.map((r) => {
          let citations: any[] = [];
          try {
            citations = JSON.parse(r.citations_json);
          } catch {}
          return {
            id: r.id,
            workspace_id: r.workspace_id,
            workspace_name: r.workspace_name,
            entry_type: r.entry_type,
            prompt: r.prompt,
            response: r.response,
            citations,
            has_uncited_warning: r.has_uncited_warning,
            created_at: r.created_at,
          };
        });
      }
    } catch (e) {
      console.warn('getHistorySqlite invocation error:', e);
    }
  }
  return null;
}

/**
 * Deletes history turn from SQLite
 */
export async function deleteHistorySqlite(id: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('delete_history_cmd', { id });
    } catch (e) {
      console.warn('deleteHistorySqlite invocation error:', e);
    }
  }
  return false;
}

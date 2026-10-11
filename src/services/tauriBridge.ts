import { ScannedFileInfo } from './scanner';

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
        headers: { 'Content-Type': 'application/json' },
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

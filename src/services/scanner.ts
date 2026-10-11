import { FileRecord } from '../types';

export const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.cache',
  'dist',
  'build',
  '$recycle.bin',
  'system volume information',
]);

export const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx', 'md', 'txt']);

export const LIMITS = {
  MAX_SUPPORTED_FILES: 500,
  MAX_TOTAL_SIZE_BYTES: 300 * 1024 * 1024, // 300 MB
  MAX_SINGLE_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
};

export interface ScannedFileInfo {
  name: string;
  relative_path: string;
  extension: string;
  size_bytes: number;
  modified_at: number;
}

/**
 * Checks whether a directory name matches any excluded directories
 */
export function isDirectorySkipped(dirName: string): boolean {
  return SKIPPED_DIRECTORIES.has(dirName.toLowerCase());
}

/**
 * Checks whether a file extension is supported
 */
export function isSupportedExtension(extension: string): boolean {
  const cleanExt = extension.replace(/^\./, '').toLowerCase();
  return SUPPORTED_EXTENSIONS.has(cleanExt);
}

/**
 * Categorizes and sorts raw scanned files, applying workspace limits in case-insensitive path order.
 * - Max 500 supported files.
 * - Max total supported-file size: 300 MB.
 * - Max single-file size: 25 MB.
 * - Index eligible files in case-insensitive path order.
 * - Stop before exceeding a limit.
 * - Show all unindexed files in "Skipped files" with reason "Workspace limit reached."
 * - Unsupported files shown with "Unsupported file type."
 */
export function processWorkspaceFiles(
  workspaceId: string,
  rawFiles: ScannedFileInfo[]
): {
  eligibleFiles: FileRecord[];
  skippedFiles: FileRecord[];
  allFiles: FileRecord[];
} {
  const eligibleFiles: FileRecord[] = [];
  const skippedFiles: FileRecord[] = [];

  const supported: ScannedFileInfo[] = [];
  const unsupported: ScannedFileInfo[] = [];

  for (const f of rawFiles) {
    const ext = f.extension.replace(/^\./, '').toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) {
      supported.push(f);
    } else {
      unsupported.push(f);
    }
  }

  // Mark all unsupported files as skipped
  for (const f of unsupported) {
    const ext = f.extension.replace(/^\./, '').toLowerCase();
    const record: FileRecord = {
      id: `${workspaceId}_${f.relative_path}`,
      workspace_id: workspaceId,
      name: f.name,
      relative_path: f.relative_path,
      file_type: ext || 'unknown',
      size_bytes: f.size_bytes,
      modified_at: f.modified_at,
      index_status: 'Skipped',
      skip_reason: 'Unsupported file type',
      created_at: Date.now(),
    };
    skippedFiles.push(record);
  }

  // Sort supported files in case-insensitive path order
  supported.sort((a, b) =>
    a.relative_path.toLowerCase().localeCompare(b.relative_path.toLowerCase())
  );

  let currentTotalSize = 0;
  let indexedCount = 0;
  let limitExceeded = false;

  for (const f of supported) {
    const ext = f.extension.replace(/^\./, '').toLowerCase();
    const baseRecord: Omit<FileRecord, 'index_status' | 'skip_reason'> = {
      id: `${workspaceId}_${f.relative_path}`,
      workspace_id: workspaceId,
      name: f.name,
      relative_path: f.relative_path,
      file_type: ext as 'pdf' | 'docx' | 'md' | 'txt',
      size_bytes: f.size_bytes,
      modified_at: f.modified_at,
      created_at: Date.now(),
    };

    // If limits already hit, remaining files are unindexed with "Workspace limit reached."
    if (limitExceeded) {
      skippedFiles.push({
        ...baseRecord,
        index_status: 'Skipped',
        skip_reason: 'Workspace limit reached.',
      });
      continue;
    }

    // Check single file size limit
    if (f.size_bytes > LIMITS.MAX_SINGLE_FILE_SIZE_BYTES) {
      skippedFiles.push({
        ...baseRecord,
        index_status: 'Skipped',
        skip_reason: 'Workspace limit reached.',
      });
      continue;
    }

    // Check file count limit and total size limit before adding
    if (
      indexedCount + 1 > LIMITS.MAX_SUPPORTED_FILES ||
      currentTotalSize + f.size_bytes > LIMITS.MAX_TOTAL_SIZE_BYTES
    ) {
      limitExceeded = true;
      skippedFiles.push({
        ...baseRecord,
        index_status: 'Skipped',
        skip_reason: 'Workspace limit reached.',
      });
      continue;
    }

    // File is eligible for indexing
    indexedCount++;
    currentTotalSize += f.size_bytes;
    eligibleFiles.push({
      ...baseRecord,
      index_status: 'Indexed',
    });
  }

  const allFiles = [...eligibleFiles, ...skippedFiles];
  return { eligibleFiles, skippedFiles, allFiles };
}

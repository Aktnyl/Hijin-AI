import { ChunkRecord, FileRecord, Workspace } from '../types';
import { db } from './db';
import {
  extractDocx,
  extractMarkdown,
  extractPdf,
  extractPlainText,
} from './extractor';
import { processWorkspaceFiles, ScannedFileInfo } from './scanner';

export interface FileDataProvider {
  readTextFile: (path: string) => Promise<string>;
  readBinaryFile: (path: string) => Promise<Uint8Array>;
  scanDirectory: (dirPath: string) => Promise<ScannedFileInfo[]>;
}

/**
 * Indexes a workspace using the provided file data provider
 */
export async function indexWorkspace(
  workspace: Workspace,
  provider: FileDataProvider
): Promise<{
  indexedCount: number;
  skippedCount: number;
  status: Workspace['status'];
}> {
  // Update status to Indexing
  await db.updateWorkspace(workspace.id, { status: 'Indexing' });

  try {
    // 1. Scan directory
    const rawFiles = await provider.scanDirectory(workspace.folder_path);

    // 2. Filter and apply limits in case-insensitive path order
    const { eligibleFiles, skippedFiles } = processWorkspaceFiles(
      workspace.id,
      rawFiles
    );

    const allChunks: ChunkRecord[] = [];
    const finalFiles: FileRecord[] = [...skippedFiles];

    // 3. Extract text from eligible files
    for (const file of eligibleFiles) {
      const fullPath = `${workspace.folder_path}/${file.relative_path}`.replace(
        /\\/g,
        '/'
      );

      try {
        let extractedResult;
        const ext = file.file_type.toLowerCase();

        if (ext === 'pdf') {
          const bytes = await provider.readBinaryFile(fullPath);
          extractedResult = await extractPdf(file.name, bytes);
        } else if (ext === 'docx') {
          const bytes = await provider.readBinaryFile(fullPath);
          extractedResult = await extractDocx(file.name, bytes);
        } else if (ext === 'md') {
          const text = await provider.readTextFile(fullPath);
          extractedResult = extractMarkdown(file.name, text);
        } else if (ext === 'txt') {
          const text = await provider.readTextFile(fullPath);
          extractedResult = extractPlainText(file.name, text);
        } else {
          finalFiles.push({
            ...file,
            index_status: 'Skipped',
            skip_reason: 'Unsupported file type',
          });
          continue;
        }

        if (extractedResult.is_skipped) {
          finalFiles.push({
            ...file,
            index_status: 'Skipped',
            skip_reason:
              extractedResult.skip_reason ||
              'Scanned PDF; OCR is not available in version 1.',
          });
        } else {
          finalFiles.push(file);

          // Convert sections to ChunkRecords
          extractedResult.sections.forEach((sec, idx) => {
            allChunks.push({
              id: `${file.id}_chk_${idx}`,
              workspace_id: workspace.id,
              file_id: file.id,
              chunk_index: idx,
              content: sec.content,
              citation_label: sec.citation_label,
              source_file_name: file.name,
              page_number: sec.page_number,
              paragraph_number: sec.paragraph_number,
              heading: sec.heading,
            });
          });
        }
      } catch (err: any) {
        // Failed extraction treated as skipped with reason
        finalFiles.push({
          ...file,
          index_status: 'Skipped',
          skip_reason: `Extraction error: ${err.message || 'Unable to read file'}`,
        });
      }
    }

    const indexedCount = finalFiles.filter(
      (f) => f.index_status === 'Indexed'
    ).length;
    const skippedCount = finalFiles.filter(
      (f) => f.index_status === 'Skipped'
    ).length;

    // Ensure finalFiles is sorted in case-insensitive path order
    finalFiles.sort((a, b) =>
      a.relative_path.toLowerCase().localeCompare(b.relative_path.toLowerCase())
    );

    // Save to local database
    await db.saveFiles(workspace.id, finalFiles);
    await db.saveChunks(workspace.id, allChunks);

    const status: Workspace['status'] =
      indexedCount > 0 ? 'Ready' : 'Needs attention';

    await db.updateWorkspace(workspace.id, {
      indexed_count: indexedCount,
      skipped_count: skippedCount,
      status,
      last_indexed_at: Date.now(),
    });

    return { indexedCount, skippedCount, status };
  } catch (err) {
    await db.updateWorkspace(workspace.id, {
      status: 'Needs attention',
    });
    throw err;
  }
}

import { describe, expect, it } from 'vitest';
import {
  isDirectorySkipped,
  isSupportedExtension,
  LIMITS,
  processWorkspaceFiles,
  ScannedFileInfo,
  SKIPPED_DIRECTORIES,
} from '../src/services/scanner';

describe('Scanner and Directory Filtering', () => {
  it('skips all excluded directories in a case-insensitive manner', () => {
    const forbidden = [
      '.git',
      '.GIT',
      'node_modules',
      'NODE_MODULES',
      '.cache',
      'dist',
      'build',
      '$RECYCLE.BIN',
      '$recycle.bin',
      'System Volume Information',
      'system volume information',
    ];

    for (const dir of forbidden) {
      expect(isDirectorySkipped(dir)).toBe(true);
    }

    const allowed = ['documents', 'proposals', 'client_notes', 'Briefs'];
    for (const dir of allowed) {
      expect(isDirectorySkipped(dir)).toBe(false);
    }
  });

  it('correctly identifies supported extensions (.pdf, .docx, .md, .txt)', () => {
    expect(isSupportedExtension('pdf')).toBe(true);
    expect(isSupportedExtension('.pdf')).toBe(true);
    expect(isSupportedExtension('DOCX')).toBe(true);
    expect(isSupportedExtension('.docx')).toBe(true);
    expect(isSupportedExtension('md')).toBe(true);
    expect(isSupportedExtension('.MD')).toBe(true);
    expect(isSupportedExtension('txt')).toBe(true);
    expect(isSupportedExtension('.TXT')).toBe(true);

    // Unsupported extensions
    expect(isSupportedExtension('exe')).toBe(false);
    expect(isSupportedExtension('xlsx')).toBe(false);
    expect(isSupportedExtension('png')).toBe(false);
    expect(isSupportedExtension('zip')).toBe(false);
  });
});

describe('Workspace Limits Enforcement', () => {
  it('marks unsupported files as skipped with "Unsupported file type"', () => {
    const rawFiles: ScannedFileInfo[] = [
      {
        name: 'logo.png',
        relative_path: 'assets/logo.png',
        extension: 'png',
        size_bytes: 1024,
        modified_at: Date.now(),
      },
      {
        name: 'budget.xlsx',
        relative_path: 'finances/budget.xlsx',
        extension: 'xlsx',
        size_bytes: 5000,
        modified_at: Date.now(),
      },
    ];

    const result = processWorkspaceFiles('test_ws', rawFiles);
    expect(result.eligibleFiles).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(2);
    expect(result.skippedFiles[0].skip_reason).toBe('Unsupported file type');
    expect(result.skippedFiles[1].skip_reason).toBe('Unsupported file type');
  });

  it('sorts supported files in case-insensitive path order', () => {
    const rawFiles: ScannedFileInfo[] = [
      {
        name: 'zebra.txt',
        relative_path: 'Zebra.txt',
        extension: 'txt',
        size_bytes: 100,
        modified_at: Date.now(),
      },
      {
        name: 'apple.txt',
        relative_path: 'apple.txt',
        extension: 'txt',
        size_bytes: 100,
        modified_at: Date.now(),
      },
      {
        name: 'Banana.txt',
        relative_path: 'Banana.txt',
        extension: 'txt',
        size_bytes: 100,
        modified_at: Date.now(),
      },
    ];

    const result = processWorkspaceFiles('test_ws', rawFiles);
    expect(result.eligibleFiles).toHaveLength(3);
    expect(result.eligibleFiles[0].name).toBe('apple.txt');
    expect(result.eligibleFiles[1].name).toBe('Banana.txt');
    expect(result.eligibleFiles[2].name).toBe('zebra.txt');
  });

  it('stops indexing when 500 files limit is exceeded and marks remainder as "Workspace limit reached."', () => {
    const rawFiles: ScannedFileInfo[] = [];
    for (let i = 0; i < 505; i++) {
      const pad = String(i).padStart(4, '0');
      rawFiles.push({
        name: `doc_${pad}.txt`,
        relative_path: `doc_${pad}.txt`,
        extension: 'txt',
        size_bytes: 100,
        modified_at: Date.now(),
      });
    }

    const result = processWorkspaceFiles('test_ws', rawFiles);
    expect(result.eligibleFiles).toHaveLength(500);
    expect(result.skippedFiles).toHaveLength(5);
    for (const skipped of result.skippedFiles) {
      expect(skipped.skip_reason).toBe('Workspace limit reached.');
    }
  });

  it('skips single files exceeding 25 MB with "Workspace limit reached."', () => {
    const rawFiles: ScannedFileInfo[] = [
      {
        name: 'small.pdf',
        relative_path: 'a_small.pdf',
        extension: 'pdf',
        size_bytes: 10 * 1024 * 1024, // 10 MB
        modified_at: Date.now(),
      },
      {
        name: 'huge.pdf',
        relative_path: 'b_huge.pdf',
        extension: 'pdf',
        size_bytes: 26 * 1024 * 1024, // 26 MB (> 25MB limit)
        modified_at: Date.now(),
      },
      {
        name: 'normal.md',
        relative_path: 'c_normal.md',
        extension: 'md',
        size_bytes: 1024,
        modified_at: Date.now(),
      },
    ];

    const result = processWorkspaceFiles('test_ws', rawFiles);
    expect(result.eligibleFiles).toHaveLength(2);
    expect(result.eligibleFiles[0].name).toBe('small.pdf');
    expect(result.eligibleFiles[1].name).toBe('normal.md');

    expect(result.skippedFiles).toHaveLength(1);
    expect(result.skippedFiles[0].name).toBe('huge.pdf');
    expect(result.skippedFiles[0].skip_reason).toBe('Workspace limit reached.');
  });

  it('stops indexing when total workspace size exceeds 300 MB', () => {
    const rawFiles: ScannedFileInfo[] = [];
    // 15 files of 20 MB each = 300 MB (each file under 25MB single limit)
    for (let i = 1; i <= 15; i++) {
      const pad = String(i).padStart(2, '0');
      rawFiles.push({
        name: `part_${pad}.pdf`,
        relative_path: `part_${pad}.pdf`,
        extension: 'pdf',
        size_bytes: 20 * 1024 * 1024, // 20 MB
        modified_at: Date.now(),
      });
    }

    // 16th file pushes total to 320 MB (> 300 MB limit)
    rawFiles.push({
      name: 'part_16.pdf',
      relative_path: 'part_16.pdf',
      extension: 'pdf',
      size_bytes: 20 * 1024 * 1024,
      modified_at: Date.now(),
    });

    const result = processWorkspaceFiles('test_ws', rawFiles);
    expect(result.eligibleFiles).toHaveLength(15);
    expect(result.skippedFiles).toHaveLength(1);
    expect(result.skippedFiles[0].name).toBe('part_16.pdf');
    expect(result.skippedFiles[0].skip_reason).toBe('Workspace limit reached.');
  });
});

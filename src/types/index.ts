export interface Workspace {
  id: string;
  name: string;
  folder_path: string;
  indexed_count: number;
  skipped_count: number;
  status: 'Ready' | 'Indexing' | 'Needs attention';
  last_indexed_at: number | null;
  created_at: number;
}

export interface FileRecord {
  id: string;
  workspace_id: string;
  name: string;
  relative_path: string;
  file_type: 'pdf' | 'docx' | 'md' | 'txt' | string;
  size_bytes: number;
  modified_at: number;
  index_status: 'Indexed' | 'Skipped';
  skip_reason?: string;
  created_at: number;
}

export interface ChunkRecord {
  id: string;
  workspace_id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  citation_label: string;
  source_file_name: string;
  page_number?: number;
  paragraph_number?: number;
  heading?: string;
}

export interface SearchResultChunk {
  id: string;
  workspace_id: string;
  file_id: string;
  content: string;
  citation_label: string;
  source_file_name: string;
  score?: number;
}

export interface HistoryRecord {
  id: string;
  workspace_id: string;
  workspace_name: string;
  entry_type: 'question' | 'client_brief' | 'proposal_draft';
  prompt: string;
  response: string;
  citations: string[];
  has_uncited_warning: boolean;
  created_at: number;
}

export interface ModelSettings {
  endpoint: string;
  model_name: string;
  is_local_only: boolean;
  status: 'connected' | 'disconnected' | 'untested';
  last_tested_at?: number;
  status_message?: string;
}

export interface ExtractionResult {
  content: string;
  citation_label: string;
  page_number?: number;
  paragraph_number?: number;
  heading?: string;
}

export interface ExtractedFileResult {
  is_skipped: boolean;
  skip_reason?: string;
  sections: ExtractionResult[];
}

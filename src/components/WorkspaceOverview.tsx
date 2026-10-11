import React, { useState } from 'react';
import { FileRecord, HistoryRecord, Workspace } from '../types';
import { AskTab } from './AskTab';
import { FilesTab } from './FilesTab';
import { GenerateTab } from './GenerateTab';
import { HistoryTab } from './HistoryTab';
import { BackIcon } from './common/Icons';

interface WorkspaceOverviewProps {
  workspace: Workspace;
  files: FileRecord[];
  history: HistoryRecord[];
  isIndexing: boolean;
  onReindex: () => Promise<void>;
  onOpenSourceFolder: () => Promise<void>;
  onBackToWorkspaces: () => void;
  onDeleteHistoryItem: (id: string) => Promise<void>;
  onSelectExportFolderDialog?: () => Promise<string | null>;
  onSaveFileDialog?: (
    defaultName: string,
    extension: string
  ) => Promise<string | null>;
}

type TabType = 'files' | 'ask' | 'generate' | 'history';

export const WorkspaceOverview: React.FC<WorkspaceOverviewProps> = ({
  workspace,
  files,
  history,
  isIndexing,
  onReindex,
  onOpenSourceFolder,
  onBackToWorkspaces,
  onDeleteHistoryItem,
  onSelectExportFolderDialog,
  onSaveFileDialog,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('files');

  return (
    <div>
      {/* Workspace Header */}
      <div
        style={{
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <button
            className="button"
            style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={onBackToWorkspaces}
          >
            <BackIcon size={13} />
            Back to Workspaces
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 600 }}>
                {workspace.name}
              </h1>
              <span
                className={`badge ${
                  workspace.status === 'Ready'
                    ? 'badge-ready'
                    : workspace.status === 'Indexing'
                    ? 'badge-indexing'
                    : 'badge-attention'
                }`}
              >
                {isIndexing ? 'Indexing...' : workspace.status}
              </span>
            </div>

            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
              }}
            >
              <strong>Folder path:</strong> {workspace.folder_path}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '10px',
                fontSize: '13px',
              }}
            >
              <div>
                <strong>Indexed files:</strong> {workspace.indexed_count}
              </div>
              <div>
                <strong>Skipped files:</strong> {workspace.skipped_count}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button"
              onClick={onOpenSourceFolder}
              title="Open the local folder in File Explorer"
            >
              Open source folder
            </button>
            <button
              className="button button-primary"
              onClick={onReindex}
              disabled={isIndexing}
            >
              {isIndexing ? 'Indexing workspace...' : 'Re-index workspace'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        <button
          className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files ({files.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'ask' ? 'active' : ''}`}
          onClick={() => setActiveTab('ask')}
        >
          Ask
        </button>
        <button
          className={`tab-button ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          Generate
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'files' && <FilesTab files={files} />}

        {activeTab === 'ask' && <AskTab workspace={workspace} />}

        {activeTab === 'generate' && (
          <GenerateTab
            workspace={workspace}
            onSelectExportFolderDialog={onSelectExportFolderDialog}
            onSaveFileDialog={onSaveFileDialog}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            history={history}
            onDeleteHistoryItem={onDeleteHistoryItem}
          />
        )}
      </div>
    </div>
  );
};

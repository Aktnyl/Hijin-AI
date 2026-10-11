import React, { useState } from 'react';
import { Workspace } from '../types';

interface WorkspacesScreenProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: (name: string, folderPath: string) => Promise<void>;
  onSelectFolderDialog?: () => Promise<string | null>;
}

export const WorkspacesScreen: React.FC<WorkspacesScreenProps> = ({
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  onSelectFolderDialog,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleBrowseFolder = async () => {
    if (onSelectFolderDialog) {
      const selected = await onSelectFolderDialog();
      if (selected) {
        setFolderPath(selected);
        if (!name) {
          // Default name to folder basename
          const parts = selected.replace(/\\/g, '/').split('/').filter(Boolean);
          if (parts.length > 0) {
            setName(parts[parts.length - 1]);
          }
        }
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }
    if (!folderPath.trim()) {
      setError('Folder path is required.');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      await onCreateWorkspace(name.trim(), folderPath.trim());
      setIsModalOpen(false);
      setName('');
      setFolderPath('');
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>Workspaces</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Manage client document workspaces. All files remain local on your machine.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
        >
          Create workspace
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="table-container empty-state">
          <div className="empty-state-title">No workspaces created yet</div>
          <div className="empty-state-text">
            Create a workspace from a local folder containing your client documents.
          </div>
          <button
            className="button button-primary"
            onClick={() => setIsModalOpen(true)}
          >
            Create workspace
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Workspace name</th>
                <th>Indexed files</th>
                <th>Last indexed</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td style={{ fontWeight: 500 }}>
                    <span
                      style={{
                        cursor: 'pointer',
                        color: 'var(--accent-color)',
                        textDecoration: 'underline',
                      }}
                      onClick={() => onSelectWorkspace(ws)}
                    >
                      {ws.name}
                    </span>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontWeight: 'normal',
                      }}
                    >
                      {ws.folder_path}
                    </div>
                  </td>
                  <td>{ws.indexed_count}</td>
                  <td>{formatTimestamp(ws.last_indexed_at)}</td>
                  <td>
                    <span
                      className={`badge ${
                        ws.status === 'Ready'
                          ? 'badge-ready'
                          : ws.status === 'Indexing'
                          ? 'badge-indexing'
                          : 'badge-attention'
                      }`}
                    >
                      {ws.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="button"
                      onClick={() => onSelectWorkspace(ws)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2 className="modal-title">Create Workspace</h2>
            <form onSubmit={handleCreateSubmit}>
              {error && <div className="alert-box alert-danger">{error}</div>}

              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  Workspace Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Acme Brand Strategy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  Local Folder Path
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="C:\path\to\documents"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button"
                    onClick={handleBrowseFolder}
                  >
                    Browse...
                  </button>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  LocalBrief scans PDF, DOCX, Markdown, and TXT files read-only.
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

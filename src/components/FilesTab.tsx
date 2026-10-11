import React, { useState } from 'react';
import { FileRecord } from '../types';

interface FilesTabProps {
  files: FileRecord[];
}

export const FilesTab: React.FC<FilesTabProps> = ({ files }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Indexed' | 'Skipped'>('all');

  const filtered = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.relative_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.skip_reason && f.skip_reason.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : f.index_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatModified = (ts: number) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search files by name or relative path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ width: '160px' }}>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All files ({files.length})</option>
            <option value="Indexed">
              Indexed ({files.filter((f) => f.index_status === 'Indexed').length})
            </option>
            <option value="Skipped">
              Skipped ({files.filter((f) => f.index_status === 'Skipped').length})
            </option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="table-container empty-state">
          <div className="empty-state-title">No matching files found</div>
          <div className="empty-state-text">
            {files.length === 0
              ? 'This workspace has no files yet.'
              : 'Try changing your search query or filter.'}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>File name</th>
                <th>Type</th>
                <th>Relative path</th>
                <th>Size</th>
                <th>Last modified</th>
                <th>Status</th>
                <th>Skip reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => (
                <tr key={file.id}>
                  <td style={{ fontWeight: 500 }}>{file.name}</td>
                  <td>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {file.file_type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {file.relative_path}
                  </td>
                  <td style={{ fontSize: '12px' }}>{formatBytes(file.size_bytes)}</td>
                  <td style={{ fontSize: '12px' }}>{formatModified(file.modified_at)}</td>
                  <td>
                    <span
                      className={`badge ${
                        file.index_status === 'Indexed'
                          ? 'badge-ready'
                          : 'badge-skipped'
                      }`}
                    >
                      {file.index_status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {file.skip_reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

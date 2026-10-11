import React, { useState } from 'react';
import { HistoryRecord } from '../types';

interface HistoryTabProps {
  history: HistoryRecord[];
  onDeleteHistoryItem: (id: string) => Promise<void>;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onDeleteHistoryItem,
}) => {
  const [selectedItem, setSelectedItem] = useState<HistoryRecord | null>(null);
  const [itemToDelete, setItemToDelete] = useState<HistoryRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatType = (type: HistoryRecord['entry_type']) => {
    switch (type) {
      case 'client_brief':
        return 'Client Brief';
      case 'proposal_draft':
        return 'Proposal Draft';
      case 'question':
      default:
        return 'Question';
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await onDeleteHistoryItem(itemToDelete.id);
      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null);
      }
      setItemToDelete(null);
    }
  };

  const handleCopy = async (item: HistoryRecord) => {
    try {
      await navigator.clipboard.writeText(item.response);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div>
      {history.length === 0 ? (
        <div className="table-container empty-state">
          <div className="empty-state-title">No history yet</div>
          <div className="empty-state-text">
            Questions asked and generated briefs or proposal drafts will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Prompt / Question</th>
                  <th>Creation time</th>
                  <th>Workspace</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        selectedItem?.id === item.id ? 'var(--bg-tertiary)' : undefined,
                    }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            item.entry_type === 'question'
                              ? 'var(--bg-tertiary)'
                              : 'var(--success-bg)',
                          color:
                            item.entry_type === 'question'
                              ? 'var(--text-secondary)'
                              : 'var(--success-text)',
                        }}
                      >
                        {formatType(item.entry_type)}
                      </span>
                    </td>
                    <td
                      style={{
                        fontWeight: 500,
                        maxWidth: '260px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.prompt}
                    </td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(item.created_at)}
                    </td>
                    <td style={{ fontSize: '12px' }}>{item.workspace_name}</td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="button button-danger"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => setItemToDelete(item)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedItem && (
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: 'var(--bg-primary)',
                height: 'fit-content',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{formatType(selectedItem.entry_type)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {formatTimestamp(selectedItem.created_at)} · {selectedItem.workspace_name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="button"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => handleCopy(selectedItem)}
                  >
                    {copiedId === selectedItem.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    className="button"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => setSelectedItem(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  PROMPT
                </div>
                <div style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '2px' }}>
                  {selectedItem.prompt}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  RESPONSE
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '4px',
                  }}
                >
                  {selectedItem.response}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {itemToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2 className="modal-title">Delete History Item</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Are you sure you want to permanently delete this {formatType(itemToDelete.entry_type).toLowerCase()} from history? This action cannot be undone.
            </p>
            <div
              style={{
                fontSize: '12px',
                padding: '10px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            >
              <strong>Prompt:</strong> {itemToDelete.prompt}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { networkStateService, NetworkActivityDetail } from '../../services/networkStateService';
import { ArtifactRecord, ConversationRecord } from '../../services/agentClient';
import {
  ChatIcon,
  ArtifactsIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  DeleteIcon,
  CloseIcon,
  SettingsIcon,
  SecurityIcon,
  CpuIcon,
  GpuIcon,
  FileCheckIcon,
  ActivityIcon,
  SpreadsheetIcon,
} from '../common/Icons';

interface LeftNavigationPanelProps {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  artifacts: ArtifactRecord[];
  activeArtifactId: string | null;
  onSelectArtifact: (art: ArtifactRecord) => void;
  onOpenSettings: () => void;
  onOpenModelHub?: () => void;
  isBackendConnected: boolean;
}

export const LeftNavigationPanel: React.FC<LeftNavigationPanelProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onOpenSettings,
  onOpenModelHub,
  isBackendConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'threads' | 'artifacts'>('threads');
  const [searchQuery, setSearchQuery] = useState('');
  const [networkDetail, setNetworkDetail] = useState<NetworkActivityDetail>(networkStateService.getDetail());
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  useEffect(() => {
    const unsub = networkStateService.subscribe(setNetworkDetail);
    return () => unsub();
  }, []);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Group conversations chronologically
  const groupedConversations = useMemo(() => {
    const now = Date.now();
    const oneDay = 86400 * 1000;
    const sevenDays = 7 * oneDay;

    const today: ConversationRecord[] = [];
    const yesterday: ConversationRecord[] = [];
    const pastWeek: ConversationRecord[] = [];
    const older: ConversationRecord[] = [];

    filteredConversations.forEach((conv) => {
      const ts = (conv.updated_at || conv.created_at || 0) * 1000;
      const diff = now - ts;
      if (diff < oneDay) {
        today.push(conv);
      } else if (diff < 2 * oneDay) {
        yesterday.push(conv);
      } else if (diff < sevenDays) {
        pastWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Previous 7 Days', items: pastWeek },
      { label: 'Older', items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredConversations]);

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    if (!searchQuery.trim()) return artifacts;
    const q = searchQuery.toLowerCase();
    return artifacts.filter(
      (a) =>
        a.filename.toLowerCase().includes(q) ||
        a.artifact_type.toLowerCase().includes(q)
    );
  }, [artifacts, searchQuery]);

  const handleStartRename = (e: React.MouseEvent, conv: ConversationRecord) => {
    e.stopPropagation();
    setRenamingId(conv.conversation_id);
    setRenameText(conv.title);
  };

  const handleSaveRename = (e: React.FormEvent, convId: string) => {
    e.preventDefault();
    if (renameText.trim()) {
      onRenameConversation(convId, renameText.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation thread?')) {
      onDeleteConversation(convId);
    }
  };

  return (
    <aside className="left-nav-sidebar">
      {/* Top Action: New Engagement Button */}
      <div className="left-nav-top-action">
        <button className="new-thread-btn" onClick={onNewChat} title="Start New Engagement (Ctrl+N)">
          <PlusIcon size={16} style={{ marginRight: 8 }} />
          <span>New Engagement</span>
          <span className="shortcut-hint">Ctrl N</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="left-nav-search-box">
        <SearchIcon size={14} className="search-icon-svg" />
        <input
          type="text"
          className="search-input-field"
          placeholder="Search engagements & files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
            <CloseIcon size={12} />
          </button>
        )}
      </div>

      {/* Tabs Switcher: Engagements vs Artifacts */}
      <div className="left-nav-tab-switcher">
        <button
          className={`nav-tab-btn ${activeTab === 'threads' ? 'active' : ''}`}
          onClick={() => setActiveTab('threads')}
        >
          <ChatIcon size={13} style={{ marginRight: 6 }} />
          <span>Engagements</span>
          <span className="tab-count-badge">{conversations.length}</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'artifacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('artifacts')}
        >
          <ArtifactsIcon size={13} style={{ marginRight: 6 }} />
          <span>Deliverables</span>
          <span className="tab-count-badge">{artifacts.length}</span>
        </button>
      </div>

      {/* Main List Container */}
      <div className="left-nav-scroll-list">
        {activeTab === 'threads' ? (
          filteredConversations.length === 0 ? (
            <div className="nav-empty-state">
              <span>No engagements found</span>
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label} className="nav-group-section">
                <div className="nav-group-header">{group.label}</div>
                <div className="nav-group-items">
                  {group.items.map((conv) => {
                    const isActive = conv.conversation_id === activeConversationId;
                    const isRenaming = renamingId === conv.conversation_id;

                    const specificTag =
                      conv.title?.toLowerCase().includes('m&a') || conv.title?.toLowerCase().includes('due diligence')
                        ? 'M&A Diligence'
                        : conv.title?.toLowerCase().includes('reconcil') || conv.title?.toLowerCase().includes('invoice')
                        ? 'Reconciliation'
                        : conv.title?.toLowerCase().includes('contract') || conv.title?.toLowerCase().includes('risk')
                        ? 'Contract Risk'
                        : null;

                    const msgCount = conv.messages?.length || 0;
                    const subLabel = specificTag ? specificTag : `${msgCount} message${msgCount !== 1 ? 's' : ''}`;

                    return (
                      <div
                        key={conv.conversation_id}
                        className={`thread-item-row ${isActive ? 'active' : ''}`}
                        onClick={() => onSelectConversation(conv.conversation_id)}
                      >
                        <ChatIcon size={14} className="thread-item-icon" />

                        {isRenaming ? (
                          <form
                            onSubmit={(e) => handleSaveRename(e, conv.conversation_id)}
                            className="thread-rename-form"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onBlur={(e) => handleSaveRename(e, conv.conversation_id)}
                              className="thread-rename-input"
                            />
                          </form>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, paddingRight: 6 }}>
                            <span className="thread-item-title" title={conv.title}>
                              {conv.title || 'Untitled Engagement'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {subLabel}
                            </span>
                          </div>
                        )}

                        <div className="thread-item-actions">
                          <button
                            type="button"
                            className="thread-action-btn"
                            onClick={(e) => handleStartRename(e, conv)}
                            title="Rename Thread"
                          >
                            <EditIcon size={12} />
                          </button>
                          <button
                            type="button"
                            className="thread-action-btn delete"
                            onClick={(e) => handleDelete(e, conv.conversation_id)}
                            title="Delete Thread"
                          >
                            <DeleteIcon size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )
        ) : (
          /* Artifacts View */
          filteredArtifacts.length === 0 ? (
            <div className="nav-empty-state">
              <span>No artifacts generated yet</span>
            </div>
          ) : (
            <div className="artifacts-list-container">
              {filteredArtifacts.map((art) => {
                const isActive = art.artifact_id === activeArtifactId;
                const ext = art.filename.split('.').pop()?.toLowerCase();
                return (
                  <div
                    key={art.artifact_id}
                    className={`artifact-item-row ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectArtifact(art)}
                  >
                    {ext === 'pptx' ? (
                      <ActivityIcon size={14} className="artifact-item-icon" />
                    ) : ext === 'csv' || ext === 'xlsx' ? (
                      <SpreadsheetIcon size={14} className="artifact-item-icon" />
                    ) : (
                      <FileCheckIcon size={14} className="artifact-item-icon" />
                    )}
                    <div className="artifact-item-info">
                      <span className="artifact-item-name" title={art.filename}>
                        {art.filename}
                      </span>
                      <span className="artifact-item-meta">
                        {ext?.toUpperCase() || art.artifact_type} · {Math.round((art.size_bytes || 0) / 1024)} KB
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Footer System Diagnostics Status & Privacy / Network Posture */}
      <div className="left-nav-footer" style={{ position: 'relative' }}>
        <div 
          className="footer-system-pill" 
          onClick={() => setShowNetworkInfo(!showNetworkInfo)}
          title="Click to inspect Network Posture & Telemetry Isolation"
          style={{ cursor: 'pointer' }}
        >
          <div className="sys-status-indicator">
            <span className={`sys-status-dot ${isBackendConnected ? 'live' : 'err'}`} />
            <span className="sys-status-label" style={{ fontWeight: 600 }}>
              {isBackendConnected ? networkDetail.state : 'OFFLINE'}
            </span>
          </div>
          <span className="sys-subtext">{networkDetail.subsystem.split('(')[0].trim()}</span>
        </div>

        {showNetworkInfo && (
          <div 
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 12,
              right: 12,
              marginBottom: 8,
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 100,
              fontSize: 11,
              color: '#94a3b8'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong style={{ color: '#f8fafc' }}>Network Posture: {networkDetail.state}</strong>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNetworkInfo(false); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                ?
              </button>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Subsystem: </span>
              <span style={{ color: '#e2e8f0' }}>{networkDetail.subsystem}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Activity: </span>
              <span style={{ color: '#e2e8f0' }}>{networkDetail.reason}</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Outbound: </span>
              <span style={{ color: '#38bdf8' }}>{networkDetail.dataTransmitted}</span>
            </div>
            <div style={{ padding: '6px 8px', background: 'rgba(56,189,248,0.06)', borderRadius: 4, color: '#38bdf8', fontSize: 10 }}>
              ??? {networkDetail.privacyGuarantee}
            </div>
          </div>
        )}

        {onOpenModelHub && (
          <button className="footer-settings-btn" onClick={onOpenModelHub} title="Model Store (Ctrl+M)">
            <CpuIcon size={15} style={{ color: '#38bdf8' }} />
          </button>
        )}
        <button className="footer-settings-btn" onClick={onOpenSettings} title="Preferences">
          <SettingsIcon size={15} />
        </button>
      </div>
    </aside>
  );
};

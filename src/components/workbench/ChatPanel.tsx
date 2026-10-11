import React, { useEffect, useRef, useState } from 'react';
import {
  ArtifactRecord,
  ConversationMessage,
  ConversationRecord,
  ModelView,
  TaskView,
} from '../../services/agentClient';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { ArtifactCard } from './ArtifactCard';
import {
  BrandIcon,
  AttachFileIcon,
  AttachImageIcon,
  SendIcon,
  StopIcon,
  CopyIcon,
  CheckIcon,
  VerifiedIcon,
  WarningIcon,
  CloseIcon,
  ActivityIcon,
  FileCheckIcon,
  ArtifactsIcon,
  ChartIcon,
  SparklesIcon,
} from '../common/Icons';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
  isImage?: boolean;
}

interface ChatPanelProps {
  conversation: ConversationRecord | null;
  onSendMessage: (text: string, attachments: AttachedFile[], modelId: string) => void;
  onCancelActiveTask: () => void;
  isExecuting: boolean;
  executingStatusLabel?: string;
  availableModels: ModelView[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenArtifact: (artifact: ArtifactRecord) => void;
  onInspectEvidence?: (evidence: { citation_id?: string; label: string; source_document: string; page_number?: number; excerpt: string }) => void;
  onRenameConversation?: (newTitle: string) => void;
  allArtifacts: ArtifactRecord[];
  activeTask?: TaskView | null;
  onApproveTask?: (taskId: string, stepId?: string, nonce?: string) => void;
  onRejectTask?: (taskId: string, stepId?: string, nonce?: string) => void;
  onRefineMessage?: (action: string, instruction?: string) => void;
}

interface TableSpecData {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
  alignment?: ('left' | 'center' | 'right')[];
}

const StructuredTableRenderer: React.FC<{ tables: TableSpecData[] }> = ({ tables }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!tables || tables.length === 0) return null;

  const copyTableAsTSV = (table: TableSpecData, idx: number) => {
    const header = table.columns.join('\t');
    const rows = table.rows.map((r) => r.join('\t')).join('\n');
    const fullTsv = `${header}\n${rows}`;
    navigator.clipboard.writeText(fullTsv);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isNumeric = (val: any): boolean => {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      const clean = val.trim().replace(/[$,%]/g, '');
      return !isNaN(Number(clean)) && clean.length > 0;
    }
    return false;
  };

  return (
    <div className="msg-structured-tables-wrap">
      {tables.map((table, tIdx) => (
        <div key={tIdx} className="structured-table-container">
          <div className="structured-table-header-bar">
            <div className="table-title-group">
              <span className="table-title-text">{table.title || 'Financial Data Table'}</span>
              <span className="table-meta-pill">
                {table.rows.length} rows · {table.columns.length} columns
              </span>
            </div>
            <button
              type="button"
              className="table-copy-tsv-btn"
              onClick={() => copyTableAsTSV(table, tIdx)}
              title="Copy table to clipboard for pasting into Excel or Google Sheets"
            >
              {copiedIndex === tIdx ? (
                <>
                  <CheckIcon size={12} style={{ color: '#10b981', marginRight: 4 }} />
                  <span>Copied for Excel!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={12} style={{ marginRight: 4 }} />
                  <span>Copy TSV</span>
                </>
              )}
            </button>
          </div>

          <div className="table-overflow-box">
            <table className="structured-table">
              <thead>
                <tr>
                  {table.columns.map((col, cIdx) => {
                    const align = table.alignment?.[cIdx] || (isNumeric(table.rows[0]?.[cIdx]) ? 'right' : 'left');
                    return (
                      <th key={cIdx} style={{ textAlign: align }}>
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => {
                      const num = isNumeric(cell);
                      const align = table.alignment?.[cIdx] || (num ? 'right' : 'left');
                      const cellStr = String(cell);
                      const isNegative = cellStr.startsWith('-') || cellStr.includes('-$') || cellStr.includes('(');
                      return (
                        <td
                          key={cIdx}
                          style={{ textAlign: align }}
                          className={`${num ? 'tabular-cell' : ''} ${isNegative ? 'cell-negative' : ''}`}
                        >
                          {cellStr}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const FinancialDiscrepancyCard: React.FC<{ calculations: any; isVerified?: boolean }> = ({
  calculations,
  isVerified,
}) => {
  if (!calculations) return null;

  const calcItem = Array.isArray(calculations) ? calculations[0] : calculations;
  if (!calcItem) return null;

  const expectedVal = calcItem.calculated_value ?? calcItem.expected_total;
  const statedVal = calcItem.stated_value ?? calcItem.stated_total;
  const rawVariance =
    calcItem.variance ?? (statedVal !== undefined && expectedVal !== undefined ? statedVal - expectedVal : 0);

  const varianceNum = typeof rawVariance === 'number' ? rawVariance : parseFloat(rawVariance || '0');
  const hasVariance = Math.abs(varianceNum) > 0.001;
  const isReconciled = calcItem.is_reconciled ?? !hasVariance;

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null) return 'N/A';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  return (
    <div className={`fin-discrepancy-card ${hasVariance ? 'has-discrepancy' : 'reconciled'}`}>
      <div className="fin-card-header">
        <div className="fin-card-title-group">
          <ActivityIcon size={16} className="fin-card-icon" />
          <span className="fin-card-title">Reconciliation & Variance Analysis</span>
        </div>

        <div className="fin-card-badge-group">
          <span className={`fin-status-pill ${hasVariance ? 'discrepancy' : 'reconciled'}`}>
            {hasVariance ? `● ${formatCurrency(Math.abs(varianceNum))} Discrepancy` : '✓ Balanced & Reconciled'}
          </span>
          {isVerified && (
            <span className="fin-verified-badge" title="Cryptographically verified by Deterministic Math Engine">
              <VerifiedIcon size={12} style={{ marginRight: 4 }} />
              Verified Math
            </span>
          )}
        </div>
      </div>

      <div className="fin-metrics-grid">
        <div className="fin-metric-cell">
          <span className="fin-metric-label">Stated in Document</span>
          <span className="fin-metric-value stated">{formatCurrency(statedVal)}</span>
          <span className="fin-metric-sub">Observed invoice total</span>
        </div>
        <div className="fin-metric-cell">
          <span className="fin-metric-label">Calculated / Expected</span>
          <span className="fin-metric-value expected">{formatCurrency(expectedVal)}</span>
          <span className="fin-metric-sub">Sum of subtotal + tax</span>
        </div>
        <div className="fin-metric-cell">
          <span className="fin-metric-label">Variance (Delta)</span>
          <span className={`fin-metric-value ${hasVariance ? 'variance-negative' : 'variance-zero'}`}>
            {formatCurrency(varianceNum)}
          </span>
          <span className="fin-metric-sub">
            {hasVariance ? (varianceNum > 0 ? 'Overstated' : 'Understated') : 'Exact Match (0.00)'}
          </span>
        </div>
      </div>

      {calcItem.formula_applied && (
        <div className="fin-card-formula">
          <span className="formula-label">Audit Verification Logic:</span>
          <code>{calcItem.formula_applied}</code>
        </div>
      )}
    </div>
  );
};

const EvidenceSourcesBlock: React.FC<{ citations: any[]; onInspect?: (c: any) => void }> = ({ citations, onInspect }) => {
  const [expanded, setExpanded] = useState(false);
  if (!citations || citations.length === 0) return null;

  return (
    <div className="msg-evidence-block">
      <button
        type="button"
        className="evidence-toggle-btn"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="evidence-badge">
          <FileCheckIcon size={13} style={{ color: 'var(--success)' }} />
          <span>{citations.length} verified evidence citation{citations.length > 1 ? 's' : ''} grounded</span>
        </span>
        <span className="evidence-expand-label">{expanded ? 'Hide Evidence ▴' : 'Inspect Evidence Sources ▾'}</span>
      </button>

      {expanded && (
        <div className="evidence-sources-list">
          {citations.map((c, i) => {
            const label = c.label || `Citation #${i + 1}`;
            const doc = c.source_document || 'Attached Document';
            const page = c.page_number ? `Page ${c.page_number}` : '';
            const excerpt = c.excerpt || (typeof c === 'string' ? c : '');
            return (
              <div
                key={i}
                className="evidence-item-card"
                onClick={() => onInspect && onInspect({ label, source_document: doc, page_number: c.page_number, excerpt })}
                style={{ cursor: onInspect ? 'pointer' : 'default' }}
                title={onInspect ? 'Click to inspect in side-by-side proof studio' : undefined}
              >
                <div className="evidence-item-header">
                  <span className="evidence-label-badge">{label}</span>
                  <span className="evidence-source-doc">{doc} {page && `· ${page}`}</span>
                  {onInspect && (
                    <span className="evidence-inspect-trigger" style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--brand-primary, #10b981)', fontWeight: 600 }}>
                      Side Proof →
                    </span>
                  )}
                </div>
                {excerpt && <div className="evidence-item-excerpt">"{excerpt}"</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  onSendMessage,
  onCancelActiveTask,
  isExecuting,
  executingStatusLabel,
  availableModels,
  selectedModel,
  onSelectModel,
  onOpenArtifact,
  onInspectEvidence,
  onRenameConversation,
  allArtifacts,
  activeTask,
  onApproveTask,
  onRejectTask,
  onRefineMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const prevMsgCountRef = useRef(conversation?.messages?.length || 0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // User is considered scrolled up if more than 160px from the bottom
    const isScrolledUp = distanceFromBottom > 160;
    setIsUserScrolledUp(isScrolledUp);
    if (!isScrolledUp) {
      setHasNewMessagesBelow(false);
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setIsUserScrolledUp(false);
    setHasNewMessagesBelow(false);
  };

  useEffect(() => {
    const currentCount = conversation?.messages?.length || 0;
    const hasNew = currentCount > prevMsgCountRef.current;
    prevMsgCountRef.current = currentCount;

    // ONLY auto-scroll if the user is not actively reading past history
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (hasNew) {
      setHasNewMessagesBelow(true);
    }
  }, [conversation?.messages?.length, isExecuting, isUserScrolledUp]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 46), 180);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if (!inputText.trim() && attachments.length === 0) return;
    onSendMessage(inputText, attachments, selectedModel);
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '46px';
    }
    setIsUserScrolledUp(false);
    setHasNewMessagesBelow(false);
    setTimeout(() => scrollToBottom(true), 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1] || '';
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isImg = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext);

        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            base64: b64,
            isImage: isImg,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleOpenNativeFileDialog = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Documents & Spreadsheets', extensions: ['pdf', 'csv', 'xlsx', 'txt', 'png', 'jpg', 'jpeg'] },
        ],
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const { invoke } = await import('@tauri-apps/api/core');
        for (const p of paths) {
          try {
            const bytes = await invoke<number[]>('read_binary_file', { path: p });
            const u8 = new Uint8Array(bytes);
            let binary = '';
            for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
            const b64 = btoa(binary);
            const fname = p.split(/[\\/]/).pop() || 'document';
            const ext = fname.split('.').pop()?.toLowerCase() || '';
            const mime = ext === 'pdf' ? 'application/pdf' : ext === 'csv' ? 'text/csv' : 'application/octet-stream';
            setAttachments((prev) => [
              ...prev,
              {
                id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: fname,
                size: bytes.length,
                type: mime,
                base64: b64,
                isImage: ['png', 'jpg', 'jpeg'].includes(ext),
              },
            ]);
          } catch {
            fileInputRef.current?.click();
          }
        }
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const copyMessageContent = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const formatMessageTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const promptStarters = [
    {
      title: 'Analyze a document',
      desc: 'Inspect an invoice, PDF contract, or dataset with verified page citations.',
      prompt: 'Analyze the attached document and provide key findings with evidence citations.',
      icon: <FileCheckIcon size={20} />,
    },
    {
      title: 'Reconcile financial data',
      desc: 'Verify expected total vs stated total with mathematical variance breakdown.',
      prompt: 'Reconcile the following accounts payable figures:\nSubtotal: $1,250.00\nTax: $125.00\nStated Total: $1,425.00',
      icon: <ActivityIcon size={20} />,
    },
    {
      title: 'Create an executive report',
      desc: 'Compile an audited business deliverable in verified DOCX, PDF, or PPTX format.',
      prompt: 'Create an executive vendor reconciliation report in PDF format.',
      icon: <ArtifactsIcon size={20} />,
    },
    {
      title: 'Advisory inquiry',
      desc: 'Inquire on accounting standards, ASC 606 revenue recognition, or GAAP compliance.',
      prompt: 'Explain how variable consideration and contract modifications are treated under ASC 606.',
      icon: <ChartIcon size={20} />,
    },
  ];

  const hasMessages = conversation && conversation.messages && conversation.messages.length > 0;

  return (
    <div
      className={`hero-canvas-container ${isDragging ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
          processFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={handleFileSelect}
      />

      {/* Drag & Drop Full Canvas Overlay */}
      {isDragging && (
        <div className="canvas-drag-overlay">
          <div className="canvas-drag-card">
            <AttachFileIcon size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
            <h3>Drop Documents Here to Ingest</h3>
            <p>PDF, XLSX, CSV, PNG, JPG (Supported up to 25 MB per file)</p>
          </div>
        </div>
      )}

      {/* Main Conversation Canvas Scroll Feed */}
      <div className="canvas-scroll-feed" ref={scrollContainerRef} onScroll={handleScroll}>
        <div className="canvas-content-column">
          {!hasMessages ? (
            /* Welcome / Zero-State Experience */
            <div className="canvas-welcome-hero">
              <div className="welcome-brand-badge">
                <div className="welcome-hero-avatar-ring">
                  <BrandIcon size={44} className="welcome-hero-brand" />
                </div>
                <h1 className="welcome-hero-headline">Hijin AI Workstation</h1>
                <p className="welcome-hero-sub">
                  On-device financial reconciliation, document intelligence, and executive artifact synthesis. Private, verified, and completely local.
                </p>

                <div className="welcome-feature-pills">
                  <span className="feat-pill">
                    <SparklesIcon size={12} style={{ color: 'var(--accent)', marginRight: 5 }} />
                    Gemma 3 + Financial Specialist
                  </span>
                  <span className="feat-pill">
                    <VerifiedIcon size={12} style={{ color: 'var(--success)', marginRight: 5 }} />
                    100% Offline Airgap
                  </span>
                  <span className="feat-pill">
                    <FileCheckIcon size={12} style={{ color: 'var(--accent-cyan)', marginRight: 5 }} />
                    Deterministic Math Guards
                  </span>
                </div>
              </div>

              {/* Starter Prompt Cards (2x2 Grid) */}
              <div className="welcome-prompt-cards-grid">
                {promptStarters.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="starter-card"
                    onClick={() => {
                      setInputText(item.prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span className="starter-card-icon">{item.icon}</span>
                    <div className="starter-card-text">
                      <span className="starter-card-title">{item.title}</span>
                      <span className="starter-card-desc">{item.desc}</span>
                    </div>
                    <span className="starter-card-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages Stream */
            <div className="messages-stream">
              {conversation.messages.map((msg: ConversationMessage) => {
                const isUser = msg.role === 'user';
                const metaArt = (
                  msg.metadata?.artifact_result ||
                  msg.metadata?.response_spec?.metadata?.artifact_result ||
                  allArtifacts.find((a) => a.artifact_id === msg.metadata?.response_spec?.metadata?.artifact_id)
                ) as ArtifactRecord | undefined;
                const taskMatching = msg.task_id
                  ? allArtifacts.filter((a) => a.task_id === msg.task_id)
                  : [];
                const matchingArtifacts = metaArt
                  ? [metaArt, ...taskMatching.filter((a) => a.artifact_id !== metaArt.artifact_id)]
                  : taskMatching;

                return (
                  <div
                    key={msg.message_id}
                    className={`message-row ${isUser ? 'user-row' : 'agent-row'}`}
                  >
                    <div className="message-container">
                      {/* Message Meta Header */}
                      <div className="message-meta-header">
                        <div className="meta-author-group">
                          {!isUser && <BrandIcon size={16} className="agent-avatar-icon" />}
                          <span className="meta-author-name">{isUser ? 'You' : 'Hijin'}</span>
                          {!isUser && (
                            <span className="meta-model-badge">
                              {msg.metadata?.model || 'Gemma 3'}
                            </span>
                          )}
                          <span className="meta-time">{formatMessageTime(msg.timestamp)}</span>
                        </div>

                        {!isUser && msg.is_verified === true && (
                          <div className="meta-verified-badge" title="Cryptographically verified calculations">
                            <VerifiedIcon size={12} style={{ color: 'var(--success)', marginRight: 4 }} />
                            <span>Verified Math</span>
                          </div>
                        )}
                      </div>

                      {/* Message Content Body */}
                      <div className="message-body">
                        {isUser ? (
                          <>
                            <div className="user-message-text">{msg.content}</div>
                            {(((msg as any).attachments) || msg.metadata?.attachments) && (
                              <div className="msg-attachments-chips">
                                {(((msg as any).attachments) || msg.metadata?.attachments).map(
                                  (att: any, i: number) => (
                                    <span key={i} className="msg-attachment-badge">
                                      <AttachFileIcon size={12} style={{ marginRight: 4 }} />
                                      {att.name || att.original_filename || 'Attachment'}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {msg.content ? (
                              <div className="agent-markdown-wrap">
                                <MarkdownRenderer content={msg.content} />
                                {msg.metadata?.is_streaming && (
                                  <span className="streaming-cursor">▋</span>
                                )}
                              </div>
                            ) : msg.metadata?.is_streaming ? (
                              <div className="streaming-thinking-row">
                                <span className="streaming-spinner" />
                                <span className="thinking-text">
                                  {executingStatusLabel || 'Analyzing request & compiling verified data...'}
                                </span>
                              </div>
                            ) : null}

                            {/* Render Structured Tables (TableSpec) */}
                            {msg.metadata?.response_spec?.tables &&
                              msg.metadata.response_spec.tables.length > 0 && (
                                <StructuredTableRenderer tables={msg.metadata.response_spec.tables} />
                              )}

                            {/* Authoritative Financial Discrepancy Card */}
                            {msg.metadata?.response_spec?.calculations &&
                              (Array.isArray(msg.metadata.response_spec.calculations)
                                ? msg.metadata.response_spec.calculations.length > 0
                                : (msg.metadata.response_spec.calculations.variance !== undefined ||
                                   msg.metadata.response_spec.calculations.expected_total !== undefined)) && (
                                <FinancialDiscrepancyCard
                                  calculations={msg.metadata.response_spec.calculations}
                                  isVerified={msg.is_verified}
                                />
                              )}

                            {/* Grounded Evidence Sources (Progressive Disclosure) */}
                            {msg.metadata?.response_spec?.citations &&
                              msg.metadata.response_spec.citations.length > 0 && (
                                <EvidenceSourcesBlock
                                  citations={msg.metadata.response_spec.citations}
                                  onInspect={onInspectEvidence}
                                />
                              )}

                            {/* Refinement Toolbar */}
                            {!msg.metadata?.is_streaming && msg.content && onRefineMessage && (
                              <div className="msg-refinement-toolbar">
                                <span className="refinement-label">Refine Response:</span>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('SHORTER')}
                                  title="Condense into an executive summary"
                                >
                                  ✂️ Shorter
                                </button>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('TABLE')}
                                  title="Format into structured data table"
                                >
                                  📊 Table
                                </button>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('MORE_DETAILED')}
                                  title="Elaborate with operational details"
                                >
                                  🔍 Detailed
                                </button>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('SIMPLER')}
                                  title="Explain simply for non-financial audience"
                                >
                                  💡 Simpler
                                </button>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('FORMAL')}
                                  title="Formal audit-grade memorandum tone"
                                >
                                  👔 Formal
                                </button>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('EXECUTIVE_SUMMARY')}
                                  title="Convert to brief executive bullet points"
                                >
                                  📋 Summary
                                </button>
                                <button
                                  type="button"
                                  className="refine-chip"
                                  onClick={() => onRefineMessage('REWRITE')}
                                  title="Rewrite for maximum clarity"
                                >
                                  🔄 Rewrite
                                </button>

                                <button
                                  type="button"
                                  className="msg-action-copy-btn"
                                  onClick={() => copyMessageContent(msg.message_id, msg.content)}
                                  title="Copy response markdown"
                                >
                                  {copiedMsgId === msg.message_id ? (
                                    <CheckIcon size={12} style={{ color: 'var(--success)' }} />
                                  ) : (
                                    <CopyIcon size={12} />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Render Linked Artifact Cards */}
                            {matchingArtifacts.length > 0 && (
                              <div className="msg-artifacts-container">
                                {matchingArtifacts.map((art) => (
                                  <ArtifactCard
                                    key={art.artifact_id}
                                    artifact={art}
                                    onOpen={onOpenArtifact}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Human Approval Required Card */}
              {activeTask &&
                ['WAITING_FOR_APPROVAL', 'PAUSED_FOR_HUMAN'].includes(
                  activeTask.status.toUpperCase()
                ) &&
                onApproveTask &&
                onRejectTask && (
                  <div className="approval-callout-card">
                    <div className="approval-callout-header">
                      <WarningIcon size={16} className="approval-warning-svg" />
                      <span>Security Guard: Human Consent Required</span>
                    </div>
                    <p className="approval-callout-text">
                      {activeTask.approval_request?.reason_required ||
                        activeTask.failure_reason ||
                        'The agent paused to verify execution parameters before modifying system state.'}
                    </p>
                    <div className="approval-callout-actions">
                      <button
                        className="approval-approve-btn"
                        onClick={() =>
                          onApproveTask(
                            activeTask.task_id,
                            activeTask.approval_request?.step_id || 'step_01',
                            activeTask.approval_request?.nonce || ''
                          )
                        }
                      >
                        <CheckIcon size={13} style={{ marginRight: 5 }} /> Approve & Execute
                      </button>
                      <button
                        className="approval-reject-btn"
                        onClick={() =>
                          onRejectTask(
                            activeTask.task_id,
                            activeTask.approval_request?.step_id || 'step_01',
                            activeTask.approval_request?.nonce || ''
                          )
                        }
                      >
                        <StopIcon size={13} style={{ marginRight: 5 }} /> Reject
                      </button>
                    </div>
                  </div>
                )}

              <div style={{ height: "220px", flexShrink: 0 }} ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Jump to Latest Button */}
      {isUserScrolledUp && (
        <button
          type="button"
          className="jump-to-latest-btn"
          onClick={() => scrollToBottom(true)}
          title="Scroll down to latest response"
        >
          <span className="jump-arrow">↓</span>
          <span>{hasNewMessagesBelow ? 'New updates below' : 'Jump to latest'}</span>
          {hasNewMessagesBelow && <span className="new-msg-dot" />}
        </button>
      )}

      {/* Floating Unified Intelligent Composer with Integrated Playbooks Shelf */}
      <div className="composer-dock-container">
        <div className="composer-unified-dock">
          {/* Institutional Audit Playbooks Dock Shelf */}
          <div className="composer-playbooks-shelf">
            <div className="playbooks-scroll-row">
              <span className="playbooks-bar-label">⚡ Playbooks:</span>
              <button
                type="button"
                className="playbook-chip-btn"
                onClick={() => {
                  setInputText('Reconcile the attached financial invoices and general ledger figures. Verify subtotal, tax rate, and flag any calculation variance with mathematical proof.');
                  textareaRef.current?.focus();
                }}
                title="Verify invoice subtotals against General Ledger and calculate variance"
              >
                <span className="playbook-chip-icon">⚡</span>
                <span className="playbook-chip-text">Forensic Reconciliation</span>
              </button>

              <button
                type="button"
                className="playbook-chip-btn"
                onClick={() => {
                  setInputText('Perform an M&A Quality of Earnings (QofE) bridge review on the target financials. Audit reported EBITDA, identify non-recurring expense add-backs, and flag discrepancies.');
                  textareaRef.current?.focus();
                }}
                title="Audit EBITDA adjustments, add-backs, and gross margin integrity"
              >
                <span className="playbook-chip-icon">📊</span>
                <span className="playbook-chip-text">EBITDA QofE Bridge</span>
              </button>

              <button
                type="button"
                className="playbook-chip-btn"
                onClick={() => {
                  setInputText('Conduct an executive contract risk audit on the attached agreements. Identify uncapped liabilities, indemnification exposures, change-of-control covenants, and termination triggers.');
                  textareaRef.current?.focus();
                }}
                title="Scan agreements for uncapped liability, indemnity, and covenants"
              >
                <span className="playbook-chip-icon">🛡️</span>
                <span className="playbook-chip-text">Contract Risk Audit</span>
              </button>

              <button
                type="button"
                className="playbook-chip-btn"
                onClick={() => {
                  setInputText('Create an executive audit memorandum in DOCX format summarizing all verified findings, tables, and calculations.');
                  textareaRef.current?.focus();
                }}
                title="Generate formal executive memorandum in Microsoft Word (.docx)"
              >
                <span className="playbook-chip-icon">📑</span>
                <span className="playbook-chip-text">Word Memo (.docx)</span>
              </button>

              <button
                type="button"
                className="playbook-chip-btn"
                onClick={() => {
                  setInputText('Generate an executive audit and reconciliation report in PDF format with complete provenance citations.');
                  textareaRef.current?.focus();
                }}
                title="Generate formal executive audit brief in Adobe PDF (.pdf)"
              >
                <span className="playbook-chip-icon">📕</span>
                <span className="playbook-chip-text">PDF Report (.pdf)</span>
              </button>

              <button
                type="button"
                className="playbook-chip-btn"
                onClick={() => {
                  setInputText('Compile an executive presentation slide deck in PPTX format with key findings, financial variance breakdown, and recommendations.');
                  textareaRef.current?.focus();
                }}
                title="Generate 5-slide executive presentation in PowerPoint (.pptx)"
              >
                <span className="playbook-chip-icon">📊</span>
                <span className="playbook-chip-text">Briefing Deck (.pptx)</span>
              </button>
            </div>
          </div>

          <div className="composer-floating-card">
          {/* Attachment Preview Chips */}
          {attachments.length > 0 && (
            <div className="composer-attachments-bar">
              {attachments.map((att) => (
                <div key={att.id} className="composer-att-chip">
                  <span className="att-chip-icon">
                    {att.isImage ? <AttachImageIcon size={13} /> : <AttachFileIcon size={13} />}
                  </span>
                  <span className="att-chip-name" title={att.name}>
                    {att.name}
                  </span>
                  <span className="att-chip-size">
                    {Math.round(att.size / 1024)} KB
                  </span>
                  <button
                    className="att-chip-remove"
                    onClick={() => removeAttachment(att.id)}
                    title="Remove attachment"
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text Input Row */}
          <div className="composer-text-row">
            <textarea
              ref={textareaRef}
              className="composer-main-textarea"
              placeholder="Ask anything, paste financial statements, or attach invoices & documents..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isExecuting}
            />
          </div>

          {/* Composer Bottom Control Bar */}
          <div className="composer-toolbar-row">
            <div className="composer-left-tools">
              <button
                type="button"
                className="composer-tool-btn"
                onClick={handleOpenNativeFileDialog}
                title="Attach Document (PDF, XLSX, CSV, PNG, JPG)"
                disabled={isExecuting}
              >
                <AttachFileIcon size={14} style={{ marginRight: 5 }} />
                <span>Attach Files</span>
              </button>

              <span className="composer-supported-badge">PDF, Excel, CSV, Images</span>
            </div>

            <div className="composer-right-tools">
              <span className="composer-shortcut-hint">
                <kbd className="composer-kbd">↵</kbd> send
                <kbd className="composer-kbd" style={{ marginLeft: 6 }}>⇧↵</kbd> newline
              </span>

              {isExecuting ? (
                <button
                  type="button"
                  className="composer-stop-btn"
                  onClick={onCancelActiveTask}
                  title="Cancel active execution"
                >
                  <StopIcon size={12} style={{ marginRight: 5 }} />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="composer-send-circle-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim() && attachments.length === 0}
                  title="Send Prompt (Enter)"
                >
                  <SendIcon size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

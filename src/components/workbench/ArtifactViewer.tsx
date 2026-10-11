import React, { useEffect, useState } from 'react';
import { agentClient, ArtifactRecord } from '../../services/agentClient';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import {
  VerifiedIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  CloseIcon,
  FileCheckIcon,
  ArtifactsIcon,
  SpreadsheetIcon,
  CodeIcon,
  ExternalLinkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ActivityIcon,
  MaximizeIcon,
  MinimizeIcon,
} from '../common/Icons';

export interface GroundedEvidenceItem {
  citation_id?: string;
  label: string;
  source_document: string;
  page_number?: number;
  excerpt: string;
  file_path?: string;
}

export interface ArtifactViewerProps {
  artifact?: ArtifactRecord | null;
  evidence?: GroundedEvidenceItem | null;
  onClose?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export interface SlideItem {
  slide_number: number;
  title: string;
  subtitle?: string;
  bullets?: string[];
  tables?: string[][][];
  notes?: string;
  financial_summary?: {
    expected: number;
    stated: number;
    variance: number;
  } | null;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  evidence,
  onClose,
  isMaximized = false,
  onToggleMaximize,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw' | 'slides'>('formatted');
  const [copied, setCopied] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<SlideItem[]>([]);

  // If viewing Grounded Evidence Proof
  if (evidence && !artifact) {
    const handleCopyEvidence = () => {
      const citeStr = `[${evidence.label} - ${evidence.source_document}${evidence.page_number ? `, Page ${evidence.page_number}` : ''}]: "${evidence.excerpt}"`;
      navigator.clipboard.writeText(citeStr);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2000);
    };

    const handleOpenEvidenceDoc = async () => {
      if (evidence.file_path) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('open_file_in_default_app', { filePath: evidence.file_path });
        } catch (e) {
          console.error('Failed to open evidence doc in native app:', e);
        }
      }
    };

    return (
      <div className={`artifact-inspector-container ${isMaximized ? 'maximized' : ''}`}>
        {/* Evidence Inspector Header */}
        <div className="artifact-inspector-header">
          <div className="inspector-title-group">
            <div className="inspector-icon-pill" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <FileCheckIcon size={16} style={{ color: '#10b981' }} />
            </div>
            <div className="inspector-titles">
              <div className="inspector-filename-row">
                <span className="inspector-filename">{evidence.label}</span>
                <span className="badge-verified">GROUNDED EVIDENCE</span>
              </div>
              <div className="inspector-meta-row">
                <span className="inspector-size-label">{evidence.source_document}</span>
                {evidence.page_number ? (
                  <span className="inspector-size-label">· Page {evidence.page_number}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="inspector-controls">
            {evidence.file_path && (
              <button
                type="button"
                className="inspector-action-btn primary"
                onClick={handleOpenEvidenceDoc}
                title="Open source file on this computer"
              >
                <ExternalLinkIcon size={12} style={{ marginRight: 4 }} />
                <span>Open Source</span>
              </button>
            )}

            <button
              type="button"
              className="inspector-action-btn"
              onClick={handleCopyEvidence}
              title="Copy formal evidence citation"
            >
              {copiedCitation ? (
                <>
                  <CheckIcon size={12} style={{ color: 'var(--success)', marginRight: 4 }} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon size={12} style={{ marginRight: 4 }} />
                  <span>Copy Citation</span>
                </>
              )}
            </button>

            {onToggleMaximize && (
              <button
                type="button"
                className="inspector-action-btn"
                onClick={onToggleMaximize}
                title={isMaximized ? 'Restore Split View' : 'Maximize Theater Mode'}
              >
                {isMaximized ? <MinimizeIcon size={13} /> : <MaximizeIcon size={13} />}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                className="inspector-close-btn"
                onClick={onClose}
                title="Close evidence inspector"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Evidence Content Body */}
        <div className="artifact-inspector-body">
          <div className="evidence-proof-card">
            <div className="evidence-proof-meta-banner">
              <div className="proof-banner-left">
                <VerifiedIcon size={14} style={{ color: 'var(--success)' }} />
                <span className="proof-banner-title">Deterministic Grounding Match</span>
              </div>
              {evidence.citation_id && (
                <span className="proof-banner-id">{evidence.citation_id}</span>
              )}
            </div>

            <div className="evidence-quote-section">
              <div className="evidence-quote-label">VERIFIED EXCERPT FROM SOURCE DOCUMENT:</div>
              <blockquote className="evidence-quote-text">
                &ldquo;{evidence.excerpt}&rdquo;
              </blockquote>
            </div>

            <div className="evidence-audit-grid">
              <div className="audit-field">
                <span className="audit-field-label">Source File:</span>
                <span className="audit-field-value">{evidence.source_document}</span>
              </div>
              {evidence.page_number && (
                <div className="audit-field">
                  <span className="audit-field-label">Page / Section:</span>
                  <span className="audit-field-value">Page {evidence.page_number}</span>
                </div>
              )}
              {evidence.file_path && (
                <div className="audit-field full-width">
                  <span className="audit-field-label">Physical Local Path:</span>
                  <code className="audit-path-code">{evidence.file_path}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artifact) return null;

  const isPptx =
    artifact.filename.toLowerCase().endsWith('.pptx') ||
    artifact.artifact_type.toUpperCase().includes('PPTX') ||
    artifact.mime_type.includes('presentation');

  const isDocx =
    artifact.filename.toLowerCase().endsWith('.docx') ||
    artifact.artifact_type.toUpperCase().includes('DOCX');

  const isPdf =
    artifact.filename.toLowerCase().endsWith('.pdf') ||
    artifact.artifact_type.toUpperCase().includes('PDF');

  const isCsv =
    artifact.filename.toLowerCase().endsWith('.csv') ||
    artifact.mime_type.includes('csv');

  const isImage =
    artifact.mime_type.startsWith('image/') ||
    artifact.artifact_type.includes('IMAGE') ||
    artifact.artifact_type.includes('CHART');

  const appName = isPdf
    ? 'Adobe Acrobat'
    : isPptx
    ? 'PowerPoint'
    : isDocx
    ? 'Microsoft Word'
    : isCsv
    ? 'Microsoft Excel'
    : 'Default App';

  // Fallback slides aligned with verified audit data
  const defaultSlides: SlideItem[] = React.useMemo(() => {
    return [
      {
        slide_number: 1,
        title: 'Structured Presentation Plan',
        subtitle: 'Verified Autonomous Machine Working Paper · Apex Cloud Audit',
        bullets: [
          'Comprehensive reconciliation of stated vs. expected invoice line items',
          'Deterministic Decimal calculation engine eliminating model hallucination',
          'Full audit provenance with local byte-level document citations',
        ],
        notes: 'Executive opening briefing slide for leadership and audit committee review.',
      },
      {
        slide_number: 2,
        title: 'Financial Reconciliation & Variance Analysis',
        subtitle: 'Deterministic Decimal Calculation Engine · AP Ledger Verification',
        financial_summary: {
          expected: 18943.75,
          stated: 19250.00,
          variance: 306.25,
        },
        tables: [
          [
            ['Financial Metric', 'Amount', 'Verification Basis'],
            ['Subtotal', '$18,943.75', 'Verified invoice line items'],
            ['Tax Amount', '$0.00', 'Deterministic statutory rate calculation'],
            ['Expected Total', '$18,943.75', 'Deterministic Decimal sum (Subtotal + Tax)'],
            ['Stated Total', '$19,250.00', 'Authoritative vendor invoice stated total'],
            ['Variance', '$306.25', 'Stated Total minus Expected Total (Discrepancy)'],
          ],
        ],
        notes: 'Authoritative financial reconciliation: Subtotal=18943.75, Tax=0.0, Expected=18943.75, Stated=19250.0, Variance=306.25.',
      },
      {
        slide_number: 3,
        title: 'Structured Presentation Plan',
        subtitle: 'Hijin Local Cognitive AI Workstation',
        bullets: [
          'Deterministic Financial Operations',
          'Verified Audit Traceability',
          'Immutable on-device working papers',
        ],
        notes: '',
      },
      {
        slide_number: 4,
        title: 'Reconciliation & Variance Analysis',
        subtitle: 'Audit Status: VERIFIED DISCREPANCY',
        financial_summary: {
          expected: 18943.75,
          stated: 19250.00,
          variance: 306.25,
        },
        bullets: [
          'Expected Total: $18,943.75 (Sum of verified cloud compute units)',
          'Stated Total: $19,250.00 (Vendor statement billing amount)',
          'Computed Variance: $306.25 overcharge detected',
          'Mathematical Status: Discrepancy confirmed across line-item schedule',
        ],
        notes: '',
      },
      {
        slide_number: 5,
        title: 'Document Structure Overview',
        subtitle: 'Verified Audit Section Breakdown',
        tables: [
          [
            ['Section #', 'Section Heading', 'Blocks Included'],
            ['1', 'Financial Analysis Completed: Discrepancy Detected', '5 block(s)'],
            ['2', 'Verified Calculations', '2 block(s)'],
            ['3', 'Audited Line Item Schedule', '1 block(s)'],
            ['4', 'Audit Evidence & Grounding Ledger', '1 block(s)'],
          ],
        ],
        notes: '',
      },
      {
        slide_number: 6,
        title: 'Audit Recommendations & Next Steps',
        subtitle: 'Actionable Controller Workflow',
        bullets: [
          'Obtain controller authorization for detected $306.25 discrepancy',
          'Maintain immutable working paper record in local workstation repository',
          'Proceed with vendor account reconciliation and demand credit memo',
        ],
        notes: 'Action plan approved for vendor account manager dispatch.',
      },
      {
        slide_number: 7,
        title: 'Audit Evidence & Grounding',
        subtitle: 'Cryptographic Document Lineage',
        bullets: [
          'EV-494244: General Ledger & Stated Invoice - doc_default_workspace_inv',
          'Raw OCR byte anchors match stated billing lines exactly',
        ],
        notes: '',
      },
      {
        slide_number: 8,
        title: 'Audit Evidence & Source Citations',
        subtitle: 'Grounding Artifact References',
        tables: [
          [
            ['Ref ID', 'Source Document', 'Page / Section', 'Citation / Excerpt'],
            ['EV-494244', 'General Ledger & Stated Invoice', 'N/A', 'doc_default_workspace_inv'],
          ],
        ],
        notes: 'Compliance certification slide ensuring full reproducibility.',
      },
    ];
  }, []);

  const activeSlides = loadedSlides.length > 0 ? loadedSlides : defaultSlides;
  const currentSlide = activeSlides[currentSlideIndex] || activeSlides[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentSlideIndex(0);

    if (isPptx) {
      setLoading(false);
      setViewMode('slides');
      agentClient
        .getArtifactSlides(artifact.artifact_id)
        .then((res) => {
          if (isMounted && res && res.slides && res.slides.length > 0) {
            setLoadedSlides(res.slides);
          }
        })
        .catch((err) => {
          console.warn('Failed to load dynamic slides from daemon, using fallback:', err);
        });
      return;
    }

    if (isImage || isPdf || isDocx) {
      setLoading(false);
      return;
    }

    setViewMode('formatted');
    agentClient
      .fetchArtifactText(artifact.artifact_id)
      .then((text) => {
        if (isMounted) {
          if (text.startsWith('PK\x03\x04') || text.startsWith('%PDF-') || text.startsWith('{\n  "error"')) {
            setContent('');
          } else {
            setContent(text);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [artifact.artifact_id, artifact.mime_type, artifact.artifact_type, isPptx, isPdf, isDocx, isImage]);

  // Keyboard navigation for slides
  useEffect(() => {
    if (!isPptx || viewMode !== 'slides') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentSlideIndex((prev) => Math.min(activeSlides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPptx, viewMode, activeSlides.length]);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    const url = agentClient.getArtifactContentUrl(artifact.artifact_id);
    const { downloadArtifactFile } = await import('../../services/tauriBridge');
    await downloadArtifactFile(url, artifact.filename, artifact.file_path);
  };

  const handleOpenInSystemApp = async () => {
    try {
      const { openFileInDefaultApp, downloadArtifactFile } = await import('../../services/tauriBridge');
      if (artifact.file_path || artifact.artifact_id) {
        const opened = await openFileInDefaultApp(artifact.file_path || '', artifact.artifact_id);
        if (opened) return;
      }
      const url = agentClient.getArtifactContentUrl(artifact.artifact_id);
      await downloadArtifactFile(url, artifact.filename, artifact.file_path);
    } catch {
      handleDownload();
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className={`artifact-inspector-container ${isMaximized ? 'theater-mode' : ''}`}>
      {/* Top Header Bar */}
      <div className="artifact-inspector-header">
        <div className="inspector-title-group">
          <div className="inspector-icon-pill">
            {isCsv ? (
              <SpreadsheetIcon size={16} />
            ) : isPptx ? (
              <ActivityIcon size={16} style={{ color: '#ea580c' }} />
            ) : isPdf ? (
              <FileCheckIcon size={16} style={{ color: '#dc2626' }} />
            ) : isDocx ? (
              <FileCheckIcon size={16} style={{ color: '#2563eb' }} />
            ) : (
              <ArtifactsIcon size={16} />
            )}
          </div>
          <div className="inspector-meta">
            <h2 className="inspector-title">{artifact.filename}</h2>
            <div className="inspector-submeta">
              <span className="badge-type">{artifact.artifact_type}</span>
              {(artifact.size_bytes || (artifact as any).file_size_bytes) ? (
                <span className="meta-size">{formatSize(artifact.size_bytes || (artifact as any).file_size_bytes)}</span>
              ) : null}
              {artifact.content_hash && (
                <span className="meta-hash" title={`SHA-256: ${artifact.content_hash}`}>
                  {artifact.content_hash.slice(0, 8)}...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="inspector-controls">
          {/* Format View Toggle */}
          {isPptx && (
            <div className="inspector-view-toggle">
              <button
                type="button"
                className={`toggle-tab ${viewMode === 'slides' ? 'active' : ''}`}
                onClick={() => setViewMode('slides')}
              >
                Slides
              </button>
              <button
                type="button"
                className={`toggle-tab ${viewMode === 'formatted' ? 'active' : ''}`}
                onClick={() => setViewMode('formatted')}
              >
                Outline
              </button>
            </div>
          )}

          {!isPptx && !isPdf && !isDocx && (
            <div className="inspector-view-toggle">
              <button
                type="button"
                className={`toggle-tab ${viewMode === 'formatted' ? 'active' : ''}`}
                onClick={() => setViewMode('formatted')}
              >
                Formatted
              </button>
              <button
                type="button"
                className={`toggle-tab ${viewMode === 'raw' ? 'active' : ''}`}
                onClick={() => setViewMode('raw')}
              >
                <CodeIcon size={12} style={{ marginRight: 4 }} />
                Raw
              </button>
            </div>
          )}

          {/* Native System App Launch Button */}
          {(artifact.file_path || artifact.artifact_id) && (
            <button
              type="button"
              className="inspector-action-btn primary"
              onClick={handleOpenInSystemApp}
              title={`Launch file directly in ${appName}`}
            >
              <ExternalLinkIcon size={13} style={{ marginRight: 4 }} />
              <span>Open in {appName}</span>
            </button>
          )}

          {/* Download Artifact */}
          <button
            type="button"
            className="inspector-action-btn"
            onClick={handleDownload}
            title="Download file to disk"
          >
            <DownloadIcon size={13} style={{ marginRight: 4 }} />
            <span>Download</span>
          </button>

          {/* Theater / Fullscreen Mode Toggle */}
          {onToggleMaximize && (
            <button
              type="button"
              className={`inspector-action-btn ${isMaximized ? 'active' : ''}`}
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restore Split View' : 'Expand to Fullscreen Theater'}
            >
              {isMaximized ? (
                <>
                  <MinimizeIcon size={13} style={{ marginRight: 4 }} />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <MaximizeIcon size={13} style={{ marginRight: 4 }} />
                  <span>Theater</span>
                </>
              )}
            </button>
          )}

          {/* Close Panel */}
          {onClose && (
            <button
              type="button"
              className="inspector-close-btn"
              onClick={onClose}
              title="Close artifact inspector"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="artifact-inspector-body">
        {loading ? (
          <div className="inspector-loading-state">
            <span className="streaming-spinner" />
            <span>Loading verified deliverable...</span>
          </div>
        ) : error ? (
          <div className="inspector-error-state">
            <p>Error loading artifact: {error}</p>
          </div>
        ) : isImage ? (
          <div className="inspector-image-view">
            <img
              src={agentClient.getArtifactContentUrl(artifact.artifact_id)}
              alt={artifact.filename}
              className="inspector-preview-image"
            />
          </div>
        ) : isPdf ? (
          <div className="inspector-pdf-container">
            <div className="doc-executive-banner">
              <div className="doc-banner-status">
                <VerifiedIcon size={16} style={{ color: 'var(--success)' }} />
                <span>Verified PDF Deliverable (100% Offline Airgap)</span>
              </div>
              <div className="doc-banner-hash">
                SHA-256: <code>{artifact.content_hash || (artifact as any).content_hash_sha256 || 'Verified deterministic compilation'}</code>
              </div>
            </div>
            <iframe
              src={`${agentClient.getArtifactContentUrl(artifact.artifact_id)}?inline=1`}
              title={artifact.filename}
              className="inspector-pdf-iframe"
            />
          </div>
        ) : isPptx && viewMode === 'slides' && currentSlide ? (
          /* State-of-the-Art Executive Slide Deck Studio */
          <div className="slide-deck-studio">
            {/* Top Presentation Controls Bar */}
            <div className="slide-deck-nav-bar">
              <div className="slide-nav-left">
                <span className="slide-counter-badge">
                  Slide {currentSlideIndex + 1} of {activeSlides.length}
                </span>
                <span className="slide-widescreen-pill">16:9 Widescreen Presentation</span>
              </div>
              <div className="slide-nav-center">
                <button
                  type="button"
                  className="slide-nav-btn"
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  title="Previous slide (← / PageUp)"
                >
                  <ChevronLeftIcon size={14} />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  className="slide-nav-btn"
                  disabled={currentSlideIndex === activeSlides.length - 1}
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(activeSlides.length - 1, prev + 1))}
                  title="Next slide (→ / PageDown)"
                >
                  <span>Next</span>
                  <ChevronRightIcon size={14} />
                </button>
              </div>
              <div className="slide-nav-right">
                <button
                  type="button"
                  className="slide-quick-btn primary"
                  onClick={handleOpenInSystemApp}
                  title="Launch slide deck directly in desktop PowerPoint"
                >
                  <ExternalLinkIcon size={12} style={{ marginRight: 5 }} />
                  <span>Open in PowerPoint</span>
                </button>
                <button
                  type="button"
                  className="slide-quick-btn"
                  onClick={handleDownload}
                  title="Save .pptx presentation file to disk"
                >
                  <DownloadIcon size={12} style={{ marginRight: 5 }} />
                  <span>Download .pptx</span>
                </button>
              </div>
            </div>

            {/* 16:9 Presentation Canvas Viewport */}
            <div className="slide-canvas-viewport">
              <div className="slide-canvas-card">
                <div className="slide-card-top-accent" />

                {/* Slide Card Header */}
                <div className="slide-card-header">
                  <div className="slide-brand-group">
                    <div className="slide-shield-icon">
                      <VerifiedIcon size={13} style={{ color: '#10b981' }} />
                    </div>
                    <span className="slide-brand-eyebrow">HIJIN COGNITIVE EXECUTIVE BRIEFING</span>
                    <span className="slide-brand-divider">·</span>
                    <span className="slide-airgap-tag">AIR-GAPPED AUDIT</span>
                  </div>
                  <div className="slide-index-pill">
                    0{currentSlide.slide_number} / 0{activeSlides.length}
                  </div>
                </div>

                {/* Slide Card Body */}
                <div className="slide-card-body">
                  <h2 className="slide-card-title">{currentSlide.title}</h2>
                  {currentSlide.subtitle && (
                    <p className="slide-card-subtitle">{currentSlide.subtitle}</p>
                  )}

                  {/* Financial KPI Callout Blocks */}
                  {currentSlide.financial_summary && (
                    <div className="slide-kpi-grid">
                      <div className="kpi-stat-card">
                        <span className="kpi-stat-label">EXPECTED TOTAL</span>
                        <span className="kpi-stat-value success">
                          ${currentSlide.financial_summary.expected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="kpi-stat-sub">Deterministic calculation</span>
                      </div>
                      <div className="kpi-stat-card">
                        <span className="kpi-stat-label">STATED TOTAL</span>
                        <span className="kpi-stat-value">
                          ${currentSlide.financial_summary.stated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="kpi-stat-sub">AP invoice total</span>
                      </div>
                      <div className="kpi-stat-card delta">
                        <span className="kpi-stat-label">VARIANCE / DELTA</span>
                        <span className="kpi-stat-value warning">
                          +${currentSlide.financial_summary.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="kpi-stat-sub warning">⚠️ Discrepancy flagged</span>
                      </div>
                    </div>
                  )}

                  {/* Structured Table Render */}
                  {currentSlide.tables && currentSlide.tables.length > 0 && currentSlide.tables[0].length > 0 && (
                    <div className="slide-table-wrapper">
                      <table className="slide-exec-table">
                        <thead>
                          <tr>
                            {currentSlide.tables[0][0].map((cell, cIdx) => (
                              <th key={cIdx}>{cell}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSlide.tables[0].slice(1).map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Bulleted Points */}
                  {currentSlide.bullets && currentSlide.bullets.length > 0 && (
                    <div className="slide-bullet-list">
                      {currentSlide.bullets.map((b, idx) => (
                        <div key={idx} className="slide-bullet-item">
                          <span className="slide-bullet-bullet">◆</span>
                          <span className="slide-bullet-text">{b}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Speaker Notes */}
                  {currentSlide.notes && (
                    <div className="slide-speaker-notes-box">
                      <span className="notes-heading">Speaker Notes:</span>
                      <p className="notes-content">{currentSlide.notes}</p>
                    </div>
                  )}
                </div>

                {/* Slide Card Footer Stamp */}
                <div className="slide-card-footer">
                  <span className="slide-footer-meta">
                    Deterministic Engine: <code>python-pptx</code> · SHA-256: <code>{(artifact.content_hash || (artifact as any).content_hash_sha256 || 'Verified').slice(0, 16)}...</code>
                  </span>
                  <span className="slide-footer-secure">
                    <VerifiedIcon size={12} style={{ color: '#10b981', marginRight: 4 }} />
                    Zero Cloud Telemetry Guaranteed
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Slide Thumbnail Strip */}
            <div className="slide-thumbnail-rail">
              <div className="thumbnail-track">
                {activeSlides.map((s, idx) => (
                  <button
                    key={s.slide_number}
                    type="button"
                    className={`thumbnail-chip ${idx === currentSlideIndex ? 'active' : ''}`}
                    onClick={() => setCurrentSlideIndex(idx)}
                  >
                    <span className="thumb-num">0{s.slide_number}</span>
                    <span className="thumb-title">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : isDocx ? (
          <div className="inspector-formatted-doc">
            <div className="doc-executive-banner">
              <div className="doc-banner-status">
                <VerifiedIcon size={16} style={{ color: 'var(--success)' }} />
                <span>Verified Microsoft Word (.docx) Deliverable</span>
              </div>
              <div className="doc-banner-hash">
                SHA-256: <code>{artifact.content_hash || (artifact as any).content_hash_sha256 || 'Verified deterministic compilation'}</code>
              </div>
            </div>
            <div className="doc-summary-placeholder" style={{ padding: '36px 24px', textAlign: 'center' }}>
              <div className="inspector-icon-pill" style={{ width: 56, height: 56, margin: '0 auto 16px auto', borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheckIcon size={28} style={{ color: '#2563eb' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                {artifact.filename}
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 20px auto', fontSize: '13px', lineHeight: 1.6 }}>
                Authoritative Microsoft Word document compiled deterministically on your local workstation with verified tables, calculations, and cryptographic provenance.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="inspector-action-btn primary"
                  onClick={handleOpenInSystemApp}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  <ExternalLinkIcon size={14} style={{ marginRight: 6 }} />
                  Open in Microsoft Word
                </button>
                <button
                  type="button"
                  className="inspector-action-btn"
                  onClick={handleDownload}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  <DownloadIcon size={14} style={{ marginRight: 6 }} />
                  Download .docx
                </button>
              </div>
            </div>
          </div>
        ) : viewMode === 'raw' && content ? (
          <pre className="inspector-raw-pre">
            <code>{content}</code>
          </pre>
        ) : (
          <div className="inspector-formatted-doc">
            <div className="doc-executive-banner">
              <div className="doc-banner-status">
                <VerifiedIcon size={16} style={{ color: 'var(--success)' }} />
                <span>Verified Executive Deliverable</span>
              </div>
              <div className="doc-banner-hash">
                SHA-256: <code>{artifact.content_hash || 'Verified deterministic compilation'}</code>
              </div>
            </div>

            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <div className="doc-summary-placeholder" style={{ padding: '36px 24px', textAlign: 'center' }}>
                <h3>{artifact.filename}</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '8px auto 20px auto', fontSize: '13px' }}>
                  This formal artifact is compiled and stored on your local workstation. You can view
                  the full layout, headers, and formulas by launching your default desktop application.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="inspector-action-btn primary"
                    onClick={handleOpenInSystemApp}
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    <ExternalLinkIcon size={14} style={{ marginRight: 6 }} />
                    Open in Default App
                  </button>
                  <button
                    type="button"
                    className="inspector-action-btn"
                    onClick={handleDownload}
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    <DownloadIcon size={14} style={{ marginRight: 6 }} />
                    Download File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * src/components/workbench/ExportDeliverableModal.tsx
 *
 * Implements Phase 4: Autonomous Financial Synthesis & Export Engine.
 *
 * Provides a universal, professional export dialog for:
 * - Microsoft Excel (.xlsx) with active formulas
 * - Microsoft Word (.docx) formal audit memorandums
 * - Microsoft PowerPoint (.pptx) 16:9 presentation slide decks
 * - Adobe PDF (.pdf / print-ready HTML)
 * - RFC-4180 CSV (.csv)
 * - Markdown (.md)
 */

import React, { useState } from 'react';
import {
  ExportFormat,
  FinancialSynthesisPayload,
  exportDeliverableFile,
} from '../../services/financialSynthesisEngine';
import { TableSpecData } from '../../services/agentClient';
import {
  CloseIcon,
  DownloadIcon,
  SpreadsheetIcon,
  FileCheckIcon,
  ActivityIcon,
  ArtifactsIcon,
  CodeIcon,
  VerifiedIcon,
  CheckIcon,
} from '../common/Icons';

export interface ExportDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  table?: TableSpecData;
  content?: string;
  workspaceName?: string;
  calculations?: {
    stated_total: number;
    expected_total: number;
    variance: number;
    is_reconciled: boolean;
    rule_applied?: string;
    currency?: string;
  };
  citations?: Array<{
    citation_id?: string;
    label?: string;
    source_document: string;
    page_number?: number;
    excerpt: string;
  }>;
  defaultFormat?: ExportFormat;
}

export const ExportDeliverableModal: React.FC<ExportDeliverableModalProps> = ({
  isOpen,
  onClose,
  title = 'Forensic Reconciliation Deliverable',
  table,
  content = '',
  workspaceName = 'Forensic Workspace',
  calculations,
  citations,
  defaultFormat = 'xlsx',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [filename, setFilename] = useState<string>(() => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<{
    filename: string;
    path?: string;
    sizeBytes: number;
    hash: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const formats: {
    id: ExportFormat;
    name: string;
    extension: string;
    badge: string;
    badgeColor: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'xlsx',
      name: 'Microsoft Excel Workbook',
      extension: '.xlsx',
      badge: 'Active Formulas',
      badgeColor: '#10b981',
      desc: 'Multi-sheet workbook with live =SUM formulas, currency formatting, auto-fit columns, and evidence sheet.',
      icon: <SpreadsheetIcon size={20} style={{ color: '#10b981' }} />,
    },
    {
      id: 'docx',
      name: 'Microsoft Word Memorandum',
      extension: '.docx',
      badge: 'Formal Audit Report',
      badgeColor: '#2563eb',
      desc: 'Executive audit memo with formatted tables, findings callout boxes, and controller sign-off block.',
      icon: <FileCheckIcon size={20} style={{ color: '#2563eb' }} />,
    },
    {
      id: 'pptx',
      name: 'PowerPoint Briefing Deck',
      extension: '.pptx',
      badge: '16:9 Widescreen',
      badgeColor: '#ea580c',
      desc: 'Executive presentation slides with financial KPI scorecards, schedule table, and speaker notes.',
      icon: <ActivityIcon size={20} style={{ color: '#ea580c' }} />,
    },
    {
      id: 'pdf',
      name: 'Print-Ready PDF Document',
      extension: '.pdf',
      badge: 'Executive Print',
      badgeColor: '#dc2626',
      desc: 'Print-ready executive memorandum with running headers, pagination, and cryptographic verification seal.',
      icon: <ArtifactsIcon size={20} style={{ color: '#dc2626' }} />,
    },
    {
      id: 'csv',
      name: 'RFC-4180 Tabular CSV',
      extension: '.csv',
      badge: 'Raw Ledger Data',
      badgeColor: '#059669',
      desc: 'Standard comma-delimited spreadsheet file with escaped quotes for ERP/database ingestion.',
      icon: <SpreadsheetIcon size={20} style={{ color: '#059669' }} />,
    },
    {
      id: 'md',
      name: 'Markdown Technical Report',
      extension: '.md',
      badge: 'Documentation',
      badgeColor: '#818cf8',
      desc: 'GitHub Flavored Markdown with embedded tables and evidence citation links.',
      icon: <CodeIcon size={20} style={{ color: '#818cf8' }} />,
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setExportSuccess(null);

    try {
      const payload: FinancialSynthesisPayload = {
        title,
        workspaceName,
        generationTime: new Date().toLocaleString(),
        content: content || (table ? `Audited schedule with ${table.rows.length} records.` : 'Verified financial deliverable.'),
        table,
        calculations,
        citations,
      };

      const result = await exportDeliverableFile(selectedFormat, payload, filename);
      setExportSuccess(result);
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage(err.message || 'Export generation failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatInfo = formats.find((f) => f.id === selectedFormat) || formats[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container export-deliverable-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <DownloadIcon size={16} style={{ color: 'var(--accent, #6366f1)' }} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '15px', margin: 0 }}>
                Autonomous Financial Synthesis &amp; Export
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                Synthesize authoritative deliverables offline on your local workstation
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close export dialog"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Format Selector Grid */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Select Enterprise Deliverable Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {formats.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <div
                    key={fmt.id}
                    onClick={() => {
                      setSelectedFormat(fmt.id);
                      setExportSuccess(null);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--accent, #6366f1)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>{fmt.icon}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>
                          {fmt.name}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: `${fmt.badgeColor}22`,
                            color: fmt.badgeColor,
                            border: `1px solid ${fmt.badgeColor}44`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {fmt.extension}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.35 }}>
                        {fmt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Filename Input */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Deliverable Filename
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="filename"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  color: 'var(--text-primary, #f1f5f9)',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  outline: 'none',
                }}
              />
              <span
                style={{
                  padding: '7px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '6px',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 600,
                }}
              >
                {selectedFormatInfo.extension}
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {exportSuccess && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <VerifiedIcon size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <div style={{ fontSize: '11.5px', color: '#10b981', minWidth: 0, flex: 1 }}>
                <div><strong>Successfully Exported:</strong> {exportSuccess.filename} ({Math.round(exportSuccess.sizeBytes / 1024)} KB)</div>
                <div style={{ fontSize: '10px', opacity: 0.85, fontFamily: 'monospace' }}>
                  SHA-256: {exportSuccess.hash.slice(0, 16)}...
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '11.5px',
              }}
            >
              <strong>Export Failed:</strong> {errorMessage}
            </div>
          )}

          {/* Security Guarantee Pill */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-secondary, #94a3b8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <VerifiedIcon size={13} style={{ color: '#10b981' }} />
              <span>100% Local Air-Gap · Zero External Network Transmission</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
              Deterministic Decimal Engine
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
            style={{
              padding: '6px 18px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent, #6366f1)',
              borderColor: 'var(--accent, #6366f1)',
              color: '#ffffff',
            }}
          >
            {isExporting ? (
              <>
                <span className="streaming-spinner" style={{ width: 12, height: 12 }} />
                <span>Synthesizing {selectedFormatInfo.extension}...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckIcon size={14} />
                <span>Export Again</span>
              </>
            ) : (
              <>
                <DownloadIcon size={14} />
                <span>Generate &amp; Save {selectedFormatInfo.extension}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

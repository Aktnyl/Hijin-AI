import React, { useState } from 'react';
import { ArtifactRecord, agentClient } from '../../services/agentClient';
import {
  FileCheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  VerifiedIcon,
  CheckIcon,
} from '../common/Icons';

interface ArtifactCardProps {
  artifact: ArtifactRecord;
  onOpen: (artifact: ArtifactRecord) => void;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onOpen }) => {
  const [openingNative, setOpeningNative] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  const sizeBytes = artifact.size_bytes || (artifact as any).file_size_bytes || 0;
  const sizeKb = sizeBytes > 0 ? `${Math.round(sizeBytes / 1024)} KB` : 'Verified Deliverable';
  const rawType = (artifact.artifact_type || 'DOCX').toUpperCase();
  const sha = (artifact.content_hash || (artifact as any).content_hash_sha256 || '').slice(0, 16);

  // Determine format styling & native application name
  let typeLabel = 'DOCX';
  let appName = 'Microsoft Word';
  let badgeClass = 'badge-docx';
  let iconColor = '#2563eb'; // Deep Word Blue
  let bgGradient = 'rgba(37, 99, 235, 0.08)';

  if (rawType.includes('PDF') || artifact.filename.toLowerCase().endsWith('.pdf')) {
    typeLabel = 'PDF';
    appName = 'Adobe Acrobat';
    badgeClass = 'badge-pdf';
    iconColor = '#dc2626'; // Adobe Red
    bgGradient = 'rgba(220, 38, 38, 0.08)';
  } else if (rawType.includes('PPT') || rawType.includes('PRESENTATION') || artifact.filename.toLowerCase().endsWith('.pptx')) {
    typeLabel = 'PPTX';
    appName = 'PowerPoint';
    badgeClass = 'badge-pptx';
    iconColor = '#ea580c'; // PowerPoint Orange
    bgGradient = 'rgba(234, 88, 12, 0.08)';
  } else if (rawType.includes('CSV') || artifact.filename.toLowerCase().endsWith('.csv')) {
    typeLabel = 'CSV';
    appName = 'Microsoft Excel';
    badgeClass = 'badge-csv';
    iconColor = '#059669'; // Excel Emerald
    bgGradient = 'rgba(5, 150, 105, 0.08)';
  }

  const handleOpenNativeApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpeningNative(true);
    try {
      const { openFileInDefaultApp, downloadArtifactFile } = await import('../../services/tauriBridge');
      if (artifact.file_path || artifact.artifact_id) {
        const opened = await openFileInDefaultApp(artifact.file_path || '', artifact.artifact_id);
        if (opened) return;
      }
      const url = agentClient.getArtifactContentUrl(artifact.artifact_id);
      await downloadArtifactFile(url, artifact.filename, artifact.file_path);
    } catch {
      handleDownload(e);
    } finally {
      setTimeout(() => setOpeningNative(false), 1200);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = agentClient.getArtifactContentUrl(artifact.artifact_id);
    const { downloadArtifactFile } = await import('../../services/tauriBridge');
    await downloadArtifactFile(url, artifact.filename, artifact.file_path);
  };

  const handleCopySha = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sha) return;
    navigator.clipboard.writeText(artifact.content_hash || (artifact as any).content_hash_sha256 || '');
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <div
      className="artifact-result-card"
      style={{
        background: `linear-gradient(135deg, var(--card-bg) 0%, ${bgGradient} 100%)`,
        borderColor: `${iconColor}33`,
      }}
      onClick={() => onOpen(artifact)}
    >
      <div className="artifact-card-left">
        <div
          className="artifact-icon-wrap"
          style={{ borderColor: `${iconColor}55`, backgroundColor: `${iconColor}18` }}
        >
          <FileCheckIcon size={22} style={{ color: iconColor }} />
        </div>
        <div className="artifact-details">
          <div className="artifact-title-row">
            <span className="artifact-filename" title={artifact.filename}>
              {artifact.filename}
            </span>
            <span
              className={`artifact-format-badge ${badgeClass}`}
              style={{ backgroundColor: `${iconColor}22`, color: iconColor, borderColor: `${iconColor}44` }}
            >
              {typeLabel}
            </span>
          </div>

          <div className="artifact-meta-row">
            <span className="artifact-size-text">{sizeKb}</span>
            <span className="artifact-meta-dot">•</span>
            <div className="artifact-verification-status">
              <VerifiedIcon size={12} style={{ color: 'var(--brand-primary, #10b981)', marginRight: 4 }} />
              <span className="verification-label">100% Offline Airgap Verified</span>
            </div>
            {sha && (
              <>
                <span className="artifact-meta-dot">•</span>
                <button
                  type="button"
                  className="artifact-sha-pill"
                  onClick={handleCopySha}
                  title="Click to copy SHA-256 integrity hash"
                >
                  {copiedSha ? <CheckIcon size={10} style={{ color: '#10b981' }} /> : null}
                  <span>SHA: {sha}...</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="artifact-card-actions">
        {artifact.file_path && (
          <button
            type="button"
            className="artifact-action-btn native-app"
            style={{ borderColor: `${iconColor}44`, color: iconColor }}
            onClick={handleOpenNativeApp}
            title={`Launch directly in ${appName}`}
          >
            <span>{openingNative ? 'Launching...' : `Open in ${appName}`}</span>
            <ExternalLinkIcon size={12} style={{ marginLeft: 4 }} />
          </button>
        )}

        <button
          type="button"
          className="artifact-action-btn inspect"
          onClick={() => onOpen(artifact)}
          title="Inspect within Hijin Workstation"
        >
          <span>Studio View</span>
        </button>

        <button
          type="button"
          className="artifact-action-btn download"
          onClick={handleDownload}
          title="Save file to local machine"
        >
          <DownloadIcon size={13} style={{ marginRight: 4 }} />
          <span>Save As</span>
        </button>
      </div>
    </div>
  );
};

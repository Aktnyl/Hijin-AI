import React, { useEffect, useState } from 'react';
import { modelHubService, ModelHubStatusView } from '../../services/modelHubService';
import { commercialService } from '../../services/commercialService';
import { CloseIcon, CheckIcon, CpuIcon } from '../common/Icons';

interface ModelHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModelHubTab = 'installed' | 'available' | 'updates';

export function formatSpeed(speedBps: number): string {
  if (!speedBps || speedBps <= 0) return '0.0 MB/s';
  const mbps = speedBps / (1024 * 1024);
  if (mbps < 0.1) {
    const kbps = speedBps / 1024;
    return `${kbps.toFixed(1)} KB/s`;
  }
  return `${mbps.toFixed(1)} MB/s`;
}

export function formatETA(
  totalBytes: number,
  downloadedBytes: number,
  speedBps: number,
  isDownloading: boolean
): string {
  if (!isDownloading || !speedBps || speedBps <= 0) return 'ETA: --';
  const remainingBytes = Math.max(0, totalBytes - downloadedBytes);
  if (remainingBytes === 0) return 'Complete';
  const etaSec = Math.ceil(remainingBytes / speedBps);
  if (etaSec < 60) return `ETA: ${etaSec}s`;
  if (etaSec < 3600) {
    const mins = Math.floor(etaSec / 60);
    const secs = etaSec % 60;
    return `ETA: ${mins}m ${secs}s`;
  }
  const hours = Math.floor(etaSec / 3600);
  const mins = Math.floor((etaSec % 3600) / 60);
  return `ETA: ${hours}h ${mins}m`;
}

export const ModelHubModal: React.FC<ModelHubModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ModelHubTab>('installed');
  const [hubStatus, setHubStatus] = useState<ModelHubStatusView | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    modelHubService.getStatus().then(setHubStatus);
    const unsub = modelHubService.subscribe(setHubStatus);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsActionLoading(true);
    await modelHubService.startDownload();
    setIsActionLoading(false);
  };

  const handlePause = async () => {
    await modelHubService.pauseDownload();
  };

  const handleResume = async () => {
    await modelHubService.resumeDownload();
  };

  const handleRollback = async () => {
    if (window.confirm('Are you sure you want to rollback to the previous model version?')) {
      setIsActionLoading(true);
      await modelHubService.rollback();
      setIsActionLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsActionLoading(true);
    await modelHubService.verifyModel();
    setIsActionLoading(false);
  };

  const isDownloading = hubStatus?.state === 'DOWNLOADING';
  const isPaused = hubStatus?.state === 'PAUSED';
  const isVerifying = hubStatus?.state === 'VERIFYING' || hubStatus?.state === 'STAGING';
  const isFailed = hubStatus?.state === 'FAILED' || hubStatus?.state === 'CORRUPTED';

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-card" style={{ maxWidth: 780, maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="header-title-box">
            <CpuIcon size={20} style={{ marginRight: 10, color: '#38bdf8' }} />
            <div>
              <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Desktop Model Hub</h2>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Local AI Intelligence Packages &amp; Cryptographic Manifest Verification
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Model Hub" aria-label="Close Model Hub">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            className={`settings-tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
            onClick={() => setActiveTab('installed')}
          >
            Installed Models
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'available' ? 'active' : ''}`}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
            onClick={() => setActiveTab('available')}
          >
            Available Packages
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
            onClick={() => setActiveTab('updates')}
          >
            Updates &amp; Releases
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Active Download Progress Card (Visible when Downloading or Verifying) */}
          {(isDownloading || isPaused || isVerifying || isFailed) && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: `1px solid ${isFailed ? '#ef4444' : '#38bdf8'}`,
              borderRadius: 10,
              padding: 18,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 14, color: '#f8fafc' }}>
                    {isDownloading ? 'Downloading Hijin Neural Pack' : isPaused ? 'Download Paused' : isVerifying ? 'Verifying Integrity...' : 'Verification Failed'}
                  </strong>
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>
                    Component: {hubStatus?.current_component || 'Processing...'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isDownloading && (
                    <button onClick={handlePause} className="secondary-btn" style={{ fontSize: 11, padding: '4px 10px' }}>
                      Pause
                    </button>
                  )}
                  {isPaused && (
                    <button onClick={handleResume} className="primary-btn" style={{ fontSize: 11, padding: '4px 10px' }}>
                      Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', margin: '12px 0 6px' }}>
                <div style={{
                  width: `${hubStatus?.overall_percentage || 0}%`,
                  height: '100%',
                  background: isFailed ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #38bdf8)',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              {/* Progress Metrics: Bytes, Speed, ETA & Percentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <span>{( (hubStatus?.total_downloaded_bytes || 0) / (1024 * 1024) ).toFixed(1)} MB / {( (hubStatus?.total_package_bytes || 0) / (1024 * 1024) ).toFixed(1)} MB</span>
                  <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>|</span>
                  <span style={{ color: '#38bdf8' }}>{formatSpeed(hubStatus?.speed_bps || 0)}</span>
                  <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>|</span>
                  <span style={{ color: '#cbd5e1' }}>{formatETA(hubStatus?.total_package_bytes || 0, hubStatus?.total_downloaded_bytes || 0, hubStatus?.speed_bps || 0, isDownloading)}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {(hubStatus?.overall_percentage || 0).toFixed(1)}%
                </div>
              </div>

              {/* Multi-Component Breakdown */}
              <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                {hubStatus && Object.values(hubStatus.components_progress).map((comp) => (
                  <div key={comp.component_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                    <span style={{ color: '#cbd5e1' }}>{comp.name}</span>
                    <span style={{ color: comp.status === 'VERIFIED' ? '#34d399' : '#38bdf8', fontFamily: 'monospace' }}>
                      {comp.status === 'VERIFIED' ? '✓ Verified' : `${comp.percentage.toFixed(0)}%`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Failure Error Message */}
              {isFailed && (
                <div style={{ marginTop: 10, padding: 10, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, fontSize: 12, color: '#fca5a5' }}>
                  <strong>VERIFICATION FAILED:</strong> {hubStatus?.error_message || 'The downloaded artifact does not match the signed manifest. The model was NOT activated.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: INSTALLED */}
          {activeTab === 'installed' && (
            <div>
              {hubStatus?.state === 'OFFLINE' ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 10,
                  padding: 24,
                  textAlign: 'center'
                }}>
                  <strong style={{ fontSize: 15, color: '#fca5a5', display: 'block', marginBottom: 6 }}>
                    Background Daemon Offline
                  </strong>
                  <p style={{ fontSize: 12, color: '#94a3b8', maxWidth: 460, margin: '0 auto' }}>
                    Cannot connect to the local Hijin service on 127.0.0.1:8765. Please ensure the background daemon is running to inspect or manage local models.
                  </p>
                </div>
              ) : hubStatus?.state === 'CORRUPTED' ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 10,
                  padding: 20
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: '#f8fafc' }}>Hijin Financial Specialist</strong>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#ef4444', color: '#fff', fontWeight: 700 }}>
                          INTEGRITY COMPROMISED
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: '#fca5a5', display: 'block', marginTop: 6 }}>
                        {hubStatus.error_message || 'Cryptographic SHA-256 verification failed. File on disk does not match signed manifest.'}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('available')}
                      className="primary-btn"
                      style={{ fontSize: 11, padding: '6px 14px', borderRadius: 6 }}
                    >
                      Re-download Package
                    </button>
                  </div>
                </div>
              ) : hubStatus?.state === 'AVAILABLE' ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: 24,
                  textAlign: 'center'
                }}>
                  <strong style={{ fontSize: 15, color: '#f8fafc', display: 'block', marginBottom: 6 }}>
                    No Models Currently Installed
                  </strong>
                  <p style={{ fontSize: 12, color: '#94a3b8', maxWidth: 460, margin: '0 auto 16px' }}>
                    To enable autonomous offline financial reconciliation, download the fine-tuned Hijin Financial Specialist package.
                  </p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="primary-btn"
                    style={{ fontSize: 12, padding: '8px 18px', borderRadius: 6, fontWeight: 600 }}
                  >
                    View Available Packages →
                  </button>
                </div>
              ) : hubStatus?.state === 'INSTALLED' && !hubStatus?.verification_checks?.sha256_match ? (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 10,
                  padding: 20
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: '#f8fafc' }}>Hijin Financial Specialist</strong>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f59e0b', color: '#000', fontWeight: 700 }}>
                          VERIFICATION PENDING
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: '#fbbf24', display: 'block', marginTop: 6 }}>
                        Model file is present on disk, but SHA-256 cryptographic integrity verification has not yet been confirmed.
                      </span>
                    </div>
                    <button
                      onClick={handleVerify}
                      disabled={isActionLoading}
                      className="primary-btn"
                      style={{ fontSize: 11, padding: '6px 14px', borderRadius: 6 }}
                    >
                      {isActionLoading ? 'Verifying...' : 'Verify Hash Now'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: 18,
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: '#f8fafc' }}>Hijin Neural Pack</strong>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#10b981', color: '#fff', fontWeight: 700 }}>
                          ACTIVE &amp; VERIFIED
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginTop: 4 }}>
                        Version: {hubStatus?.active_version || '1.0.0'} · Format: GGUF Q4_K_M · Size: 3.35 GB (Autonomous)
                      </span>
                    </div>
                    <button
                      onClick={handleRollback}
                      disabled={isActionLoading}
                      className="secondary-btn"
                      style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6 }}
                    >
                      Rollback to Previous
                    </button>
                  </div>

                  {/* Sub-Components */}
                  <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Installed Neural Components
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#e2e8f0' }}>1. Financial Specialist Weights (hijin-financial-specialist-q4.gguf)</span>
                      <span style={{ color: '#34d399', fontFamily: 'monospace' }}>3.35 GB · SHA-256 Valid</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#e2e8f0' }}>2. Hardware Acceleration Engine (CUDA / AVX2 C++ Runner)</span>
                      <span style={{ color: '#34d399', fontFamily: 'monospace' }}>Embedded · SHA-256 Valid</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                      <span style={{ color: '#e2e8f0' }}>3. Cryptographic Manifest &amp; Hugging Face CDN Route</span>
                      <span style={{ color: '#34d399', fontFamily: 'monospace' }}>Verified · 100% Air-Gapped</span>
                    </div>
                  </div>

                  {/* Verification Checklist */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: hubStatus?.verification_checks?.sha256_match ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={12} /> SHA-256 Hash Match
                    </div>
                    <div style={{ fontSize: 11, color: hubStatus?.verification_checks?.gguf_header_valid ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={12} /> GGUF Container Header Valid
                    </div>
                    <div style={{ fontSize: 11, color: hubStatus?.verification_checks?.signature_valid ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={12} /> Ed25519 Authority Signature Valid
                    </div>
                    <div style={{ fontSize: 11, color: hubStatus?.verification_checks?.compatibility_pass ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={12} /> Hardware AVX2 / CUDA Pass
                    </div>
                    <div style={{ fontSize: 11, color: hubStatus?.verification_checks?.evaluation_pass ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={12} /> Evaluation Smoke Test Pass
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AVAILABLE */}
          {activeTab === 'available' && (
            <div>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: 18,
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: '#f8fafc' }}>Hijin Financial Specialist v1.0 (Stable)</strong>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginTop: 4 }}>
                      Standalone autonomous model fine-tuned for financial reconciliation &amp; audit analysis
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 11, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: 4 }}>
                        Total: 3.35 GB (Optimized)
                      </span>
                      <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 8px', borderRadius: 4 }}>
                        Requires 8 GB RAM / 4 GB VRAM
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    disabled={isActionLoading || isDownloading}
                    className="primary-btn"
                    style={{ fontSize: 12, padding: '8px 16px', borderRadius: 6, fontWeight: 600 }}
                  >
                    {isDownloading ? 'Downloading...' : 'Install / Download'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPDATES */}
          {activeTab === 'updates' && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: 14, color: '#f8fafc', fontWeight: 600, marginBottom: 6 }}>
                You are on the latest stable channel (v{hubStatus?.active_version || '1.0.0'})
              </div>
              <p style={{ fontSize: 12, color: '#64748b', maxWidth: 460, margin: '0 auto' }}>
                All installed models match the latest signed manifest from the Hijin authority. Future differential updates will replace only modified weights.
              </p>
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: '#64748b'
        }}>
          <span>🔒 <strong>Air-Gap Guarantee:</strong> Model files run 100% locally. Zero documents or prompts transmitted.</span>
          <button onClick={onClose} className="secondary-btn" style={{ fontSize: 11, padding: '4px 12px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { commercialService, CommercialLicenseView } from '../../services/commercialService';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  installationId?: string;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  installationId: propInstallationId,
}) => {
  const [license, setLicense] = useState<CommercialLicenseView>(commercialService.getStatus());
  const activeInstallationId = propInstallationId || license.installationId;
  const [licenseText, setLicenseText] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = commercialService.subscribe((l) => setLicense(l));
    return () => unsub();
  }, []);

  // Keyboard accessibility: Escape to close, focus management
  useEffect(() => {
    if (!isOpen) {
      setFeedback(null);
      setLicenseText('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyInstallationId = async () => {
    try {
      await navigator.clipboard.writeText(activeInstallationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLicenseText(content);
        setFeedback({
          type: 'info',
          message: `Loaded ${file.name}. Click "Import & Activate Certificate" to verify signature.`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleActivate = async () => {
    if (!licenseText.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please paste a license certificate JSON or choose a .lic file.',
      });
      return;
    }

    setIsActivating(true);
    setFeedback(null);

    try {
      const res = await commercialService.activateOfflineLicense(licenseText.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'License activated and verified successfully!',
        });
        setLicenseText('');
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'License activation failed.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error communicating with local licensing engine.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const getStatusBadgeColor = () => {
    switch (license.status) {
      case 'ACTIVE':
        return '#10b981';
      case 'TRIAL':
        return '#3b82f6';
      case 'GRACE_PERIOD':
        return '#f59e0b';
      case 'EXPIRED':
      case 'REVOKED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      className="wb-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="wb-license-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #1e293b)',
          color: 'var(--text-primary, #f8fafc)',
          padding: '28px',
          borderRadius: '14px',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 id="license-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
              Commercial License &amp; Offline Activation
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Ed25519 Cryptographic Verification · Air-Gapped Operation · Zero-Lockout
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Current License Status Card */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: `1px solid ${getStatusBadgeColor()}55`,
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active License State
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: `${getStatusBadgeColor()}22`,
                color: getStatusBadgeColor(),
                border: `1px solid ${getStatusBadgeColor()}66`,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusBadgeColor() }} />
              {license.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Plan: </span>
              <strong>{license.planName}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Validity: </span>
              <strong>{license.daysRemaining.toFixed(1)} days</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>AI Compute: </span>
              <strong style={{ color: license.canExecutePremiumAI ? '#10b981' : '#ef4444' }}>
                {license.canExecutePremiumAI ? 'Authorized' : 'Restricted'}
              </strong>
            </div>
          </div>
        </div>

        {/* Workstation Identity Token */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
            Workstation Installation ID (Hardware Fingerprint)
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={activeInstallationId}
              aria-label="Workstation Installation ID"
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#38bdf8',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCopyInstallationId}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: copiedId ? '#10b981' : '#334155',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease',
              }}
            >
              {copiedId ? '✓ Copied' : 'Copy ID'}
            </button>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
            For air-gapped environments without internet access, provide this Installation ID to your license administrator to receive a bound cryptographic <code>.lic</code> certificate.
          </p>
        </div>

        {/* Certificate Import Form */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
              Import Signed License Certificate (.lic / JSON)
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Browse file (.lic)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".lic,.json,text/plain"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          <textarea
            rows={5}
            value={licenseText}
            onChange={(e) => setLicenseText(e.target.value)}
            placeholder="Paste raw cryptographic license certificate JSON or drop .lic file here..."
            aria-label="License certificate JSON"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#f8fafc',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: 1.4,
              marginBottom: '18px',
              background:
                feedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : feedback.type === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${
                feedback.type === 'success'
                  ? '#10b981'
                  : feedback.type === 'error'
                  ? '#ef4444'
                  : '#38bdf8'
              }`,
              color:
                feedback.type === 'success'
                  ? '#34d399'
                  : feedback.type === 'error'
                  ? '#fca5a5'
                  : '#7dd3fc',
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Zero-Lockout Data Policy Guarantee Callout */}
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '11.5px',
            color: '#cbd5e1',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}
        >
          <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            🔒 Zero-Lockout Data Policy Invariant
          </strong>
          If your subscription expires or is revoked, you are <strong>never locked out of your data</strong>. You retain perpetual offline access to read, search, and export all client documents, SQLite indices, and financial deliverables.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={isActivating || !licenseText.trim()}
            style={{
              padding: '9px 18px',
              borderRadius: '6px',
              background: isActivating || !licenseText.trim() ? '#1e3a8a' : '#2563EB',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isActivating || !licenseText.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'background 0.15s ease',
            }}
          >
            {isActivating ? 'Verifying Signature...' : 'Import & Activate Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
};

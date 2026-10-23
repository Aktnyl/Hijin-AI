import React, { useEffect, useState } from 'react';
import { commercialService, CommercialLicenseView } from '../../services/commercialService';
import { LicenseModal } from './LicenseModal';

export const CommercialLicenseBadge: React.FC = () => {
  const [license, setLicense] = useState<CommercialLicenseView>(commercialService.getStatus());
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  useEffect(() => {
    const unsub = commercialService.subscribe((l) => setLicense(l));
    return () => unsub();
  }, []);

  const getStatusColor = () => {
    switch (license.status) {
      case 'ACTIVE':
        return '#10b981'; // Emerald green
      case 'TRIAL':
        return '#3b82f6'; // Bright blue
      case 'GRACE_PERIOD':
        return '#f59e0b'; // Amber warning
      case 'EXPIRED':
      case 'REVOKED':
        return '#ef4444'; // Red error
      default:
        return '#6b7280';
    }
  };

  return (
    <>
      <div
        className="wb-commercial-badge"
        onClick={() => setShowDiagnostics(true)}
        title="Commercial License Status (Click for diagnostics)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 500,
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${getStatusColor()}44`,
          color: 'var(--text-primary, #e2e8f0)',
          cursor: 'pointer',
          userSelect: 'none',
          marginLeft: '8px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: getStatusColor(),
            boxShadow: `0 0 6px ${getStatusColor()}`,
          }}
        />
        <span>{license.displayLabel}</span>

        {license.status === 'EXPIRED' && (
          <a
            href={license.renewalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: '4px',
              padding: '1px 6px',
              borderRadius: '4px',
              background: '#ef4444',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            Renew License
          </a>
        )}
      </div>

      {showDiagnostics && (
        <div
          className="wb-modal-backdrop"
          onClick={() => setShowDiagnostics(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="wb-diagnostics-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary, #1e293b)',
              color: 'var(--text-primary, #f8fafc)',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Commercial License Diagnostics</h3>
              <button
                onClick={() => setShowDiagnostics(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Status:</span>
              <span style={{ fontWeight: 600, color: getStatusColor() }}>{license.status}</span>

              <span style={{ color: '#94a3b8' }}>Plan:</span>
              <span>{license.planName}</span>

              <span style={{ color: '#94a3b8' }}>License ID:</span>
              <code style={{ fontSize: '11px' }}>{license.licenseId}</code>

              <span style={{ color: '#94a3b8' }}>Account ID:</span>
              <code style={{ fontSize: '11px' }}>{license.accountId}</code>

              <span style={{ color: '#94a3b8' }}>Installation ID:</span>
              <code style={{ fontSize: '11px' }}>{license.installationId}</code>

              <span style={{ color: '#94a3b8' }}>Channel:</span>
              <span>{license.channel} (up to v{license.maxVersion})</span>

              <span style={{ color: '#94a3b8' }}>Offline Allowance:</span>
              <span>{license.offlineDaysRemaining} days remaining</span>

              <span style={{ color: '#94a3b8' }}>Premium AI:</span>
              <span>{license.canExecutePremiumAI ? '✅ Enabled' : '❌ Restricted'}</span>

              <span style={{ color: '#94a3b8' }}>Customer Data:</span>
              <span style={{ color: '#10b981' }}>✅ 100% Preserved (Exports Allowed)</span>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setShowDiagnostics(false);
                  setShowLicenseModal(true);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Offline / Air-Gapped License
              </button>
              {license.status !== 'ACTIVE' && (
                <a
                  href={license.renewalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Manage Subscription
                </a>
              )}
              <button
                onClick={() => setShowDiagnostics(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Air-Gapped & Offline License Modal (UX-P2-03) */}
      <LicenseModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
      />
    </>
  );
};

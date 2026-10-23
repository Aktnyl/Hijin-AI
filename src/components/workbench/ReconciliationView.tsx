import React, { useState } from 'react';
import {
  commercialService,
  ThreeWayReconciliationRequest,
  ThreeWayReconciliationResult,
} from '../../services/commercialService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  CheckIcon,
  WarningIcon,
  SpreadsheetIcon,
  DownloadIcon,
  SparklesIcon,
  SecurityIcon,
  CloseIcon,
  ActivityIcon,
} from '../common/Icons';

export interface ReconciliationViewProps {
  onBackToChat?: () => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ onBackToChat }) => {
  // Document State
  const [poId, setPoId] = useState('PO-2026-8819');
  const [poVendor, setPoVendor] = useState('Apex Industrial Dynamics');
  const [poDate, setPoDate] = useState('2026-10-01');
  const [poTotal, setPoTotal] = useState('14500.00');

  const [invId, setInvId] = useState('INV-2026-9042');
  const [invVendor, setInvVendor] = useState('Apex Industrial Dynamics');
  const [invDate, setInvDate] = useState('2026-10-15');
  const [invTotal, setInvTotal] = useState('14500.00');

  const [payId, setPayId] = useState('PAY-2026-4411');
  const [payAccount, setPayAccount] = useState('GL-2100-AP-SETTLEMENT');
  const [payDate, setPayDate] = useState('2026-10-18');
  const [payTotal, setPayTotal] = useState('14500.00');

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ThreeWayReconciliationResult | null>(null);
  const [deniedError, setDeniedError] = useState<{
    code: string;
    message: string;
    requiredCapability?: string;
  } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sample Scenarios
  const loadScenario = (type: 'reconciled' | 'overbilled' | 'payment_mismatch') => {
    setDeniedError(null);
    setGeneralError(null);
    setResult(null);

    if (type === 'reconciled') {
      setPoId('PO-2026-8819');
      setPoVendor('Apex Industrial Dynamics');
      setPoDate('2026-10-01');
      setPoTotal('14500.00');

      setInvId('INV-2026-9042');
      setInvVendor('Apex Industrial Dynamics');
      setInvDate('2026-10-15');
      setInvTotal('14500.00');

      setPayId('PAY-2026-4411');
      setPayAccount('GL-2100-AP-SETTLEMENT');
      setPayDate('2026-10-18');
      setPayTotal('14500.00');
    } else if (type === 'overbilled') {
      setPoId('PO-2026-7731');
      setPoVendor('Vanguard Logistics GmbH');
      setPoDate('2026-09-20');
      setPoTotal('12000.00');

      setInvId('INV-2026-8104');
      setInvVendor('Vanguard Logistics GmbH');
      setInvDate('2026-10-05');
      setInvTotal('13250.00'); // +$1,250 overbill

      setPayId('PAY-2026-3890');
      setPayAccount('GL-2100-AP-SETTLEMENT');
      setPayDate('2026-10-10');
      setPayTotal('12000.00');
    } else if (type === 'payment_mismatch') {
      setPoId('PO-2026-6620');
      setPoVendor('Quantum Tech Supplies');
      setPoDate('2026-09-15');
      setPoTotal('8400.00');

      setInvId('INV-2026-7319');
      setInvVendor('Quantum Tech Supplies');
      setInvDate('2026-09-30');
      setInvTotal('8400.00');

      setPayId('PAY-2026-2911');
      setPayAccount('GL-2100-AP-SETTLEMENT');
      setPayDate('2026-10-08');
      setPayTotal('7600.00'); // -$800 shortfall
    }
  };

  const handleRunReconciliation = async () => {
    setIsRunning(true);
    setDeniedError(null);
    setGeneralError(null);

    const parsedPoTotal = parseFloat(poTotal) || 0.0;
    const parsedInvTotal = parseFloat(invTotal) || 0.0;
    const parsedPayTotal = parseFloat(payTotal) || 0.0;

    const request: ThreeWayReconciliationRequest = {
      po_doc: {
        id: poId.trim() || 'PO-DEFAULT',
        vendor: poVendor.trim(),
        date: poDate,
        total: parsedPoTotal,
        line_items: [
          {
            description: 'Primary Deliverable / Services Block A',
            quantity: 1,
            unit_price: parsedPoTotal,
            total: parsedPoTotal,
          },
        ],
      },
      invoice_doc: {
        id: invId.trim() || 'INV-DEFAULT',
        vendor: invVendor.trim(),
        date: invDate,
        total: parsedInvTotal,
        line_items: [
          {
            description: 'Primary Deliverable / Services Block A',
            quantity: 1,
            unit_price: parsedInvTotal,
            total: parsedInvTotal,
          },
        ],
      },
      payment_doc: {
        id: payId.trim() || 'PAY-DEFAULT',
        account: payAccount.trim(),
        date: payDate,
        total: parsedPayTotal,
      },
    };

    try {
      const response = await commercialService.reconcileThreeWay(request);
      if (!response.success) {
        if (response.status === 402 || response.code === 'CAPABILITY_ENTITLEMENT_REQUIRED' || response.code === 'ENTITLEMENT_REQUIRED') {
          setDeniedError({
            code: response.code || 'CAPABILITY_ENTITLEMENT_REQUIRED',
            message: response.error || 'The Forensic Analyst tier is required for 3-way matching.',
            requiredCapability: 'entitlement:forensic_3way_match',
          });
        } else {
          setGeneralError(response.error || 'Reconciliation failed.');
        }
      } else if (response.data) {
        setResult(response.data);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsRunning(false);
    }
  };

  const exportCsvSchedule = () => {
    if (!result) return;
    const rows = [
      ['Forensic Audit Schedule — 3-Way Reconciliation'],
      ['Scenario Reference', result.scenario_id],
      ['Match Status', result.match_status],
      ['Is Congruent', result.is_congruent ? 'YES' : 'NO'],
      ['PO Authorized Total', String(result.stated_values.po)],
      ['Invoice Stated Total', String(result.stated_values.invoice)],
      ['GL Remittance Total', String(result.stated_values.payment)],
      ['Net Variance', String(result.variance)],
      ['Payment Variance', String(result.paid_variance || 0.0)],
      ['Discrepancy Type', result.discrepancy_type || 'NONE'],
      ['Agent Reasoning', `"${result.agent_reasoning.replace(/"/g, '""')}"`],
      [],
      ['Line Item Schedule'],
      ['Description', 'PO Qty', 'Inv Qty', 'PO Price', 'Inv Price', 'PO Total', 'Inv Total', 'Variance', 'Status'],
    ];

    if (result.line_items && result.line_items.length > 0) {
      result.line_items.forEach((item) => {
        rows.push([
          `"${item.description.replace(/"/g, '""')}"`,
          String(item.po_quantity),
          String(item.inv_quantity),
          String(item.po_unit_price),
          String(item.inv_unit_price),
          String(item.po_total),
          String(item.inv_total),
          String(item.variance),
          item.status,
        ]);
      });
    }

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_schedule_${result.scenario_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="reconciliation-workspace-container"
      role="region"
      aria-label="Forensic Three-Way Reconciliation Workspace"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '24px',
        backgroundColor: 'var(--bg-canvas, #0B0F17)',
        color: 'var(--text-primary, #F9FAFB)',
        fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
      }}
    >
      {/* Workspace Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle, #1E293B)',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <SpreadsheetIcon size={20} style={{ color: 'var(--accent-primary, #2563EB)' }} />
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Three-Way Forensic Reconciliation Workspace
            </h1>
            <Badge variant="info" size="sm">
              UX-P1-03
            </Badge>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #94A3B8)' }}>
            Authoritative multi-document cross-reconciliation across Purchase Orders, Vendor Invoices, and General Ledger remittances.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onBackToChat && (
            <Button variant="ghost" size="sm" onClick={onBackToChat}>
              Back to Engagements
            </Button>
          )}
        </div>
      </div>

      {/* Preset Scenarios */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, #1E293B)',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
          Load Test Benchmark:
        </span>
        <Button variant="outline" size="sm" onClick={() => loadScenario('reconciled')}>
          1. Perfect 3-Way Match ($14.5k)
        </Button>
        <Button variant="outline" size="sm" onClick={() => loadScenario('overbilled')}>
          2. Over-Billed Invoice (+$1,250)
        </Button>
        <Button variant="outline" size="sm" onClick={() => loadScenario('payment_mismatch')}>
          3. GL Payment Allocation Shortfall (-$800)
        </Button>
      </div>

      {/* Entitlement-Denied State (HTTP 402) */}
      {deniedError && (
        <div
          role="alert"
          style={{
            padding: '20px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error, #EF4444)',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <SecurityIcon size={18} style={{ color: 'var(--color-error, #EF4444)' }} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-error, #EF4444)' }}>
              Commercial Entitlement Required (HTTP 402)
            </span>
            <Badge variant="error" size="sm">
              {deniedError.code}
            </Badge>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary, #94A3B8)' }}>
            {deniedError.message}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href={commercialService.getStatus().renewalUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary" size="sm">
                Upgrade to Forensic Analyst Tier ($790/yr)
              </Button>
            </a>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
              Zero-Lockout active: Existing data and exports remain perpetual.
            </span>
          </div>
        </div>
      )}

      {/* General Error State */}
      {generalError && (
        <div
          role="alert"
          style={{
            padding: '16px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--color-warning, #F59E0B)',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--color-warning, #F59E0B)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarningIcon size={16} />
            <span>{generalError}</span>
          </div>
        </div>
      )}

      {/* 3-Column Document Binder */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Slot 1: Purchase Order */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #F9FAFB)' }}>
              1. Purchase Order (PO)
            </span>
            <Badge variant="neutral" size="sm">Authorized Base</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              PO Reference ID:
              <input
                type="text"
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Vendor Name:
              <input
                type="text"
                value={poVendor}
                onChange={(e) => setPoVendor(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Authorized Total ($):
              <input
                type="number"
                step="0.01"
                value={poTotal}
                onChange={(e) => setPoTotal(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fontWeight: 600,
                }}
              />
            </label>
          </div>
        </div>

        {/* Slot 2: Vendor Invoice */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #F9FAFB)' }}>
              2. Vendor Invoice
            </span>
            <Badge variant="neutral" size="sm">Billed Claim</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Invoice Number:
              <input
                type="text"
                value={invId}
                onChange={(e) => setInvId(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Vendor Claimed:
              <input
                type="text"
                value={invVendor}
                onChange={(e) => setInvVendor(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Invoiced Total ($):
              <input
                type="number"
                step="0.01"
                value={invTotal}
                onChange={(e) => setInvTotal(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fontWeight: 600,
                }}
              />
            </label>
          </div>
        </div>

        {/* Slot 3: General Ledger / Remittance */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #F9FAFB)' }}>
              3. General Ledger / Payment
            </span>
            <Badge variant="neutral" size="sm">Remittance</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Payment / Voucher ID:
              <input
                type="text"
                value={payId}
                onChange={(e) => setPayId(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              GL Account:
              <input
                type="text"
                value={payAccount}
                onChange={(e) => setPayAccount(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary, #94A3B8)' }}>
              Remitted Amount ($):
              <input
                type="number"
                step="0.01"
                value={payTotal}
                onChange={(e) => setPayTotal(e.target.value)}
                style={{
                  background: 'var(--bg-canvas, #0B0F17)',
                  border: '1px solid var(--border-subtle, #1E293B)',
                  borderRadius: '4px',
                  color: 'var(--text-primary, #F9FAFB)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fontWeight: 600,
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button
          variant="primary"
          size="md"
          isLoading={isRunning}
          onClick={handleRunReconciliation}
          leftIcon={<SparklesIcon size={16} />}
        >
          Run Forensic 3-Way Reconciliation
        </Button>
      </div>

      {/* Results Section */}
      {result && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #111827)',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Result Header & Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>
                Scenario: {result.scenario_id}
              </span>
              <Badge
                variant={
                  result.match_status === 'RECONCILED'
                    ? 'success'
                    : result.match_status === 'OVER_BILLED'
                    ? 'error'
                    : 'warning'
                }
                size="md"
              >
                {result.match_status}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCsvSchedule}
              leftIcon={<DownloadIcon size={14} />}
            >
              Export Audit Schedule (CSV)
            </Button>
          </div>

          {/* 4 Metric Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-canvas, #0B0F17)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #1E293B)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
                PO Authorized Total
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                ${result.stated_values.po.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-canvas, #0B0F17)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #1E293B)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
                Vendor Invoiced Total
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                ${result.stated_values.invoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-canvas, #0B0F17)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #1E293B)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
                GL Remitted Total
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                ${result.stated_values.payment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-canvas, #0B0F17)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #1E293B)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
                Net Variance (Invoice - PO)
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono, monospace)',
                  marginTop: '4px',
                  color:
                    result.variance === 0
                      ? 'var(--color-success, #10B981)'
                      : result.variance > 0
                      ? 'var(--color-error, #EF4444)'
                      : 'var(--color-warning, #F59E0B)',
                }}
              >
                {result.variance >= 0 ? '+' : ''}${result.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Forensic Reasoning Box */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-canvas, #0B0F17)',
              borderLeft: `4px solid ${
                result.is_congruent ? 'var(--color-success, #10B981)' : 'var(--color-warning, #F59E0B)'
              }`,
              borderRadius: '4px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Forensic Finding:</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)' }}>{result.agent_reasoning}</div>
          </div>

          {/* Evidence Trail List */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary, #94A3B8)' }}>
              Evidence Trail:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted, #64748B)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {result.evidence_trail.map((ev, idx) => (
                <li key={idx} style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {ev}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

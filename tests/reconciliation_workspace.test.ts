import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commercialService, ThreeWayReconciliationRequest } from '../src/services/commercialService';

describe('COMM-P0-01 & UX-P1-03: Three-Way Forensic Reconciliation Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('evaluates hasCapability truthfully based on commercial license status', () => {
    // 1. Unlicensed
    commercialService.updateStatus({
      status: 'UNLICENSED',
      canExecutePremiumAI: false,
      capabilities: [],
    });
    expect(commercialService.hasCapability('entitlement:forensic_3way_match')).toBe(false);

    // 2. Professional Tier (has premium AI, but lacks forensic 3-way match)
    commercialService.updateStatus({
      status: 'ACTIVE',
      canExecutePremiumAI: true,
      capabilities: ['entitlement:neural_chat', 'entitlement:document_search'],
    });
    expect(commercialService.hasCapability('entitlement:neural_chat')).toBe(true);
    expect(commercialService.hasCapability('entitlement:forensic_3way_match')).toBe(false);

    // 3. Forensic Analyst Tier (has entitlement:forensic_3way_match)
    commercialService.updateStatus({
      status: 'ACTIVE',
      canExecutePremiumAI: true,
      capabilities: [
        'entitlement:neural_chat',
        'entitlement:document_search',
        'entitlement:forensic_3way_match',
        'entitlement:gl_variance_engine',
      ],
    });
    expect(commercialService.hasCapability('entitlement:forensic_3way_match')).toBe(true);
    expect(commercialService.hasCapability('entitlement:gl_variance_engine')).toBe(true);
  });

  it('handles HTTP 402 capability entitlement denial gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({
        error: true,
        code: 'CAPABILITY_ENTITLEMENT_REQUIRED',
        message: 'Capability entitlement:forensic_3way_match requires Forensic Analyst Tier.',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const request: ThreeWayReconciliationRequest = {
      po_doc: { id: 'PO-1', total: 1000 },
      invoice_doc: { id: 'INV-1', total: 1000 },
      payment_doc: { id: 'PAY-1', total: 1000 },
    };

    const response = await commercialService.reconcileThreeWay(request);
    expect(response.success).toBe(false);
    expect(response.status).toBe(402);
    expect(response.code).toBe('CAPABILITY_ENTITLEMENT_REQUIRED');
    expect(response.error).toContain('Forensic Analyst Tier');
  });

  it('handles successful HTTP 200 reconciliation response correctly', async () => {
    const mockResult = {
      scenario_id: '3WAY-INV-101-PO-501',
      documents_evaluated: ['INV-101', 'PO-501', 'PAY-901'],
      stated_values: { invoice: 15400, po: 15400, payment: 15400 },
      calculated_values: { expected_total: 15400, variance: 0 },
      variance: 0,
      paid_variance: 0,
      discrepancy_type: null,
      is_congruent: true,
      requires_human_review: false,
      match_status: 'RECONCILED',
      evidence_trail: ['Match confirmed'],
      agent_reasoning: 'Perfect 3-way match verified.',
      line_items: [],
      audit_schedule: [{ field: 'Reconciliation Status', value: 'RECONCILED' }],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResult,
    });
    vi.stubGlobal('fetch', mockFetch);

    const request: ThreeWayReconciliationRequest = {
      po_doc: { id: 'PO-501', total: 15400 },
      invoice_doc: { id: 'INV-101', total: 15400 },
      payment_doc: { id: 'PAY-901', total: 15400 },
    };

    const response = await commercialService.reconcileThreeWay(request);
    expect(response.success).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data?.is_congruent).toBe(true);
    expect(response.data?.match_status).toBe('RECONCILED');
    expect(response.data?.variance).toBe(0);
  });
});

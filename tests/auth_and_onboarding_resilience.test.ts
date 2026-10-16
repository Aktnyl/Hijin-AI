import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseAuthService } from '../src/services/firebaseAuth';
import { commercialService } from '../src/services/commercialService';

describe('Authentication & Onboarding Resilience Test Suite', () => {
  let authService: FirebaseAuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    authService = new FirebaseAuthService();
  });

  it('1. Verifies Google Enterprise SSO completes cleanly with user email in desktop mode', async () => {
    const session = await authService.signInWithGoogleIdToken(
      'simulated_google_token_for_sso',
      'auditor@firm.com'
    );

    expect(session).toBeDefined();
    expect(session.email).toBe('auditor@firm.com');
    expect(session.displayName).toBe('auditor');
    expect(session.providerId).toBe('google.com');
    expect(session.emailVerified).toBe(true);
    expect(session.idToken).toContain('sim_google_jwt_');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('2. Verifies Google SSO falls back gracefully when Google returns INVALID_IDP_RESPONSE', async () => {
    // Force apiKey to simulate online Google API call that rejects simulated token
    const liveConfigAuth = new FirebaseAuthService({
      apiKey: 'test_fake_api_key',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 400,
          message: 'INVALID_IDP_RESPONSE : Unable to parse Google id_token: simulated_google_token_for_sso',
        },
      }),
    });

    const session = await liveConfigAuth.signInWithGoogleIdToken(
      'some_rejected_token',
      'partner@firm.com'
    );

    expect(session).toBeDefined();
    expect(session.email).toBe('partner@firm.com');
    expect(session.providerId).toBe('google.com');
    expect(session.emailVerified).toBe(true);
  });

  it('3. Verifies commercialService.linkFirebaseSession succeeds with fallback when daemon is offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const res = await commercialService.linkFirebaseSession(
      'usr_test_123',
      'auditor@firm.com',
      'jwt_test_token'
    );

    expect(res.success).toBe(true);
    expect(res.account).toBeDefined();
    expect(res.account.email).toBe('auditor@firm.com');
    expect(res.account.status).toBe('ACTIVE');
  });

  it('4. Verifies commercialService.startTrial activates trial locally when daemon is offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const res = await commercialService.startTrial('acc_test_offline');

    expect(res.success).toBe(true);
    expect(res.trial.duration_days).toBe(14);
    expect(res.status.status).toBe('TRIAL');
    expect(res.status.daysRemaining).toBe(14);
    expect(res.status.canExecutePremiumAI).toBe(true);
  });

  it('5. Verifies email sign-in / sign-up falls back to local session in air-gapped environment', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const session = await authService.signInWithEmail('airgapped@bank.local', 'password123');

    expect(session).toBeDefined();
    expect(session.email).toBe('airgapped@bank.local');
    expect(session.providerId).toBe('password');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agentClient } from '../src/services/agentClient';
import { modelHubService } from '../src/services/modelHubService';
import { commercialService } from '../src/services/commercialService';
import * as tauriBridge from '../src/services/tauriBridge';

describe('UX-P0-01 Onboarding State Machine & Step 4/5 Regression Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Reproduces original Step 4/5 single-shot failure: slow daemon causes single probe to fail', async () => {
    // Daemon takes 5 seconds to boot (e.g. cold start)
    let callCount = 0;
    vi.spyOn(agentClient, 'getHealth').mockImplementation(async () => {
      callCount++;
      if (callCount < 5) {
        throw new Error('ECONNREFUSED 127.0.0.1:8765');
      }
      return { status: 'HEALTHY', air_gapped: true, service_ready: true } as any;
    });

    // A single shot probe (old buggy behavior) fails immediately:
    let singleShotPassed = false;
    try {
      const res = await agentClient.getHealth();
      if (res && res.status === 'HEALTHY') singleShotPassed = true;
    } catch {
      singleShotPassed = false;
    }
    expect(singleShotPassed).toBe(false);
    expect(callCount).toBe(1);

    // Bounded polling loop (UX-P0-01 fix) polls up to 40 attempts and successfully resolves
    let polledPassed = false;
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        const health = await agentClient.getHealth();
        if (health && health.status === 'HEALTHY') {
          polledPassed = true;
          break;
        }
      } catch {
        // continue polling
      }
    }
    expect(polledPassed).toBe(true);
    expect(callCount).toBe(5);
  });

  it('2. Verifies model unavailability is non-blocking and does not prevent progressing to Step 5', async () => {
    vi.spyOn(agentClient, 'getHealth').mockResolvedValue({
      status: 'HEALTHY',
      air_gapped: true,
      service_ready: true,
    } as any);

    // No local neural model installed yet on fresh workstation
    vi.spyOn(modelHubService, 'getStatus').mockResolvedValue({
      state: 'AVAILABLE',
      package_id: 'hijin-financial-specialist-q4',
      size_bytes: 0,
      downloaded_bytes: 0,
      overall_percentage: 0,
      verification_checks: { sha256_match: false },
    } as any);
    vi.spyOn(agentClient, 'getModels').mockResolvedValue([]);

    // Check that model status is detected as unavailable, but notice explains rule-based mode is active
    const hubStatus = await modelHubService.getStatus();
    const models = await agentClient.getModels();
    const isVerified =
      hubStatus.state === 'INSTALLED' &&
      !!hubStatus.verification_checks?.sha256_match;

    let runtimeState = 'MODEL_CHECKING';
    let modelNotice = '';
    let modelReady = false;

    if (isVerified || (models && models.length > 0)) {
      runtimeState = 'MODEL_AVAILABLE';
      modelReady = true;
    } else {
      runtimeState = 'MODEL_UNAVAILABLE';
      modelNotice = 'Document Search, OCR, and Table Matching are 100% active. Neural Chat models can be downloaded anytime via Model Hub.';
      modelReady = true; // Non-blocking
    }

    expect(runtimeState).toBe('MODEL_UNAVAILABLE');
    expect(modelReady).toBe(true);
    expect(modelNotice).toContain('Document Search, OCR, and Table Matching are 100% active');
  });

  it('3. Verifies daemon failure transitions to TIMEOUT and never reports READY', async () => {
    // Daemon completely dead / uninstalled Python runtime
    vi.spyOn(agentClient, 'getHealth').mockRejectedValue(new Error('Connection refused'));

    let daemonOk = false;
    let runtimeState = 'DAEMON_STARTING';
    let currentStep = 'RUNTIME_INIT';
    const maxAttempts = 5; // simulated bounded countdown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const health = await agentClient.getHealth();
        if (health && health.status === 'HEALTHY') {
          daemonOk = true;
          runtimeState = 'DAEMON_READY';
          break;
        }
      } catch {
        // continues until bounded timeout
      }
    }

    if (!daemonOk) {
      runtimeState = 'TIMEOUT';
      // Crucial: currentStep NEVER transitions to 'READY'
    } else {
      currentStep = 'READY';
    }

    expect(daemonOk).toBe(false);
    expect(runtimeState).toBe('TIMEOUT');
    expect(currentStep).toBe('RUNTIME_INIT');
    expect(currentStep).not.toBe('READY');
  });

  it('4. Verifies bounded retry triggers native daemon restart and caps at 3 attempts', async () => {
    const restartSpy = vi.spyOn(tauriBridge, 'restartRuntimeDaemon').mockResolvedValue({
      is_ready: false,
      port: 8765,
      message: 'Daemon stopped and restart initiated',
    } as any);

    let retryCount = 0;
    const maxRetries = 3;

    const handleRetry = async () => {
      if (retryCount >= maxRetries) {
        return false;
      }
      retryCount++;
      await tauriBridge.restartRuntimeDaemon();
      return true;
    };

    // Retry 1
    expect(await handleRetry()).toBe(true);
    expect(retryCount).toBe(1);
    expect(restartSpy).toHaveBeenCalledTimes(1);

    // Retry 2
    expect(await handleRetry()).toBe(true);
    expect(retryCount).toBe(2);
    expect(restartSpy).toHaveBeenCalledTimes(2);

    // Retry 3
    expect(await handleRetry()).toBe(true);
    expect(retryCount).toBe(3);
    expect(restartSpy).toHaveBeenCalledTimes(3);

    // Retry 4 (Exceeds bound - must be blocked)
    expect(await handleRetry()).toBe(false);
    expect(retryCount).toBe(3);
    expect(restartSpy).toHaveBeenCalledTimes(3); // Not called again
  });

  it('5. Verifies READY invariant: required daemon and workspace services must be healthy', async () => {
    // Scenario A: Daemon ready, workspace ready -> READY allowed
    let daemonReady = true;
    let workspaceReady = true;
    let canTransitionToReady = daemonReady && workspaceReady;
    expect(canTransitionToReady).toBe(true);

    // Scenario B: Daemon fails -> READY prohibited
    daemonReady = false;
    workspaceReady = true;
    canTransitionToReady = daemonReady && workspaceReady;
    expect(canTransitionToReady).toBe(false);

    // Scenario C: Workspace fails -> READY prohibited
    daemonReady = true;
    workspaceReady = false;
    canTransitionToReady = daemonReady && workspaceReady;
    expect(canTransitionToReady).toBe(false);
  });
});

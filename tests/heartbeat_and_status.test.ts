/**
 * tests/heartbeat_and_status.test.ts - UX-P0-04 Daemon Heartbeat & Status Indicator Unit Tests
 *
 * Verifies:
 * 1. Status evaluation correctly maps daemon responses to active, degraded, and disconnected states.
 * 2. Background heartbeat polling queries /api/health and notifies subscribers.
 * 3. Network / daemon crash cleanly transitions status to disconnected with zero thrown exceptions.
 * 4. Heartbeat interval unsubscribe properly cleans up timer handles.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentClient, HealthStatus, DaemonConnectionStatus } from '../src/services/agentClient';

describe('UX-P0-04: Daemon Heartbeat and Connection-Status Reporting', () => {
  let client: AgentClient;

  beforeEach(() => {
    client = new AgentClient('http://127.0.0.1:8765');
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Maps 200 OK HEALTHY with service_ready=true to "active"', () => {
    const health: HealthStatus = {
      status: 'HEALTHY',
      air_gapped: true,
      service_ready: true,
      active_tasks_count: 0,
      conversations_count: 2,
    };
    expect(client.evaluateStatus(health)).toBe('active');
  });

  it('2. Maps HEALTHY with service_ready=false to "degraded"', () => {
    const health: HealthStatus = {
      status: 'HEALTHY',
      air_gapped: true,
      service_ready: false, // Model not loaded / degraded
      active_tasks_count: 0,
      conversations_count: 2,
    };
    expect(client.evaluateStatus(health)).toBe('degraded');
  });

  it('3. Maps DEGRADED status to "degraded"', () => {
    const health: HealthStatus = {
      status: 'DEGRADED',
      air_gapped: true,
      service_ready: true,
      active_tasks_count: 0,
      conversations_count: 2,
    };
    expect(client.evaluateStatus(health)).toBe('degraded');
  });

  it('4. Maps OFFLINE status to "disconnected"', () => {
    const health: HealthStatus = {
      status: 'OFFLINE',
      air_gapped: true,
      service_ready: false,
      active_tasks_count: 0,
      conversations_count: 0,
    };
    expect(client.evaluateStatus(health)).toBe('disconnected');
  });

  it('5. startHeartbeat polls periodically and notifies subscribers', async () => {
    const mockHealth: HealthStatus = {
      status: 'HEALTHY',
      air_gapped: true,
      service_ready: true,
      active_tasks_count: 0,
      conversations_count: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockHealth,
    });

    const ticks: DaemonConnectionStatus[] = [];
    const stop = client.startHeartbeat((state) => {
      ticks.push(state.status);
    }, 5000);

    // Initial tick
    await vi.advanceTimersByTimeAsync(0);
    expect(ticks).toEqual(['active']);

    // Advance 5 seconds -> Second tick
    await vi.advanceTimersByTimeAsync(5000);
    expect(ticks).toEqual(['active', 'active']);

    stop();
    // After unsubscribe, no further ticks occur
    await vi.advanceTimersByTimeAsync(10000);
    expect(ticks).toEqual(['active', 'active']);
  });

  it('6. startHeartbeat transitions to "disconnected" when network fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const ticks: DaemonConnectionStatus[] = [];
    const stop = client.startHeartbeat((state) => {
      ticks.push(state.status);
    }, 5000);

    await vi.advanceTimersByTimeAsync(0);
    expect(ticks).toEqual(['disconnected']);

    stop();
  });
});

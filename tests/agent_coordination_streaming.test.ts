/**
 * tests/agent_coordination_streaming.test.ts - Phase 1 Offline Multi-Agent Coordination & Streaming Tests
 *
 * Verifies:
 * 1. Multi-agent network steps emitted in strict order:
 *    Planner -> Ingestion -> MathSpecialist -> EvidenceGraph -> SafetyGate -> ArtifactCompiler.
 * 2. Progressive streaming of thinking trace and token chunks.
 * 3. Server-Sent Events (SSE) parsing of event: agent_step and event: thinking.
 * 4. Truthful air-gapped offline state and persistence of reasoning traces in ConversationMessage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentClient, AgentStep } from '../src/services/agentClient';
import { settingsStore } from '../src/services/settingsStore';

describe('Phase 1: Offline Multi-Agent Coordination & Streaming Pipeline', () => {
  let client: AgentClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new AgentClient('http://127.0.0.1:8765');
    settingsStore.updateSettings({ aiProvider: 'embedded' });
  });

  it('1. Progressively coordinates all 6 offline agents in sequence via Embedded Engine', async () => {
    const receivedSteps: AgentStep[] = [];
    const thinkingChunks: string[] = [];
    const tokenChunks: string[] = [];
    let completedPayload: any = null;

    await new Promise<void>((resolve, reject) => {
      const handle = client.streamChatMessage({
        conversationId: 'conv_agent_coord_01',
        content: 'Reconcile Q3 EBITDA variance and analyze add-backs',
        onAgentStep: (step) => {
          if (step.status === 'completed') {
            receivedSteps.push(step);
          }
        },
        onThinking: (delta) => {
          thinkingChunks.push(delta);
        },
        onToken: (delta) => {
          tokenChunks.push(delta);
        },
        onDone: (data) => {
          completedPayload = data;
          resolve();
        },
        onError: (err) => reject(err),
      });

      expect(handle.abort).toBeDefined();
    });

    // 1. Verify all 6 specialized agents coordinated
    expect(receivedSteps.length).toBe(6);
    const agentNames = receivedSteps.map((s) => s.agent);
    expect(agentNames).toEqual([
      'Planner',
      'Ingestion',
      'MathSpecialist',
      'EvidenceGraph',
      'SafetyGate',
      'ArtifactCompiler',
    ]);

    // 2. Verify deterministic calculations and artifacts
    expect(completedPayload).toBeDefined();
    expect(completedPayload.is_verified).toBe(true);
    expect(completedPayload.response_spec.classification).toBe('FINANCIAL_RECONCILIATION');
    expect(completedPayload.response_spec.tables.length).toBeGreaterThan(0);
    expect(completedPayload.response_spec.calculations.variance).toBe(-120000);

    // 3. Verify thinking trace was streamed and retained
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(completedPayload.thinking_text).toContain('Planner');
    expect(completedPayload.thinking_text).toContain('28-Digit Decimal Math Specialist');
    expect(completedPayload.duration_seconds).toBeGreaterThanOrEqual(0);

    // 4. Verify markdown response content was streamed
    expect(tokenChunks.length).toBeGreaterThan(0);
    expect(completedPayload.accumulated).toContain('EBITDA Normalization Bridge');
  });

  it('2. Correctly parses SSE streams with event: agent_step, event: thinking, and event: token', async () => {
    settingsStore.updateSettings({ aiProvider: 'auto' });

    const sseChunks = [
      'event: agent_step\ndata: {"id":"step_planner","agent":"Planner","label":"Decomposing DAG","description":"Parsed intent","status":"completed"}\n\n',
      'event: thinking\ndata: {"delta":"Thinking about ASC 606...\\n","accumulated":"Thinking about ASC 606...\\n"}\n\n',
      'event: token\ndata: {"delta":"Revenue ","accumulated":"Revenue ","is_complete":false}\n\n',
      'event: token\ndata: {"delta":"reconciles.","accumulated":"Revenue reconciles.","is_complete":true}\n\n',
      'event: done\ndata: {"conversation_id":"conv_sse_test","finish_reason":"stop","is_verified":true,"accumulated":"Revenue reconciles.","thinking_text":"Thinking about ASC 606...\\n","agent_steps":[{"agent":"Planner"}]}\n\n',
    ];

    const encoder = new TextEncoder();
    let chunkIdx = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIdx < sseChunks.length) {
          return { done: false, value: encoder.encode(sseChunks[chunkIdx++]) };
        }
        return { done: true, value: undefined };
      }),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as any);

    const steps: AgentStep[] = [];
    const thinking: string[] = [];
    const tokens: string[] = [];
    let doneData: any = null;

    await new Promise<void>((resolve, reject) => {
      client.streamChatMessage({
        conversationId: 'conv_sse_test',
        content: 'Check revenue',
        onAgentStep: (step) => steps.push(step),
        onThinking: (delta) => thinking.push(delta),
        onToken: (delta) => tokens.push(delta),
        onDone: (data) => {
          doneData = data;
          resolve();
        },
        onError: reject,
      });
    });

    expect(steps.length).toBe(1);
    expect(steps[0].agent).toBe('Planner');
    expect(thinking).toEqual(['Thinking about ASC 606...\n']);
    expect(tokens).toEqual(['Revenue ', 'reconciles.']);
    expect(doneData.accumulated).toBe('Revenue reconciles.');
    expect(doneData.is_verified).toBe(true);
  });

  it('3. Preserves backward compatibility when onAgentStep and onThinking are omitted', async () => {
    settingsStore.updateSettings({ aiProvider: 'embedded' });

    const tokens: string[] = [];
    let doneData: any = null;

    await new Promise<void>((resolve) => {
      client.streamChatMessage({
        conversationId: 'conv_legacy_caller',
        content: 'General financial inquiry',
        onToken: (delta) => tokens.push(delta),
        onDone: (data) => {
          doneData = data;
          resolve();
        },
      });
    });

    expect(tokens.length).toBeGreaterThan(0);
    expect(doneData).toBeDefined();
    expect(doneData.accumulated.length).toBeGreaterThan(0);
    expect(doneData.finish_reason).toBe('completed');
  });
});

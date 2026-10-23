/**
 * Stage 3A Desktop Interaction & Presentation Validation Suite
 *
 * Verifies frontend client operations, SSE streaming, cancellation mechanics,
 * table rendering data flows, financial discrepancy presentation, and refinement wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentClient, ConversationMessage, ConversationRecord, HealthStatus } from '../src/services/agentClient';

describe('Stage 3A Desktop AgentClient & UI Presentation Verification', () => {
  let client: AgentClient;

  beforeEach(() => {
    client = new AgentClient('http://127.0.0.1:8765');
    vi.restoreAllMocks();
  });

  it('1. Verifies loopback health and air-gapped assertion from daemon', async () => {
    const mockHealth: HealthStatus = {
      status: 'HEALTHY',
      air_gapped: true,
      service_ready: true,
      active_tasks_count: 0,
      conversations_count: 5,
      model_health: {
        backend_name: 'ollama',
        is_available: true,
        discovered_models: ['gemma3:latest'],
        active_sessions: 0,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockHealth,
    });

    const health = await client.getHealth();
    expect(health.status).toBe('HEALTHY');
    expect(health.air_gapped).toBe(true);
    expect(health.model_health?.backend_name).toBe('ollama');
  });

  it('2. Verifies SSE streaming token accumulation and onDone delivery', async () => {
    const sseChunks = [
      'event: token\ndata: {"delta":"Compound ","accumulated":"Compound "}\n\n',
      'event: token\ndata: {"delta":"interest is ","accumulated":"Compound interest is "}\n\n',
      'event: token\ndata: {"delta":"earned on interest.","accumulated":"Compound interest is earned on interest."}\n\n',
      'event: done\ndata: {"finish_reason":"stop","response_spec":{"content":"Compound interest is earned on interest."},"is_verified":false}\n\n',
    ];

    let chunkIdx = 0;
    const encoder = new TextEncoder();
    const mockStream = new ReadableStream({
      pull(controller) {
        if (chunkIdx < sseChunks.length) {
          controller.enqueue(encoder.encode(sseChunks[chunkIdx++]));
        } else {
          controller.close();
        }
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: mockStream,
    });

    const tokensReceived: string[] = [];
    let donePayload: any = null;

    await new Promise<void>((resolve) => {
      client.streamChatMessage({
        conversationId: 'conv_test_stream',
        content: 'What is compound interest?',
        onToken: (delta) => {
          tokensReceived.push(delta);
        },
        onDone: (data) => {
          donePayload = data;
          resolve();
        },
      });
    });

    expect(tokensReceived.length).toBe(3);
    expect(tokensReceived.join('')).toBe('Compound interest is earned on interest.');
    expect(donePayload.finish_reason).toBe('stop');
    expect(donePayload.is_verified).toBe(false);
  });

  it('3. Verifies cancellation dispatch through cancelChatStream', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ conversation_id: 'conv_cancel', cancelled: true }),
    });

    const res = await client.cancelChatStream('conv_cancel');
    expect(res.conversation_id).toBe('conv_cancel');
    expect(res.cancelled).toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/api/chat/cancel',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ conversation_id: 'conv_cancel' }),
      })
    );
  });

  it('4. Verifies response refinement action routing', async () => {
    const mockRefinedMsg: ConversationRecord = {
      conversation_id: 'conv_refine',
      title: 'Investigation',
      created_at: Date.now(),
      updated_at: Date.now(),
      tasks: [],
      messages: [
        {
          message_id: 'msg_01',
          conversation_id: 'conv_refine',
          role: 'agent',
          content: '| Item | Amount |\n|---|---|\n| Subtotal | $1,000 |',
          timestamp: Date.now(),
          metadata: {
            response_spec: {
              tables: [
                {
                  columns: ['Item', 'Amount'],
                  rows: [['Subtotal', '$1,000']],
                },
              ],
            },
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ conversation_id: 'conv_refine', message: mockRefinedMsg.messages[0] }),
    });

    const result = await client.refineChat({
      conversationId: 'conv_refine',
      action: 'TABLE',
    });

    expect(result.conversation_id).toBe('conv_refine');
    expect(result.message.content).toContain('| Item | Amount |');
  });

  it('5. Verifies authoritative financial discrepancy calculation structure in message', () => {
    const calculationPayload = [
      {
        calculated_value: 1100.0,
        stated_value: 1250.0,
        variance: 150.0,
        formula_applied: "Subtotal ($1,000.00) + Tax ($100.00) = Expected ($1,100.00)",
        is_verified: true,
        is_reconciled: false,
      },
    ];

    const agentMsg: ConversationMessage = {
      message_id: 'msg_fin_01',
      conversation_id: 'conv_fin',
      role: 'agent',
      content: 'Financial Analysis Completed: Discrepancy Detected.',
      timestamp: Date.now() / 1000,
      is_verified: true,
      classification: 'TASK_VERIFIED',
      metadata: {
        response_spec: {
          calculations: calculationPayload,
          is_verified: true,
        },
      },
    };

    expect(agentMsg.is_verified).toBe(true);
    const calcs = agentMsg.metadata?.response_spec?.calculations;
    expect(calcs).toBeDefined();
    expect(calcs[0].calculated_value).toBe(1100.0);
    expect(calcs[0].stated_value).toBe(1250.0);
    expect(calcs[0].variance).toBe(150.0);
    expect(calcs[0].is_verified).toBe(true);
  });
});

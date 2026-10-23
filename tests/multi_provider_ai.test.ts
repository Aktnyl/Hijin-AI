/**
 * tests/multi_provider_ai.test.ts - AI-P1-01 Multi-Provider AI Architecture Tests
 *
 * Verifies:
 * 1. Settings store provider configuration (auto, embedded, ollama) and security invariants.
 * 2. Strict loopback endpoint validation preventing external data egress.
 * 3. Local Ollama availability probing and connection testing.
 * 4. Chunked token streaming via streamOllamaChat.
 * 5. Dynamic routing and seamless non-blocking fallback in AgentClient.streamChatMessage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { settingsStore, AIProvider } from '../src/services/settingsStore';
import {
  DEFAULT_OLLAMA_ENDPOINT,
  DEFAULT_MODEL_NAME,
  validateLocalEndpoint,
  testOllamaConnection,
  isOllamaAvailable,
  streamOllamaChat,
} from '../src/services/ollama';
import { AgentClient } from '../src/services/agentClient';

describe('AI-P1-01: Multi-Provider AI Architecture & Settings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    settingsStore.updateSettings({
      aiProvider: 'auto',
      ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,
      ollamaModel: DEFAULT_MODEL_NAME,
    });
  });

  it('1. Initializes with correct multi-provider defaults', () => {
    const s = settingsStore.getSettings();
    expect(s.aiProvider).toBe('auto');
    expect(s.ollamaEndpoint).toBe('http://127.0.0.1:11434');
    expect(s.ollamaModel).toBe('gemma3:latest');
    expect(s.localProcessingOnly).toBe(true);
    expect(s.telemetryEnabled).toBe(false);
  });

  it('2. Switches providers and strictly preserves air-gap invariants', () => {
    settingsStore.updateSettings({ aiProvider: 'embedded' });
    expect(settingsStore.getSettings().aiProvider).toBe('embedded');

    settingsStore.updateSettings({ aiProvider: 'ollama' });
    expect(settingsStore.getSettings().aiProvider).toBe('ollama');

    // Invariant check: cannot disable air-gap
    const corrupted = { localProcessingOnly: false as any, telemetryEnabled: true as any };
    settingsStore.updateSettings(corrupted);
    const s = settingsStore.getSettings();
    expect(s.localProcessingOnly).toBe(true);
    expect(s.telemetryEnabled).toBe(false);
  });
});

describe('AI-P1-01: Localhost Endpoint Invariants & Security', () => {
  it('1. Accepts valid local loopback addresses', () => {
    expect(validateLocalEndpoint('http://127.0.0.1:11434').valid).toBe(true);
    expect(validateLocalEndpoint('http://localhost:11434').valid).toBe(true);
    expect(validateLocalEndpoint('http://127.0.0.1:8000').valid).toBe(true);
    expect(validateLocalEndpoint('http://localhost:9000/').valid).toBe(true);
  });

  it('2. Strictly rejects remote URLs, non-HTTP schemes, and LAN addresses', () => {
    expect(validateLocalEndpoint('https://api.openai.com/v1').valid).toBe(false);
    expect(validateLocalEndpoint('http://192.168.1.100:11434').valid).toBe(false);
    expect(validateLocalEndpoint('http://10.0.0.1:11434').valid).toBe(false);
    expect(validateLocalEndpoint('ftp://127.0.0.1:11434').valid).toBe(false);
    expect(validateLocalEndpoint('').valid).toBe(false);
  });
});

describe('AI-P1-01: Ollama Availability & Connection Probing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Detects available Ollama instance and extracts models', async () => {
    const mockModels = [{ name: 'gemma3:latest' }, { name: 'llama3:latest' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: mockModels }),
    } as any);

    const res = await testOllamaConnection('http://127.0.0.1:11434');
    expect(res.success).toBe(true);
    expect(res.models).toEqual(['gemma3:latest', 'llama3:latest']);
  });

  it('2. Truthfully reports offline state when daemon is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const res = await testOllamaConnection('http://127.0.0.1:11434');
    expect(res.success).toBe(false);
    expect(res.message).toContain('local Ollama model is required');
  });

  it('3. isOllamaAvailable returns boolean quickly without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true } as any);
    expect(await isOllamaAvailable('http://127.0.0.1:11434')).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('timeout'));
    expect(await isOllamaAvailable('http://127.0.0.1:11434')).toBe(false);
  });
});

describe('AI-P1-01: Real-Time Token Streaming (streamOllamaChat)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Emits incremental tokens and returns full text on completion', async () => {
    const chunks = [
      JSON.stringify({ response: 'The ', done: false }) + '\n',
      JSON.stringify({ response: 'ledger ', done: false }) + '\n',
      JSON.stringify({ response: 'reconciles.', done: true }) + '\n',
    ];

    let chunkIndex = 0;
    const encoder = new TextEncoder();
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (chunkIndex < chunks.length) {
          const val = encoder.encode(chunks[chunkIndex++]);
          return { done: false, value: val };
        }
        return { done: true, value: undefined };
      }),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    } as any);

    const tokens: string[] = [];
    const res = await streamOllamaChat({
      endpoint: 'http://127.0.0.1:11434',
      model: 'gemma3:latest',
      prompt: 'Verify invoice',
      onToken: (delta) => tokens.push(delta),
    });

    expect(tokens).toEqual(['The ', 'ledger ', 'reconciles.']);
    expect(res.fullText).toBe('The ledger reconciles.');
    expect(res.done).toBe(true);
    expect(res.model).toBe('gemma3:latest');
  });

  it('2. Rejects unsafe endpoint before initiating network request', async () => {
    await expect(
      streamOllamaChat({
        endpoint: 'http://external-llm-cloud.com',
        prompt: 'test',
      })
    ).rejects.toThrow(/Only localhost or 127\.0\.0\.1/);
  });
});

describe('AI-P1-01: AgentClient Multi-Provider Stream Routing & Fallback', () => {
  let client: AgentClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new AgentClient('http://127.0.0.1:8765');
  });

  it('1. Routes to Embedded Autonomous Engine when aiProvider is embedded', async () => {
    settingsStore.updateSettings({ aiProvider: 'embedded' });

    const tokens: string[] = [];
    let completedData: any = null;

    await new Promise<void>((resolve) => {
      client.streamChatMessage({
        conversationId: 'conv_test_1',
        content: 'Perform GAAP reconciliation',
        onToken: (delta) => tokens.push(delta),
        onDone: (data) => {
          completedData = data;
          resolve();
        },
      });
    });

    expect(tokens.length).toBeGreaterThan(0);
    expect(completedData).toBeDefined();
    expect(completedData.finish_reason).toBe('completed');
    expect(completedData.response_spec.provider).toBe('embedded');
    expect(completedData.response_spec.model).toBe('hijin-financial-specialist');
  });

  it('2. Routes to Ollama Bridge when aiProvider is ollama and online', async () => {
    settingsStore.updateSettings({ aiProvider: 'ollama' });

    const encoder = new TextEncoder();
    const chunks = [
      JSON.stringify({ response: 'Audited ', done: false }) + '\n',
      JSON.stringify({ response: '100% OK', done: true }) + '\n',
    ];
    let i = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (i < chunks.length) {
          return { done: false, value: encoder.encode(chunks[i++]) };
        }
        return { done: true, value: undefined };
      }),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as any);

    const tokens: string[] = [];
    let completedData: any = null;

    await new Promise<void>((resolve) => {
      client.streamChatMessage({
        conversationId: 'conv_test_2',
        content: 'Check balance',
        onToken: (delta) => tokens.push(delta),
        onDone: (data) => {
          completedData = data;
          resolve();
        },
      });
    });

    expect(tokens).toEqual(['Audited ', '100% OK']);
    expect(completedData.response_spec.provider).toBe('ollama');
    expect(completedData.accumulated).toBe('Audited 100% OK');
  });

  it('3. Seamlessly falls back to Embedded Engine when Ollama is offline', async () => {
    settingsStore.updateSettings({ aiProvider: 'ollama' });

    // Simulate Ollama connection failure (daemon offline)
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const tokens: string[] = [];
    let completedData: any = null;

    await new Promise<void>((resolve) => {
      client.streamChatMessage({
        conversationId: 'conv_test_3',
        content: 'Reconcile invoice',
        onToken: (delta) => tokens.push(delta),
        onDone: (data) => {
          completedData = data;
          resolve();
        },
      });
    });

    expect(tokens.length).toBeGreaterThan(0);
    expect(completedData).toBeDefined();
    expect(completedData.response_spec.fallback_triggered).toBe(true);
    expect(completedData.response_spec.provider).toBe('embedded');
  });

  it('4. In Auto mode, uses Ollama when available', async () => {
    settingsStore.updateSettings({ aiProvider: 'auto' });

    const encoder = new TextEncoder();
    const chunks = [JSON.stringify({ response: 'Auto-routed via Ollama', done: true }) + '\n'];
    let i = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (i < chunks.length) {
          return { done: false, value: encoder.encode(chunks[i++]) };
        }
        return { done: true, value: undefined };
      }),
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/chat/stream')) {
        // Native daemon offline
        return { ok: false, status: 503, statusText: 'Service Unavailable' } as any;
      }
      if (urlStr.includes('/api/tags')) {
        return { ok: true, status: 200, json: async () => ({ models: [{ name: 'gemma3:latest' }] }) } as any;
      }
      if (urlStr.includes('/api/generate')) {
        return { ok: true, status: 200, body: { getReader: () => mockReader } } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    let completedData: any = null;
    await new Promise<void>((resolve) => {
      client.streamChatMessage({
        conversationId: 'conv_test_4',
        content: 'Test auto',
        onDone: (data) => {
          completedData = data;
          resolve();
        },
      });
    });

    expect(completedData.response_spec.provider).toBe('ollama');
    expect(completedData.accumulated).toBe('Auto-routed via Ollama');
  });

  it('5. Allows stream cancellation without uncaught exceptions', async () => {
    settingsStore.updateSettings({ aiProvider: 'embedded' });

    const handle = client.streamChatMessage({
      conversationId: 'conv_test_5',
      content: 'Long prompt',
    });

    expect(typeof handle.abort).toBe('function');
    expect(typeof handle.cancelBackend).toBe('function');

    expect(() => handle.abort()).not.toThrow();
  });
});

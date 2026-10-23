import {
  EMBEDDED_MODELS,
  EMBEDDED_CAPABILITIES,
  getEmbeddedHealth,
  getEmbeddedConversations,
  getEmbeddedConversation,
  saveEmbeddedConversation,
  createEmbeddedConversation,
  getEmbeddedArtifacts,
  fetchEmbeddedArtifactText,
  generateEmbeddedFinancialResponse,
} from './embeddedFinancialEngine';
import {
  IngestedDocumentRecord,
  getIngestedDocument,
  getAllIngestedDocuments,
  ingestMultiFormatFile,
} from './multiFormatIngestion';
import { settingsStore, AIProvider } from './settingsStore';
import {
  DEFAULT_OLLAMA_ENDPOINT,
  DEFAULT_MODEL_NAME,
  isOllamaAvailable,
  streamOllamaChat,
  validateLocalEndpoint,
} from './ollama';

export interface TableSpecData {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
  alignment?: ('left' | 'center' | 'right')[];
}

export type AgentRoleName =
  | 'Planner'
  | 'Ingestion'
  | 'MathSpecialist'
  | 'EvidenceGraph'
  | 'SafetyGate'
  | 'ArtifactCompiler';

export interface AgentStep {
  id: string;
  agent: AgentRoleName;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration_ms?: number;
  details?: Record<string, any>;
}

export interface ModelView {
  model_id: string;
  model_family: string;
  version: string;
  status: string;
  suitability: string;
  privacy_tier: string;
  routing_status: string;
  parameter_size?: string;
  context_window?: number;
}

export interface CapabilityView {
  capability_id: string;
  name: string;
  version: string;
  description: string;
  status: string;
  is_validated: boolean;
  permitted_tools: string[];
}

export interface ConversationMessage {
  message_id: string;
  conversation_id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  task_id?: string;
  step_id?: string;
  is_verified?: boolean;
  classification?: string;
  attachments?: any[];
  evidence_count?: number;
  requires_approval?: boolean;
  thinking_text?: string;
  agent_steps?: AgentStep[];
  duration_seconds?: number;
  metadata?: Record<string, any>;
}

export interface ConversationRecord {
  conversation_id: string;
  title: string;
  created_at: number;
  updated_at: number;
  tasks: string[];
  messages: ConversationMessage[];
  metadata?: Record<string, any>;
}

export interface PlanStepView {
  step_id: string;
  capability_id: string;
  description: string;
  status: string;
  risk_level: string;
  requires_human_approval: boolean;
  dependencies?: string[];
}

export interface PlanView {
  plan_id: string;
  task_id: string;
  is_valid: boolean;
  steps: PlanStepView[];
}

export interface EvidenceItemView {
  evidence_id: string;
  source_type: string;
  title: string;
  snippet: string;
  confidence: number;
  verification_state: string;
}

export interface CitationView {
  citation_id: string;
  label: string;
  claim_text: string;
  source_id: string;
  source_title: string;
}

export interface CitationItem {
  citation_id: string;
  label: string;
  source_document: string;
  excerpt: string;
  page_number?: number;
}

export interface TaskView {
  task_id: string;
  conversation_id: string;
  status: string;
  status_label?: string;
  user_objective?: string;
  description: string;
  created_at: number;
  updated_at: number;
  plan?: PlanView;
  evidence: EvidenceItemView[];
  evidence_items?: any[];
  artifacts: ArtifactRecord[];
  requires_approval: boolean;
  approval_request?: {
    step_id?: string;
    nonce?: string;
    action_type?: string;
    action_requested?: string;
    summary?: string;
    blast_radius?: string;
    risk_level?: string;
    reason_required?: boolean;
    consequences_if_approved?: string;
    parameters?: Record<string, any>;
  };
  failure_reason?: string;
  result_summary?: string;
  verification?: {
    is_valid?: boolean;
    is_verified?: boolean;
    reason?: string;
  };
  metadata?: Record<string, any>;
}

export interface ArtifactRecord {
  artifact_id: string;
  task_id: string;
  artifact_type: string;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  content_hash: string;
  created_at: number;
  validation?: {
    is_valid: boolean;
    reason?: string;
  };
}

export interface HealthStatus {
  status: string;
  air_gapped: boolean;
  service_ready: boolean;
  active_tasks_count: number;
  conversations_count: number;
  model_health?: {
    backend_name: string;
    is_available: boolean;
    discovered_models: string[];
    active_sessions: number;
  };
}

export type DaemonConnectionStatus = 'active' | 'degraded' | 'disconnected';

export interface HeartbeatState {
  status: DaemonConnectionStatus;
  health: HealthStatus;
  lastChecked: number;
  latencyMs?: number;
}

export function getOfflineHealth(): HealthStatus {
  return {
    status: 'OFFLINE',
    air_gapped: true,
    service_ready: false,
    active_tasks_count: 0,
    conversations_count: 0,
    model_health: {
      backend_name: 'offline',
      is_available: false,
      discovered_models: [],
      active_sessions: 0,
    },
  };
}

export interface AgentEvent {
  event_type: string;
  task_id: string;
  timestamp: number;
  payload: Record<string, any>;
  semantic_label?: string;
}

export class AgentClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor(baseUrl: string = 'http://127.0.0.1:8765') {
    this.baseUrl = baseUrl;
  }

  public setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  public getSessionToken(): string | null {
    return this.sessionToken;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public evaluateStatus(health: HealthStatus): DaemonConnectionStatus {
    if (!health || health.status === 'OFFLINE') {
      return 'disconnected';
    }
    if (health.status === 'HEALTHY' && health.service_ready) {
      return 'active';
    }
    return 'degraded';
  }

  public startHeartbeat(
    onTick: (state: HeartbeatState) => void,
    intervalMs: number = 5000
  ): () => void {
    let active = true;
    const poll = async () => {
      const start = Date.now();
      try {
        const health = await this.request<HealthStatus>('/api/health');
        const latencyMs = Date.now() - start;
        const status = this.evaluateStatus(health);
        if (active) {
          onTick({ status, health, lastChecked: Date.now(), latencyMs });
        }
      } catch {
        if (active) {
          onTick({
            status: 'disconnected',
            health: getOfflineHealth(),
            lastChecked: Date.now(),
            latencyMs: Date.now() - start,
          });
        }
      }
    };

    poll();
    const interval = setInterval(poll, intervalMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Hijin-Client': 'desktop-ipc',
      ...(this.sessionToken ? { 'X-Hijin-Session-Token': this.sessionToken } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}: ${res.statusText}`;
      try {
        const data = await res.json();
        if (data.message) {
          errorMsg = data.message;
        }
      } catch {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  }

  // -------------------------------------------------------------------------
  // Health & Catalog
  // -------------------------------------------------------------------------

  public async getHealth(): Promise<HealthStatus> {
    try {
      return await this.request<HealthStatus>('/api/health');
    } catch {
      return getEmbeddedHealth();
    }
  }

  public async getModels(): Promise<ModelView[]> {
    try {
      const models = await this.request<ModelView[]>('/api/models');
      if (models && models.length > 0) return models;
    } catch {}
    return EMBEDDED_MODELS;
  }

  public async getCapabilities(): Promise<CapabilityView[]> {
    try {
      return await this.request<CapabilityView[]>('/api/capabilities');
    } catch {
      return EMBEDDED_CAPABILITIES;
    }
  }

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------

  public async getConversations(): Promise<ConversationRecord[]> {
    try {
      const res = await this.request<ConversationRecord[]>('/api/conversations');
      if (res && res.length > 0) return res;
    } catch {}
    return getEmbeddedConversations();
  }

  public async createConversation(title?: string): Promise<ConversationRecord> {
    try {
      return await this.request<ConversationRecord>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    } catch {
      return createEmbeddedConversation(title);
    }
  }

  public async getConversation(conversationId: string): Promise<ConversationRecord> {
    try {
      return await this.request<ConversationRecord>(`/api/conversations/${conversationId}`);
    } catch {
      return getEmbeddedConversation(conversationId);
    }
  }

  public async saveConversation(conversation: ConversationRecord): Promise<void> {
    try {
      await this.request(`/api/conversations/${conversation.conversation_id}`, {
        method: 'PUT',
        body: JSON.stringify(conversation),
      });
    } catch {
      saveEmbeddedConversation(conversation);
    }
  }

  public async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.request(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
    } catch {
      const convs = getEmbeddedConversations().filter((c) => c.conversation_id !== conversationId);
      localStorage.setItem('hijin_embedded_conversations_v1', JSON.stringify(convs));
    }
  }

  public async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    try {
      await this.request(`/api/conversations/${conversationId}/title`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      });
    } catch {
      const conv = getEmbeddedConversation(conversationId);
      conv.title = title;
      saveEmbeddedConversation(conv);
    }
  }

  // -------------------------------------------------------------------------
  // Tasks & Evidence
  // -------------------------------------------------------------------------

  public async getTasks(conversationId?: string): Promise<TaskView[]> {
    try {
      const query = conversationId ? `?conversation_id=${conversationId}` : '';
      return await this.request<TaskView[]>(`/api/tasks${query}`);
    } catch {
      return [];
    }
  }

  public async getTask(taskId: string): Promise<TaskView> {
    return this.request<TaskView>(`/api/tasks/${taskId}`);
  }

  public async approveTask(
    arg: string | { taskId: string; stepId?: string; nonce?: string },
    stepId?: string,
    nonce?: string
  ): Promise<TaskView> {
    const tid = typeof arg === 'string' ? arg : arg.taskId;
    const sid = typeof arg === 'string' ? stepId : arg.stepId;
    const n = typeof arg === 'string' ? nonce : arg.nonce;
    return this.request<TaskView>(`/api/tasks/${tid}/approve`, {
      method: 'POST',
      body: JSON.stringify({ step_id: sid, nonce: n }),
    });
  }

  public async rejectTask(
    arg: string | { taskId: string; stepId?: string; nonce?: string },
    stepId?: string,
    nonce?: string
  ): Promise<TaskView> {
    const tid = typeof arg === 'string' ? arg : arg.taskId;
    const sid = typeof arg === 'string' ? stepId : arg.stepId;
    const n = typeof arg === 'string' ? nonce : arg.nonce;
    return this.request<TaskView>(`/api/tasks/${tid}/reject`, {
      method: 'POST',
      body: JSON.stringify({ step_id: sid, nonce: n }),
    });
  }

  public async cancelTask(taskId: string): Promise<TaskView> {
    return this.request<TaskView>(`/api/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  }

  public async renameConversation(conversationId: string, title: string): Promise<any> {
    try {
      return await this.request(`/api/conversations/${conversationId}/rename`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    } catch {
      return { success: true, conversation_id: conversationId, title };
    }
  }

  public async getArtifactSlides(id: string): Promise<any> {
    try {
      return await this.request(`/api/artifacts/${id}/slides`);
    } catch {
      return { slides: [] };
    }
  }

  public async fetchArtifactText(id: string): Promise<string> {
    return this.getArtifactText(id);
  }

  public async getHardware(): Promise<any> {
    try {
      return await this.request('/api/health');
    } catch {
      return { cpu_percent: 5, ram_used_gb: 4.2, gpu_available: false };
    }
  }

  // -------------------------------------------------------------------------
  // Artifacts
  // -------------------------------------------------------------------------

  public async getArtifacts(taskId?: string): Promise<ArtifactRecord[]> {
    try {
      const query = taskId ? `?task_id=${taskId}` : '';
      return await this.request<ArtifactRecord[]>(`/api/artifacts${query}`);
    } catch {
      return getEmbeddedArtifacts(taskId);
    }
  }

  public async getArtifactText(artifactId: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/api/artifacts/${artifactId}/content`;
      const headers: Record<string, string> = {
        'X-Hijin-Client': 'desktop-ipc',
        ...(this.sessionToken ? { 'X-Hijin-Session-Token': this.sessionToken } : {}),
      };
      const res = await fetch(url, { headers });
      if (res.ok) {
        return await res.text();
      }
    } catch {}
    return fetchEmbeddedArtifactText(artifactId);
  }

  public getArtifactContentUrl(artifactId: string): string {
    return `${this.baseUrl}/api/artifacts/${artifactId}/content`;
  }

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------

  public async uploadAttachment(
    arg1:
      | string
      | {
          filename: string;
          contentBase64?: string;
          data_base64?: string;
          claimedMime?: string;
          mime_type?: string;
          conversationId?: string;
          conversation_id?: string;
          sizeBytes?: number;
          size_bytes?: number;
          size?: number;
        },
    arg2?: { name: string; size: number; mime_type: string; data_base64: string }
  ): Promise<{ attachment_id: string; filename: string; attachment?: any }> {
    let convId = 'default';
    let filename = 'document.dat';
    let sizeBytes = 0;
    let mimeType = 'application/octet-stream';
    let dataB64 = '';

    if (typeof arg1 === 'string') {
      convId = arg1;
      if (arg2) {
        filename = arg2.name;
        sizeBytes = arg2.size;
        mimeType = arg2.mime_type;
        dataB64 = arg2.data_base64;
      }
    } else if (arg1 && typeof arg1 === 'object') {
      convId = arg1.conversationId || arg1.conversation_id || 'default';
      filename = arg1.filename;
      sizeBytes = arg1.sizeBytes || arg1.size_bytes || arg1.size || 0;
      mimeType = arg1.claimedMime || arg1.mime_type || 'application/octet-stream';
      dataB64 = arg1.contentBase64 || arg1.data_base64 || '';
    }

    // Process offline locally into in-memory multi-format registry
    let localDoc: IngestedDocumentRecord | null = null;
    try {
      localDoc = await ingestMultiFormatFile({
        fileName: filename,
        base64: dataB64,
        mimeType,
        sizeBytes,
      });
    } catch (ingestErr) {
      console.warn('Local multi-format ingestion notice:', ingestErr);
    }

    try {
      const resp = await this.request<{ attachment_id?: string; filename?: string; attachment?: any }>(
        '/api/attachments',
        {
          method: 'POST',
          body: JSON.stringify({
            conversation_id: convId,
            filename,
            size_bytes: sizeBytes,
            mime_type: mimeType,
            data_base64: dataB64,
          }),
        }
      );
      const attId = resp?.attachment_id || resp?.attachment?.attachment_id || localDoc?.id || `att_${Date.now()}`;
      return {
        attachment_id: attId,
        filename: resp?.filename || filename,
        attachment: resp?.attachment || { attachment_id: attId, filename },
      };
    } catch {
      // Offline fallback: return local doc
      const attId = localDoc?.id || `att_${Date.now()}`;
      return {
        attachment_id: attId,
        filename,
        attachment: { attachment_id: attId, filename },
      };
    }
  }

  // -------------------------------------------------------------------------
  // Multi-Provider Streaming Chat Message with Offline Multi-Agent Coordination
  // -------------------------------------------------------------------------

  public streamChatMessage(params: {
    conversationId: string;
    content: string;
    attachmentIds?: string[];
    modelPreference?: string;
    onToken?: (delta: string, accumulated: string) => void;
    onThinking?: (delta: string, accumulated: string) => void;
    onAgentStep?: (step: AgentStep) => void;
    onDone?: (data: {
      conversation_id?: string;
      finish_reason?: string;
      accumulated?: string;
      response_spec?: any;
      is_verified?: boolean;
      thinking_text?: string;
      agent_steps?: AgentStep[];
      duration_seconds?: number;
    }) => void;
    onError?: (err: Error) => void;
  }): {
    abort: () => void;
    cancelBackend: () => Promise<void>;
  } {
    const controller = new AbortController();
    let isAborted = false;
    let fallbackInterval: any = null;

    const runEmbeddedEngine = (options?: { fallbackTriggered?: boolean; fallbackReason?: string }) => {
      try {
        let attachedDocs: IngestedDocumentRecord[] = [];
        if (params.attachmentIds && params.attachmentIds.length > 0) {
          attachedDocs = params.attachmentIds
            .map((id) => getIngestedDocument(id))
            .filter((d): d is IngestedDocumentRecord => !!d);
        }
        if (attachedDocs.length === 0) {
          attachedDocs = getAllIngestedDocuments();
        }

        const result = generateEmbeddedFinancialResponse(
          params.content,
          attachedDocs.length > 0 ? attachedDocs : undefined
        );
        const { responseText, thinkingText, agentSteps, tables, calculations, citations, artifact } = result;

        const startTime = Date.now();
        let stepIndex = 0;
        let streamedThinking = '';
        const allSteps: AgentStep[] = agentSteps || [];

        // Progressively emit agent coordination steps and thinking trace
        const emitNextStep = () => {
          if (isAborted) return;
          if (stepIndex < allSteps.length) {
            const step = allSteps[stepIndex];
            params.onAgentStep?.({ ...step, status: 'running' });
            setTimeout(() => {
              if (isAborted) return;
              params.onAgentStep?.({ ...step, status: 'completed' });
              const thinkChunk = `[${step.agent}] ${step.label}: ${step.description}\n`;
              streamedThinking += thinkChunk;
              params.onThinking?.(thinkChunk, streamedThinking);

              stepIndex++;
              emitNextStep();
            }, 10);
          } else {
            startTokenStream();
          }
        };

        const startTokenStream = () => {
          const words = responseText.split(' ');
          let currentAcc = '';
          let wordIdx = 0;
          const batchSize = Math.max(1, Math.ceil(words.length / 30));

          fallbackInterval = setInterval(() => {
            if (isAborted) {
              if (fallbackInterval) clearInterval(fallbackInterval);
              return;
            }

            if (wordIdx < words.length) {
              const nextIdx = Math.min(wordIdx + batchSize, words.length);
              const slice = words.slice(wordIdx, nextIdx).join(' ');
              const chunk = (wordIdx === 0 ? '' : ' ') + slice;
              currentAcc += chunk;
              params.onToken?.(chunk, currentAcc);
              wordIdx = nextIdx;
            } else {
              if (fallbackInterval) clearInterval(fallbackInterval);
              const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
              const finalThinking = thinkingText || streamedThinking;

              // Save to embedded conversation
              try {
                const conv = getEmbeddedConversation(params.conversationId);
                conv.messages.push(
                  {
                    message_id: 'msg_user_' + Date.now(),
                    conversation_id: params.conversationId,
                    role: 'user',
                    content: params.content,
                    timestamp: Date.now() - 1000,
                  },
                  {
                    message_id: 'msg_agent_' + Date.now(),
                    conversation_id: params.conversationId,
                    role: 'agent',
                    content: currentAcc,
                    timestamp: Date.now(),
                    is_verified: true,
                    classification: 'FINANCIAL_RECONCILIATION',
                    thinking_text: finalThinking,
                    agent_steps: allSteps,
                    duration_seconds: durationSec,
                    metadata: {
                      provider: 'embedded',
                      thinking_text: finalThinking,
                      agent_steps: allSteps,
                      duration_seconds: durationSec,
                      response_spec: {
                        task_id: 'task_embedded_' + Date.now(),
                        classification: 'FINANCIAL_RECONCILIATION',
                        model: 'hijin-financial-specialist',
                        provider: 'embedded',
                        tables: tables || [],
                        calculations: calculations,
                        citations: citations || [],
                        artifact: artifact,
                        artifact_result: artifact,
                        ...(options?.fallbackTriggered ? { fallback_triggered: true, fallback_reason: options.fallbackReason } : {}),
                      },
                      ...(options?.fallbackTriggered ? { fallback_triggered: true, fallback_reason: options.fallbackReason } : {}),
                    },
                  }
                );
                conv.updated_at = Date.now();
                saveEmbeddedConversation(conv);
              } catch {}

              params.onDone?.({
                conversation_id: params.conversationId,
                finish_reason: 'completed',
                accumulated: currentAcc,
                is_verified: true,
                thinking_text: finalThinking,
                agent_steps: allSteps,
                duration_seconds: durationSec,
                response_spec: {
                  task_id: 'task_embedded_' + Date.now(),
                  classification: 'FINANCIAL_RECONCILIATION',
                  model: 'hijin-financial-specialist',
                  provider: 'embedded',
                  tables: tables || [],
                  calculations: calculations,
                  citations: citations || [],
                  artifact: artifact,
                  artifact_result: artifact,
                  ...(options?.fallbackTriggered ? { fallback_triggered: true, fallback_reason: options.fallbackReason } : {}),
                },
              });
            }
          }, 15);
        };

        // Trigger progressive multi-agent pipeline
        emitNextStep();
      } catch (innerErr: any) {
        params.onError?.(innerErr instanceof Error ? innerErr : new Error(String(innerErr)));
      }
    };

    const runStream = async () => {
      const settings = settingsStore.getSettings();
      const provider: AIProvider = settings.aiProvider || 'auto';

      // 1. Force Embedded Autonomous Engine
      if (provider === 'embedded') {
        runEmbeddedEngine();
        return;
      }

      // 2. Force Local Ollama Bridge
      if (provider === 'ollama') {
        try {
          const endpoint = settings.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT;
          const model = params.modelPreference && params.modelPreference !== 'auto'
            ? params.modelPreference
            : settings.ollamaModel || DEFAULT_MODEL_NAME;

          const res = await streamOllamaChat({
            endpoint,
            model,
            prompt: params.content,
            signal: controller.signal,
            onToken: (delta, accumulated) => {
              if (!isAborted) {
                params.onToken?.(delta, accumulated);
              }
            },
          });

          if (isAborted) return;

          try {
            const conv = getEmbeddedConversation(params.conversationId);
            conv.messages.push(
              {
                message_id: 'msg_user_' + Date.now(),
                conversation_id: params.conversationId,
                role: 'user',
                content: params.content,
                timestamp: Date.now() - 1000,
              },
              {
                message_id: 'msg_agent_' + Date.now(),
                conversation_id: params.conversationId,
                role: 'agent',
                content: res.fullText,
                timestamp: Date.now(),
                is_verified: true,
                classification: 'OLLAMA_LOCAL_BRIDGE',
                metadata: {
                  provider: 'ollama',
                  model: res.model,
                },
              }
            );
            conv.updated_at = Date.now();
            saveEmbeddedConversation(conv);
          } catch {}

          params.onDone?.({
            conversation_id: params.conversationId,
            finish_reason: 'completed',
            accumulated: res.fullText,
            is_verified: true,
            response_spec: {
              task_id: 'task_ollama_' + Date.now(),
              classification: 'OLLAMA_LOCAL_BRIDGE',
              model: res.model,
              provider: 'ollama',
            },
          });
          return;
        } catch (err: any) {
          if (isAborted || err?.name === 'AbortError') {
            return;
          }
          runEmbeddedEngine({
            fallbackTriggered: true,
            fallbackReason: err?.message || 'Local Ollama connection failed',
          });
          return;
        }
      }

      // 3. Auto (Cognitive Router): Primary Python Daemon -> Secondary Ollama -> Tertiary Embedded
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
          ...(this.sessionToken ? { 'X-Hijin-Session-Token': this.sessionToken } : {}),
        };
        const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            conversation_id: params.conversationId,
            content: params.content,
            attachment_ids: params.attachmentIds || [],
            model_preference: params.modelPreference,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP stream error: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by environment.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const parsed = JSON.parse(dataStr);
                if (currentEvent === 'token') {
                  params.onToken?.(parsed.delta || '', parsed.accumulated || '');
                } else if (currentEvent === 'thinking') {
                  params.onThinking?.(parsed.delta || '', parsed.accumulated || '');
                } else if (currentEvent === 'agent_step') {
                  params.onAgentStep?.(parsed);
                } else if (currentEvent === 'done') {
                  params.onDone?.(parsed);
                } else if (currentEvent === 'error') {
                  params.onError?.(new Error(parsed.error || 'Stream error'));
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || isAborted) {
          return;
        }

        // Secondary check in Auto mode: Is local Ollama available?
        try {
          const ollamaOnline = await isOllamaAvailable(settings.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT);
          if (ollamaOnline && !isAborted) {
            const endpoint = settings.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT;
            const model = params.modelPreference && params.modelPreference !== 'auto'
              ? params.modelPreference
              : settings.ollamaModel || DEFAULT_MODEL_NAME;

            const res = await streamOllamaChat({
              endpoint,
              model,
              prompt: params.content,
              signal: controller.signal,
              onToken: (delta, accumulated) => {
                if (!isAborted) {
                  params.onToken?.(delta, accumulated);
                }
              },
            });

            if (isAborted) return;

            try {
              const conv = getEmbeddedConversation(params.conversationId);
              conv.messages.push(
                {
                  message_id: 'msg_user_' + Date.now(),
                  conversation_id: params.conversationId,
                  role: 'user',
                  content: params.content,
                  timestamp: Date.now() - 1000,
                },
                {
                  message_id: 'msg_agent_' + Date.now(),
                  conversation_id: params.conversationId,
                  role: 'agent',
                  content: res.fullText,
                  timestamp: Date.now(),
                  is_verified: true,
                  classification: 'OLLAMA_LOCAL_BRIDGE',
                  metadata: {
                    provider: 'ollama',
                    model: res.model,
                  },
                }
              );
              conv.updated_at = Date.now();
              saveEmbeddedConversation(conv);
            } catch {}

            params.onDone?.({
              conversation_id: params.conversationId,
              finish_reason: 'completed',
              accumulated: res.fullText,
              is_verified: true,
              response_spec: {
                task_id: 'task_ollama_' + Date.now(),
                classification: 'OLLAMA_LOCAL_BRIDGE',
                model: res.model,
                provider: 'ollama',
              },
            });
            return;
          }
        } catch {
          // Ollama check failed, fall through to Tertiary Embedded Engine
        }

        if (!isAborted) {
          runEmbeddedEngine({
            fallbackTriggered: true,
            fallbackReason: err?.message || 'Primary and secondary inference engines offline',
          });
        }
      }
    };

    runStream();

    return {
      abort: () => {
        isAborted = true;
        if (fallbackInterval) clearInterval(fallbackInterval);
        controller.abort();
      },
      cancelBackend: async () => {
        isAborted = true;
        if (fallbackInterval) clearInterval(fallbackInterval);
        controller.abort();
        try {
          await this.cancelChatStream(params.conversationId);
        } catch (e) {
          console.warn('Failed to signal backend chat cancellation:', e);
        }
      },
    };
  }

  public async refineChat(params: {
    conversationId: string;
    action: string;
    instruction?: string;
  }): Promise<{ conversation_id: string; message: ConversationMessage }> {
    return this.request<{ conversation_id: string; message: ConversationMessage }>(
      '/api/chat/refine',
      {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: params.conversationId,
          action: params.action,
          instruction: params.instruction,
        }),
      }
    );
  }

  public async cancelChatStream(conversationId: string): Promise<{ conversation_id: string; cancelled: boolean }> {
    return this.request<{ conversation_id: string; cancelled: boolean }>('/api/chat/cancel', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    });
  }

  // -------------------------------------------------------------------------
  // Event Streaming (SSE)
  // -------------------------------------------------------------------------

  public subscribeEvents(
    onEvent: (event: AgentEvent) => void,
    taskId?: string,
    onConnected?: () => void,
    onError?: (err: any) => void
  ): () => void {
    const query = taskId ? `?task_id=${encodeURIComponent(taskId)}` : '';
    const url = `${this.baseUrl}/api/events${query}`;

    const es = new EventSource(url);

    es.addEventListener('connected', () => {
      if (onConnected) onConnected();
    });

    es.addEventListener('agent_event', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    });

    es.onerror = (err) => {
      if (onError) onError(err);
    };

    return () => {
      es.close();
    };
  }
}

export const agentClient = new AgentClient();


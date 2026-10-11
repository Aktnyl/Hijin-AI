/**
 * Production Agent Client
 *
 * Interfaces the Desktop Presentation Layer with the AgentProductService HTTP Daemon
 * (http://127.0.0.1:8765) using standard fetch and Server-Sent Events (SSE).
 * Strictly guarantees that all requests pass through the validated security boundary.
 */

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

export interface VerificationView {
  is_verified: boolean;
  verification_state: string;
  passed_rules: string[];
  violations: string[];
}

export interface ErrorView {
  error_id: string;
  classification: string;
  user_friendly_message: string;
  diagnostic_details: string;
}

export interface ApprovalRequestView {
  step_id: string;
  action_requested: string;
  reason_required: string;
  risk_level: string;
  consequences_if_approved: string;
  consequences_if_rejected: string;
  nonce: string;
  payload_snapshot?: Record<string, any>;
}

export interface TaskView {
  task_id: string;
  conversation_id: string;
  user_objective: string;
  status: string;
  status_label: string;
  created_at: number;
  current_step_id?: string;
  plan?: PlanView;
  evidence_items?: EvidenceItemView[];
  citations?: CitationView[];
  verification?: VerificationView;
  error?: ErrorView;
  result_summary?: string;
  artifacts?: Record<string, any>;
  ledger_integrity_valid?: boolean;
  approval_request?: ApprovalRequestView;
  failure_reason?: string;
}

export interface AgentEvent {
  event_id: string;
  task_id: string;
  event_type: string;
  semantic_label: string;
  payload: Record<string, any>;
  timestamp: number;
}

export interface ArtifactRecord {
  artifact_id: string;
  filename: string;
  artifact_type: string;
  mime_type: string;
  size_bytes: number;
  content_hash: string;
  task_id?: string;
  file_path: string;
  created_at: number;
  metadata?: Record<string, any>;
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

export class AgentClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:8765') {
    this.baseUrl = baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
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
    return this.request<HealthStatus>('/api/health');
  }

  public async getModels(): Promise<ModelView[]> {
    return this.request<ModelView[]>('/api/models');
  }

  public async getCapabilities(): Promise<CapabilityView[]> {
    return this.request<CapabilityView[]>('/api/capabilities');
  }

  public async getHardware(): Promise<any> {
    return this.request<any>('/api/diagnostics/hardware');
  }

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------

  public async getConversations(): Promise<ConversationRecord[]> {
    return this.request<ConversationRecord[]>('/api/conversations');
  }

  public async getConversation(conversationId: string): Promise<ConversationRecord> {
    return this.request<ConversationRecord>(`/api/conversations/${conversationId}`);
  }

  public async createConversation(title: string = 'New Investigation'): Promise<ConversationRecord> {
    return this.request<ConversationRecord>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  public async renameConversation(conversationId: string, title: string): Promise<ConversationRecord> {
    return this.request<ConversationRecord>(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  public async deleteConversation(conversationId: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    return res.success;
  }

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------

  public async submitTask(params: {
    objective: string;
    conversationId?: string;
    initialContext?: Record<string, any>;
    permissions?: string[];
  }): Promise<TaskView> {
    return this.request<TaskView>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        objective: params.objective,
        conversation_id: params.conversationId,
        initial_context: params.initialContext || {},
        permissions: params.permissions || [],
      }),
    });
  }

  public async getTask(taskId: string): Promise<TaskView> {
    return this.request<TaskView>(`/api/tasks/${taskId}`);
  }

  public async cancelTask(taskId: string, reason: string = 'User requested cancellation'): Promise<TaskView> {
    return this.request<TaskView>(`/api/tasks/${taskId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async approveTask(params: {
    taskId: string;
    stepId: string;
    nonce: string;
    decisionNotes?: string;
  }): Promise<TaskView> {
    return this.request<TaskView>(`/api/tasks/${params.taskId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: params.stepId,
        nonce: params.nonce,
        decision_notes: params.decisionNotes || 'Approved by user',
      }),
    });
  }

  public async rejectTask(params: {
    taskId: string;
    stepId: string;
    nonce: string;
    reason?: string;
  }): Promise<TaskView> {
    return this.request<TaskView>(`/api/tasks/${params.taskId}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: params.stepId,
        nonce: params.nonce,
        reason: params.reason || 'Rejected by user',
      }),
    });
  }

  // -------------------------------------------------------------------------
  // Attachments & Artifacts
  // -------------------------------------------------------------------------

  public async uploadAttachment(params: {
    filename: string;
    contentBase64: string;
    claimedMime?: string;
    taskId?: string;
    conversationId?: string;
  }): Promise<any> {
    return this.request<any>('/api/attachments', {
      method: 'POST',
      body: JSON.stringify({
        filename: params.filename,
        content_base64: params.contentBase64,
        claimed_mime: params.claimedMime,
        task_id: params.taskId,
        conversation_id: params.conversationId,
      }),
    });
  }

  public async sendChatMessage(params: {
    conversationId: string;
    content: string;
    attachmentIds?: string[];
    modelPreference?: string;
  }): Promise<{
    conversation_id: string;
    classification: string;
    is_task: boolean;
    task_id?: string;
    task?: TaskView;
    message?: ConversationMessage;
    verified: boolean;
    rationale?: string;
  }> {
    return this.request<any>(`/api/conversations/${params.conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: params.content,
        attachment_ids: params.attachmentIds || [],
        model_preference: params.modelPreference,
      }),
    });
  }

  public async getArtifacts(taskId?: string): Promise<ArtifactRecord[]> {
    const query = taskId ? `?task_id=${encodeURIComponent(taskId)}` : '';
    return this.request<ArtifactRecord[]>(`/api/artifacts${query}`);
  }

  public async getArtifact(artifactId: string): Promise<ArtifactRecord> {
    return this.request<ArtifactRecord>(`/api/artifacts/${artifactId}`);
  }

  public getArtifactContentUrl(artifactId: string): string {
    return `${this.baseUrl}/api/artifacts/${artifactId}/content`;
  }

  public async fetchArtifactText(artifactId: string): Promise<string> {
    const url = this.getArtifactContentUrl(artifactId);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load artifact content (${res.status})`);
    }
    return res.text();
  }

  public async getArtifactSlides(artifactId: string): Promise<{ slides: any[]; total_slides: number; filename: string }> {
    return this.request<{ slides: any[]; total_slides: number; filename: string }>(`/api/artifacts/${artifactId}/slides`);
  }

  public async generateArtifact(params: {
    prompt: string;
    artifactType?: string;
    outputFormat?: string;
    taskId?: string;
    dataPayload?: Record<string, any>;
    maxTokens?: number;
  }): Promise<any> {
    return this.request<any>('/api/artifacts/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: params.prompt,
        artifact_type: params.artifactType || 'TEXT_REPORT',
        output_format: params.outputFormat || 'markdown',
        task_id: params.taskId,
        data_payload: params.dataPayload,
        max_tokens: params.maxTokens || 256,
      }),
    });
  }

  // -------------------------------------------------------------------------
  // Stage 2: Interaction Models & Refinement
  // -------------------------------------------------------------------------

  public async refineChat(params: {
    conversationId: string;
    action: string;
    instruction?: string;
  }): Promise<{
    conversation_id: string;
    message: ConversationMessage;
    response_spec: any;
    is_task: boolean;
    verified: boolean;
  }> {
    return this.request<{
      conversation_id: string;
      message: ConversationMessage;
      response_spec: any;
      is_task: boolean;
      verified: boolean;
    }>('/api/chat/refine', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: params.conversationId,
        action: params.action,
        instruction: params.instruction,
      }),
    });
  }

  public async getInteractionModels(): Promise<{ models: ModelView[]; status: string }> {
    return this.request<{ models: ModelView[]; status: string }>('/api/interaction/models');
  }

  public streamChatMessage(params: {
    conversationId: string;
    content: string;
    attachmentIds?: string[];
    modelPreference?: string;
    onToken?: (delta: string, accumulated: string) => void;
    onDone?: (data: { conversation_id?: string; finish_reason?: string; accumulated?: string; response_spec?: any; is_verified?: boolean }) => void;
    onError?: (err: Error) => void;
  }): {
    abort: () => void;
    cancelBackend: () => Promise<void>;
  } {
    const controller = new AbortController();
    let isAborted = false;

    const runStream = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        params.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    runStream();

    return {
      abort: () => {
        isAborted = true;
        controller.abort();
      },
      cancelBackend: async () => {
        isAborted = true;
        controller.abort();
        try {
          await this.cancelChatStream(params.conversationId);
        } catch (e) {
          console.warn('Failed to signal backend chat cancellation:', e);
        }
      },
    };
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  agentClient,
  AgentEvent,
  AgentStep,
  ArtifactRecord,
  ConversationRecord,
  DaemonConnectionStatus,
  ModelView,
  TaskView,
} from './services/agentClient';
import { settingsStore } from './services/settingsStore';
import { commercialService, CommercialLicenseView } from './services/commercialService';
import { evaluateReadinessState, ReadinessDescriptor } from './services/readinessState';
import { getIpcSessionToken } from './services/tauriBridge';
import { ChatPanel, AttachedFile } from './components/workbench/ChatPanel';
import { LeftNavigationPanel } from './components/workbench/LeftNavigationPanel';
import { ArtifactViewer, GroundedEvidenceItem } from './components/workbench/ArtifactViewer';
import { ResizablePanels } from './components/workbench/ResizablePanels';
import { SettingsModal } from './components/workbench/SettingsModal';
import { ModelHubModal } from './components/workbench/ModelHubModal';
import { WorkbenchHeader } from './components/workbench/WorkbenchHeader';
import { CommandPalette } from './components/workbench/CommandPalette';
import { FirstLaunchWizard } from './components/onboarding/FirstLaunchWizard';
import { ReconciliationView } from './components/workbench/ReconciliationView';

export const App: React.FC = () => {
  const [settings, setSettings] = useState(settingsStore.getSettings());
  const [leftCollapsed, setLeftCollapsed] = useState(settings.leftPanelCollapsed || false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelHubOpen, setIsModelHubOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!settingsStore.getSettings().firstLaunchCompleted);
  const [commercialLicense, setCommercialLicense] = useState<CommercialLicenseView>(commercialService.getStatus());
  const [dismissLicenseBanner, setDismissLicenseBanner] = useState(false);

  // Commercial state listener
  useEffect(() => {
    const unsub = commercialService.subscribe((s) => setCommercialLicense(s));
    return () => unsub();
  }, []);

  // Backend Connectivity State (UX-P0-04 Heartbeat)
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [daemonStatus, setDaemonStatus] = useState<DaemonConnectionStatus>('disconnected');
  const [availableModels, setAvailableModels] = useState<ModelView[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // Application Data
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const activeStreamRef = useRef<{ abort: () => void; cancelBackend: () => Promise<void> } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<ArtifactRecord | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<GroundedEvidenceItem | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [isArtifactMaximized, setIsArtifactMaximized] = useState(false);

  // Active Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingStatusLabel, setExecutingStatusLabel] = useState<string>('');
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<'chat' | 'reconciliation'>('chat');

  const activeTaskPollRef = useRef<number | null>(null);

  // Subscribe to Settings Changes
  useEffect(() => {
    const unsub = settingsStore.subscribe((s) => setSettings(s));
    return () => unsub();
  }, []);

  // Poll backend health and connect (5s heartbeat per UX-P0-04)
  const checkBackend = useCallback(async () => {
    try {
      const health = await agentClient.getHealth();
      const status = agentClient.evaluateStatus(health);
      setDaemonStatus(status);

      if (status === 'active' || status === 'degraded') {
        setIsBackendConnected(true);

        // Load models
        const models = await agentClient.getModels();
        setAvailableModels(models);

        // Load conversations with structural identity preservation (most recent first)
        const rawConvList = await agentClient.getConversations();
        const convList = [...rawConvList].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
        setConversations((prev) => {
          // Guard: Never wipe in-flight optimistic or streaming messages during generation
          if (activeStreamRef.current) {
            return prev;
          }
          const hasStreamingMsg = prev.some((p) =>
            p.messages.some((m) => m.metadata?.is_streaming)
          );
          if (hasStreamingMsg) {
            return prev;
          }

          // Preserve in-memory metadata (thinking, agent steps, response_spec)
          return convList.map((c) => {
            const existing = prev.find((p) => p.conversation_id === c.conversation_id);
            if (!existing) return c;
            return {
              ...c,
              messages: c.messages.map((m) => {
                const exMsg = existing.messages.find((em) => em.message_id === m.message_id);
                if (!exMsg) return m;
                return {
                  ...m,
                  thinking_text: exMsg.thinking_text || m.thinking_text,
                  agent_steps: exMsg.agent_steps || m.agent_steps,
                  duration_seconds: exMsg.duration_seconds || m.duration_seconds,
                  metadata: {
                    ...m.metadata,
                    ...(exMsg.metadata || {}),
                  },
                };
              }),
            };
          });
        });
        if (convList.length > 0 && !activeConversationId) {
          setActiveConversationId(convList[0].conversation_id);
        }

        // Load artifacts
        const artList = await agentClient.getArtifacts();
        setArtifacts(artList);

        return true;
      } else {
        setIsBackendConnected(false);
      }
    } catch {
      setIsBackendConnected(false);
      setDaemonStatus('disconnected');
    }
    return false;
  }, [activeConversationId]);

  useEffect(() => {
    let active = true;
    const initTokenAndPoll = async () => {
      const token = await getIpcSessionToken();
      if (token && active) {
        agentClient.setSessionToken(token);
        commercialService.setSessionToken(token);
      }
      if (active) {
        checkBackend();
      }
    };
    initTokenAndPoll();
    const interval = setInterval(() => {
      checkBackend();
    }, 5000); // 5s background polling per UX-P0-04
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkBackend]);

  // Global Keyboard Shortcuts (P29 Section 39)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
      } else if (cmdKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftCollapsed((prev) => {
          const next = !prev;
          settingsStore.updateSettings({ leftPanelCollapsed: next });
          return next;
        });
      } else if (cmdKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsModelHubOpen((prev) => !prev);
      } else if (cmdKey && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      } else if (cmdKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsArtifactPanelOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to Real-Time SSE Events
  useEffect(() => {
    if (!isBackendConnected) return;

    const unsub = agentClient.subscribeEvents(
      (evt: AgentEvent) => {
        if (evt.semantic_label) {
          setExecutingStatusLabel(evt.semantic_label);
        }

        if (activeTaskId && evt.task_id === activeTaskId) {
          const type = evt.event_type || '';
          if (
            type.includes('TASK_COMPLETED') ||
            type.includes('TASK_FAILED') ||
            type.includes('TASK_CANCELLED') ||
            type.includes('TERMINATED')
          ) {
            setIsExecuting(false);
            setExecutingStatusLabel('');

            agentClient.getTask(activeTaskId).then((updated) => {
              setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
            });

            agentClient.getConversations().then((cList) => setConversations(cList));

            agentClient.getArtifacts().then((aList) => {
              setArtifacts(aList);
              if (settings.autoFocusArtifact && aList.length > 0) {
                const latestArt = aList[aList.length - 1];
                if (latestArt.task_id === activeTaskId) {
                  setActiveArtifact(latestArt);
                  setIsArtifactPanelOpen(true);
                }
              }
            });
          }
        }
      },
      activeTaskId || undefined,
      () => setIsBackendConnected(true),
      () => {}
    );

    return () => unsub();
  }, [isBackendConnected, activeTaskId, settings.autoFocusArtifact]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.conversation_id === activeConversationId) || null;
  const activeTask = tasks.find((t) => t.task_id === activeTaskId) || null;

  // Handlers
  const handleNewChat = async () => {
    try {
      const created = await agentClient.createConversation('New Thread');
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.conversation_id);
      setActiveArtifact(null);
      setIsArtifactPanelOpen(false);
      setActiveTaskId(null);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await agentClient.renameConversation(id, newTitle);
      setConversations((prev) => prev.map((c) => (c.conversation_id === id ? updated : c)));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await agentClient.deleteConversation(id);
      const remaining = conversations.filter((c) => c.conversation_id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining.length > 0 ? remaining[0].conversation_id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (text: string, attachments: AttachedFile[], modelId: string) => {
    if (!text.trim() && attachments.length === 0) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      const newConv = await agentClient.createConversation(text.slice(0, 32) || 'Investigation');
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.conversation_id);
      targetConvId = newConv.conversation_id;
    }

    // Ingest attachments
    const uploadedAttachmentIds: string[] = [];
    for (const att of attachments) {
      try {
        const res = await agentClient.uploadAttachment({
          filename: att.name,
          contentBase64: att.base64,
          claimedMime: att.type,
          conversationId: targetConvId,
        });
        const attId = res?.attachment_id || res?.attachment?.attachment_id;
        if (attId) uploadedAttachmentIds.push(attId);
      } catch (attErr) {
        console.error('Attachment upload failed for:', att.name, attErr);
      }
    }

    // Optimistically update conversation
    const tempUserMsgId = `temp_msg_${Date.now()}`;
    const userMsg = {
      message_id: tempUserMsgId,
      conversation_id: targetConvId,
      role: 'user' as const,
      content: text,
      timestamp: Date.now() / 1000,
      classification: 'USER_INPUT',
      attachments: attachments.map((a) => ({ name: a.name, size: a.size, type: a.type })),
    };

    const streamingMsgId = `stream_msg_${Date.now()}`;
    const initialAgentMsg = {
      message_id: streamingMsgId,
      conversation_id: targetConvId,
      role: 'agent' as const,
      content: '',
      timestamp: Date.now() / 1000,
      classification: 'CONVERSATIONAL',
      is_verified: false,
      metadata: { is_streaming: true, model: modelId === 'auto' ? 'gemma3:latest' : modelId },
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === targetConvId
          ? { ...c, messages: [...c.messages, userMsg, initialAgentMsg] }
          : c
      )
    );

    setIsExecuting(true);
    setExecutingStatusLabel('Thinking...');

    let streamedAccumulated = '';
    try {
      const streamHandle = agentClient.streamChatMessage({
        conversationId: targetConvId,
        content: text,
        attachmentIds: uploadedAttachmentIds,
        modelPreference: modelId,
        onToken: (delta, accumulated) => {
          streamedAccumulated = accumulated;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversation_id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.message_id === streamingMsgId
                    ? { ...m, content: accumulated, metadata: { ...m.metadata, is_streaming: true } }
                    : m
                ),
              };
            })
          );
        },
        onThinking: (delta, accumulated) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversation_id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.message_id === streamingMsgId
                    ? {
                        ...m,
                        thinking_text: accumulated,
                        metadata: {
                          ...m.metadata,
                          thinking_text: accumulated,
                          is_streaming: true,
                        },
                      }
                    : m
                ),
              };
            })
          );
        },
        onAgentStep: (step) => {
          setExecutingStatusLabel(`[${step.agent}] ${step.label}`);
          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversation_id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.message_id !== streamingMsgId) return m;
                  const existingSteps = m.agent_steps || [];
                  const existingIdx = existingSteps.findIndex((s) => s.id === step.id);
                  let updatedSteps: AgentStep[];
                  if (existingIdx >= 0) {
                    updatedSteps = [...existingSteps];
                    updatedSteps[existingIdx] = step;
                  } else {
                    updatedSteps = [...existingSteps, step];
                  }
                  return {
                    ...m,
                    agent_steps: updatedSteps,
                    metadata: {
                      ...m.metadata,
                      agent_steps: updatedSteps,
                      is_streaming: true,
                    },
                  };
                }),
              };
            })
          );
        },
        onDone: async (data) => {
          activeStreamRef.current = null;
          setIsExecuting(false);
          setExecutingStatusLabel('');
          const finalContent = data.accumulated || streamedAccumulated;
          const isVerified = data.is_verified || false;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversation_id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.message_id === streamingMsgId
                    ? {
                        ...m,
                        content: finalContent,
                        is_verified: isVerified,
                        classification: isVerified ? 'TASK_VERIFIED' : 'CONVERSATIONAL',
                        thinking_text: data.thinking_text || m.thinking_text,
                        agent_steps: data.agent_steps || m.agent_steps,
                        duration_seconds: data.duration_seconds || m.duration_seconds,
                        metadata: {
                          ...m.metadata,
                          response_spec: data.response_spec,
                          thinking_text: data.thinking_text || m.thinking_text,
                          agent_steps: data.agent_steps || m.agent_steps,
                          duration_seconds: data.duration_seconds || m.duration_seconds,
                          is_streaming: false,
                        },
                      }
                    : m
                ),
              };
            })
          );
          try {
            const cList = await agentClient.getConversations();
            setConversations(cList);
            const aList = await agentClient.getArtifacts();
            setArtifacts(aList);
            const artRes = data.response_spec?.artifact_result || 
              data.response_spec?.artifact || 
              data.response_spec?.metadata?.artifact_result || 
              (data as any).artifact;
            if (artRes) {
              const artObj = artRes.artifact_id ? artRes : (artRes as any);
              const matched = aList.find((a) => a.artifact_id === artObj.artifact_id) || artObj;
              setActiveEvidence(null);
              setActiveArtifact(matched);
              setIsArtifactPanelOpen(true);
            }
          } catch {}
        },
        onError: (err) => {
          activeStreamRef.current = null;
          setIsExecuting(false);
          setExecutingStatusLabel('');
          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversation_id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.message_id === streamingMsgId
                    ? {
                        ...m,
                        content: streamedAccumulated
                          ? `${streamedAccumulated}\n\n*(Generation halted: ${err.message})*`
                          : `⚠️ Error: ${err.message}`,
                        metadata: {
                          ...m.metadata,
                          is_streaming: false,
                          is_error: true,
                        },
                      }
                    : m
                ),
              };
            })
          );
        },
      });

      activeStreamRef.current = streamHandle;
    } catch (err: any) {
      console.error('Stream request initiation error:', err);
      setIsExecuting(false);
      setExecutingStatusLabel('');
      alert(`Error starting chat stream: ${err.message}`);
    }
  };

  const handleCancelActiveTask = async () => {
    if (activeStreamRef.current) {
      await activeStreamRef.current.cancelBackend();
      activeStreamRef.current = null;
      setIsExecuting(false);
      setExecutingStatusLabel('');
      setConversations((prev) =>
        prev.map((c) => {
          if (c.conversation_id !== activeConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.metadata?.is_streaming
                ? {
                    ...m,
                    content: m.content
                      ? `${m.content}\n\n*(Generation cancelled by user)*`
                      : '*(Generation cancelled by user)*',
                    metadata: { ...m.metadata, is_streaming: false, is_cancelled: true },
                  }
                : m
            ),
          };
        })
      );
      return;
    }
    if (!activeTaskId) return;
    try {
      const updated = await agentClient.cancelTask(activeTaskId);
      setIsExecuting(false);
      setExecutingStatusLabel('');
      setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
      const cList = await agentClient.getConversations();
      setConversations(cList);
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  const handleApproveTask = async (taskId: string, stepId?: string, nonce?: string) => {
    try {
      setIsExecuting(true);
      setExecutingStatusLabel('Executing approved action...');
      const updated = await agentClient.approveTask({
        taskId,
        stepId: stepId || 'step_01',
        nonce: nonce || '',
      });
      setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
      const cList = await agentClient.getConversations();
      setConversations(cList);
    } catch (err: any) {
      console.error('Failed to approve task:', err);
      setIsExecuting(false);
      alert(`Approval failed: ${err.message || err}`);
    }
  };

  const handleRejectTask = async (taskId: string, stepId?: string, nonce?: string) => {
    try {
      setIsExecuting(false);
      setExecutingStatusLabel('');
      const updated = await agentClient.rejectTask({
        taskId,
        stepId: stepId || 'step_01',
        nonce: nonce || '',
      });
      setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
      const cList = await agentClient.getConversations();
      setConversations(cList);
    } catch (err: any) {
      console.error('Failed to reject task:', err);
      alert(`Rejection failed: ${err.message || err}`);
    }
  };

  const handleSelectArtifact = (art: ArtifactRecord) => {
    setActiveEvidence(null);
    setActiveArtifact(art);
    setIsArtifactPanelOpen(true);
  };

  const handleInspectEvidence = (ev: GroundedEvidenceItem) => {
    setActiveArtifact(null);
    setActiveEvidence(ev);
    setIsArtifactPanelOpen(true);
  };

  const handleCloseArtifact = () => {
    setActiveArtifact(null);
    setActiveEvidence(null);
    setIsArtifactPanelOpen(false);
    setIsArtifactMaximized(false);
  };

  const handleRefineMessage = async (action: string, instruction?: string) => {
    if (!activeConversationId) return;
    setIsExecuting(true);
    setExecutingStatusLabel(`Refining (${action})...`);
    try {
      await agentClient.refineChat({
        conversationId: activeConversationId,
        action,
        instruction,
      });
      const updatedList = await agentClient.getConversations();
      setConversations(updatedList);
    } catch (err) {
      console.error('Refinement failed:', err);
    } finally {
      setIsExecuting(false);
      setExecutingStatusLabel('');
    }
  };

  return (
    <div className="workbench-app-root">
      {/* Top Application Header */}
      <WorkbenchHeader
        leftCollapsed={leftCollapsed}
        onToggleLeft={() => {
          const next = !leftCollapsed;
          setLeftCollapsed(next);
          settingsStore.updateSettings({ leftPanelCollapsed: next });
        }}
        activeConversationTitle={activeConversation?.title || 'New Thread'}
        onRenameConversation={(title) => {
          if (activeConversationId) handleRenameConversation(activeConversationId, title);
        }}
        availableModels={availableModels}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        isBackendConnected={isBackendConnected}
        daemonStatus={daemonStatus}
        isExecuting={isExecuting}
        hasActiveArtifact={Boolean(activeArtifact)}
        isArtifactPanelOpen={isArtifactPanelOpen}
        onToggleArtifactPanel={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenModelHub={() => setIsModelHubOpen(true)}
      />

      {/* Non-Blocking License Warning Banner (Zero-Lockout Invariant) */}
      {(commercialLicense.status === 'EXPIRED' ||
        commercialLicense.status === 'REVOKED' ||
        commercialLicense.status === 'GRACE_PERIOD') &&
        !dismissLicenseBanner && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#f8fafc',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Notice:</span>
              <span>
                {commercialLicense.status === 'EXPIRED'
                  ? 'Your Hijin subscription has expired. All existing projects, documents, and exports remain fully accessible.'
                  : commercialLicense.status === 'REVOKED'
                  ? 'Your license key has been revoked. Offline data and exports remain accessible.'
                  : `Your license is in grace period (${commercialLicense.daysRemaining} days remaining).`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href={commercialLicense.renewalUrl || 'https://hijin.ai/pricing'}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#38bdf8',
                  textDecoration: 'underline',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Renew License →
              </a>
              <button
                type="button"
                onClick={() => setDismissLicenseBanner(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px',
                }}
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      {/* Main Studio Resizable Layout */}
      <ResizablePanels
        leftCollapsed={leftCollapsed}
        onToggleLeft={() => {
          const next = !leftCollapsed;
          setLeftCollapsed(next);
          settingsStore.updateSettings({ leftPanelCollapsed: next });
        }}
        leftPanel={
          <LeftNavigationPanel
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              setActiveWorkspaceMode('chat');
              handleSelectConversation(id);
            }}
            onNewChat={() => {
              setActiveWorkspaceMode('chat');
              handleNewChat();
            }}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            artifacts={artifacts}
            activeArtifactId={activeArtifact?.artifact_id || null}
            onSelectArtifact={handleSelectArtifact}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isBackendConnected={isBackendConnected}
            activeMode={activeWorkspaceMode}
            onSelectMode={(mode) => setActiveWorkspaceMode(mode)}
          />
        }
        centerPanel={
          activeWorkspaceMode === 'reconciliation' ? (
            <ReconciliationView onBackToChat={() => setActiveWorkspaceMode('chat')} />
          ) : (
            <ChatPanel
              conversation={activeConversation}
              onSendMessage={handleSendMessage}
              onCancelActiveTask={handleCancelActiveTask}
              isExecuting={isExecuting}
              executingStatusLabel={executingStatusLabel}
              availableModels={availableModels}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onOpenArtifact={handleSelectArtifact}
              onInspectEvidence={handleInspectEvidence}
              onRenameConversation={(title) => {
                if (activeConversationId) handleRenameConversation(activeConversationId, title);
              }}
              allArtifacts={artifacts}
              activeTask={activeTask}
              onApproveTask={handleApproveTask}
              onRejectTask={handleRejectTask}
              onRefineMessage={handleRefineMessage}
              onStartReconciliation={() => setActiveWorkspaceMode('reconciliation')}
              recentConversations={conversations}
              onSelectConversation={handleSelectConversation}
            />
          )
        }
        rightPanel={
          activeArtifact || activeEvidence ? (
            <ArtifactViewer
              artifact={activeArtifact}
              evidence={activeEvidence}
              onClose={handleCloseArtifact}
              isMaximized={isArtifactMaximized}
              onToggleMaximize={() => setIsArtifactMaximized((prev) => !prev)}
              onInspectEvidence={handleInspectEvidence}
            />
          ) : undefined
        }
        rightCollapsed={!isArtifactPanelOpen || (!activeArtifact && !activeEvidence)}
        rightMaximized={isArtifactMaximized}
        onToggleRight={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
        onToggleRightMaximized={() => setIsArtifactMaximized((prev) => !prev)}
      />

      {/* Model Hub Modal */}
      <ModelHubModal
        isOpen={isModelHubOpen}
        onClose={() => setIsModelHubOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        availableModels={availableModels}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNewChat={handleNewChat}
        onSearchFocus={() => {
          if (leftCollapsed) {
            setLeftCollapsed(false);
            settingsStore.updateSettings({ leftPanelCollapsed: false });
          }
        }}
        onToggleSidebar={() => {
          const next = !leftCollapsed;
          setLeftCollapsed(next);
          settingsStore.updateSettings({ leftPanelCollapsed: next });
        }}
        onToggleArtifacts={() => {
          setIsArtifactPanelOpen((prev) => !prev);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* C8 First Launch & Activation Wizard */}
      <FirstLaunchWizard
        isOpen={isOnboardingOpen}
        onComplete={() => {
          setIsOnboardingOpen(false);
          settingsStore.updateSettings({ firstLaunchCompleted: true });
        }}
      />
    </div>
  );
};

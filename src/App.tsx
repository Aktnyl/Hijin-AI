import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  agentClient,
  AgentEvent,
  ArtifactRecord,
  ConversationRecord,
  ModelView,
  TaskView,
} from './services/agentClient';
import { settingsStore } from './services/settingsStore';
import { ChatPanel, AttachedFile } from './components/workbench/ChatPanel';
import { LeftNavigationPanel } from './components/workbench/LeftNavigationPanel';
import { ArtifactViewer, GroundedEvidenceItem } from './components/workbench/ArtifactViewer';
import { ResizablePanels } from './components/workbench/ResizablePanels';
import { SettingsModal } from './components/workbench/SettingsModal';
import { ModelHubModal } from './components/workbench/ModelHubModal';
import { WorkbenchHeader } from './components/workbench/WorkbenchHeader';
import { CommandPalette } from './components/workbench/CommandPalette';
import { FirstLaunchWizard } from './components/onboarding/FirstLaunchWizard';

export const App: React.FC = () => {
  const [settings, setSettings] = useState(settingsStore.getSettings());
  const [leftCollapsed, setLeftCollapsed] = useState(settings.leftPanelCollapsed || false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelHubOpen, setIsModelHubOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!settingsStore.getSettings().firstLaunchCompleted);

  // Backend Connectivity State
  const [isBackendConnected, setIsBackendConnected] = useState(false);
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

  const activeTaskPollRef = useRef<number | null>(null);

  // Subscribe to Settings Changes
  useEffect(() => {
    const unsub = settingsStore.subscribe((s) => setSettings(s));
    return () => unsub();
  }, []);

  // Poll backend health and connect
  const checkBackend = useCallback(async () => {
    try {
      const health = await agentClient.getHealth();
      if (health && health.status === 'HEALTHY') {
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

          if (prev.length === convList.length) {
            const isIdentical = prev.every((p, i) => {
              const c = convList[i];
              return (
                c &&
                p.conversation_id === c.conversation_id &&
                p.updated_at === c.updated_at &&
                p.title === c.title &&
                p.messages.length === c.messages.length
              );
            });
            if (isIdentical) return prev;
          }
          return convList;
        });
        if (convList.length > 0 && !activeConversationId) {
          setActiveConversationId(convList[0].conversation_id);
        }

        // Load artifacts
        const artList = await agentClient.getArtifacts();
        setArtifacts(artList);

        return true;
      }
    } catch {
      setIsBackendConnected(false);
    }
    return false;
  }, [activeConversationId]);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(() => {
      checkBackend();
    }, 4000);
    return () => clearInterval(interval);
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
                        metadata: {
                          ...m.metadata,
                          response_spec: data.response_spec,
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
            const artRes = data.response_spec?.metadata?.artifact_result;
            if (artRes && artRes.artifact_id) {
              const matched = aList.find((a) => a.artifact_id === artRes.artifact_id) || artRes;
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
        isExecuting={isExecuting}
        hasActiveArtifact={Boolean(activeArtifact)}
        isArtifactPanelOpen={isArtifactPanelOpen}
        onToggleArtifactPanel={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenModelHub={() => setIsModelHubOpen(true)}
      />

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
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            artifacts={artifacts}
            activeArtifactId={activeArtifact?.artifact_id || null}
            onSelectArtifact={handleSelectArtifact}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isBackendConnected={isBackendConnected}
          />
        }
        centerPanel={
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
          />
        }
        rightPanel={
          activeArtifact || activeEvidence ? (
            <ArtifactViewer
              artifact={activeArtifact}
              evidence={activeEvidence}
              onClose={handleCloseArtifact}
              isMaximized={isArtifactMaximized}
              onToggleMaximize={() => setIsArtifactMaximized((prev) => !prev)}
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

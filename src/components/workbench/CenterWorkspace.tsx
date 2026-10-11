import React from 'react';
import { ArtifactRecord, TaskView } from '../../services/agentClient';
import { WorkspaceMode } from '../../services/settingsStore';
import { ArtifactViewer } from './ArtifactViewer';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import {
  BrandIcon,
  CheckIcon,
  VerifiedIcon,
  SparklesIcon,
  ActivityIcon,
  SpreadsheetIcon,
  ChartIcon,
  WarningIcon,
  StopIcon,
} from '../common/Icons';

interface CenterWorkspaceProps {
  activeMode: WorkspaceMode;
  activeTask: TaskView | null;
  activeArtifact: ArtifactRecord | null;
  onCloseArtifact: () => void;
  onCancelTask: (taskId: string) => void;
  onSelectPrompt: (promptText: string) => void;
  onDropFiles: (files: FileList) => void;
  onApproveTask?: (taskId: string, stepId?: string, nonce?: string) => void;
  onRejectTask?: (taskId: string, stepId?: string, nonce?: string) => void;
}

export const CenterWorkspace: React.FC<CenterWorkspaceProps> = ({
  activeMode,
  activeTask,
  activeArtifact,
  onCloseArtifact,
  onCancelTask,
  onSelectPrompt,
  onDropFiles,
  onApproveTask,
  onRejectTask,
}) => {
  // If an artifact is actively selected, show it
  if (activeArtifact) {
    return <ArtifactViewer artifact={activeArtifact} onClose={onCloseArtifact} />;
  }

  // Execution states for truthful progress timeline
  const executionStages = [
    { id: 'UNDERSTANDING', label: 'Understanding' },
    { id: 'RETRIEVING', label: 'Retrieving' },
    { id: 'ANALYZING', label: 'Analyzing' },
    { id: 'EXECUTING', label: 'Executing' },
    { id: 'GENERATING', label: 'Generating' },
    { id: 'VALIDATING', label: 'Validating' },
    { id: 'VERIFYING', label: 'Verifying' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  const getStageIndex = (statusStr: string): number => {
    const s = statusStr.toUpperCase();
    if (s.includes('COMPLETED')) return 7;
    if (s.includes('VERIFY')) return 6;
    if (s.includes('VALIDAT')) return 5;
    if (s.includes('GENERAT')) return 4;
    if (s.includes('EXECUT')) return 3;
    if (s.includes('ANALYZ')) return 2;
    if (s.includes('RETRIEV')) return 1;
    return 0; // Default understanding
  };

  const isTaskActive =
    activeTask &&
    activeTask.status &&
    ['EXECUTING', 'IN_PROGRESS', 'INITIALIZING'].includes(activeTask.status.toUpperCase());

  const isTaskCompleted =
    activeTask &&
    activeTask.status &&
    activeTask.status.toUpperCase() === 'COMPLETED';

  const isTaskFailed =
    activeTask &&
    activeTask.status &&
    ['FAILED', 'TERMINATED_SAFE', 'CANCELLED', 'BLOCKED'].includes(activeTask.status.toUpperCase());

  const isWaitingApproval =
    activeTask &&
    activeTask.status &&
    ['WAITING_FOR_APPROVAL', 'PAUSED_FOR_HUMAN'].includes(activeTask.status.toUpperCase());

  // Render active task progress view
  if (activeTask && (isTaskActive || isTaskCompleted || isTaskFailed || isWaitingApproval || activeMode === 'task')) {
    const currentStageIdx = isTaskCompleted ? 7 : getStageIndex(activeTask.status_label || activeTask.status);

    return (
      <div className="task-workspace-container">
        {/* Task Header */}
        <div className="task-workspace-header">
          <div className="task-header-title-group">
            <span className="task-id-badge">{activeTask.task_id}</span>
            <h2 className="task-objective-title">{activeTask.user_objective}</h2>
          </div>
          <div className="task-header-actions">
            {isTaskActive && (
              <button
                className="task-cancel-btn"
                onClick={() => onCancelTask(activeTask.task_id)}
                title="Cancel Task"
              >
                Cancel Task
              </button>
            )}
            <span className={`status-badge-pill ${activeTask.status.toLowerCase()}`}>
              {activeTask.status_label || activeTask.status}
            </span>
          </div>
        </div>

        {/* High-Level Truthful Execution Timeline */}
        <div className="execution-timeline-card">
          <div className="timeline-header">
            <h3>Execution Lifecycle</h3>
            <span className="timeline-hint">
              {isTaskActive ? 'Deterministic step progression in progress' : 'Task execution finalized'}
            </span>
          </div>

          <div className="stages-flow-track">
            {executionStages.map((stage, idx) => {
              const isPast = idx < currentStageIdx || isTaskCompleted;
              const isCurrent = idx === currentStageIdx && isTaskActive;

              return (
                <div
                  key={stage.id}
                  className={`stage-node ${isPast ? 'completed' : ''} ${isCurrent ? 'active-pulse' : ''}`}
                >
                  <div className="stage-circle">
                    {isPast ? (
                      <CheckIcon size={12} strokeWidth={2.5} />
                    ) : isCurrent ? (
                      <span className="stage-current-dot" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className="stage-label">{stage.label}</span>
                </div>
              );
            })}
          </div>

          {isTaskActive && (
            <div className="truthful-indeterminate-bar">
              <div className="indeterminate-progress-shimmer" />
            </div>
          )}
        </div>

        {/* Human Authorization / Clarification Card */}
        {isWaitingApproval && (
          <div className="human-approval-card">
            <div className="approval-card-header">
              <div className="approval-title-row">
                <WarningIcon size={18} className="approval-warning-icon" />
                <h3>Action Paused: Human Authorization Required</h3>
              </div>
              <span className="approval-risk-badge">
                {activeTask.approval_request?.risk_level || 'HIGH'} RISK
              </span>
            </div>

            <div className="approval-card-body">
              <p className="approval-reason-text">
                {activeTask.approval_request?.reason_required ||
                  activeTask.failure_reason ||
                  'The agent paused this task to verify parameters and require user consent before proceeding.'}
              </p>

              {activeTask.approval_request && (
                <div className="approval-details-grid">
                  <div className="approval-detail-item">
                    <span className="detail-label">Action Requested</span>
                    <span className="detail-value">{activeTask.approval_request.action_requested}</span>
                  </div>
                  <div className="approval-detail-item">
                    <span className="detail-label">Step ID</span>
                    <span className="detail-value mono">{activeTask.approval_request.step_id}</span>
                  </div>
                  <div className="approval-detail-item">
                    <span className="detail-label">Security Nonce</span>
                    <span className="detail-value mono nonce">{activeTask.approval_request.nonce}</span>
                  </div>
                  <div className="approval-detail-item">
                    <span className="detail-label">Consequence if Approved</span>
                    <span className="detail-value">{activeTask.approval_request.consequences_if_approved}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="approval-actions-bar">
              <button
                className="approval-approve-btn"
                onClick={() =>
                  onApproveTask &&
                  onApproveTask(
                    activeTask.task_id,
                    activeTask.approval_request?.step_id || 'step_01',
                    activeTask.approval_request?.nonce || ''
                  )
                }
              >
                <CheckIcon size={14} style={{ marginRight: 6 }} />
                Approve & Continue Execution
              </button>
              <button
                className="approval-reject-btn"
                onClick={() =>
                  onRejectTask &&
                  onRejectTask(
                    activeTask.task_id,
                    activeTask.approval_request?.step_id || 'step_01',
                    activeTask.approval_request?.nonce || ''
                  )
                }
              >
                <StopIcon size={14} style={{ marginRight: 6 }} />
                Reject & Halt Task
              </button>
            </div>
          </div>
        )}

        {/* DAG Steps & Evidence Inspection */}
        {activeTask.plan && activeTask.plan.steps && activeTask.plan.steps.length > 0 && (
          <div className="plan-steps-card">
            <h3>Workflow Plan DAG ({activeTask.plan.steps.length} Steps)</h3>
            <div className="steps-grid">
              {activeTask.plan.steps.map((s, idx) => (
                <div key={s.step_id} className={`step-card status-${s.status.toLowerCase()}`}>
                  <div className="step-card-header">
                    <span className="step-num">Step {idx + 1}</span>
                    <span className="step-cap">{s.capability_id}</span>
                    <span className="step-risk">{s.risk_level} Risk</span>
                  </div>
                  <div className="step-desc">{s.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Result Summary */}
        {(activeTask.result_summary || isTaskCompleted || isTaskFailed) && (
          <div className={`task-outcome-card ${isTaskCompleted ? 'success' : 'failure'}`}>
            <div className="outcome-header">
              <h3>{isTaskCompleted ? 'Verified Execution Result' : 'Task Status Outcome'}</h3>
              {activeTask.verification?.is_verified && (
                <span className="verification-certified-badge">
                  <VerifiedIcon size={14} style={{ marginRight: 5 }} />
                  Deterministically Verified
                </span>
              )}
            </div>

            <div className="outcome-body">
              <MarkdownRenderer
                content={
                  activeTask.result_summary ||
                  (isTaskCompleted ? 'Task completed successfully.' : 'Execution halted safely.')
                }
              />
            </div>

            {activeTask.evidence_items && activeTask.evidence_items.length > 0 && (
              <div className="outcome-evidence-section">
                <h4>Grounded Evidence ({activeTask.evidence_items.length} citations)</h4>
                <div className="evidence-chips-list">
                  {activeTask.evidence_items.map((ev) => (
                    <div key={ev.evidence_id} className="evidence-chip">
                      <span className="evidence-title">{ev.title}</span>
                      <span className="evidence-snippet">{ev.snippet}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default Empty / Home Workstation State
  return (
    <div
      className="empty-workspace-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files) onDropFiles(e.dataTransfer.files);
      }}
    >
      <div className="welcome-hero-card">
        <BrandIcon size={36} className="hero-brand-icon" />
        <h1 className="hero-title">Professional AI Workstation</h1>
        <p className="hero-subtitle">
          Local semantic reasoning with deterministic mathematical execution boundaries.
          Zero external telemetry. Your documents and data never leave this device.
        </p>

        <div className="hero-pills-row">
          <span className="hero-pill">
            <CheckIcon size={13} style={{ marginRight: 4 }} />
            NVIDIA CUDA Acceleration
          </span>
          <span className="hero-pill">
            <CheckIcon size={13} style={{ marginRight: 4 }} />
            Deterministic Math Guard
          </span>
          <span className="hero-pill">
            <CheckIcon size={13} style={{ marginRight: 4 }} />
            Local-First & Offline
          </span>
          <span className="hero-pill">
            <CheckIcon size={13} style={{ marginRight: 4 }} />
            Byte-Level Citations
          </span>
        </div>
      </div>

      {/* Quick Action Prompt Cards */}
      <div className="quick-actions-section">
        <h3>Common Tasks & Capabilities</h3>
        <div className="quick-cards-grid">
          <button
            className="action-card"
            onClick={() => onSelectPrompt('Explain what you can currently do.')}
          >
            <span className="card-icon"><SparklesIcon size={18} /></span>
            <div className="card-text">
              <span className="card-title">Explain Capabilities</span>
              <span className="card-desc">Ask the agent to explain its local tools, backends, and skills</span>
            </div>
          </button>

          <button
            className="action-card"
            onClick={() => onSelectPrompt('Reconcile spreadsheet and invoices to calculate variances.')}
          >
            <span className="card-icon"><ActivityIcon size={18} /></span>
            <div className="card-text">
              <span className="card-title">Financial Reconciliation</span>
              <span className="card-desc">Deterministic balance-sheet and purchase order line item audits</span>
            </div>
          </button>

          <button
            className="action-card"
            onClick={() => onSelectPrompt('Summarize this document with key contractual terms.')}
          >
            <span className="card-icon"><SpreadsheetIcon size={18} /></span>
            <div className="card-text">
              <span className="card-title">Document Intelligence</span>
              <span className="card-desc">Extract obligations, terms, dates, and identify contradictions</span>
            </div>
          </button>

          <button
            className="action-card"
            onClick={() => onSelectPrompt('Generate formal markdown audit memo for Q3.')}
          >
            <span className="card-icon"><ChartIcon size={18} /></span>
            <div className="card-text">
              <span className="card-title">Generate Audit Report</span>
              <span className="card-desc">Create cited executive briefs, CSV ledgers, and verified charts</span>
            </div>
          </button>
        </div>
      </div>

      {/* Drag & Drop Target Area */}
      <div className="drag-drop-zone">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="drop-title">Drag & Drop Documents or Images Here</span>
        <span className="drop-hint">PDF, DOCX, TXT, CSV, XLSX, PNG, JPEG (Automatically validated by ServiceGuard)</span>
      </div>
    </div>
  );
};

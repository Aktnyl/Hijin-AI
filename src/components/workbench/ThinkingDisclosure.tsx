import React, { useState, useEffect } from 'react';
import { AgentStep } from '../../services/agentClient';
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  VerifiedIcon,
  ActivityIcon,
  SpreadsheetIcon,
  FileCheckIcon,
  SecurityIcon,
  CpuIcon,
} from '../common/Icons';

export interface ThinkingDisclosureProps {
  thinkingText?: string;
  agentSteps?: AgentStep[];
  durationSeconds?: number;
  isStreaming?: boolean;
  executingStatusLabel?: string;
}

export const ThinkingDisclosure: React.FC<ThinkingDisclosureProps> = ({
  thinkingText = '',
  agentSteps = [],
  durationSeconds,
  isStreaming = false,
  executingStatusLabel = '',
}) => {
  // While streaming, keep open by default so user can watch agents coordinate;
  // after completion, collapse to a clean "Thought for Xs" line like Claude AI.
  const [isOpen, setIsOpen] = useState<boolean>(isStreaming);

  // If streaming starts anew, expand
  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  // If there's neither thinking text nor agent steps, and not streaming, don't render
  if (!isStreaming && !thinkingText && (!agentSteps || agentSteps.length === 0)) {
    return null;
  }

  const completedSteps = (agentSteps || []).filter((s) => s.status === 'completed').length;
  const totalSteps = Math.max(6, (agentSteps || []).length);

  // Agent Icon Resolver
  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case 'Planner':
        return <CpuIcon size={14} style={{ color: '#818cf8' }} />;
      case 'Ingestion':
        return <FileCheckIcon size={14} style={{ color: '#38bdf8' }} />;
      case 'MathSpecialist':
        return <SpreadsheetIcon size={14} style={{ color: '#34d399' }} />;
      case 'EvidenceGraph':
        return <ActivityIcon size={14} style={{ color: '#fbbf24' }} />;
      case 'SafetyGate':
        return <SecurityIcon size={14} style={{ color: '#f43f5e' }} />;
      case 'ArtifactCompiler':
        return <SparklesIcon size={14} style={{ color: '#a78bfa' }} />;
      default:
        return <ActivityIcon size={14} style={{ color: '#94a3b8' }} />;
    }
  };

  const activeStep = (agentSteps || []).find((s) => s.status === 'running');

  // Title generation
  let headerLabel = 'Thinking Process';
  if (isStreaming) {
    if (activeStep) {
      headerLabel = `Thinking... [${activeStep.agent}] ${activeStep.label}`;
    } else if (executingStatusLabel) {
      headerLabel = executingStatusLabel.startsWith('Thinking')
        ? executingStatusLabel
        : `Thinking... ${executingStatusLabel}`;
    } else {
      headerLabel = 'Thinking...';
    }
  } else if (durationSeconds && durationSeconds > 0) {
    headerLabel = `Thought for ${durationSeconds} second${durationSeconds === 1 ? '' : 's'}`;
  } else if (agentSteps && agentSteps.length > 0) {
    headerLabel = `Reasoning Process · ${completedSteps}/${totalSteps} agents coordinated`;
  }

  return (
    <div className={`thinking-disclosure-container ${isStreaming ? 'is-streaming' : 'is-completed'}`}>
      <button
        type="button"
        className="thinking-disclosure-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="thinking-trigger-left">
          <span className="thinking-icon-badge">
            {isStreaming ? (
              <span className="thinking-spinner-pulse" />
            ) : (
              <SparklesIcon size={13} style={{ color: '#93c5fd' }} />
            )}
          </span>
          <span className="thinking-trigger-label">{headerLabel}</span>
        </div>

        <div className="thinking-trigger-right">
          {isStreaming ? (
            <span className="thinking-status-pill running">
              <span className="thinking-live-dot" />
              {completedSteps}/{totalSteps} Agents
            </span>
          ) : (
            <span className="thinking-status-pill verified">
              <CheckIcon size={11} style={{ marginRight: 3 }} />
              Air-Gapped
            </span>
          )}
          <span className="thinking-chevron">
            {isOpen ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="thinking-disclosure-body">
          {/* Multi-Agent Coordination Pipeline Cards */}
          {agentSteps && agentSteps.length > 0 && (
            <div className="thinking-agent-pipeline-grid">
              {agentSteps.map((step) => {
                const isRunning = step.status === 'running';
                const isDone = step.status === 'completed';
                return (
                  <div
                    key={step.id}
                    className={`thinking-agent-card ${isRunning ? 'running' : ''} ${isDone ? 'completed' : ''}`}
                  >
                    <div className="thinking-agent-header">
                      <div className="thinking-agent-name-group">
                        <span className="agent-icon-box">{getAgentIcon(step.agent)}</span>
                        <span className="agent-name-text">{step.agent}</span>
                      </div>
                      <div className="agent-status-badge">
                        {isRunning && <span className="agent-pulse-spinner" />}
                        {isDone && <CheckIcon size={12} style={{ color: '#10b981' }} />}
                        {step.duration_ms && step.duration_ms > 0 ? (
                          <span className="agent-duration">{step.duration_ms}ms</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="thinking-agent-label">{step.label}</div>
                    <div className="thinking-agent-desc">{step.description}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grounded Chain-of-Thought Stream */}
          {thinkingText && (
            <div className="thinking-trace-section">
              <div className="thinking-trace-header">
                <span className="trace-title">Offline Cognitive Reasoning Trace</span>
                <span className="trace-note">100% deterministic local inference</span>
              </div>
              <div className="thinking-trace-content">
                <pre>{thinkingText}</pre>
                {isStreaming && <span className="streaming-cursor">▋</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

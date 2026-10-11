import React, { useEffect, useRef, useState } from 'react';
import { ModelView } from '../../services/agentClient';
import { PRODUCT_IDENTITY } from '../../services/productIdentity';
import { settingsStore, ThemeMode } from '../../services/settingsStore';
import {
  BrandIcon,
  SettingsIcon,
  ChevronDownIcon,
  ArtifactsIcon,
  EditIcon,
  SparklesIcon,
  CheckIcon,
  SunIcon,
  MoonIcon,
  CpuIcon,
} from '../common/Icons';
import { CommercialLicenseBadge } from './CommercialLicenseBadge';

interface WorkbenchHeaderProps {
  leftCollapsed: boolean;
  onToggleLeft: () => void;
  activeConversationTitle?: string;
  onRenameConversation?: (newTitle: string) => void;
  availableModels: ModelView[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isBackendConnected: boolean;
  isExecuting: boolean;
  hasActiveArtifact: boolean;
  isArtifactPanelOpen: boolean;
  onToggleArtifactPanel: () => void;
  onOpenSettings: () => void;
  onOpenModelHub?: () => void;
  onOpenCommandPalette?: () => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  leftCollapsed,
  onToggleLeft,
  activeConversationTitle = 'New Thread',
  onRenameConversation,
  availableModels,
  selectedModel,
  onSelectModel,
  isBackendConnected,
  isExecuting,
  hasActiveArtifact,
  isArtifactPanelOpen,
  onToggleArtifactPanel,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenModelHub,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(activeConversationTitle);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(settingsStore.getSettings().theme);
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const readEffective = () => {
      const domTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
      if (domTheme === 'light' || domTheme === 'dark') {
        setEffectiveTheme(domTheme);
      } else {
        setEffectiveTheme(settingsStore.getSettings().theme === 'light' ? 'light' : 'dark');
      }
    };

    readEffective();

    const unsub = settingsStore.subscribe((s) => {
      setCurrentTheme(s.theme);
      readEffective();
    });

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      observer = new MutationObserver(() => readEffective());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    return () => {
      unsub();
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setTitleInput(activeConversationTitle);
  }, [activeConversationTitle]);

  // Close model dropdown on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModelDropdownOpen]);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim() && onRenameConversation) {
      onRenameConversation(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = effectiveTheme === 'light' ? 'dark' : 'light';
    settingsStore.updateSettings({ theme: nextTheme });
  };

  const getActiveModelDisplay = () => {
    if (selectedModel === 'auto') {
      return {
        name: 'Auto-Router',
        badge: 'Gemma 3 + Specialist',
        desc: 'Autonomous dynamic routing based on query complexity and mathematical risk',
      };
    }
    const found = availableModels.find((m) => m.model_id === selectedModel);
    if (!found) {
      return { name: selectedModel, badge: 'Local', desc: 'On-device local model' };
    }
    return {
      name: found.model_id.replace('agent-alpha-', '').replace('-v1', '').toUpperCase(),
      badge: found.parameter_size || 'On-Device',
      desc: found.suitability || `${found.model_family || 'Local'} intelligence runtime`,
    };
  };

  const activeModelMeta = getActiveModelDisplay();

  return (
    <header className="wb-header">
      {/* Left: Sidebar Toggle + Brand Badge + Airgap Telemetry */}
      <div className="wb-header-left">
        <button
          className={`wb-sidebar-toggle-btn ${leftCollapsed ? 'collapsed' : ''}`}
          onClick={onToggleLeft}
          title={leftCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
          aria-label="Toggle navigation"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <div className="wb-brand">
          <BrandIcon size={20} className="wb-brand-icon" />
          <span className="wb-brand-title">{PRODUCT_IDENTITY.productName}</span>
          <span className="wb-brand-version">v{PRODUCT_IDENTITY.version}</span>
        </div>

        <div
          className={`wb-airgap-pill ${isBackendConnected ? 'online' : 'offline'}`}
          title={
            isBackendConnected
              ? 'Local Processing: Loopback verified on 127.0.0.1:8765 (Zero Cloud Telemetry)'
              : 'Connecting to local service daemon...'
          }
        >
          <span className="wb-status-dot" />
          <span className="wb-status-text">
            {isBackendConnected ? 'On-Device' : 'Connecting'}
          </span>
        </div>

        <CommercialLicenseBadge />
      </div>

      {/* Center: Thread Breadcrumb + Model Popover Selector + Command Palette Trigger */}
      <div className="wb-header-center">
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="wb-title-edit-form">
            <input
              autoFocus
              type="text"
              className="wb-title-input"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
            />
          </form>
        ) : (
          <div
            className="wb-title-display"
            onClick={() => {
              setTitleInput(activeConversationTitle);
              setIsEditingTitle(true);
            }}
            title="Click to rename thread"
          >
            <span className="wb-title-crumb">Investigation /</span>
            <span className="wb-title-text">{activeConversationTitle}</span>
            {activeConversationTitle.toLowerCase().includes('reconcil') ? (
              <span className="wb-matter-badge">Reconciliation</span>
            ) : activeConversationTitle.toLowerCase().includes('m&a') ? (
              <span className="wb-matter-badge">M&A Audit</span>
            ) : activeConversationTitle.toLowerCase().includes('contract') ? (
              <span className="wb-matter-badge">Contract Risk</span>
            ) : null}
            <EditIcon size={12} className="wb-title-edit-icon" />
          </div>
        )}

        {/* Custom Model Selector Popover */}
        <div className="wb-model-popover-wrapper" ref={modelDropdownRef}>
          <button
            type="button"
            className={`wb-model-trigger-btn ${isModelDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            title="Switch Active Intelligence Engine"
          >
            <SparklesIcon size={13} className="wb-model-trigger-icon" />
            <span className="wb-model-trigger-name">{activeModelMeta.name}</span>
            <span className="wb-model-trigger-badge">{activeModelMeta.badge}</span>
            <ChevronDownIcon size={11} className="wb-model-trigger-chevron" />
          </button>

          {isModelDropdownOpen && (
            <div className="wb-model-dropdown-menu">
              <div className="wb-model-dropdown-header">
                <span>Select Intelligence Model</span>
                <span className="wb-model-dropdown-sub">100% On-Device & Private</span>
              </div>

              <div className="wb-model-dropdown-list">
                <button
                  type="button"
                  className={`wb-model-option-item ${selectedModel === 'auto' ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectModel('auto');
                    setIsModelDropdownOpen(false);
                  }}
                >
                  <div className="wb-model-option-info">
                    <div className="wb-model-option-title-row">
                      <span className="wb-model-option-title">⚡ Auto-Router (Cognitive Engine)</span>
                      <span className="wb-model-option-badge">Recommended</span>
                    </div>
                    <span className="wb-model-option-desc">
                      Dynamically routes between Gemma 3 and specialist models based on query complexity.
                    </span>
                  </div>
                  {selectedModel === 'auto' && <CheckIcon size={14} className="wb-model-option-check" />}
                </button>

                {availableModels.map((m) => (
                  <button
                    key={m.model_id}
                    type="button"
                    className={`wb-model-option-item ${selectedModel === m.model_id ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectModel(m.model_id);
                      setIsModelDropdownOpen(false);
                    }}
                  >
                    <div className="wb-model-option-info">
                      <div className="wb-model-option-title-row">
                        <span className="wb-model-option-title">{m.model_id}</span>
                        <span className="wb-model-option-badge">{m.parameter_size || 'Local'}</span>
                      </div>
                      <span className="wb-model-option-desc">
                        {m.suitability || `Specialized ${m.model_family || 'local'} model running on on-device GPU.`}
                      </span>
                    </div>
                    {selectedModel === m.model_id && <CheckIcon size={14} className="wb-model-option-check" />}
                  </button>
                ))}
                {onOpenModelHub && (
                  <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                    <button
                      type="button"
                      className="wb-model-store-btn"
                      onClick={() => {
                        setIsModelDropdownOpen(false);
                        onOpenModelHub();
                      }}
                    >
                      <CpuIcon size={13} style={{ color: '#38bdf8' }} />
                      <span>Manage Models & Download from Store...</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Command Palette Trigger Pill */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="wb-command-palette-btn"
            onClick={onOpenCommandPalette}
            title="Open Command Palette (Ctrl+K)"
          >
            <span className="wb-cmd-icon">⌘</span>
            <span>Commands</span>
            <kbd className="wb-kbd-pill">Ctrl K</kbd>
          </button>
        )}
      </div>

      {/* Right: Quick Theme Toggle + Inspector Toggle + Settings */}
      <div className="wb-header-right">
        {onOpenModelHub && (
          <button
            className="wb-header-store-btn"
            onClick={onOpenModelHub}
            title="Open Model Store & Local Weights Manager (Ctrl+M)"
          >
            <CpuIcon size={14} style={{ color: '#38bdf8' }} />
            <span>Model Store</span>
          </button>
        )}

        <button
          className="wb-icon-btn wb-theme-toggle-btn" 
          onClick={toggleTheme}
          title={effectiveTheme === 'light' ? 'Switch to Obsidian Dark Mode' : 'Switch to Crisp Paper Light Mode'}
          aria-label="Toggle theme"
        >
          {effectiveTheme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
        </button>

        {hasActiveArtifact && (
          <button
            className={`wb-inspector-toggle-btn ${isArtifactPanelOpen ? 'active' : ''}`}
            onClick={onToggleArtifactPanel}
            title={isArtifactPanelOpen ? 'Hide Artifact Workspace' : 'Open Artifact Workspace (Ctrl+Shift+A)'}
          >
            <ArtifactsIcon size={14} style={{ marginRight: 5 }} />
            <span>Workspace</span>
          </button>
        )}

        <button
          className="wb-icon-btn"
          onClick={onOpenSettings}
          title="Open Settings & Diagnostics (Ctrl+,)"
          aria-label="Settings"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
};

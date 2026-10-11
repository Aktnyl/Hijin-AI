import React, { useEffect, useState } from 'react';
import { agentClient, ModelView } from '../../services/agentClient';
import { PRODUCT_IDENTITY } from '../../services/productIdentity';
import { commercialService } from '../../services/commercialService';
import {
  AccentColor,
  AnimationLevel,
  AppSettingsV1,
  FontSize,
  ReasoningDepth,
  settingsStore,
  ThemeMode,
  UiDensity,
  WorkspaceMode,
} from '../../services/settingsStore';
import {
  SettingsIcon,
  CloseIcon,
  PaletteIcon,
  SlidersIcon,
  ChatIcon,
  CpuIcon,
  GpuIcon,
  SecurityIcon,
} from '../common/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableModels: ModelView[];
}

type SettingsTab = 'appearance' | 'layout' | 'chat' | 'models' | 'agent' | 'hardware' | 'privacy';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, availableModels }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [settings, setSettings] = useState<AppSettingsV1>(settingsStore.getSettings());
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [loadingHw, setLoadingHw] = useState(false);

  useEffect(() => {
    const unsub = settingsStore.subscribe((s) => setSettings(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'hardware') {
      setLoadingHw(true);
      agentClient
        .getHardware()
        .then((data) => {
          setHardwareInfo(data);
          setLoadingHw(false);
        })
        .catch(() => setLoadingHw(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const update = (partial: Partial<AppSettingsV1>) => {
    settingsStore.updateSettings(partial);
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="settings-modal-header">
          <div className="header-title-box">
            <SettingsIcon size={18} style={{ marginRight: 8 }} />
            <h2>Workbench Settings & Customization</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Settings" aria-label="Close Settings">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="settings-modal-body">
          <nav className="settings-tabs-sidebar">
            <button
              className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <PaletteIcon size={15} style={{ marginRight: 6 }} />
              Appearance
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
              onClick={() => setActiveTab('layout')}
            >
              <SlidersIcon size={15} style={{ marginRight: 6 }} />
              Layout & Panels
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <ChatIcon size={15} style={{ marginRight: 6 }} />
              Chat & Models
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
              onClick={() => setActiveTab('agent')}
            >
              <CpuIcon size={15} style={{ marginRight: 6 }} />
              Agent Behavior
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'hardware' ? 'active' : ''}`}
              onClick={() => setActiveTab('hardware')}
            >
              <GpuIcon size={15} style={{ marginRight: 6 }} />
              Hardware & Telemetry
            </button>
            <button
              className={`settings-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <SecurityIcon size={15} style={{ marginRight: 6 }} />
              Privacy & Security
            </button>
          </nav>

          <div className="settings-tab-content">
            {/* 1. Appearance */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3>Visual Theme & Palette</h3>
                <p className="section-desc">Customize the workstation design language to your preferred visual comfort.</p>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Color Theme</label>
                    <span>System adaptive, crisp dark mode, or daylight light mode</span>
                  </div>
                  <div className="options-pill-group">
                    {[
                      { id: 'system', label: 'System', icon: '💻' },
                      { id: 'light', label: 'Light', icon: '☀️' },
                      { id: 'dark', label: 'Dark', icon: '🌙' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`pill-option-btn ${settings.theme === t.id ? 'selected' : ''}`}
                        onClick={() => {
                          update({ theme: t.id as ThemeMode });
                          if (t.id === 'system') {
                            settingsStore.applyThemeToDOM({ ...settings, theme: 'system' });
                          }
                        }}
                        title={`Switch to ${t.label} theme`}
                      >
                        <span className="pill-icon">{t.icon}</span>
                        <span>{t.label}</span>
                        {settings.theme === t.id && <span className="pill-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Accent Highlight Color</label>
                    <span>Primary focal color for badges, buttons, and highlights</span>
                  </div>
                  <div className="options-pill-group accent-pills">
                    {[
                      { id: 'blue', label: 'Blue', color: '#3b82f6' },
                      { id: 'emerald', label: 'Emerald', color: '#10b981' },
                      { id: 'indigo', label: 'Indigo', color: '#6366f1' },
                      { id: 'amber', label: 'Amber', color: '#f59e0b' },
                      { id: 'slate', label: 'Slate', color: '#64748b' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`pill-option-btn color-accent-${c.id} ${settings.accentColor === c.id ? 'selected' : ''}`}
                        onClick={() => update({ accentColor: c.id as AccentColor })}
                        title={`Select ${c.label} accent color`}
                      >
                        <span className="accent-dot" style={{ backgroundColor: c.color }} />
                        <span>{c.label}</span>
                        {settings.accentColor === c.id && <span className="pill-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Typography Font Size</label>
                    <span>Scale application-wide text for readability</span>
                  </div>
                  <div className="options-pill-group">
                    {(['sm', 'md', 'lg'] as FontSize[]).map((s) => (
                      <button
                        key={s}
                        className={`pill-option-btn ${settings.fontSize === s ? 'selected' : ''}`}
                        onClick={() => update({ fontSize: s })}
                      >
                        {s === 'sm' ? 'Compact' : s === 'md' ? 'Normal' : 'Large'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>UI Density</label>
                    <span>Spacing and padding between messages and lists</span>
                  </div>
                  <div className="options-pill-group">
                    {(['compact', 'comfortable'] as UiDensity[]).map((d) => (
                      <button
                        key={d}
                        className={`pill-option-btn ${settings.density === d ? 'selected' : ''}`}
                        onClick={() => update({ density: d })}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Micro-Animations</label>
                    <span>Smooth motion or reduced motion for minimal latency</span>
                  </div>
                  <div className="options-pill-group">
                    {(['standard', 'reduced'] as AnimationLevel[]).map((a) => (
                      <button
                        key={a}
                        className={`pill-option-btn ${settings.animationLevel === a ? 'selected' : ''}`}
                        onClick={() => update({ animationLevel: a })}
                      >
                        {a === 'standard' ? 'Standard' : 'Reduced Motion'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Layout & Panels */}
            {activeTab === 'layout' && (
              <div className="settings-section">
                <h3>Workbench Layout Preferences</h3>
                <p className="section-desc">Manage default panel widths, collapse behavior, and initial modes.</p>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Default Startup Workspace Mode</label>
                    <span>Initial workspace perspective when opening the application</span>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.defaultMode}
                    onChange={(e) => update({ defaultMode: e.target.value as WorkspaceMode })}
                  >
                    <option value="chat">Chat Mode</option>
                    <option value="artifact">Artifact Mode</option>
                    <option value="document">Document Mode</option>
                    <option value="data">Data Mode</option>
                    <option value="task">Task Mode</option>
                    <option value="focus">Focus Mode</option>
                  </select>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Auto-Focus Generated Artifacts</label>
                    <span>Automatically switch central view to artifact when agent produces a document</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-checkbox"
                    checked={settings.autoFocusArtifact}
                    onChange={(e) => update({ autoFocusArtifact: e.target.checked })}
                  />
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Reset Panel Layout</label>
                    <span>Restore navigation (260px) and chat (380px) to default dimensions</span>
                  </div>
                  <button
                    className="secondary-btn"
                    onClick={() => update({ leftPanelWidth: 260, rightPanelWidth: 380, leftPanelCollapsed: false, rightPanelCollapsed: false })}
                  >
                    Reset Layout
                  </button>
                </div>
              </div>
            )}

            {/* 3.5 AI Model Hub & Licensing */}
            {activeTab === 'models' && (
              <div className="settings-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>AI Model Hub & Local Weights</h3>
                    <p className="section-desc" style={{ margin: '4px 0 0' }}>
                      Download and manage specialized neural models on your local workstation without terminal commands.
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    100% Local Inference
                  </span>
                </div>

                {/* License & Recognition Account Status Banner */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.07)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 13, color: '#f0f4ff', display: 'block' }}>
                        Recognition Account: {commercialService.getStatus().accountId || 'Evaluation Workstation'}
                      </strong>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        Status: <strong style={{ color: '#38bdf8' }}>{commercialService.getStatus().displayLabel}</strong> · Tier: {commercialService.getStatus().planName}
                      </span>
                    </div>
                    <a
                      href={commercialService.getStatus().renewalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-btn"
                      style={{ fontSize: 12, padding: '6px 14px', textDecoration: 'none', borderRadius: 6, fontWeight: 600 }}
                    >
                      {commercialService.getStatus().status === 'ACTIVE' ? 'Manage Subscription' : 'Renew / Buy License on Website'}
                    </a>
                  </div>
                </div>

                {/* Model 1: Hijin Financial Specialist */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 14, color: '#f0f4ff' }}>Hijin Financial Specialist (4B Q4_K_M GGUF)</strong>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#10b981', color: '#fff', fontWeight: 700 }}>
                          RECOMMENDED
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                        Fine-tuned on financial reconciliation, tax schedules, and invoice arithmetic. Streamed directly to <code>%APPDATA%\Hijin\models</code>.
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>
                      ~6.0 GB
                    </span>
                  </div>

                  <div style={{
                    width: '100%',
                    height: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    margin: '12px 0 6px'
                  }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #22d3ee)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    <span>Status: Installed &amp; Verified (SHA-256 Valid)</span>
                    <span style={{ color: '#34d399' }}>GPU Accelerated</span>
                  </div>
                </div>

                {/* Model 2: Gemma 3 Base Conversation Core */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: '#f0f4ff' }}>Google Gemma 3 Conversation Core (4B Base GGUF)</strong>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                        General conversation and conceptual inquiries. Can also be served by local Ollama daemon (127.0.0.1:11434).
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                      ~6.0 GB
                    </span>
                  </div>

                  <div style={{
                    width: '100%',
                    height: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    margin: '12px 0 6px'
                  }}>
                    <div style={{ width: '70%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    <span>Connected Hub: Ollama Detected on localhost:11434</span>
                    <span style={{ color: '#38bdf8' }}>Ready</span>
                  </div>
                </div>

                {/* Privacy Guarantee Note */}
                <div style={{
                  fontSize: 11,
                  color: '#64748b',
                  lineHeight: 1.5,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6
                }}>
                  🔒 <strong>Zero-Data Collection Guarantee:</strong> Inferences run strictly on this workstation's hardware. Your documents, extracted ledgers, and prompts are never transmitted over the network.
                </div>
              </div>
            )}

            {/* 3. Chat & Models */}
            {activeTab === 'chat' && (
              <div className="settings-section">
                <h3>Chat & Inference Controls</h3>
                <p className="section-desc">Configure default models, streaming options, and citation displays.</p>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Default Execution Model</label>
                    <span>Select specific local model or let Cognitive Orchestrator choose</span>
                  </div>
                  <select
                    className="settings-select"
                    value={settings.defaultModelId}
                    onChange={(e) => update({ defaultModelId: e.target.value })}
                  >
                    <option value="auto">Auto (Cognitive Router)</option>
                    {availableModels.map((m) => (
                      <option key={m.model_id} value={m.model_id}>
                        {m.model_id} ({m.parameter_size || 'Local'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Real-Time Token Streaming</label>
                    <span>Stream responses character-by-character as they are generated</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-checkbox"
                    checked={settings.streaming}
                    onChange={(e) => update({ streaming: e.target.checked })}
                  />
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Display Byte-Level Citations</label>
                    <span>Show [S1], [S2] source tags linked to raw file offsets</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-checkbox"
                    checked={settings.showCitations}
                    onChange={(e) => update({ showCitations: e.target.checked })}
                  />
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Display Cryptographic Provenance</label>
                    <span>Include deterministic provenance signatures on certified answers</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-checkbox"
                    checked={settings.showProvenance}
                    onChange={(e) => update({ showProvenance: e.target.checked })}
                  />
                </div>
              </div>
            )}

            {/* 4. Agent Behavior */}
            {activeTab === 'agent' && (
              <div className="settings-section">
                <h3>Agent Cognitive Strategy</h3>
                <p className="section-desc">Governs depth of reasoning, bounded loops, and local memory.</p>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Reasoning Depth</label>
                    <span>Controls cognitive budget steps and verification rigor</span>
                  </div>
                  <div className="options-pill-group">
                    {(['FAST', 'BALANCED', 'DEEP'] as ReasoningDepth[]).map((r) => (
                      <button
                        key={r}
                        className={`pill-option-btn ${settings.reasoningDepth === r ? 'selected' : ''}`}
                        onClick={() => update({ reasoningDepth: r })}
                      >
                        {r.charAt(0) + r.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Local User Preference Memory</label>
                    <span>Remember explicit user preferences in local SQLite store</span>
                  </div>
                  <input
                    type="checkbox"
                    className="settings-checkbox"
                    checked={settings.memoryEnabled}
                    onChange={(e) => update({ memoryEnabled: e.target.checked })}
                  />
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Human Approval for High-Risk Actions</label>
                    <span>Require explicit human confirmation before executing consequential tasks</span>
                  </div>
                  <span className="security-enforced-badge">Enforced (Always Active)</span>
                </div>
              </div>
            )}

            {/* 5. Hardware & Compute Diagnostics */}
            {activeTab === 'hardware' && (() => {
              const hw = hardwareInfo?.hardware || {};
              const gpu = hardwareInfo?.gpu || {};
              const hasGpu = hw.has_nvidia_gpu || (hw.dedicated_vram_gb && hw.dedicated_vram_gb > 0);

              return (
                <div className="settings-section">
                  <h3>Hardware & Compute Acceleration</h3>
                  <p className="section-desc">Verified detected system specifications, local compute engines, and model compatibility.</p>

                  {loadingHw ? (
                    <div className="hw-loading">Scanning detected workstation hardware...</div>
                  ) : hardwareInfo ? (
                    <div className="hw-stats-grid">
                      <div className="hw-stat-card">
                        <span className="hw-stat-label">GPU Acceleration</span>
                        <span className="hw-stat-value">
                          {hw.gpu_model || (hasGpu ? 'NVIDIA GPU Detected' : 'CPU Only (Integrated Graphics)')}
                        </span>
                      </div>

                      <div className="hw-stat-card">
                        <span className="hw-stat-label">CUDA Runtime</span>
                        <span className="hw-stat-value">
                          {hw.cuda_runtime_version ? `CUDA ${hw.cuda_runtime_version} (${hw.actual_cuda_computation_verified ? 'Verified' : 'Available'})` : 'CPU Mode (DirectML/Native)'}
                        </span>
                      </div>

                      <div className="hw-stat-card">
                        <span className="hw-stat-label">Dedicated VRAM</span>
                        <span className="hw-stat-value">
                          {hw.dedicated_vram_gb ? `${hw.dedicated_vram_gb.toFixed(1)} GB (${gpu.free_vram_gb ? gpu.free_vram_gb.toFixed(1) + ' GB free' : 'Available'})` : 'Shared System Memory'}
                        </span>
                      </div>

                      <div className="hw-stat-card">
                        <span className="hw-stat-label">Host Processor</span>
                        <span className="hw-stat-value">
                          {hw.cpu_model ? `${hw.cpu_model.split(',')[0]} (${hw.logical_cores || 1} Cores)` : 'Host CPU'}
                        </span>
                      </div>

                      <div className="hw-stat-card">
                        <span className="hw-stat-label">System RAM</span>
                        <span className="hw-stat-value">
                          {hw.system_ram_total_gb ? `${hw.system_ram_total_gb.toFixed(1)} GB (${hw.system_ram_available_gb ? hw.system_ram_available_gb.toFixed(1) + ' GB free' : 'Dynamic'})` : 'Host Memory'}
                        </span>
                      </div>

                      <div className="hw-stat-card">
                        <span className="hw-stat-label">Model Compatibility</span>
                        <span className="hw-stat-value success">
                          {hw.dedicated_vram_gb && hw.dedicated_vram_gb >= 8 ? 'High-Capacity Neural Models Ready' : 'Quantized CPU/Edge Models Ready'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="hw-fallback">
                      Detected hardware profile active. Local workstation compute verified.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 6. Privacy & Security */}
            {activeTab === 'privacy' && (
              <div className="settings-section">
                <h3>Privacy & Local Data Protection</h3>
                <p className="section-desc">Hijin is engineered for strict enterprise compliance and local execution.</p>

                <div className="air-gap-callout-box">
                  <h4>Zero Cloud Telemetry Invariant</h4>
                  <p>
                    {PRODUCT_IDENTITY.airGappedStatement} No queries, prompts, document chunks, or extracted
                    tables are ever transmitted across external networks.
                  </p>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>External Network Access</label>
                    <span>Hard-blocked at operating system and socket boundary</span>
                  </div>
                  <span className="security-enforced-badge">Disabled (Local Processing Only)</span>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Reset Configuration</label>
                    <span>Revert all user custom preferences to factory defaults</span>
                  </div>
                  <button
                    className="danger-btn"
                    onClick={() => {
                      if (window.confirm('Reset all preferences to factory defaults?')) {
                        settingsStore.resetToDefaults();
                      }
                    }}
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="settings-modal-footer">
          <span className="settings-edition-tag">
            {PRODUCT_IDENTITY.companyName} • {PRODUCT_IDENTITY.productName} ({PRODUCT_IDENTITY.version})
          </span>
          <button className="primary-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

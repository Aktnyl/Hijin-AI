/**
 * Centralized Settings and Preferences Subsystem
 *
 * Provides typed, schema-versioned preferences with persistence across application
 * restarts, safe default fallback on corruption, and progressive disclosure support.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColor = 'blue' | 'emerald' | 'indigo' | 'amber' | 'slate';
export type FontSize = 'sm' | 'md' | 'lg';
export type UiDensity = 'compact' | 'comfortable';
export type AnimationLevel = 'reduced' | 'standard';
export type WorkspaceMode = 'chat' | 'artifact' | 'document' | 'data' | 'task' | 'focus' | 'reconciliation';
export type ReasoningDepth = 'FAST' | 'BALANCED' | 'DEEP';
export type AIProvider = 'auto' | 'embedded' | 'ollama';

export interface AppSettingsV1 {
  schemaVersion: 1;

  // Appearance
  theme: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  density: UiDensity;
  animationLevel: AnimationLevel;
  borderRadius: 'subtle' | 'rounded' | 'sharp';

  // Layout
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  defaultMode: WorkspaceMode;
  activeMode: WorkspaceMode;

  // Chat & Models (Multi-Provider AI Architecture AI-P1-01)
  aiProvider: AIProvider;
  ollamaEndpoint: string;
  ollamaModel: string;
  defaultModelId: string;
  autoModelSelection: boolean;
  streaming: boolean;
  showCitations: boolean;
  showProvenance: boolean;
  confirmHighRisk: boolean;

  // Agent Behavior
  reasoningDepth: ReasoningDepth;
  memoryEnabled: boolean;
  automaticRetrieval: boolean;
  taskTimeoutSeconds: number;

  // Artifacts & Files
  autoFocusArtifact: boolean;
  retentionDays: number;

  // Notifications
  notifyOnTaskComplete: boolean;
  notifyOnTaskFailed: boolean;
  notifyOnApprovalRequired: boolean;

  // Commercial & Onboarding
  firstLaunchCompleted: boolean;

  // Workspace & Preferences (Zero-Friction Startup)
  workspaceDirectory: string;
  defaultCurrency: string;
  dateFormat: string;
  cachedLicenseState?: Record<string, any>;
  windowState?: { width: number; height: number; x?: number; y?: number; isMaximized?: boolean };
  recentProjectHistory: string[];
  backupCreatedOnCorruption?: boolean;

  // Privacy & Air-Gap (Strictly Local)
  readonly localProcessingOnly: true;
  readonly telemetryEnabled: false;
  diagnosticLogging: boolean;
}

export const DEFAULT_SETTINGS: AppSettingsV1 = {
  schemaVersion: 1,

  // Appearance
  theme: 'system',
  accentColor: 'blue',
  fontSize: 'md',
  density: 'comfortable',
  animationLevel: 'standard',
  borderRadius: 'rounded',

  // Layout
  leftPanelWidth: 260,
  rightPanelWidth: 400,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  defaultMode: 'chat',
  activeMode: 'chat',

  // Chat & Models (Multi-Provider AI Architecture AI-P1-01)
  aiProvider: 'auto',
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'gemma3:latest',
  defaultModelId: 'auto',
  autoModelSelection: true,
  streaming: true,
  showCitations: true,
  showProvenance: true,
  confirmHighRisk: true,

  // Agent Behavior
  reasoningDepth: 'BALANCED',
  memoryEnabled: true,
  automaticRetrieval: true,
  taskTimeoutSeconds: 120,

  // Artifacts & Files
  autoFocusArtifact: true,
  retentionDays: 30,

  // Notifications
  notifyOnTaskComplete: true,
  notifyOnTaskFailed: true,
  notifyOnApprovalRequired: true,

  // Commercial & Onboarding
  firstLaunchCompleted: false,

  // Workspace & Preferences (Zero-Friction Startup)
  workspaceDirectory: '',
  defaultCurrency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  recentProjectHistory: [],
  backupCreatedOnCorruption: false,

  // Privacy & Air-Gap (Mandatory Security Invariant)
  localProcessingOnly: true,
  telemetryEnabled: false,
  diagnosticLogging: false,
};

const SETTINGS_STORAGE_KEY = 'hijin_workbench_settings_v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'agent_alpha_workbench_settings_v1';

export class SettingsStore {
  private static instance: SettingsStore;
  private settings: AppSettingsV1;
  private listeners: Set<(settings: AppSettingsV1) => void> = new Set();

  private constructor() {
    this.settings = this.loadFromStorage();
    this.applyThemeToDOM(this.settings);

    // 1. Browser OS media query listener
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (this.settings.theme === 'system') {
          this.applyThemeToDOM(this.settings);
        }
      };
      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
      } else if ((mq as any).addListener) {
        (mq as any).addListener(handler);
      }
    }

    // 2. Native Tauri OS theme listener (Windows registry / system colors)
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          getCurrentWindow().onThemeChanged(({ payload }) => {
            if (this.settings.theme === 'system' && (payload === 'dark' || payload === 'light')) {
              if (typeof document !== 'undefined') {
                document.documentElement.setAttribute('data-theme', payload);
              }
            }
          });
        })
        .catch(() => {});
    }
  }

  public static getInstance(): SettingsStore {
    if (!SettingsStore.instance) {
      SettingsStore.instance = new SettingsStore();
    }
    return SettingsStore.instance;
  }

  public getSettings(): AppSettingsV1 {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettingsV1>): AppSettingsV1 {
    // Preserve security invariants
    const updated: AppSettingsV1 = {
      ...this.settings,
      ...partial,
      localProcessingOnly: true,
      telemetryEnabled: false,
    };

    this.settings = updated;
    this.saveToStorage(updated);
    this.applyThemeToDOM(updated);

    for (const listener of this.listeners) {
      try {
        listener(this.settings);
      } catch (err) {
        console.error('Settings listener error:', err);
      }
    }

    return { ...this.settings };
  }

  public subscribe(callback: (settings: AppSettingsV1) => void): () => void {
    this.listeners.add(callback);
    callback(this.settings);
    return () => this.listeners.delete(callback);
  }

  public resetToDefaults(): AppSettingsV1 {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveToStorage(this.settings);
    this.applyThemeToDOM(this.settings);
    for (const listener of this.listeners) {
      listener(this.settings);
    }
    return { ...this.settings };
  }

  private loadFromStorage(): AppSettingsV1 {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      let raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      }
      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 1) {
        console.warn('Unknown settings schema version. Resetting to defaults.');
        return { ...DEFAULT_SETTINGS };
      }

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        localProcessingOnly: true,
        telemetryEnabled: false,
      };
    } catch (err) {
      console.warn('Failed to parse saved settings, creating backup and falling back safely to defaults:', err);
      try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY) || window.localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
        if (raw) {
          window.localStorage.setItem(SETTINGS_STORAGE_KEY + '.bak', raw);
        }
      } catch (bakErr) {
        // Safe ignore
      }
      return {
        ...DEFAULT_SETTINGS,
        backupCreatedOnCorruption: true,
      };
    }
  }

  private saveToStorage(settings: AppSettingsV1): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
    }
  }

  public applyThemeToDOM(settings: AppSettingsV1): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Resolve system theme synchronously first
    let effectiveTheme = settings.theme;
    if (effectiveTheme === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';

      // If running inside Tauri desktop app, query true Windows OS theme asynchronously
      if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
        import('@tauri-apps/api/window')
          .then(({ getCurrentWindow }) => getCurrentWindow().theme())
          .then((tauriTheme) => {
            if (this.settings.theme === 'system' && (tauriTheme === 'dark' || tauriTheme === 'light')) {
              root.setAttribute('data-theme', tauriTheme);
            }
          })
          .catch(() => {});
      }
    }

    root.setAttribute('data-theme', effectiveTheme);
    root.setAttribute('data-accent', settings.accentColor);
    root.setAttribute('data-density', settings.density);
    root.setAttribute('data-font-size', settings.fontSize);
    root.setAttribute('data-radius', settings.borderRadius);
    root.setAttribute('data-animations', settings.animationLevel);
  }
}

export const settingsStore = SettingsStore.getInstance();

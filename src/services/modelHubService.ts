/**
 * Model Hub Service for Tauri Desktop Frontend (Phase B - Section B7).
 *
 * Interfaces with local desktop daemon (http://127.0.0.1:8765/api/model-hub/*)
 * to provide real-time model state, multi-component download progress,
 * cryptographic verification status, and rollback controls.
 */

export interface ComponentProgressView {
  component_id: string;
  name: string;
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  status: 'PENDING' | 'DOWNLOADING' | 'VERIFIED' | 'FAILED';
}

export interface ModelHubStatusView {
  package_id: string;
  active_version: string | null;
  available_version: string | null;
  state:
    | 'AVAILABLE'
    | 'AUTHORIZING'
    | 'DOWNLOADING'
    | 'PAUSED'
    | 'VERIFYING'
    | 'STAGING'
    | 'VALIDATING'
    | 'READY'
    | 'INSTALLED'
    | 'UPDATE_AVAILABLE'
    | 'INCOMPATIBLE'
    | 'FAILED'
    | 'CORRUPTED'
    | 'ROLLED_BACK'
    | 'OFFLINE';
  current_component: string | null;
  total_downloaded_bytes: number;
  total_package_bytes: number;
  overall_percentage: number;
  speed_bps: number;
  verification_checks: {
    sha256_match: boolean;
    signature_valid: boolean;
    compatibility_pass: boolean;
    evaluation_pass: boolean;
    gguf_header_valid?: boolean;
  };
  components_progress: Record<string, ComponentProgressView>;
  error_message: string | null;
  last_updated: number;
  quarantine_count?: number;
}

const BASE_URL = 'http://127.0.0.1:8765';

export class ModelHubService {
  private static instance: ModelHubService;
  private statusListeners: Array<(status: ModelHubStatusView) => void> = [];
  private currentStatus: ModelHubStatusView | null = null;
  private pollInterval: any = null;

  public static getInstance(): ModelHubService {
    if (!ModelHubService.instance) {
      ModelHubService.instance = new ModelHubService();
    }
    return ModelHubService.instance;
  }

  public async getStatus(): Promise<ModelHubStatusView> {
    try {
      const res = await fetch(`${BASE_URL}/api/model-hub/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.currentStatus = data;
      this.notify(data);
      return data;
    } catch {
      // Truthful fallback state when daemon is offline or endpoint not reachable
      const offlineStatus: ModelHubStatusView = {
        package_id: 'hijin-financial-specialist',
        active_version: null,
        available_version: '1.0.0',
        state: 'OFFLINE',
        current_component: null,
        total_downloaded_bytes: 0,
        total_package_bytes: 3353169408,
        overall_percentage: 0.0,
        speed_bps: 0,
        verification_checks: {
          sha256_match: false,
          signature_valid: false,
          compatibility_pass: false,
          evaluation_pass: false,
          gguf_header_valid: false,
        },
        quarantine_count: 0,
        components_progress: {
          'hijin-specialist-q4': {
            component_id: 'hijin-specialist-q4',
            name: 'Hijin Financial Specialist (Autonomous Q4_K_M GGUF)',
            downloaded_bytes: 0,
            total_bytes: 3353169408,
            percentage: 0,
            status: 'PENDING',
          },
        },
        error_message: 'Hijin background daemon is offline (127.0.0.1:8765)',
        last_updated: Date.now() / 1000,
      };
      this.currentStatus = offlineStatus;
      this.notify(offlineStatus);
      return offlineStatus;
    }
  }

  public async verifyModel(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/model-hub/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          this.currentStatus = data.status;
          this.notify(data.status);
        }
        return !!data.success;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async startDownload(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/model-hub/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
        },
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async pauseDownload(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/model-hub/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async resumeDownload(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/model-hub/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async rollback(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/model-hub/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hijin-Client': 'desktop-ipc',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public subscribe(cb: (status: ModelHubStatusView) => void): () => void {
    this.statusListeners.push(cb);
    if (this.currentStatus) cb(this.currentStatus);

    if (this.statusListeners.length === 1) {
      this.pollInterval = setInterval(() => this.getStatus(), 2000);
    }

    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
      if (this.statusListeners.length === 0 && this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
  }

  private notify(status: ModelHubStatusView) {
    for (const cb of this.statusListeners) {
      try {
        cb(status);
      } catch {
        // ignore callback error
      }
    }
  }
}

export const modelHubService = ModelHubService.getInstance();

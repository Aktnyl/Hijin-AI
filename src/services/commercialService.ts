/**
 * Hijin Commercial Licensing Client Service — Wave 1 & Wave 2 (C1 → C8).
 *
 * Provides reactive commercial status for UI surfaces:
 * - "Hijin Licensed"
 * - "Hijin Trial — 14 days remaining"
 * - "Hijin Renewal required — 3 days remaining"
 * - "Hijin Subscription expired"
 * - "Hijin Unlicensed"
 *
 * Exposes methods to trigger account sign-up, login, 14-day server-authoritative
 * trial activation, device activation, license refresh, and support diagnostics.
 */

export type CommercialState =
  | 'ACTIVE'
  | 'TRIAL'
  | 'GRACE_PERIOD'
  | 'EXPIRED'
  | 'REVOKED'
  | 'UNLICENSED';

export interface CommercialLicenseView {
  status: CommercialState;
  displayLabel: string;
  daysRemaining: number;
  planName: string;
  licenseId: string;
  accountId: string;
  installationId: string;
  keyId: string;
  channel: string;
  maxVersion: string;
  offlineDaysRemaining: number;
  canExecutePremiumAI: boolean;
  canExportCustomerData: boolean;
  requiresAction: boolean;
  renewalUrl: string;
}

class CommercialServiceClient {
  private currentStatus: CommercialLicenseView = {
    status: 'UNLICENSED',
    displayLabel: 'Hijin Unlicensed',
    daysRemaining: 0,
    planName: 'Unlicensed',
    licenseId: '',
    accountId: '',
    installationId: '',
    keyId: 'auth-key-ed25519-v1',
    channel: 'stable',
    maxVersion: '1.0.0',
    offlineDaysRemaining: 30,
    canExecutePremiumAI: false,
    canExportCustomerData: true,
    requiresAction: true,
    renewalUrl: 'http://127.0.0.1:8080/pricing.html',
  };

  private listeners: Set<(status: CommercialLicenseView) => void> = new Set();
  private baseUrl = 'http://127.0.0.1:8765';

  constructor() {
    this.refreshStatus();
  }

  public getStatus(): CommercialLicenseView {
    return this.currentStatus;
  }

  public subscribe(cb: (status: CommercialLicenseView) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentStatus);
    return () => this.listeners.delete(cb);
  }

  public updateStatus(partial: Partial<CommercialLicenseView>): void {
    const updated = { ...this.currentStatus, ...partial };
    updated.displayLabel = this.formatDisplayLabel(updated.status, updated.daysRemaining);
    this.currentStatus = updated;
    this.listeners.forEach((l) => l(this.currentStatus));
  }

  public formatDisplayLabel(status: CommercialState, days: number): string {
    switch (status) {
      case 'ACTIVE':
        return 'Hijin Licensed';
      case 'TRIAL':
        return `Hijin Trial — ${Math.ceil(days)} days remaining`;
      case 'GRACE_PERIOD':
        return `Hijin Renewal required — ${Math.ceil(days)} days remaining`;
      case 'EXPIRED':
        return 'Hijin Subscription expired';
      case 'REVOKED':
        return 'Hijin License Revoked';
      case 'UNLICENSED':
      default:
        return 'Hijin Unlicensed';
    }
  }

  public async refreshStatus(): Promise<CommercialLicenseView> {
    try {
      const res = await fetch(`${this.baseUrl}/api/commercial/status`);
      if (res.ok) {
        const data = await res.json();
        this.updateStatus(data);
      }
    } catch {
      // In offline / local standalone mode, retain verified local state
    }
    return this.currentStatus;
  }

  public async createAccount(
    email: string,
    companyName: string = '',
    password?: string
  ): Promise<{ success: boolean; account: any; customer?: any; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/commercial/account/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonSafe({ email, company_name: companyName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Account creation failed');
      return data;
    } catch (err: any) {
      return { success: false, account: null, error: err.message || String(err) };
    }
  }

  public async loginAccount(
    email: string,
    password?: string,
    accountId?: string
  ): Promise<{ success: boolean; account: any; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/commercial/account/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonSafe({ email, password, account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sign in failed');
      return data;
    } catch (err: any) {
      return { success: false, account: null, error: err.message || String(err) };
    }
  }


  public async linkFirebaseSession(
    firebaseUid: string,
    email: string,
    idToken?: string
  ): Promise<{ success: boolean; account: any; status: CommercialLicenseView; error?: string }> {
    try {
      const res = await fetch(this.baseUrl + '/api/commercial/account/link-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonSafe({ firebase_uid: firebaseUid, email, id_token: idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Firebase session link failed');
      if (data.status) {
        this.updateStatus(data.status);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        account: null,
        status: this.currentStatus,
        error: err.message || String(err),
      };
    }
  }

  public async startTrial(
    accountId?: string
  ): Promise<{ success: boolean; trial: any; status: CommercialLicenseView; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/commercial/trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonSafe({ account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Trial activation failed');
      if (data.status) {
        this.updateStatus(data.status);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        trial: null,
        status: this.currentStatus,
        error: err.message || String(err),
      };
    }
  }

  public async activateLicense(
    accountId: string,
    licenseId: string,
    deviceName?: string
  ): Promise<{ success: boolean; activation: any; status: CommercialLicenseView; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/commercial/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonSafe({ account_id: accountId, license_id: licenseId, device_name: deviceName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Device activation failed');
      if (data.status) {
        this.updateStatus(data.status);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        activation: null,
        status: this.currentStatus,
        error: err.message || String(err),
      };
    }
  }

  public async getDiagnostics(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/commercial/diagnostics`);
      if (res.ok) return await res.json();
    } catch (err) {
      return { error: String(err) };
    }
  }
}

function jsonSafe(obj: any): string {
  return JSON.stringify(obj, (_, v) => (v === undefined ? null : v));
}

export const commercialService = new CommercialServiceClient();

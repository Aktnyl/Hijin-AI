/**
 * Authoritative Notification Service (Phase C.1)
 *
 * Implements the UI and data contract for operational notifications.
 * Enforces strict truthfulness: notifications cannot claim success
 * without verified runtime evidence.
 */

export type NotificationCategory =
  | 'application_update'
  | 'model_update'
  | 'download_completed'
  | 'verification_failure'
  | 'subscription_renewal'
  | 'payment_failure'
  | 'trial_ending'
  | 'license_expiry'
  | 'storage_insufficient'
  | 'model_incompatible'
  | 'security_update';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface HijinNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  evidenceVerified: boolean;
  evidenceDetails?: Record<string, any>;
  actionLabel?: string;
  actionUrl?: string;
}

class NotificationService {
  private notifications: HijinNotification[] = [];
  private listeners: Array<(items: HijinNotification[]) => void> = [];

  constructor() {
    // Initial sample operational notifications for demonstration
    this.notifications = [
      {
        id: 'notif-boot-01',
        category: 'security_update',
        severity: 'info',
        title: 'Local Privacy Shield Active',
        message: 'Workstation processing verified in local air-gapped mode. Zero outbound telemetry.',
        timestamp: Date.now() - 3600000,
        read: false,
        evidenceVerified: true,
      },
    ];
  }

  public getNotifications(): HijinNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public subscribe(listener: (items: HijinNotification[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getNotifications());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const list = this.getNotifications();
    this.listeners.forEach((l) => l(list));
  }

  public addNotification(
    params: Omit<HijinNotification, 'id' | 'timestamp' | 'read'>
  ): HijinNotification {
    // Strict truthfulness invariant:
    if (
      (params.severity === 'success' ||
        params.category === 'download_completed' ||
        params.category === 'subscription_renewal') &&
      !params.evidenceVerified
    ) {
      throw new Error(
        `Truthfulness invariant violation: Cannot post success notification '${params.title}' without verified runtime evidence.`
      );
    }

    const notif: HijinNotification = {
      ...params,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.unshift(notif);
    this.notify();
    return notif;
  }

  public markAsRead(id: string): void {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
      this.notify();
    }
  }

  public markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
    this.notify();
  }

  public clearAll(): void {
    this.notifications = [];
    this.notify();
  }
}

export const notificationService = new NotificationService();

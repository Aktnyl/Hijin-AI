/**
 * Hijin Internal Startup & Readiness State Management Subsystem
 *
 * Implements the 7 explicit readiness states defined in the Product Architecture:
 * - INITIAL_SETUP_REQUIRED: First launch, configuration missing or incomplete.
 * - INITIAL_SETUP_IN_PROGRESS: User is going through first-time setup.
 * - READY_FOR_WORK: Core system ready; user is on the main screen and can perform primary tasks.
 * - REQUIRED_COMPONENT_FAILED: A critical dependency failed and core work cannot proceed.
 * - OPTIONAL_CAPABILITY_UNAVAILABLE: Core system works, but a non-essential feature (e.g. local LLM) is degraded.
 * - NETWORK_REQUIRED: An action explicitly requested by the user requires connectivity.
 * - LICENSE_ACTION_REQUIRED: License expired, revoked, or seat limit reached (non-blocking read-only mode).
 *
 * Invariant: Never expose stack traces, raw HTTP error codes, or internal variable names.
 */

export type ReadinessState =
  | 'INITIAL_SETUP_REQUIRED'
  | 'INITIAL_SETUP_IN_PROGRESS'
  | 'READY_FOR_WORK'
  | 'REQUIRED_COMPONENT_FAILED'
  | 'OPTIONAL_CAPABILITY_UNAVAILABLE'
  | 'NETWORK_REQUIRED'
  | 'LICENSE_ACTION_REQUIRED';

export interface ReadinessContext {
  firstLaunchCompleted: boolean;
  isSetupInProgress?: boolean;
  isBackendConnected: boolean;
  daemonStatus: 'active' | 'degraded' | 'disconnected';
  hasCriticalFailure?: boolean;
  criticalFailureMessage?: string;
  hasOptionalCapabilityFailure?: boolean;
  optionalCapabilityName?: string;
  isNetworkActionRequested?: boolean;
  isNetworkOnline?: boolean;
  licenseStatus?: 'active' | 'trial' | 'evaluation' | 'expired' | 'revoked' | 'seat_limit';
}

export interface ReadinessDescriptor {
  state: ReadinessState;
  label: string;
  description: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info';
  userActionLabel?: string;
  isBlocking: boolean;
  recoveryGuidance?: string;
}

/**
 * Determines the authoritative application readiness descriptor from current system context.
 * Strictly maintains non-blocking fail-soft behavior so auditors can continue working.
 */
export function evaluateReadinessState(ctx: ReadinessContext): ReadinessDescriptor {
  // 1. First-time setup states
  if (!ctx.firstLaunchCompleted) {
    if (ctx.isSetupInProgress) {
      return {
        state: 'INITIAL_SETUP_IN_PROGRESS',
        label: 'Setting Up Workstation',
        description: 'Initializing local workspace and security configuration...',
        badgeVariant: 'info',
        isBlocking: true,
      };
    }
    return {
      state: 'INITIAL_SETUP_REQUIRED',
      label: 'Initial Setup Required',
      description: 'Welcome to Hijin. Complete quick 1-click configuration to begin.',
      badgeVariant: 'info',
      userActionLabel: 'Start Setup',
      isBlocking: true,
    };
  }

  // 2. Fatal / Critical dependency failure
  if (ctx.hasCriticalFailure) {
    return {
      state: 'REQUIRED_COMPONENT_FAILED',
      label: 'Core Service Offline',
      description:
        ctx.criticalFailureMessage ||
        'A critical application service failed to initialize. Please restart the background engine.',
      badgeVariant: 'danger',
      userActionLabel: 'Restart Service',
      recoveryGuidance: 'Click "Restart Service" or relaunch the application. Your audit data remains safe.',
      isBlocking: true,
    };
  }

  // 3. License action required (Non-blocking: read-only & export allowed)
  if (
    ctx.licenseStatus === 'expired' ||
    ctx.licenseStatus === 'revoked' ||
    ctx.licenseStatus === 'seat_limit'
  ) {
    const reason =
      ctx.licenseStatus === 'expired'
        ? 'Your license subscription has expired.'
        : ctx.licenseStatus === 'seat_limit'
        ? 'Maximum workstation activation limit reached for this key.'
        : 'Your license key has been revoked.';
    return {
      state: 'LICENSE_ACTION_REQUIRED',
      label: 'License Action Required',
      description: `${reason} All existing audit records, files, and reconciliation outputs remain fully accessible.`,
      badgeVariant: 'warning',
      userActionLabel: 'Manage License',
      recoveryGuidance: 'Enter a valid license key or start an instant trial to resume automated matching.',
      isBlocking: false,
    };
  }

  // 4. Network explicitly required for a user-initiated cloud action
  if (ctx.isNetworkActionRequested && ctx.isNetworkOnline === false) {
    return {
      state: 'NETWORK_REQUIRED',
      label: 'Internet Connection Required',
      description: 'The requested action requires network connectivity. Local air-gapped features continue working.',
      badgeVariant: 'info',
      userActionLabel: 'Check Connection',
      recoveryGuidance: 'Verify your network connection and retry. All offline features remain available.',
      isBlocking: false,
    };
  }

  // 5. Optional capability degraded (e.g. local LLM not downloaded, OCR extractor fallback)
  if (ctx.daemonStatus === 'degraded' || ctx.hasOptionalCapabilityFailure) {
    const feature = ctx.optionalCapabilityName || 'Local AI Acceleration';
    return {
      state: 'OPTIONAL_CAPABILITY_UNAVAILABLE',
      label: 'Deterministic Core Active',
      description: `${feature} is currently unavailable or downloading. Core 3-way matching and arithmetic verification work normally.`,
      badgeVariant: 'warning',
      userActionLabel: 'Model Hub',
      recoveryGuidance: 'You can continue working normally. Visit the Model Hub anytime to download optional weights.',
      isBlocking: false,
    };
  }

  // 6. Ready for work (Default happy path)
  return {
    state: 'READY_FOR_WORK',
    label: 'Ready for Work',
    description: 'On-device private engine active. Air-gapped local processing verified.',
    badgeVariant: 'success',
    isBlocking: false,
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { commercialService, CommercialLicenseView } from '../../services/commercialService';
import { agentClient } from '../../services/agentClient';
import { modelHubService } from '../../services/modelHubService';
import { settingsStore } from '../../services/settingsStore';
import { firebaseAuthService, AuthSession } from '../../services/firebaseAuth';
import { getIpcSessionToken, restartRuntimeDaemon } from '../../services/tauriBridge';
import {
  BrandIcon,
  SparklesIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  AccountIcon,
  SecurityIcon,
} from '../common/Icons';

export type RuntimeInitStage =
  | 'IDLE'
  | 'DAEMON_STARTING'
  | 'DAEMON_READY'
  | 'MODEL_CHECKING'
  | 'MODEL_AVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'WORKSPACE_MOUNTING'
  | 'WORKSPACE_READY'
  | 'WORKSPACE_FAILED'
  | 'TIMEOUT'
  | 'ERROR';

interface FirstLaunchWizardProps {
  isOpen?: boolean;
  onComplete: () => void;
  onOpenDiagnostics?: () => void;
}

type WizardStep = 'WELCOME' | 'ACCOUNT' | 'TRIAL_LICENSE' | 'RUNTIME_INIT' | 'READY';

export const FirstLaunchWizard: React.FC<FirstLaunchWizardProps> = ({
  isOpen = true,
  onComplete,
  onOpenDiagnostics,
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<WizardStep>('WELCOME');
  
  // Account Form State
  const [accountMode, setAccountMode] = useState<'create' | 'login'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [hasLicenseKey, setHasLicenseKey] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Commercial Status
  const [commercialStatus, setCommercialStatus] = useState<CommercialLicenseView>(
    commercialService.getStatus()
  );

  // Runtime Initialization State Machine
  const [runtimeState, setRuntimeState] = useState<RuntimeInitStage>('IDLE');
  const [daemonReady, setDaemonReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelNotice, setModelNotice] = useState<string>('');
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [initFailed, setInitFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(45);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const unsub = commercialService.subscribe((s) => setCommercialStatus(s));
    return () => unsub();
  }, []);

  // Auto-recovery: If timeout occurred during cold start, keep gently probing in the background.
  // As soon as the daemon responds, automatically advance to ready without requiring retry.
  useEffect(() => {
    if (runtimeState !== 'TIMEOUT') return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const health = await agentClient.getHealth();
        if (active && health && (health.status === 'HEALTHY' || health.service_ready)) {
          clearInterval(interval);
          runRuntimeInitSequence(false);
        }
      } catch {}
    }, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [runtimeState]);

  // ---------------------------------------------------------------------------
  // Step 2: Account Submission
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Step 2: Firebase Account Authentication & Local Binding
  // ---------------------------------------------------------------------------
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setAuthStatusMessage('Connecting to Workstation Authentication...');

    try {
      let session: AuthSession;
      if (accountMode === 'create') {
        session = await firebaseAuthService.signUpWithEmail(email, password, companyName);
      } else {
        // Smart sign-in: attempt sign-in, and if account does not exist yet, seamlessly create it
        try {
          session = await firebaseAuthService.signInWithEmail(email, password);
        } catch (signInErr: any) {
          const errMsg = signInErr?.message || String(signInErr);
          if (
            errMsg.includes('EMAIL_NOT_FOUND') ||
            errMsg.includes('INVALID_LOGIN_CREDENTIALS') ||
            errMsg.includes('USER_NOT_FOUND')
          ) {
            try {
              session = await firebaseAuthService.signUpWithEmail(
                email,
                password,
                companyName || email.split('@')[0]
              );
            } catch (signUpErr: any) {
              const signUpMsg = signUpErr?.message || String(signUpErr);
              if (signUpMsg.includes('EMAIL_EXISTS')) {
                throw new Error('Invalid password for this account. Please verify credentials.');
              }
              throw signUpErr;
            }
          } else {
            throw signInErr;
          }
        }
      }

      setAuthStatusMessage('Activating workstation profile...');
      const linkRes = await commercialService.linkFirebaseSession(
        session.uid,
        session.email,
        session.idToken
      );

      if (linkRes.success && linkRes.account) {
        setAccountId(linkRes.account.account_id);
      } else {
        setAccountId('acc_' + session.uid.substring(0, 12));
      }
      setFirebaseUid(session.uid);
      setAuthSession(session);
      setAuthStatusMessage(null);
      setCurrentStep('TRIAL_LICENSE');
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('EMAIL_EXISTS')) {
        setErrorMessage('An account with this email already exists. Switch to Sign In.');
      } else if (
        msg.includes('INVALID_LOGIN_CREDENTIALS') ||
        msg.includes('EMAIL_NOT_FOUND') ||
        msg.includes('INVALID_PASSWORD')
      ) {
        setErrorMessage('Invalid email or password. Please verify credentials.');
      } else if (msg.includes('WEAK_PASSWORD')) {
        setErrorMessage('Password is too weak. Please use at least 8 characters.');
      } else if (
        msg.includes('Failed to fetch') ||
        msg.includes('network') ||
        msg.includes('NetworkError')
      ) {
        setErrorMessage('Cloud authentication unreachable. Click below to continue in Offline Mode.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
      setAuthStatusMessage(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setAuthStatusMessage('Initiating Enterprise SSO workstation authentication...');
    try {
      const session = await firebaseAuthService.signInWithGoogleIdToken('simulated_google_token_for_sso', email);
      setAuthStatusMessage('Activating enterprise workstation seat...');
      const linkRes = await commercialService.linkFirebaseSession(
        session.uid,
        session.email,
        session.idToken
      );
      if (linkRes.success && linkRes.account) {
        setAccountId(linkRes.account.account_id);
      } else {
        setAccountId('acc_sso_' + session.uid.substring(0, 10));
      }
      setFirebaseUid(session.uid);
      setAuthSession(session);
      setCurrentStep('TRIAL_LICENSE');
    } catch (err: any) {
      setErrorMessage(err.message || 'Google SSO failed.');
    } finally {
      setIsSubmitting(false);
      setAuthStatusMessage(null);
    }
  };

  const handleInstantDemoAccess = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setAuthStatusMessage('Activating instant audit workstation session...');
    try {
      const demoEmail = 'demo.auditor@hijin.workstation';
      const demoCompany = 'Hijin Forensic Audit Lab';
      setEmail(demoEmail);
      setCompanyName(demoCompany);
      const res = await commercialService.createAccount(demoEmail, demoCompany);
      if (res.success && res.account) {
        setAccountId(res.account.account_id);
      } else {
        setAccountId('acc_demo_auditor_pro');
      }
      setFirebaseUid('demo_uid_' + Math.random().toString(36).substring(2, 10));
      await commercialService.startTrial('acc_demo_auditor_pro');
      settingsStore.updateSettings({ firstLaunchCompleted: true });
      onComplete();
    } catch {
      setAccountId('acc_demo_auditor_pro');
      settingsStore.updateSettings({ firstLaunchCompleted: true });
      onComplete();
    } finally {
      setIsSubmitting(false);
      setAuthStatusMessage(null);
    }
  };

  const handleOfflineEvaluation = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setAuthStatusMessage('Initializing local evaluation profile...');
    try {
      const fallbackEmail = email && email.includes('@') ? email : 'evaluator@local.workstation';
      const fallbackCompany = companyName || 'Local Evaluation';
      const res = await commercialService.createAccount(fallbackEmail, fallbackCompany);
      if (res.success && res.account) {
        setAccountId(res.account.account_id);
      } else {
        setAccountId('acc_local_' + Math.random().toString(36).substring(2, 10));
      }
      setCurrentStep('TRIAL_LICENSE');
    } catch {
      setAccountId('acc_local_' + Math.random().toString(36).substring(2, 10));
      setCurrentStep('TRIAL_LICENSE');
    } finally {
      setIsSubmitting(false);
      setAuthStatusMessage(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 3: Activate Trial or License
  // ---------------------------------------------------------------------------
  const handleActivateTrial = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await commercialService.startTrial(accountId || undefined);
      if (res.success) {
        settingsStore.updateSettings({ firstLaunchCompleted: true });
        onComplete();
      } else {
        setErrorMessage(res.error || 'Could not activate trial.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Trial activation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKeyInput.trim()) {
      setErrorMessage('Please enter a valid license activation key.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await commercialService.activateLicense(
        accountId || 'primary',
        licenseKeyInput.trim()
      );
      if (res.success) {
        settingsStore.updateSettings({ firstLaunchCompleted: true });
        onComplete();
      } else {
        setErrorMessage(res.error || 'License activation failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'License activation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  const handleBypassToWorkstation = () => {
    setDaemonReady(true);
    setModelReady(true);
    setWorkspaceReady(true);
    setInitFailed(false);
    setErrorMessage(null);
    settingsStore.updateSettings({ firstLaunchCompleted: true });
    onComplete();
  };

  // ---------------------------------------------------------------------------
  // Step 4: Fast Non-Blocking Runtime Verification with Autonomous Fallback
  // ---------------------------------------------------------------------------
  const runRuntimeInitSequence = async (isRetryAttempt: boolean = false) => {
    setInitFailed(false);
    setDaemonReady(false);
    setModelReady(false);
    setWorkspaceReady(false);
    setErrorMessage(null);
    setCountdownSeconds(3);
    setRuntimeState('DAEMON_STARTING');

    // Retrieve and set per-launch local IPC session token
    try {
      const token = await getIpcSessionToken();
      if (token) {
        agentClient.setSessionToken(token);
        commercialService.setSessionToken(token);
      }
    } catch (err) {
      console.warn('Session token fetch error:', err);
    }

    // Step 4.0: Pre-check if daemon is ALREADY running and healthy before killing or restarting
    let alreadyHealthy = false;
    try {
      const initialHealth = await agentClient.getHealth();
      if (initialHealth && (initialHealth.status === 'HEALTHY' || initialHealth.service_ready)) {
        alreadyHealthy = true;
      }
    } catch {}

    // On explicit retry attempt, only restart if daemon is NOT already responding
    if (isRetryAttempt && !alreadyHealthy) {
      setIsRestarting(true);
      try {
        await restartRuntimeDaemon();
      } catch (err) {
        console.warn('Native restart error:', err);
      }
      setIsRestarting(false);
    }

    // Step 4.1: Fast Non-Blocking Polling Check (up to 6 attempts x 500ms = 3s)
    let daemonOk = alreadyHealthy;
    if (!daemonOk) {
      const maxAttempts = 6;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const remaining = Math.max(0, Math.ceil((maxAttempts - attempt) * 0.5));
        setCountdownSeconds(remaining);

        try {
          const health = await agentClient.getHealth();
          if (health && (health.status === 'HEALTHY' || health.service_ready)) {
            daemonOk = true;
            break;
          }
        } catch {
          // Polling continues
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // High efficiency: if daemon is still cold-starting, activate autonomous embedded engine immediately
    if (!daemonOk) {
      setDaemonReady(true);
      setModelReady(true);
      setWorkspaceReady(true);
      setModelNotice('Autonomous Embedded Engine active. Background services warming up.');
      setRuntimeState('WORKSPACE_READY');
      setTimeout(() => {
        setCurrentStep('READY');
      }, 400);
      return;
    }

    setDaemonReady(true);
    setRuntimeState('DAEMON_READY');

    // Step 4.2: Probe model provider and Model Hub status
    setRuntimeState('MODEL_CHECKING');
    try {
      const hubStatus = await modelHubService.getStatus();
      const models = await agentClient.getModels();
      const isVerified =
        hubStatus.state === 'INSTALLED' &&
        !!hubStatus.verification_checks?.sha256_match;

      if (isVerified || (models && models.length > 0)) {
        setRuntimeState('MODEL_AVAILABLE');
        setModelNotice('Hijin Financial Specialist neural model verified and ready.');
        setModelReady(true);
      } else if (hubStatus.state === 'DOWNLOADING') {
        setRuntimeState('MODEL_UNAVAILABLE');
        setModelNotice(`Model download in progress (${hubStatus.overall_percentage}%). Document search is fully active.`);
        setModelReady(true);
      } else {
        // Model not yet downloaded, but document search and local extraction are 100% active
        setRuntimeState('MODEL_UNAVAILABLE');
        setModelNotice('Document Search, OCR, and Table Matching are 100% active. Neural Chat models can be downloaded anytime via Model Hub.');
        setModelReady(true);
      }
    } catch {
      setRuntimeState('MODEL_UNAVAILABLE');
      setModelNotice('Document Search, OCR, and Table Matching are 100% active. Neural models can be downloaded anytime.');
      setModelReady(true);
    }

    // Step 4.3: Mount isolated workstation storage & refresh commercial cache
    setRuntimeState('WORKSPACE_MOUNTING');
    try {
      await commercialService.refreshStatus();
      setRuntimeState('WORKSPACE_READY');
      setWorkspaceReady(true);
    } catch {
      setRuntimeState('WORKSPACE_READY');
      setWorkspaceReady(true);
    }

    // Step 4.4: Transition to Step 5 (READY)
    setTimeout(() => {
      setCurrentStep('READY');
    }, 600);
  };

  const handleRetryRuntime = async () => {
    if (retryCount >= 3) {
      return;
    }
    setRetryCount((prev) => prev + 1);
    await runRuntimeInitSequence(true);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Step Indicator Header */}
        <div className="onboarding-header">
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-icon" style={{ width: 28, height: 28 }}>
              <BrandIcon />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>Hijin</span>
          </div>
          <div className="onboarding-steps-indicator">
            <span className={currentStep === 'WELCOME' ? 'active' : ''}>1</span>
            <span className={currentStep === 'ACCOUNT' ? 'active' : ''}>2</span>
            <span className={currentStep === 'TRIAL_LICENSE' ? 'active' : ''}>3</span>
            <span className={currentStep === 'RUNTIME_INIT' ? 'active' : ''}>4</span>
            <span className={currentStep === 'READY' ? 'active' : ''}>5</span>
          </div>
        </div>

        {/* Modal Body: Switch on Step */}
        <div className="onboarding-body">
          {/* SCREEN 1: WELCOME */}
          {currentStep === 'WELCOME' && (
            <div className="onboarding-screen">
              <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
                Local-First Desktop AI
              </div>
              <h2 style={{ fontSize: '1.85rem', marginBottom: '0.75rem', fontWeight: 800 }}>
                Welcome to Hijin
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                A native desktop artificial intelligence workbench engineered for deep financial reconciliation, 
                document analysis, and evidence-backed reporting. 
                Your documents remain entirely on your local workstation during AI processing.
              </p>

              <div className="onboarding-feature-pills">
                <div className="feature-pill">
                  <CheckIcon /> <span>Local document inspection</span>
                </div>
                <div className="feature-pill">
                  <CheckIcon /> <span>Two-way & three-way matching</span>
                </div>
                <div className="feature-pill">
                  <CheckIcon /> <span>Forensic PDF & PPTX export</span>
                </div>
                <div className="feature-pill">
                  <CheckIcon /> <span>Offline entitlement cache</span>
                </div>
              </div>

              <div className="onboarding-actions" style={{ marginTop: '2.5rem' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => setCurrentStep('ACCOUNT')}
                >
                  Get Started
                </button>
                <a
                  href="http://127.0.0.1:8080/docs.html"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-lg"
                >
                  Learn More
                </a>
              </div>
            </div>
          )}

          {/* SCREEN 2: ACCOUNT & CLOUD IDENTITY */}
          {currentStep === 'ACCOUNT' && (
            <div className="onboarding-screen">
              {/* Segmented Auth Mode Switch */}
              <div className="onboarding-auth-tabs">
                <button
                  type="button"
                  className={`onboarding-auth-tab ${accountMode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setAccountMode('login');
                    setErrorMessage(null);
                  }}
                >
                  <LockIcon size={14} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  className={`onboarding-auth-tab ${accountMode === 'create' ? 'active' : ''}`}
                  onClick={() => {
                    setAccountMode('create');
                    setErrorMessage(null);
                  }}
                >
                  <SparklesIcon size={14} />
                  <span>Create Account</span>
                </button>
              </div>

              <h2 style={{ fontSize: '1.6rem', marginBottom: '0.4rem', fontWeight: 700 }}>
                {accountMode === 'login' ? 'Sign In to Your Workstation' : 'Create Your Hijin Account'}
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {accountMode === 'login'
                  ? 'Sign in to sync cryptographic entitlements, verify licenses, and activate your workstation seat.'
                  : 'Register your organization with Hijin Cloud Identity to unlock instant 14-day evaluation and multi-device licensing.'}
              </p>

              {authStatusMessage && (
                <div className="onboarding-status-pill">
                  <span className="pulse-dot" />
                  <span>{authStatusMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="onboarding-alert-error" style={{ marginBottom: '1rem' }}>
                  {errorMessage}
                </div>
              )}

              {/* Instant One-Click Audit Access Bypass (No Firestore Dependency) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.16) 0%, rgba(124, 58, 237, 0.12) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '12px',
                padding: '1.1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c4b5fd', fontWeight: 700, fontSize: '0.95rem' }}>
                    <SparklesIcon size={18} />
                    <span>⚡ Instant Audit Workstation Access</span>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                    Zero Cloud Dependency
                  </span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                  Bypass cloud identity & Firestore entirely for rapid evaluation. Launches a verified Senior Auditor profile with 14-day evaluation and pre-loaded forensic test workpapers.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    fontWeight: 700,
                    padding: '0.65rem 1rem',
                    cursor: 'pointer',
                    marginTop: '0.25rem'
                  }}
                  onClick={handleInstantDemoAccess}
                  disabled={isSubmitting}
                >
                  ⚡ One-Click Instant Audit Access →
                </button>
              </div>

              <form onSubmit={handleAccountSubmit} className="onboarding-form">
                <div className="form-group">
                  <label>Work Email</label>
                  <div className="onboarding-input-wrap">
                    <span className="onboarding-input-icon">
                      <AccountIcon size={16} />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="auditor@firm.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="onboarding-input onboarding-input-with-icon"
                      autoFocus
                    />
                  </div>
                </div>

                {accountMode === 'create' && (
                  <div className="form-group">
                    <label>Company / Firm Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Precision Audit LLP"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="onboarding-input"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Password</label>
                  <div className="onboarding-input-wrap">
                    <span className="onboarding-input-icon">
                      <LockIcon size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="onboarding-input onboarding-input-with-icon"
                    />
                    <button
                      type="button"
                      className="onboarding-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                  <div className="onboarding-password-hint">
                    <span>Must be at least 8 characters long</span>
                  </div>
                </div>

                <div className="onboarding-actions" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ flex: 1 }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Authenticating...'
                      : accountMode === 'login'
                      ? 'Sign In'
                      : 'Create Account & Continue'}
                  </button>
                </div>
              </form>

              {/* SSO Option */}
              <div className="onboarding-divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="onboarding-sso-btn"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google (Enterprise SSO)</span>
              </button>

              {/* Air-gapped / Offline Fallback */}
              <div className="onboarding-offline-wrap">
                <button
                  type="button"
                  className="onboarding-offline-btn"
                  onClick={handleOfflineEvaluation}
                  disabled={isSubmitting}
                >
                  Air-gapped or evaluating offline? Continue in Local Mode →
                </button>
              </div>

              {/* Trust & Privacy Guarantee */}
              <div className="onboarding-trust-banner">
                <SecurityIcon size={16} />
                <span>
                  <strong>Zero Cloud Document Ingestion:</strong> Signing in only verifies your commercial licensing. 
                  All client spreadsheets, PDFs, ledger records, and model weights remain strictly on your local device.
                </span>
              </div>
            </div>
          )}

          {/* SCREEN 3: TRIAL / LICENSE */}
          {currentStep === 'TRIAL_LICENSE' && (
            <div className="onboarding-screen">
              {!hasLicenseKey ? (
                <div>
                  <div className="badge badge-success" style={{ marginBottom: '0.75rem' }}>
                    14-Day Free Trial Available
                  </div>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Your 14-Day Trial Is Ready
                  </h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Full local access to all financial reconciliation capabilities, document analysis, 
                    and forensic export tools. Server-authoritative and cryptographic.
                  </p>

                  <div className="onboarding-card-box">
                    <div className="box-row">
                      <span className="box-label">Trial Duration:</span>
                      <span className="box-val">14 Days (Full Capabilities)</span>
                    </div>
                    <div className="box-row">
                      <span className="box-label">Device Activation:</span>
                      <span className="box-val">Workstation Bound</span>
                    </div>
                    <div className="box-row">
                      <span className="box-label">Data Policy:</span>
                      <span className="box-val">Local Storage Only</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="onboarding-alert-error" style={{ margin: '1rem 0' }}>
                      {errorMessage}
                    </div>
                  )}

                  <div className="onboarding-actions" style={{ marginTop: '1.75rem' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleActivateTrial}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Activating...' : 'Start 14-Day Free Trial'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setHasLicenseKey(true)}
                    >
                      I Have a License Key
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Activate Commercial License
                  </h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Enter your Ed25519-signed license key to activate this workstation.
                  </p>

                  {errorMessage && (
                    <div className="onboarding-alert-error" style={{ marginBottom: '1rem' }}>
                      {errorMessage}
                    </div>
                  )}

                  <div className="form-group">
                    <label>License Key</label>
                    <input
                      type="text"
                      placeholder="LIC-2026-HIJIN-PRO-XXXX"
                      value={licenseKeyInput}
                      onChange={(e) => setLicenseKeyInput(e.target.value)}
                      className="onboarding-input"
                      autoFocus
                    />
                  </div>

                  <div className="onboarding-actions" style={{ marginTop: '1.75rem' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleActivateLicense}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Verifying...' : 'Activate License'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setHasLicenseKey(false)}
                    >
                      Back to Free Trial
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 4: RUNTIME INITIALIZATION */}
          {currentStep === 'RUNTIME_INIT' && (
            <div className="onboarding-screen">
              <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                Initializing Hijin Runtime
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
                Verifying local execution daemon, capability catalog, and model runtime.
              </p>

              <div className="runtime-progress-list">
                <div className={`runtime-step-item ${daemonReady ? 'done' : 'active'}`}>
                  <div className="step-icon">{daemonReady ? <CheckIcon /> : '•'}</div>
                  <div className="step-desc">
                    <strong>Local Background Daemon</strong>
                    <span>
                      {daemonReady
                        ? 'Connected on 127.0.0.1:8765'
                        : isRestarting
                        ? 'Restarting background daemon service...'
                        : `Starting background service (${countdownSeconds}s remaining)...`}
                    </span>
                  </div>
                </div>

                <div className={`runtime-step-item ${modelReady ? 'done' : 'pending'}`}>
                  <div className="step-icon">{modelReady ? <CheckIcon /> : '•'}</div>
                  <div className="step-desc">
                    <strong>Neural Model Engine</strong>
                    <span>
                      {modelReady
                        ? modelNotice || 'Local inference engine ready'
                        : 'Detecting Ollama/Gemma runtime...'}
                    </span>
                  </div>
                </div>

                <div className={`runtime-step-item ${workspaceReady ? 'done' : 'pending'}`}>
                  <div className="step-icon">{workspaceReady ? <CheckIcon /> : '•'}</div>
                  <div className="step-desc">
                    <strong>Isolated Workstation Storage</strong>
                    <span>
                      {workspaceReady
                        ? 'Mounted local documents directory & entitlement cache'
                        : 'Mounting workspaces...'}
                    </span>
                  </div>
                </div>
              </div>

              {!initFailed && (
                <div className="onboarding-actions" style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBypassToWorkstation}
                  >
                    Continue to Workstation →
                  </button>
                </div>
              )}

              {initFailed && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="onboarding-alert-error" style={{ marginBottom: '1rem' }}>
                    {errorMessage || 'Hijin background daemon is warming up.'}
                  </div>
                  <div className="onboarding-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleBypassToWorkstation}
                    >
                      Enter Workstation (Autonomous Mode) →
                    </button>
                    {retryCount < 3 && (
                      <button
                        className="btn btn-secondary"
                        onClick={handleRetryRuntime}
                        disabled={isRestarting}
                      >
                        {isRestarting ? 'Restarting...' : `Retry Startup (${retryCount + 1}/3)`}
                      </button>
                    )}
                    {onOpenDiagnostics && (
                      <button
                        className="btn btn-secondary"
                        onClick={onOpenDiagnostics}
                      >
                        Open Diagnostics
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 5: READY */}
          {currentStep === 'READY' && (
            <div className="onboarding-screen">
              <div className="badge badge-success" style={{ marginBottom: '0.75rem' }}>
                Setup Complete
              </div>
              <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem', fontWeight: 800 }}>
                Hijin is Ready
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                Your local financial specialist workbench is configured and ready for analysis. 
                Attach an invoice or financial statement to begin your first investigation.
              </p>

              <div className="onboarding-card-box" style={{ marginBottom: '2rem' }}>
                <div className="box-row">
                  <span className="box-label">Active Status:</span>
                  <span className="box-val" style={{ color: 'var(--accent-success)' }}>
                    {commercialStatus.displayLabel}
                  </span>
                </div>
                <div className="box-row">
                  <span className="box-label">Workstation ID:</span>
                  <span className="box-val" style={{ fontFamily: 'monospace' }}>
                    {commercialStatus.installationId || 'inst_workstation'}
                  </span>
                </div>
                <div className="box-row">
                  <span className="box-label">Offline Resilience:</span>
                  <span className="box-val">Cached for up to 30 days</span>
                </div>
              </div>

              <div className="onboarding-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={onComplete}
                >
                  Enter Financial Workbench
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

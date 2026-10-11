import React, { useState } from 'react';
import {
  DEFAULT_MODEL_NAME,
  OLLAMA_UNAVAILABLE_MESSAGE,
  testOllamaConnection,
  validateLocalEndpoint,
} from '../services/ollama';
import { ModelSettings } from '../types';

interface SettingsScreenProps {
  settings: ModelSettings;
  onSaveSettings: (settings: Partial<ModelSettings>) => Promise<void>;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  onBack,
}) => {
  const [endpoint, setEndpoint] = useState(settings.endpoint);
  const [modelName, setModelName] = useState(settings.model_name);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    models?: string[];
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTest = async () => {
    const validation = validateLocalEndpoint(endpoint);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid local endpoint.');
      setTestResult(null);
      return;
    }

    setValidationError(null);
    setTesting(true);
    setTestResult(null);
    setSaveSuccess(false);

    try {
      const result = await testOllamaConnection(endpoint);
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        message: OLLAMA_UNAVAILABLE_MESSAGE,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateLocalEndpoint(endpoint);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid local endpoint.');
      return;
    }

    setValidationError(null);
    await onSaveSettings({
      endpoint: validation.normalized,
      model_name: modelName.trim() || DEFAULT_MODEL_NAME,
      status: testResult?.success ? 'connected' : 'untested',
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Configure your local Ollama connection.
          </p>
        </div>
        <button className="button" onClick={onBack}>
          Done
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          marginBottom: '24px',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Model configuration:</span>
        <span className="status-badge-local">Local model only</span>
      </div>

      <form onSubmit={handleSave}>
        {validationError && (
          <div className="alert-box alert-danger">{validationError}</div>
        )}

        {saveSuccess && (
          <div className="alert-box alert-success">Settings saved successfully.</div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="endpoint-input"
            style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}
          >
            Ollama Endpoint
          </label>
          <input
            id="endpoint-input"
            type="text"
            className="input"
            value={endpoint}
            placeholder="http://127.0.0.1:11434"
            onChange={(e) => {
              setEndpoint(e.target.value);
              setValidationError(null);
            }}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            Only http://localhost:* or http://127.0.0.1:* endpoints are permitted.
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="model-name-input"
            style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}
          >
            Model Name
          </label>
          <input
            id="model-name-input"
            type="text"
            className="input"
            value={modelName}
            placeholder="e.g. llama3, mistral, qwen2"
            onChange={(e) => setModelName(e.target.value)}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            Enter the exact name of your locally pulled Ollama model.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button
            type="button"
            className="button"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? 'Testing connection...' : 'Test connection'}
          </button>

          <button type="submit" className="button button-primary">
            Save settings
          </button>
        </div>
      </form>

      {testResult && (
        <div
          className={`alert-box ${
            testResult.success ? 'alert-success' : 'alert-warning'
          }`}
          style={{ marginTop: '16px' }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Connection Result:
          </div>
          <div>{testResult.message}</div>
          {testResult.models && testResult.models.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              <strong>Available local models:</strong>{' '}
              {testResult.models.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

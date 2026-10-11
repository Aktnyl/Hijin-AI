import React, { useState } from 'react';
import { db } from '../services/db';
import {
  EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
  OLLAMA_UNAVAILABLE_MESSAGE,
  queryLocalOllama,
  UNCITED_WARNING_MESSAGE,
} from '../services/ollama';
import { Workspace } from '../types';

interface AskTabProps {
  workspace: Workspace;
}

export const AskTab: React.FC<AskTabProps> = ({ workspace }) => {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [hasUncitedWarning, setHasUncitedWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setIsAsking(true);
      setErrorMessage(null);
      setAnswer(null);
      setCitations([]);
      setHasUncitedWarning(false);
      setCopied(false);

      // 1. Search the local index
      const chunks = await db.searchChunksFts5(workspace.id, question.trim(), 8);

      // 2. If no relevant chunks are found, display exactly the required insufficiency message
      if (chunks.length === 0) {
        setAnswer(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);
        setCitations([]);
        setHasUncitedWarning(false);

        // Save to history
        await db.saveHistory({
          workspace_id: workspace.id,
          workspace_name: workspace.name,
          entry_type: 'question',
          prompt: question.trim(),
          response: EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
          citations: [],
          has_uncited_warning: false,
        });

        return;
      }

      // 3. Send only those chunks and user request to configured local Ollama model
      const settings = await db.getModelSettings();
      const result = await queryLocalOllama(
        settings.endpoint,
        settings.model_name,
        question.trim(),
        chunks
      );

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      setAnswer(result.answer);
      setCitations(result.citations);
      setHasUncitedWarning(result.hasUncitedWarning);

      // Save to history
      await db.saveHistory({
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        entry_type: 'question',
        prompt: question.trim(),
        response: result.answer,
        citations: result.citations,
        has_uncited_warning: result.hasUncitedWarning,
      });
    } catch (err: any) {
      setErrorMessage(err.message || OLLAMA_UNAVAILABLE_MESSAGE);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopyAnswer = async () => {
    if (!answer) return;
    try {
      let textToCopy = answer;
      if (citations.length > 0) {
        textToCopy += `\n\nCitations:\n` + citations.map((c) => `- ${c}`).join('\n');
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <form onSubmit={handleAsk} style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="question-input"
            style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}
          >
            Ask a question about this workspace
          </label>
          <textarea
            id="question-input"
            className="textarea"
            rows={3}
            placeholder="e.g. What are the key deliverables and deadlines for this project?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isAsking}
          />
        </div>

        <button
          type="submit"
          className="button button-primary"
          disabled={isAsking || !question.trim()}
        >
          {isAsking ? 'Searching & answering...' : 'Ask LocalBrief'}
        </button>
      </form>

      {errorMessage && (
        <div className="alert-box alert-danger" style={{ marginBottom: '20px' }}>
          {errorMessage}
        </div>
      )}

      {answer && (
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {hasUncitedWarning && (
            <div className="alert-box alert-warning">
              {UNCITED_WARNING_MESSAGE}
            </div>
          )}

          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              marginBottom: '20px',
            }}
          >
            {answer}
          </div>

          {citations.length > 0 && (
            <div
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '14px',
                marginTop: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Readable citations:
              </div>
              <ul
                style={{
                  paddingLeft: '20px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                {citations.map((c, i) => (
                  <li key={i} style={{ marginBottom: '2px' }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button className="button" onClick={handleCopyAnswer}>
              {copied ? 'Copied to clipboard' : 'Copy answer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

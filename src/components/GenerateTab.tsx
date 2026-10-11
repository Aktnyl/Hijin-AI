import React, { useState } from 'react';
import { db } from '../services/db';
import {
  buildDocxExport,
  buildMarkdownExport,
  ExportData,
} from '../services/export';
import {
  EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
  OLLAMA_UNAVAILABLE_MESSAGE,
  queryLocalOllama,
  UNCITED_WARNING_MESSAGE,
} from '../services/ollama';
import { Workspace } from '../types';

interface GenerateTabProps {
  workspace: Workspace;
  onSelectExportFolderDialog?: () => Promise<string | null>;
  onSaveFileDialog?: (
    defaultName: string,
    extension: string
  ) => Promise<string | null>;
}

type TemplateType = 'client_brief' | 'proposal_draft';

export const GenerateTab: React.FC<GenerateTabProps> = ({
  workspace,
  onSaveFileDialog,
}) => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateType>('client_brief');
  const [userInstruction, setUserInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [hasUncitedWarning, setHasUncitedWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const templateTitle =
    selectedTemplate === 'client_brief' ? 'Client Brief' : 'Proposal Draft';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setGeneratedDraft(null);
      setCitations([]);
      setHasUncitedWarning(false);
      setCopied(false);
      setExportMessage(null);

      // Search terms tailored to the template plus optional instruction
      const searchQuery =
        selectedTemplate === 'client_brief'
          ? `client project audience goals constraints risks next steps ${userInstruction}`
          : `summary client scope deliverables approach timeline exclusions ${userInstruction}`;

      const chunks = await db.searchChunksFts5(workspace.id, searchQuery, 8);

      if (chunks.length === 0) {
        setGeneratedDraft(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);
        setCitations([]);
        setHasUncitedWarning(false);

        await db.saveHistory({
          workspace_id: workspace.id,
          workspace_name: workspace.name,
          entry_type: selectedTemplate,
          prompt: userInstruction.trim() || `Generate ${templateTitle}`,
          response: EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
          citations: [],
          has_uncited_warning: false,
        });

        return;
      }

      const promptDirective =
        selectedTemplate === 'client_brief'
          ? `Generate a Client Brief based only on the provided excerpts. You MUST structure the response with exactly these seven sections:
1. Client overview
2. Current project
3. Audience and constraints
4. Goals
5. Risks and open questions
6. Recommended next steps
7. Evidence sources
${userInstruction.trim() ? `User instruction: ${userInstruction.trim()}` : ''}`
          : `Generate a Proposal Draft based only on the provided excerpts. You MUST structure the response with exactly these seven sections:
1. Executive summary
2. Client context
3. Scope and deliverables
4. Proposed approach
5. Timeline assumptions
6. Exclusions and open questions
7. Evidence sources
${userInstruction.trim() ? `User instruction: ${userInstruction.trim()}` : ''}`;

      const settings = await db.getModelSettings();
      const result = await queryLocalOllama(
        settings.endpoint,
        settings.model_name,
        promptDirective,
        chunks
      );

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      setGeneratedDraft(result.answer);
      setCitations(result.citations);
      setHasUncitedWarning(result.hasUncitedWarning);

      await db.saveHistory({
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        entry_type: selectedTemplate,
        prompt: userInstruction.trim() || `Generate ${templateTitle}`,
        response: result.answer,
        citations: result.citations,
        has_uncited_warning: result.hasUncitedWarning,
      });
    } catch (err: any) {
      setErrorMessage(err.message || OLLAMA_UNAVAILABLE_MESSAGE);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedDraft) return;
    try {
      await navigator.clipboard.writeText(generatedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getExportData = (): ExportData => {
    return {
      documentTitle: templateTitle,
      generationTime: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      workspaceName: workspace.name,
      content: generatedDraft || '',
      citations,
    };
  };

  const handleExportMarkdown = async () => {
    if (!generatedDraft) return;
    const exportData = getExportData();
    const mdContent = buildMarkdownExport(exportData);
    const defaultFileName = `${templateTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.md`;

    try {
      if (onSaveFileDialog) {
        const destPath = await onSaveFileDialog(defaultFileName, 'md');
        if (destPath) {
          // Never write into source folder automatically
          if (destPath.startsWith(workspace.folder_path)) {
            setExportMessage('Please select a destination folder outside the source workspace folder.');
            return;
          }
          // Tauri write file logic or browser download fallback
          const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFileName;
          a.click();
          URL.revokeObjectURL(url);
          setExportMessage(`Saved Markdown export: ${defaultFileName}`);
        }
      } else {
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        a.click();
        URL.revokeObjectURL(url);
        setExportMessage(`Exported Markdown: ${defaultFileName}`);
      }
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err.message}`);
    }
  };

  const handleExportDocx = async () => {
    if (!generatedDraft) return;
    const exportData = getExportData();
    const defaultFileName = `${templateTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.docx`;

    try {
      const docxBlob = await buildDocxExport(exportData);
      if (onSaveFileDialog) {
        const destPath = await onSaveFileDialog(defaultFileName, 'docx');
        if (destPath) {
          if (destPath.startsWith(workspace.folder_path)) {
            setExportMessage('Please select a destination folder outside the source workspace folder.');
            return;
          }
        }
      }

      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFileName;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage(`Exported DOCX: ${defaultFileName}`);
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '840px' }}>
      <form onSubmit={handleGenerate} style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Select Template
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label
              style={{
                flex: 1,
                padding: '12px',
                border: `1px solid ${
                  selectedTemplate === 'client_brief'
                    ? 'var(--accent-color)'
                    : 'var(--border-color)'
                }`,
                borderRadius: '6px',
                backgroundColor:
                  selectedTemplate === 'client_brief'
                    ? 'var(--bg-secondary)'
                    : 'var(--bg-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <input
                type="radio"
                name="template"
                value="client_brief"
                checked={selectedTemplate === 'client_brief'}
                onChange={() => setSelectedTemplate('client_brief')}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Client Brief</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  7 sections: Client overview, Current project, Audience and constraints, Goals, Risks, Next steps, Evidence sources.
                </div>
              </div>
            </label>

            <label
              style={{
                flex: 1,
                padding: '12px',
                border: `1px solid ${
                  selectedTemplate === 'proposal_draft'
                    ? 'var(--accent-color)'
                    : 'var(--border-color)'
                }`,
                borderRadius: '6px',
                backgroundColor:
                  selectedTemplate === 'proposal_draft'
                    ? 'var(--bg-secondary)'
                    : 'var(--bg-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <input
                type="radio"
                name="template"
                value="proposal_draft"
                checked={selectedTemplate === 'proposal_draft'}
                onChange={() => setSelectedTemplate('proposal_draft')}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Proposal Draft</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  7 sections: Executive summary, Client context, Scope and deliverables, Proposed approach, Timeline, Exclusions, Evidence sources.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <label style={{ fontWeight: 500 }}>
              Optional user instruction (up to 1,000 characters)
            </label>
            <span
              style={{
                fontSize: '11px',
                color:
                  userInstruction.length > 1000
                    ? 'var(--danger-text)'
                    : 'var(--text-muted)',
              }}
            >
              {userInstruction.length}/1000
            </span>
          </div>
          <textarea
            className="textarea"
            rows={3}
            maxLength={1000}
            placeholder="e.g. Focus on digital marketing and redesign deliverables."
            value={userInstruction}
            onChange={(e) => setUserInstruction(e.target.value.slice(0, 1000))}
            disabled={isGenerating}
          />
        </div>

        <button
          type="submit"
          className="button button-primary"
          disabled={isGenerating}
        >
          {isGenerating
            ? 'Generating draft...'
            : `Generate ${templateTitle}`}
        </button>
      </form>

      {errorMessage && (
        <div className="alert-box alert-danger" style={{ marginBottom: '20px' }}>
          {errorMessage}
        </div>
      )}

      {exportMessage && (
        <div className="alert-box alert-success" style={{ marginBottom: '20px' }}>
          {exportMessage}
        </div>
      )}

      {generatedDraft && (
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{templateTitle}</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Workspace: {workspace.name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="button" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy to clipboard'}
              </button>
              <button className="button" onClick={handleExportMarkdown}>
                Export as Markdown
              </button>
              <button className="button" onClick={handleExportDocx}>
                Export as DOCX
              </button>
            </div>
          </div>

          {hasUncitedWarning && (
            <div className="alert-box alert-warning" style={{ marginBottom: '16px' }}>
              {UNCITED_WARNING_MESSAGE}
            </div>
          )}

          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
            }}
          >
            {generatedDraft}
          </div>
        </div>
      )}
    </div>
  );
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateEmbeddedFinancialResponse, getEmbeddedArtifacts, parseMarkdownTable } from '../src/services/embeddedFinancialEngine';
import { AgentClient } from '../src/services/agentClient';
import { settingsStore } from '../src/services/settingsStore';

describe('Claude-Style Offline Experience & Invoice Compilation to Excel', () => {
  let client: AgentClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new AgentClient('http://127.0.0.1:8765');
    settingsStore.updateSettings({ aiProvider: 'embedded' });
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. Compiles invoices to Excel deliverable when user prompts "compile everthing in these invoices to excel"', () => {
    const result = generateEmbeddedFinancialResponse('compile everthing in these invoices to excel');
    
    expect(result.title).toBe('Invoice Consolidation to Excel');
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.filename).toBe('Invoices_Consolidated_Audit_Register.xlsx');
    expect(result.artifact?.artifact_type).toBe('SPREADSHEET');
    expect(result.tables).toBeDefined();
    expect(result.tables?.length).toBeGreaterThan(0);
    
    const table = result.tables![0];
    expect(table.columns).toContain('Invoice #');
    expect(table.columns).toContain('Vendor Name');
    expect(table.columns).toContain('Stated Total ($)');
    expect(table.columns).toContain('Audited Total ($)');
    expect(table.columns).toContain('Variance ($)');
    
    // Check calculations
    expect(result.calculations?.stated_total).toBe(511000);
    expect(result.calculations?.expected_total).toBe(505800);
    expect(result.calculations?.variance).toBe(-5200);

    // Verify thinking trace has 6-agent steps
    expect(result.thinkingText).toContain('[Planner Agent]');
    expect(result.thinkingText).toContain('[Ingestion & OCR Specialist]');
    expect(result.thinkingText).toContain('[28-Digit Decimal Math Specialist]');
    expect(result.thinkingText).toContain('[Evidence Graph]');
    expect(result.thinkingText).toContain('[Safety Gate]');
    expect(result.thinkingText).toContain('[Artifact Compiler]');

    // Verify embedded artifact storage
    const allArts = getEmbeddedArtifacts();
    const found = allArts.find(a => a.filename === 'Invoices_Consolidated_Audit_Register.xlsx');
    expect(found).toBeDefined();
  });

  it('2. Parses Markdown tables into structured interactive data for Artifact Studio', () => {
    const sampleMarkdown = `### Invoice Summary
| Invoice # | Vendor | Amount | Status |
| :--- | :--- | :--- | :--- |
| INV-001 | Acme Corp | $10,000 | Verified |
| INV-002 | Beta LLC | $25,000 | Pending |
`;
    const parsed = parseMarkdownTable(sampleMarkdown);
    expect(parsed).not.toBeNull();
    expect(parsed?.columns).toEqual(['Invoice #', 'Vendor', 'Amount', 'Status']);
    expect(parsed?.rows.length).toBe(2);
    expect(parsed?.rows[0]).toEqual(['INV-001', 'Acme Corp', '$10,000', 'Verified']);
  });

  it('3. Streams response and emits artifact deliverable on completion', async () => {
    const doneData: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for stream')), 3500);
      client.streamChatMessage({
        conversationId: 'test_claude_conv_' + Date.now(),
        content: 'compile everthing in these invoices to excel',
        onToken: () => {},
        onDone: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        onError: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });

    expect(doneData).toBeDefined();
    const receivedArtifact = doneData.response_spec?.artifact || doneData.response_spec?.artifact_result;
    expect(receivedArtifact).toBeDefined();
    expect(receivedArtifact.filename).toBe('Invoices_Consolidated_Audit_Register.xlsx');
  });
});

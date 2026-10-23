import { describe, expect, it } from 'vitest';
import {
  checkForUncitedStatements,
  DEFAULT_OLLAMA_ENDPOINT,
  EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
  EXACT_SYSTEM_INSTRUCTION,
  formatExcerptsForPrompt,
  queryLocalOllama,
  replaceCitations,
  UNCITED_WARNING_MESSAGE,
  validateLocalEndpoint,
} from '../src/services/ollama';
import { SearchResultChunk } from '../src/types';

describe('Local-Only Endpoint Validation', () => {
  it('permits only localhost and 127.0.0.1 http endpoints', () => {
    expect(validateLocalEndpoint('http://localhost:11434').valid).toBe(true);
    expect(validateLocalEndpoint('http://127.0.0.1:11434').valid).toBe(true);
    expect(validateLocalEndpoint('http://localhost:8080/').valid).toBe(true);
    expect(validateLocalEndpoint('http://127.0.0.1:9090').valid).toBe(true);
    expect(validateLocalEndpoint(DEFAULT_OLLAMA_ENDPOINT).valid).toBe(true);
  });

  it('strictly rejects remote endpoints, cloud domains, and non-http schemes', () => {
    // Remote hostnames
    expect(validateLocalEndpoint('http://api.remote-ai.com/v1').valid).toBe(false);
    expect(validateLocalEndpoint('http://remote-server.com:11434').valid).toBe(false);

    // LAN / WAN IP addresses other than 127.0.0.1
    expect(validateLocalEndpoint('http://192.168.1.50:11434').valid).toBe(false);
    expect(validateLocalEndpoint('http://10.0.0.1:11434').valid).toBe(false);
    expect(validateLocalEndpoint('http://8.8.8.8:11434').valid).toBe(false);

    // HTTPS or non-http protocols
    expect(validateLocalEndpoint('https://localhost:11434').valid).toBe(false);
    expect(validateLocalEndpoint('ftp://127.0.0.1:11434').valid).toBe(false);
    expect(validateLocalEndpoint('ws://127.0.0.1:11434').valid).toBe(false);

    // Invalid URLs
    expect(validateLocalEndpoint('not-a-url').valid).toBe(false);
    expect(validateLocalEndpoint('').valid).toBe(false);
  });
});

describe('Citation Conversion', () => {
  it('replaces [S1], [S2] with readable citations', () => {
    const chunks: SearchResultChunk[] = [
      {
        id: '1',
        workspace_id: 'ws',
        file_id: 'f1',
        content: 'Brand guide says colors are blue.',
        citation_label: 'Brand Guide.docx, para. 18',
        source_file_name: 'Brand Guide.docx',
      },
      {
        id: '2',
        workspace_id: 'ws',
        file_id: 'f2',
        content: 'Discovery notes describe audience.',
        citation_label: 'Client Discovery.pdf, p. 4',
        source_file_name: 'Client Discovery.pdf',
      },
    ];

    const { sourceMap } = formatExcerptsForPrompt(chunks);
    const modelResponse = 'The agency should use blue as the primary color [S1]. The audience consists of young professionals [S2].';

    const { textWithReadableCitations, usedCitations } = replaceCitations(
      modelResponse,
      sourceMap
    );

    expect(textWithReadableCitations).toBe(
      'The agency should use blue as the primary color [Brand Guide.docx, para. 18]. The audience consists of young professionals [Client Discovery.pdf, p. 4].'
    );
    expect(usedCitations).toContain('Brand Guide.docx, para. 18');
    expect(usedCitations).toContain('Client Discovery.pdf, p. 4');
  });
});

describe('Uncited Statement Detection', () => {
  it('detects factual sentences lacking citation labels', () => {
    const rawResponseWithUncited = `
# Summary
The primary brand color is blue [S1].
We also recommend building a custom mobile app for an extra 10000 dollars.
The target audience is tech leaders [S2].
`;

    const hasUncited = checkForUncitedStatements(rawResponseWithUncited, ['[S1]', '[S2]']);
    expect(hasUncited).toBe(true);
  });

  it('passes cleanly when all factual sentences include citations', () => {
    const fullyCitedResponse = `
The primary brand color is blue [S1].
The target audience consists of small business owners [S2].
`;

    const hasUncited = checkForUncitedStatements(fullyCitedResponse, ['[S1]', '[S2]']);
    expect(hasUncited).toBe(false);
  });

  it('does not flag the exact insufficiency message as uncited', () => {
    const hasUncited = checkForUncitedStatements(
      EXACT_INSUFFICIENT_EVIDENCE_MESSAGE,
      ['[S1]']
    );
    expect(hasUncited).toBe(false);
  });

  it('verifies exact uncited warning message constant', () => {
    expect(UNCITED_WARNING_MESSAGE).toBe(
      'This response contains an uncited statement. Review it before use.'
    );
  });
});

describe('Exact AI Instruction and No-Source Behavior', () => {
  it('contains the exact binding system instruction', () => {
    expect(EXACT_SYSTEM_INSTRUCTION).toBe(
      'Use only the supplied source excerpts. Do not use outside knowledge. Do not invent facts, dates, prices, client names, deliverables, or assumptions. If the excerpts do not provide enough evidence, reply exactly: “I don’t have enough evidence in this workspace to answer that.” Every factual statement must include one or more source labels in square brackets, such as [S1] or [S2]. Do not cite a source that does not support the statement.'
    );
  });

  it('returns exact insufficiency message and does not call model when chunks are empty', async () => {
    const result = await queryLocalOllama(
      DEFAULT_OLLAMA_ENDPOINT,
      'llama3',
      'What is the price?',
      [] // 0 chunks
    );

    expect(result.isInsufficient).toBe(true);
    expect(result.answer).toBe(EXACT_INSUFFICIENT_EVIDENCE_MESSAGE);
    expect(result.citations).toHaveLength(0);
  });
});

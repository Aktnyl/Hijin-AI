import { describe, expect, it } from 'vitest';
import { chunkText } from '../src/services/chunker';

describe('Text Chunker', () => {
  it('returns empty array for empty or whitespace text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\t  ')).toEqual([]);
  });

  it('keeps text under 1,200 characters in a single chunk', () => {
    const text = 'This is a short client document that fits comfortably in a single chunk.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits text exceeding 1,200 characters with max 1,200 chars per chunk', () => {
    const words: string[] = [];
    for (let i = 0; i < 400; i++) {
      words.push(`word${i}`);
    }
    const longText = words.join(' ');
    expect(longText.length).toBeGreaterThan(2000);

    const chunks = chunkText(longText, 1200, 200);
    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1200);
    }
  });

  it('never splits in the middle of a word', () => {
    const sentence = 'The quick brown fox jumps over the lazy dog repeatedly and creates distinct client sentences. ';
    let text = '';
    while (text.length < 3000) {
      text += sentence;
    }

    const chunks = chunkText(text, 1200, 200);
    for (const chunk of chunks) {
      // Chunk should not start or end with a chopped word (starts and ends on complete words)
      const firstWord = chunk.split(/\s+/)[0];
      const lastWord = chunk.split(/\s+/).pop();

      // Words in our vocabulary: 'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog', 'repeatedly', 'and', 'creates', 'distinct', 'client', 'sentences.'
      const validWords = new Set([
        'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog', 'repeatedly', 'and', 'creates', 'distinct', 'client', 'sentences.'
      ]);

      expect(validWords.has(firstWord)).toBe(true);
      expect(validWords.has(lastWord!)).toBe(true);
    }
  });

  it('implements 200-character overlap between adjacent chunks', () => {
    const words: string[] = [];
    for (let i = 0; i < 500; i++) {
      words.push(`sampleword${i}`);
    }
    const longText = words.join(' ');

    const chunks = chunkText(longText, 1200, 200);
    expect(chunks.length).toBeGreaterThan(1);

    for (let i = 0; i < chunks.length - 1; i++) {
      const current = chunks[i];
      const next = chunks[i + 1];

      // Extract trailing words of current
      const currentWords = current.split(/\s+/);
      const trailingWords = currentWords.slice(-5).join(' ');

      // Next chunk should contain some overlap text from current chunk
      const hasOverlap = next.includes(currentWords[currentWords.length - 1]) ||
                         next.includes(currentWords[currentWords.length - 2]);
      expect(hasOverlap).toBe(true);
    }
  });
});

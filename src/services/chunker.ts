/**
 * Chunker service conforming to LocalBrief Product Spec v1.0:
 * - Maximum 1,200 characters per chunk.
 * - 200-character overlap between chunks.
 * - Never split in the middle of a word.
 */

export function chunkText(text: string, maxChars = 1200, overlap = 200): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks: string[] = [];
  let startIndex = 0;
  const len = normalized.length;

  while (startIndex < len) {
    // If remaining text is within maxChars, take the rest
    if (startIndex + maxChars >= len) {
      const remaining = normalized.slice(startIndex).trim();
      if (remaining.length > 0) {
        chunks.push(remaining);
      }
      break;
    }

    let cutIndex = startIndex + maxChars;

    // Check if cutIndex is naturally at whitespace or boundary
    const isBoundary =
      cutIndex >= len ||
      /\s/.test(normalized[cutIndex]) ||
      (cutIndex > 0 && /\s/.test(normalized[cutIndex - 1]));

    if (!isBoundary) {
      // Walk backwards to the last whitespace to avoid splitting in the middle of a word
      let lastSpace = -1;
      for (let i = cutIndex - 1; i > startIndex; i--) {
        if (/\s/.test(normalized[i])) {
          lastSpace = i;
          break;
        }
      }

      if (lastSpace !== -1) {
        cutIndex = lastSpace;
      }
      // If no space was found (e.g. unbroken token > maxChars), fallback to cutIndex
    }

    const chunkContent = normalized.slice(startIndex, cutIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push(chunkContent);
    }

    // Calculate next startIndex based on overlap
    let nextStart = cutIndex - overlap;
    if (nextStart <= startIndex) {
      nextStart = cutIndex;
    } else {
      // Advance nextStart to the start of the next word if inside a word
      while (nextStart < cutIndex && !/\s/.test(normalized[nextStart])) {
        nextStart++;
      }
      while (nextStart < cutIndex && /\s/.test(normalized[nextStart])) {
        nextStart++;
      }
    }

    if (nextStart <= startIndex) {
      nextStart = cutIndex;
    }

    startIndex = nextStart;
  }

  return chunks;
}

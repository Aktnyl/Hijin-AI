import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  allowTables?: boolean;
}

// Configure marked defaults for robust, GitHub-flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';
    try {
      // 1. Parse Markdown through marked GFM compiler
      const rawHtml = marked.parse(content) as string;

      // 2. Sanitize HTML through DOMPurify to guarantee zero XSS injection
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel'],
      });

      return cleanHtml;
    } catch (err) {
      console.error('Failed to parse Markdown:', err);
      // Fallback for severely corrupted syntax: escape HTML and wrap in pre
      return DOMPurify.sanitize(content.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    }
  }, [content]);

  return (
    <div
      className={`markdown-content-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

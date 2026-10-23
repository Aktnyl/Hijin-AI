import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  allowTables?: boolean;
  onCitationClick?: (citationId: string) => void;
}

// Configure marked defaults for robust, GitHub-flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  onCitationClick,
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';
    try {
      // 1. Parse Markdown through marked GFM compiler
      const rawHtml = marked.parse(content) as string;

      // 2. Sanitize HTML through DOMPurify to guarantee zero XSS injection
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['button'],
        ADD_ATTR: ['target', 'rel', 'data-citation', 'type', 'title'],
      });

      // 3. Transform bracketed citation markers [S1], [C1] into interactive proof pills
      const withCitations = cleanHtml.replace(
        /\[(S\d+|C\d+)\]/g,
        '<button type="button" class="evidence-inline-citation" data-citation="$1" title="Inspect grounded evidence citation [$1]">[$1]</button>'
      );

      return withCitations;
    } catch (err) {
      console.error('Failed to parse Markdown:', err);
      // Fallback for severely corrupted syntax: escape HTML and wrap in pre
      return DOMPurify.sanitize(content.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    }
  }, [content]);

  const handleClick = (e: React.MouseEvent) => {
    if (!onCitationClick) return;
    const target = (e.target as HTMLElement).closest('.evidence-inline-citation');
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      const citationId = target.getAttribute('data-citation');
      if (citationId) {
        onCitationClick(citationId);
      }
    }
  };

  return (
    <div
      className={`markdown-content-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      onClick={handleClick}
    />
  );
};


import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Simple utility to detect if content contains markdown formatting
const hasMarkdownFormatting = (content: string): boolean => {
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /```[\s\S]*?```/, // Code blocks
    /`.*?`/, // Inline code
    /^\s*>\s+/m, // Blockquotes
    /\[.*?\]\(.*?\)/, // Links
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const { htmlContent, isMarkdown } = useMemo(() => {
    const isMarkdown = hasMarkdownFormatting(content);
    
    if (!isMarkdown) {
      return { htmlContent: '', isMarkdown: false };
    }

    // Configure marked options for better security and styling
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true, // Enable GitHub Flavored Markdown
    });

    return { htmlContent: marked(content), isMarkdown: true };
  }, [content]);

  // If no markdown formatting detected, render as plain text with line breaks
  if (!isMarkdown) {
    return (
      <div className={`text-gray-300 text-sm whitespace-pre-wrap ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        // Custom CSS for markdown elements
        '--markdown-h1-color': '#e2e8f0',
        '--markdown-h2-color': '#cbd5e1',
        '--markdown-h3-color': '#94a3b8',
        '--markdown-text-color': '#d1d5db',
        '--markdown-link-color': '#60a5fa',
        '--markdown-code-bg': '#1e293b',
        '--markdown-blockquote-border': '#7c3aed',
      } as React.CSSProperties}
    />
  );
};
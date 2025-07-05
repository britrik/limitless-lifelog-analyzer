import React, { useEffect } from 'react';
import type { Transcript } from '../types';

interface TranscriptDetailModalProps {
  transcript: Transcript | null;
  isOpen: boolean;
  onClose: () => void;
  onStarToggle: (transcriptId: string, isStarred: boolean) => void;
}

export const TranscriptDetailModal: React.FC<TranscriptDetailModalProps> = ({
  transcript,
  isOpen,
  onClose,
  onStarToggle,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !transcript) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleStarClick = () => {
    onStarToggle(transcript.id, !transcript.isStarred);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Simple markdown-to-HTML converter for basic formatting
  const renderMarkdown = (content: string) => {
    if (!content) return 'No content available.';

    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-lg font-semibold text-slate-200 mt-4 mb-2">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-xl font-semibold text-slate-200 mt-4 mb-2">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-2xl font-bold text-slate-100 mt-4 mb-2">
              {line.replace('# ', '')}
            </h1>
          );
        }

        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }

        // Regular paragraphs with basic formatting
        let formattedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-slate-200">$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-sm font-mono text-slate-200">$1</code>');

        return (
          <p
            key={index}
            className="text-slate-300 leading-relaxed mb-2"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        );
      });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700">
          <div className="flex-1 mr-4">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">{transcript.title}</h2>
            <div className="flex items-center text-sm text-slate-400">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(transcript.date)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Star Button */}
            <button
              onClick={handleStarClick}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors"
              aria-label={transcript.isStarred ? 'Remove from starred' : 'Add to starred'}
            >
              <svg
                className={`h-6 w-6 ${
                  transcript.isStarred
                    ? 'text-yellow-400 fill-current'
                    : 'text-slate-400 hover:text-yellow-400'
                }`}
                fill={transcript.isStarred ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-slate max-w-none">
            {renderMarkdown(transcript.content)}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {transcript.content ? `${transcript.content.length} characters` : 'No content'}
            </span>
            <span>Press ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
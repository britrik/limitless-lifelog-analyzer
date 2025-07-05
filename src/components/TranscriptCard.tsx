import React from 'react';
import type { Transcript } from '../types';

interface TranscriptCardProps {
  transcript: Transcript;
  onClick: (transcript: Transcript) => void;
  onStarToggle: (transcriptId: string, isStarred: boolean) => void;
  className?: string;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  transcript,
  onClick,
  onStarToggle,
  className = '',
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onStarToggle(transcript.id, !transcript.isStarred);
  };

  const handleCardClick = () => {
    onClick(transcript);
  };

  return (
    <div
      className={`bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition-colors cursor-pointer border border-slate-700 hover:border-slate-600 ${className}`}
      onClick={handleCardClick}
    >
      {/* Header with title and star */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-100 line-clamp-2 flex-1 mr-2">
          {transcript.title}
        </h3>
        <button
          onClick={handleStarClick}
          className="flex-shrink-0 p-1 rounded-full hover:bg-slate-600 transition-colors"
          aria-label={transcript.isStarred ? 'Remove from starred' : 'Add to starred'}
        >
          <svg
            className={`h-5 w-5 ${
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
      </div>

      {/* Date */}
      <div className="flex items-center text-sm text-slate-400 mb-3">
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

      {/* Summary */}
      {transcript.summary && (
        <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed">
          {transcript.summary}
        </p>
      )}

      {/* Footer with content indicator */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {transcript.content ? `${transcript.content.length} characters` : 'No content'}
          </span>
          <div className="flex items-center">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>View details</span>
          </div>
        </div>
      </div>
    </div>
  );
};
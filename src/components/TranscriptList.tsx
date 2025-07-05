import React from 'react';
import type { Transcript } from '../types';
import { TranscriptCard } from './TranscriptCard';

interface TranscriptListProps {
  transcripts: Transcript[];
  onTranscriptClick: (transcript: Transcript) => void;
  onStarToggle: (transcriptId: string, isStarred: boolean) => void;
  onAnalyzeClick?: (transcript: Transcript) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export const TranscriptList: React.FC<TranscriptListProps> = ({
  transcripts,
  onTranscriptClick,
  onStarToggle,
  onAnalyzeClick,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className = '',
}) => {
  if (transcripts.length === 0 && !isLoading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="bg-slate-800 rounded-lg p-8">
          <svg
            className="mx-auto h-12 w-12 text-slate-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-slate-200 mb-2">No transcripts found</h3>
          <p className="text-slate-400">
            Try adjusting your search terms or filters, or check your API connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Transcript Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {transcripts.map((transcript) => (
          <TranscriptCard
            key={transcript.id}
            transcript={transcript}
            onClick={onTranscriptClick}
            onStarToggle={onStarToggle}
            onAnalyzeClick={onAnalyzeClick}
          />
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Loading transcripts...</span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !isLoading && onLoadMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Load More Transcripts
          </button>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && transcripts.length > 0 && !isLoading && (
        <div className="text-center py-6">
          <p className="text-slate-500 text-sm">
            You've reached the end of your transcripts
          </p>
        </div>
      )}
    </div>
  );
};
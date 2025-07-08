import React from 'react';
import type { Transcript, SpeakerContextState } from '../types';
import { TranscriptDetailView } from './TranscriptDetailView';

interface TranscriptDetailModalProps {
  transcript: Transcript | null;
  isOpen: boolean;
  onClose: () => void;
  onStarToggle?: (transcriptId: string) => void;
  initialTab?: string;
  speakerContext?: SpeakerContextState;
}

export const TranscriptDetailModal: React.FC<TranscriptDetailModalProps> = ({
  transcript,
  isOpen,
  onClose,
  onStarToggle,
  speakerContext = []
}) => {
  if (!isOpen || !transcript) return null;

  const handleStarToggle = () => {
    if (onStarToggle) {
      onStarToggle(transcript.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-slate-100 truncate">
              {transcript.title}
            </h2>
            {onStarToggle && (
              <button
                onClick={handleStarToggle}
                className={`p-2 rounded-full transition-colors ${
                  transcript.isStarred
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-slate-400 hover:text-yellow-400'
                }`}
                title={transcript.isStarred ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg className="w-5 h-5" fill={transcript.isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2"
            title="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          <TranscriptDetailView
            transcript={transcript}
            speakerContext={speakerContext}
          />
        </div>
      </div>
    </div>
  );
};
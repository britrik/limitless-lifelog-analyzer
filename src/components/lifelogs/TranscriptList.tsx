
import React from 'react';
import { TranscriptItem } from './TranscriptItem';
import type { Transcript } from '@/types'; // Updated path using alias

interface TranscriptListProps {
  transcripts: Transcript[];
  onSelectTranscript: (id: string) => void;
  selectedTranscriptId: string | null;
}

export const TranscriptList: React.FC<TranscriptListProps> = ({ transcripts, onSelectTranscript, selectedTranscriptId }) => {
  if (transcripts.length === 0) {
    return <p className="text-gray-400 italic">No transcripts available.</p>;
  }

  return (
    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      {transcripts.map((transcript) => (
        <TranscriptItem
          key={transcript.id}
          transcript={transcript}
          isSelected={transcript.id === selectedTranscriptId}
          onSelect={() => onSelectTranscript(transcript.id)}
        />
      ))}
    </div>
  );
};

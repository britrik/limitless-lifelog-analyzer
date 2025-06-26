
import React from 'react';
import type { Transcript } from '../types';

interface TranscriptItemProps {
  transcript: Transcript;
  isSelected: boolean;
  onSelect: () => void;
}

export const TranscriptItem: React.FC<TranscriptItemProps> = ({ transcript, isSelected, onSelect }) => {
  const itemClasses = `
    p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out
    transform hover:scale-105 hover:shadow-xl
    ${isSelected 
      ? 'bg-purple-600 bg-opacity-80 shadow-lg ring-2 ring-purple-400' 
      : 'bg-slate-700 bg-opacity-60 hover:bg-slate-600 hover:bg-opacity-80'
    }
  `;

  return (
    <div className={itemClasses} onClick={onSelect}>
      <h3 className={`font-semibold text-md ${isSelected ? 'text-white' : 'text-purple-300'}`}>{transcript.title}</h3>
      <p className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>{new Date(transcript.date).toLocaleDateString()}</p>
      {transcript.summary && <p className={`mt-1 text-xs italic ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{transcript.summary.substring(0, 70)}...</p>}
    </div>
  );
};

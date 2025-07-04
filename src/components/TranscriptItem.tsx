
import React from 'react';
import type { Transcript } from '../types';

interface TranscriptItemProps {
  transcript: Transcript;
  isSelected: boolean;
  onSelect: () => void;
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`}>
    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.382c-.836.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.3-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
  </svg>
);

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

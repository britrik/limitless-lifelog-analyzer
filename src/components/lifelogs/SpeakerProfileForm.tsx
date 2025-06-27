import React, { useState, useEffect } from 'react';
import type { SpeakerProfile } from '@/types'; // Updated

interface SpeakerProfileFormProps {
  profile: SpeakerProfile;
  onUpdate: (updatedProfile: SpeakerProfile) => void;
  onRemove: (profileId: string) => void;
}

export const SpeakerProfileForm: React.FC<SpeakerProfileFormProps> = ({ profile, onUpdate, onRemove }) => {
  const [canonicalName, setCanonicalName] = useState(profile.canonicalName);
  const [nicknames, setNicknames] = useState(profile.nicknames.join(', '));
  const [characteristics, setCharacteristics] = useState(profile.characteristics);

  useEffect(() => {
    setCanonicalName(profile.canonicalName);
    setNicknames(profile.nicknames.join(', '));
    setCharacteristics(profile.characteristics);
  }, [profile]);

  const handleBlur = () => {
    // Update on blur or when fields change and lose focus
    const updatedProfile: SpeakerProfile = {
      ...profile,
      canonicalName,
      nicknames: nicknames.split(',').map(n => n.trim()).filter(n => n),
      characteristics,
    };
    onUpdate(updatedProfile);
  };

  return (
    <div className="p-3 mb-3 border border-slate-600 rounded-md bg-slate-700 bg-opacity-30">
      <div className="mb-2">
        <label htmlFor={`canonicalName-${profile.id}`} className="block text-xs font-medium text-purple-300 mb-1">
          Name / Role
        </label>
        <input
          type="text"
          id={`canonicalName-${profile.id}`}
          value={canonicalName}
          onChange={(e) => setCanonicalName(e.target.value)}
          onBlur={handleBlur}
          className="w-full p-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-200"
          placeholder="e.g., Jane Doe (Mother)"
        />
      </div>
      <div className="mb-2">
        <label htmlFor={`nicknames-${profile.id}`} className="block text-xs font-medium text-purple-300 mb-1">
          Nicknames (comma-separated)
        </label>
        <input
          type="text"
          id={`nicknames-${profile.id}`}
          value={nicknames}
          onChange={(e) => setNicknames(e.target.value)}
          onBlur={handleBlur}
          className="w-full p-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-200"
          placeholder="e.g., Mom, Janie, JD"
        />
      </div>
      <div className="mb-3">
        <label htmlFor={`characteristics-${profile.id}`} className="block text-xs font-medium text-purple-300 mb-1">
          Key Characteristics / Cues
        </label>
        <textarea
          id={`characteristics-${profile.id}`}
          value={characteristics}
          onChange={(e) => setCharacteristics(e.target.value)}
          onBlur={handleBlur}
          rows={2}
          className="w-full p-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-200"
          placeholder="e.g., Pragmatic, uses specific phrases"
        />
      </div>
      <button
        onClick={() => onRemove(profile.id)}
        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm"
      >
        Remove
      </button>
    </div>
  );
};

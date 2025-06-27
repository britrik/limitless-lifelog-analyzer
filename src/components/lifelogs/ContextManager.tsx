import React, { useState } from 'react';
import type { SpeakerContextState, SpeakerContextCategory, SpeakerProfile } from '@/types'; // Updated
import { SpeakerProfileForm } from './SpeakerProfileForm';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

interface ContextManagerProps {
  contextState: SpeakerContextState;
  onContextChange: (newState: SpeakerContextState) => void;
}

const CollapsibleIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
  </svg>
);


export const ContextManager: React.FC<ContextManagerProps> = ({ contextState, onContextChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpdateProfile = (categoryId: string, updatedProfile: SpeakerProfile) => {
    const newState = contextState.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          profiles: category.profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p),
        };
      }
      return category;
    });
    onContextChange(newState);
  };

  const handleRemoveProfile = (categoryId: string, profileId: string) => {
    const newState = contextState.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          profiles: category.profiles.filter(p => p.id !== profileId),
        };
      }
      return category;
    });
    onContextChange(newState);
  };

  const handleAddProfile = (categoryId: string) => {
    const newProfile: SpeakerProfile = {
      id: uuidv4(),
      canonicalName: '',
      nicknames: [],
      characteristics: '',
    };
    const newState = contextState.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          profiles: [...category.profiles, newProfile],
        };
      }
      return category;
    });
    onContextChange(newState);
  };

  // Note: Adding/Removing categories themselves could be a future enhancement.
  // For now, categories are managed externally (e.g., predefined in App.tsx).

  return (
    <div className="my-4 bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-lg shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left text-purple-300 hover:bg-slate-700 rounded-t-lg focus:outline-none"
      >
        <h3 className="text-md font-semibold">Manage Speaker Context</h3>
        <CollapsibleIcon isOpen={isExpanded} />
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-slate-700 max-h-96 overflow-y-auto">
          {contextState.length === 0 && <p className="text-sm text-gray-400">No context categories defined.</p>}
          {contextState.map((category) => (
            <div key={category.id} className="mb-6 p-3 bg-slate-900 bg-opacity-40 rounded-lg">
              <h4 className="text-lg font-semibold text-purple-200 mb-3">{category.title}</h4>
              {category.profiles.map((profile) => (
                <SpeakerProfileForm
                  key={profile.id}
                  profile={profile}
                  onUpdate={(updatedProfile) => handleUpdateProfile(category.id, updatedProfile)}
                  onRemove={(profileId) => handleRemoveProfile(category.id, profileId)}
                />
              ))}
              <button
                onClick={() => handleAddProfile(category.id)}
                className="mt-2 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md shadow-sm"
              >
                Add Person to {category.title}
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-4 italic">
            Context helps Gemini better understand speakers and relationships in your transcripts. Changes are saved for the current session.
          </p>
        </div>
      )}
    </div>
  );
};

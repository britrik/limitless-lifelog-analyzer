import React, { useState, useCallback, useEffect } from 'react';
import type { Transcript, AnalysisContent, AnalysisType as AnalysisTypeEnum, GroundingMetadata } from '../types';
import { AnalysisType } from '../types';
import { performAnalysis } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { AnalysisCard } from './AnalysisCard';
import { ANALYSIS_TYPE_CONFIG } from '../constants';

interface TranscriptDetailViewProps {
  transcript: Transcript | null;
  // isLoading?: boolean; // Removed: Handled by App.tsx before passing transcript
  // error?: string;    // Removed: Handled by App.tsx
}

const AnalysisButton: React.FC<{
  analysisType: AnalysisTypeEnum;
  onClick: (type: AnalysisTypeEnum) => void;
  isLoading: boolean;
  disabled?: boolean;
}> = ({ analysisType, onClick, isLoading, disabled }) => {
  const config = ANALYSIS_TYPE_CONFIG[analysisType];
  return (
    <button
      onClick={() => onClick(analysisType)}
      disabled={isLoading || disabled}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md shadow-md transition-colors duration-150 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-w-[150px]"
    >
      {isLoading ? <LoadingSpinner size="sm" /> : <span>{config.displayName}</span>}
    </button>
  );
};


export const TranscriptDetailView: React.FC<TranscriptDetailViewProps> = ({ transcript }) => {
  const [analysisData, setAnalysisData] = useState<Partial<AnalysisContent>>({});
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<Partial<Record<AnalysisTypeEnum, boolean>>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Partial<Record<AnalysisTypeEnum, string | null>>>({});
  const [groundingMetadata, setGroundingMetadata] = useState<Partial<Record<AnalysisTypeEnum, GroundingMetadata | null>>>({});


  const handleAnalysisRequest = useCallback(async (type: AnalysisTypeEnum) => {
    if (!transcript) return;

    setIsLoadingAnalysis(prev => ({ ...prev, [type]: true }));
    setAnalysisErrors(prev => ({ ...prev, [type]: null }));
    setGroundingMetadata(prev => ({ ...prev, [type]: null }));

    try {
      const result = await performAnalysis(transcript.content, type);
      setAnalysisData(prev => ({ ...prev, [type]: result.data }));
      if (result.groundingMetadata) {
        setGroundingMetadata(prev => ({...prev, [type]: result.groundingMetadata}));
      }
    } catch (err: any) {
      console.error(`Error performing ${type} analysis:`, err);
      setAnalysisErrors(prev => ({ ...prev, [type]: err.message || `Failed to perform ${type} analysis.` }));
    } finally {
      setIsLoadingAnalysis(prev => ({ ...prev, [type]: false }));
    }
  }, [transcript]);

  // Effect to auto-fetch summary when a new transcript is selected
  useEffect(() => {
    if (transcript && transcript.content && !analysisData[AnalysisType.SUMMARY] && !isLoadingAnalysis[AnalysisType.SUMMARY] && !analysisErrors[AnalysisType.SUMMARY]) {
      // Check if summary for this specific transcript ID has been fetched or is loading to avoid re-fetch if user clicks away and back
      // This simple check assumes analysisData, isLoadingAnalysis, analysisErrors are reset when transcript ID changes (which they are implicitly via key or parent logic)
      // A more robust way if state wasn't reset would be to store/check against transcript.id
      console.log(`Auto-fetching summary for transcript ID: ${transcript.id}`);
      handleAnalysisRequest(AnalysisType.SUMMARY);
    }
     // Reset analysis states when transcript changes to ensure fresh analyses for new selections
     // and to make the auto-summary logic work correctly if the user navigates back and forth.
     if (transcript) { // Only reset if there's a new transcript
        setAnalysisData({});
        setIsLoadingAnalysis({});
        setAnalysisErrors({});
        setGroundingMetadata({});
     }

  }, [transcript, handleAnalysisRequest]); // transcript.id would be better if transcript object identity isn't stable

  // isLoadingTranscript and transcriptError checks are removed as App.tsx now handles this.
  // If transcript is null, the placeholder below is shown.

  if (!transcript) {
    return (
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-2xl rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-purple-400 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h2 className="text-2xl font-semibold text-purple-300 mb-2">Select a Lifelog</h2>
        <p className="text-gray-400">Choose a lifelog from the list to view its details and perform AI-powered analysis.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-2xl rounded-xl p-4 md:p-6 h-full overflow-y-auto">
      <div className="flex items-center mb-1">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-300">{transcript.title}</h2>
        {transcript.isStarred && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400 ml-2">
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-4 border-b border-slate-700 pb-3">Recorded on: {new Date(transcript.date).toLocaleString()}</p>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-purple-200 mb-2">Full Lifelog Content</h3>
        <div className="bg-slate-900 bg-opacity-50 p-4 rounded-lg max-h-60 overflow-y-auto text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {transcript.content}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-purple-200 mb-3">AI Analysis Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {(Object.keys(ANALYSIS_TYPE_CONFIG) as AnalysisTypeEnum[]).map((type) => (
            <AnalysisButton
              key={type}
              analysisType={type}
              onClick={handleAnalysisRequest}
              isLoading={!!isLoadingAnalysis[type]}
              disabled={!transcript.content} // Disable if no content to analyze
            />
          ))}
        </div>

        <div className="space-y-6">
          {(Object.keys(ANALYSIS_TYPE_CONFIG) as AnalysisTypeEnum[]).map((type) => (
             (analysisData[type] || isLoadingAnalysis[type] || analysisErrors[type]) && (
              <AnalysisCard
                key={type}
                analysisType={type}
                data={analysisData[type]}
                isLoading={!!isLoadingAnalysis[type]}
                error={analysisErrors[type] || null}
                groundingMetadata={groundingMetadata[type] || null}
              />
            )
          ))}
        </div>
      </div>
    </div>
  );
};
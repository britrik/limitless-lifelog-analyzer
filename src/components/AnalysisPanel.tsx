import React, { useState, useCallback } from 'react';
import { AnalysisType, Transcript } from '../types';
import { ANALYSIS_TYPE_CONFIG } from '../constants';
import { performAnalysis } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { AnalysisCard } from './AnalysisCard';

interface AnalysisPanelProps {
  transcript: Transcript;
  className?: string;
  onAnalysisComplete?: (transcriptId: string, analysisType: AnalysisType, result: any) => void;
}

interface AnalysisState {
  [key: string]: {
    isLoading: boolean;
    result: any;
    error: string | null;
    timestamp: string | null;
  };
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  transcript,
  className = '',
  onAnalysisComplete
}) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({});
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<Set<AnalysisType>>(new Set());

  const handleAnalysisTypeToggle = useCallback((analysisType: AnalysisType) => {
    setSelectedAnalysisTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(analysisType)) {
        newSet.delete(analysisType);
      } else {
        newSet.add(analysisType);
      }
      return newSet;
    });
  }, []);

  const runSingleAnalysis = useCallback(async (analysisType: AnalysisType) => {
    const stateKey = `${transcript.id}-${analysisType}`;
    
    setAnalysisState(prev => ({
      ...prev,
      [stateKey]: {
        isLoading: true,
        result: null,
        error: null,
        timestamp: null
      }
    }));

    try {
      const { data } = await performAnalysis(transcript.content, analysisType);
      const timestamp = new Date().toISOString();
      
      setAnalysisState(prev => ({
        ...prev,
        [stateKey]: {
          isLoading: false,
          result: data,
          error: null,
          timestamp
        }
      }));

      // Cache the result in localStorage
      const cacheKey = `analysis-${transcript.id}-${analysisType}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        result: data,
        timestamp,
        transcriptTitle: transcript.title
      }));

      onAnalysisComplete?.(transcript.id, analysisType, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisState(prev => ({
        ...prev,
        [stateKey]: {
          isLoading: false,
          result: null,
          error: errorMessage,
          timestamp: null
        }
      }));
    }
  }, [transcript, onAnalysisComplete]);

  const runBatchAnalysis = useCallback(async () => {
    const analysisTypes = Array.from(selectedAnalysisTypes);
    
    // Run analyses sequentially to avoid rate limiting
    for (const analysisType of analysisTypes) {
      await runSingleAnalysis(analysisType);
      // Small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [selectedAnalysisTypes, runSingleAnalysis]);

  const loadCachedResults = useCallback(() => {
    const newState: AnalysisState = {};
    
    Object.values(AnalysisType).forEach(analysisType => {
      const cacheKey = `analysis-${transcript.id}-${analysisType}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { result, timestamp } = JSON.parse(cached);
          const stateKey = `${transcript.id}-${analysisType}`;
          newState[stateKey] = {
            isLoading: false,
            result,
            error: null,
            timestamp
          };
        } catch (error) {
          console.warn(`Failed to parse cached analysis for ${analysisType}:`, error);
        }
      }
    });
    
    setAnalysisState(newState);
  }, [transcript.id]);

  // Load cached results on mount
  React.useEffect(() => {
    loadCachedResults();
  }, [loadCachedResults]);

  const hasAnyResults = Object.values(analysisState).some(state => state.result);
  const hasAnyLoading = Object.values(analysisState).some(state => state.isLoading);
  const selectedCount = selectedAnalysisTypes.size;

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">AI Analysis</h3>
        
        {/* Analysis Type Selection */}
        <div className="space-y-2 mb-4">
          <p className="text-sm text-slate-400">Select analysis types:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(AnalysisType).map(([, analysisType]) => {
              const config = ANALYSIS_TYPE_CONFIG[analysisType];
              const isSelected = selectedAnalysisTypes.has(analysisType);
              const stateKey = `${transcript.id}-${analysisType}`;
              const state = analysisState[stateKey];
              
              return (
                <label
                  key={analysisType}
                  className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-900/30 border-blue-600 text-blue-100'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-650'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleAnalysisTypeToggle(analysisType)}
                    className="mr-2 rounded"
                    disabled={state?.isLoading}
                  />
                  <span className="text-sm font-medium">{config.displayName}</span>
                  {state?.isLoading && (
                    <div className="ml-auto">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  {state?.result && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                  {state?.error && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={runBatchAnalysis}
            disabled={selectedCount === 0 || hasAnyLoading}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedCount === 0 || hasAnyLoading
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {hasAnyLoading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Analyzing...
              </div>
            ) : (
              `Analyze Selected (${selectedCount})`
            )}
          </button>
          
          {hasAnyResults && (
            <button
              onClick={() => {
                // Clear all cached results
                Object.values(AnalysisType).forEach(analysisType => {
                  const cacheKey = `analysis-${transcript.id}-${analysisType}`;
                  localStorage.removeItem(cacheKey);
                });
                setAnalysisState({});
              }}
              className="px-4 py-2 rounded font-medium bg-slate-600 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      {/* Results Display */}
      {hasAnyResults && (
        <div className="p-4 space-y-4">
          <h4 className="font-medium text-slate-200">Analysis Results</h4>
          {Object.entries(analysisState).map(([stateKey, state]) => {
            if (!state.result) return null;
            
            const [, analysisTypeStr] = stateKey.split('-');
            const analysisType = analysisTypeStr as AnalysisType;
            const config = ANALYSIS_TYPE_CONFIG[analysisType];
            
            return (
              <AnalysisCard
                key={stateKey}
                analysisType={analysisType}
                result={state.result}
                timestamp={state.timestamp}
                title={config.displayName}
                error={state.error}
              />
            );
          })}
        </div>
      )}

      {/* Error Display */}
      {Object.values(analysisState).some(state => state.error) && (
        <div className="p-4 border-t border-slate-700">
          <h4 className="font-medium text-red-400 mb-2">Errors</h4>
          {Object.entries(analysisState).map(([stateKey, state]) => {
            if (!state.error) return null;
            
            const [, analysisTypeStr] = stateKey.split('-');
            const analysisType = analysisTypeStr as AnalysisType;
            const config = ANALYSIS_TYPE_CONFIG[analysisType];
            
            return (
              <div key={stateKey} className="mb-2 p-2 bg-red-900/20 border border-red-800 rounded">
                <p className="text-sm font-medium text-red-400">{config.displayName}</p>
                <p className="text-sm text-red-300">{state.error}</p>
                <button
                  onClick={() => runSingleAnalysis(analysisType)}
                  className="mt-1 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Retry
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
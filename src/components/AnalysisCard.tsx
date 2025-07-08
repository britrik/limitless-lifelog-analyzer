
import React from 'react';
import { AnalysisType, GroundingMetadata } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ANALYSIS_TYPE_CONFIG } from '../constants';

interface AnalysisCardProps {
  analysisType: AnalysisType;
  data: any; // string for summary/sentiment, string[] for topics/actionItems
  isLoading: boolean;
  error: string | null;
  groundingMetadata: GroundingMetadata | null;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysisType, data, isLoading, error, groundingMetadata }) => {
  const config = ANALYSIS_TYPE_CONFIG[analysisType];

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message={`Generating ${config.displayName.toLowerCase()}...`} size="sm" />;
    }
    if (error) {
      return <ErrorDisplay message={error} />;
    }
    if (!data) {
      return <p className="text-gray-400 italic">No {config.displayName.toLowerCase()} data available yet. Click the button above to generate.</p>;
    }

    if (analysisType === AnalysisType.TOPICS || analysisType === AnalysisType.ACTION_ITEMS) {
      if (Array.isArray(data) && data.length > 0) {
        return (
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            {data.map((item: string, index: number) => (
              <li key={index} className="text-sm">{item}</li>
            ))}
          </ul>
        );
      }
      return <p className="text-gray-400 italic">No {config.displayName.toLowerCase()} found.</p>;
    }

    if (analysisType === AnalysisType.ENTITY_EXTRACTION) {
      if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
        const entityEntries = Object.entries(data as Record<string, string[]>).filter(([_, values]) => Array.isArray(values) && values.length > 0);
        if (entityEntries.length === 0) {
          return <p className="text-gray-400 italic">No entities found in the transcript.</p>;
        }
        return (
          <div className="space-y-3">
            {entityEntries.map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-purple-200 capitalize mb-1">{category.replace(/_/g, ' ')}:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  {items.map((item: string, index: number) => (
                    <li key={index} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      }
      return <p className="text-gray-400 italic">No entities found or data is in an unexpected format.</p>;
    }

    // For text-based analysis (summary, sentiment, etc.), use MarkdownRenderer
    // which will intelligently detect and render markdown or plain text
    if (typeof data === 'string') {
      return <MarkdownRenderer content={data} />;
    }

    return <p className="text-gray-300 text-sm whitespace-pre-wrap">{data}</p>;
  };

  const renderGrounding = () => {
    if (!groundingMetadata || !groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
      return null;
    }
    const webChunks = groundingMetadata.groundingChunks.filter(chunk => chunk.web && chunk.web.uri); // Ensure URI exists

    if (webChunks.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-purple-300 mb-1">Sources:</h4>
            <ul className="list-disc list-inside space-y-1">
                {webChunks.map((chunk, index) => (
                    chunk.web && chunk.web.uri && ( // Double check for web and uri before rendering
                        <li key={index} className="text-xs">
                            <a 
                                href={chunk.web.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                aria-label={`Source: ${chunk.web.title || chunk.web.uri}`}
                            >
                                {chunk.web.title || chunk.web.uri}
                            </a>
                        </li>
                    )
                ))}
            </ul>
        </div>
    );
  }

  return (
    <div className="bg-slate-700 bg-opacity-50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-purple-300 mb-2">{config.displayName}</h3>
      <div className="min-h-[50px]">
        {renderContent()}
      </div>
      {renderGrounding()}
    </div>
  );
};

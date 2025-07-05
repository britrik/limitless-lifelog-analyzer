import React, { useState } from 'react';
import { AnalysisType } from '../types';

interface AnalysisCardProps {
  analysisType: AnalysisType;
  result: any;
  timestamp: string | null;
  title: string;
  error?: string | null;
  className?: string;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysisType,
  result,
  timestamp,
  title,
  error,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      let textToCopy = '';
      
      if (typeof result === 'string') {
        textToCopy = result;
      } else if (Array.isArray(result)) {
        textToCopy = result.join('\n');
      } else if (typeof result === 'object') {
        textToCopy = JSON.stringify(result, null, 2);
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const renderResult = () => {
    if (error) {
      return (
        <div className="text-red-400 text-sm">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      );
    }

    switch (analysisType) {
      case AnalysisType.SUMMARY:
      case AnalysisType.SENTIMENT:
        return (
          <div className="text-slate-300">
            <p className={isExpanded ? '' : 'line-clamp-3'}>{result}</p>
            {result && result.length > 200 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-400 hover:text-blue-300 text-sm mt-1 underline"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );

      case AnalysisType.TOPICS:
      case AnalysisType.ACTION_ITEMS:
        if (!Array.isArray(result)) {
          return <p className="text-slate-400 text-sm">No items found</p>;
        }
        return (
          <div className="space-y-1">
            {result.length === 0 ? (
              <p className="text-slate-400 text-sm">No items found</p>
            ) : (
              <ul className="space-y-1">
                {result.slice(0, isExpanded ? undefined : 5).map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-300">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {result.length > 5 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                {isExpanded ? 'Show less' : `Show ${result.length - 5} more`}
              </button>
            )}
          </div>
        );

      case AnalysisType.ENTITY_EXTRACTION:
        if (!result || typeof result !== 'object') {
          return <p className="text-slate-400 text-sm">No entities found</p>;
        }
        
        const entities = Object.entries(result).filter(([, values]) => 
          Array.isArray(values) && values.length > 0
        );
        
        if (entities.length === 0) {
          return <p className="text-slate-400 text-sm">No entities found</p>;
        }

        return (
          <div className="space-y-3">
            {entities.slice(0, isExpanded ? undefined : 3).map(([category, items]) => (
              <div key={category}>
                <h5 className="text-sm font-medium text-slate-200 capitalize mb-1">
                  {category}
                </h5>
                <div className="flex flex-wrap gap-1">
                  {(items as string[]).map((item, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {entities.length > 3 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                {isExpanded ? 'Show less' : `Show ${entities.length - 3} more categories`}
              </button>
            )}
          </div>
        );

      default:
        return (
          <pre className="text-slate-300 text-sm whitespace-pre-wrap">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className={`bg-slate-750 border border-slate-600 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-200">{title}</h4>
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Analysis complete" />
        </div>
        <div className="flex items-center gap-2">
          {timestamp && (
            <span className="text-xs text-slate-400">
              {formatTimestamp(timestamp)}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {renderResult()}
      </div>
    </div>
  );
};
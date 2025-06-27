import React, { useState, useCallback, useEffect } from 'react';
import type { Transcript, AnalysisContent, AnalysisType as AnalysisTypeEnum, GroundingMetadata, SpeakerContextState } from '@/types';
import { AnalysisType } from '@/types';
import { performAnalysis } from '@/services/geminiService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { AnalysisCard } from '@/components/lifelogs/AnalysisCard';
import { ANALYSIS_TYPE_CONFIG } from '@/constants';
import { useQueryClient } from '@tanstack/react-query'; // Added
import { lifelogsQueryKeys } from '@/hooks/useLifelogs'; // Added
import { Bookmark, Tag, XCircle } from 'lucide-react'; // Added icons
import { v4 as uuidv4 } from 'uuid'; // For annotation IDs

// Basic Button component (can be replaced with Shadcn Button later)
// This should be extracted to a common component file if not already.
// For now, keeping it here for brevity if it's not yet a shared Shadcn component.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  size?: "sm" | "icon" | "default" | "lg";
  children?: React.ReactNode;
}
const Button: React.FC<ButtonProps> = ({ className, variant, size, children, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  };
  const appliedVariant = variant || "default";
  const appliedSize = size || "default";
  return (
    <button
      className={`${baseStyle} ${variants[appliedVariant]} ${sizes[appliedSize]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};


interface TranscriptDetailViewProps {
  transcript: Transcript | null;
  speakerContext: SpeakerContextState;
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


export const TranscriptDetailView: React.FC<TranscriptDetailViewProps> = ({ transcript, speakerContext }) => {
  const queryClient = useQueryClient(); // Added
  const [analysisData, setAnalysisData] = useState<Partial<AnalysisContent>>({});
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<Partial<Record<AnalysisTypeEnum, boolean>>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Partial<Record<AnalysisTypeEnum, string | null>>>({});
  const [groundingMetadata, setGroundingMetadata] = useState<Partial<Record<AnalysisTypeEnum, GroundingMetadata | null>>>({});
  const [currentTag, setCurrentTag] = useState(''); // Added for tag input

  // Function to update transcript in React Query cache
  const updateTranscriptInCache = (updatedTranscript: Transcript) => {
    // This uses the default query key for the list of lifelogs.
    // If filtering/sorting is implemented and active, this key would need to include those filter parameters
    // to update the correct query in the cache.
    const queryKey = lifelogsQueryKeys.list({}); // Default list key

    queryClient.setQueryData<any>(queryKey, (oldData: any) => {
      if (!oldData || !oldData.pages) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          transcripts: page.transcripts.map((t: Transcript) =>
            t.id === updatedTranscript.id ? updatedTranscript : t
          ),
        })),
      };
    });
  };

  const handleToggleBookmark = () => {
    if (!transcript) return;
    const updatedTranscript = {
      ...transcript,
      isBookmarked: !transcript.isBookmarked,
    };
    updateTranscriptInCache(updatedTranscript);
    // In a real app, you'd also call a backend service here.
  };

  const handleAddTag = () => {
    if (!transcript || !currentTag.trim()) return;
    const updatedTranscript = {
      ...transcript,
      tags: [...(transcript.tags || []), currentTag.trim()],
    };
    updateTranscriptInCache(updatedTranscript);
    setCurrentTag(''); // Reset input
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!transcript) return;
    const updatedTranscript = {
      ...transcript,
      tags: transcript.tags?.filter(tag => tag !== tagToRemove),
    };
    updateTranscriptInCache(updatedTranscript);
  };

  // Placeholder for annotations
  // const handleAddAnnotation = (text: string) => { ... };
  // const handleRemoveAnnotation = (annotationId: string) => { ... };


  const handleAnalysisRequest = useCallback(async (type: AnalysisTypeEnum) => {
    if (!transcript) return;

    setIsLoadingAnalysis(prev => ({ ...prev, [type]: true }));
    setAnalysisErrors(prev => ({ ...prev, [type]: null }));
    setGroundingMetadata(prev => ({ ...prev, [type]: null }));

    try {
      const result = await performAnalysis(transcript.content, type, speakerContext); // Pass speakerContext
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
  }, [transcript, speakerContext]); // Added speakerContext to dependencies

  // Effect to auto-fetch summary when a new transcript is selected
  useEffect(() => {
    // When transcript changes, reset all analysis data first
    if (transcript) {
      setAnalysisData({});
      setIsLoadingAnalysis({});
      setAnalysisErrors({});
      setGroundingMetadata({});

      // Then, if conditions are met, auto-fetch summary
      // We explicitly check against initial/empty states here because they've just been reset.
      if (transcript.content) { // No need to check analysisData/isLoading/analysisError for summary as they are fresh
        console.log(`Auto-fetching summary for transcript ID: ${transcript.id} with current context.`);
        handleAnalysisRequest(AnalysisType.SUMMARY);
      }
    } else {
      // If transcript becomes null (deselected), clear all analysis data
      setAnalysisData({});
      setIsLoadingAnalysis({});
      setAnalysisErrors({});
      setGroundingMetadata({});
    }
  }, [transcript, handleAnalysisRequest]); // handleAnalysisRequest will change if transcript or speakerContext changes

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
    <div className="bg-card p-4 md:p-6 h-full overflow-y-auto"> {/* Changed bg-slate-800 to bg-card */}
      <div className="flex items-start justify-between mb-1"> {/* items-start for alignment with button */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">{transcript.title}</h2> {/* text-purple-300 to text-primary */}
          <p className="text-sm text-muted-foreground"> {/* text-gray-400 to text-muted-foreground */}
            Recorded on: {new Date(transcript.date).toLocaleString()}
            {transcript.isStarred && <span className="ml-2 text-yellow-500">★ Starred</span>}
          </p>
        </div>
        <Button
            onClick={handleToggleBookmark}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            aria-label={transcript.isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
            <Bookmark className={transcript.isBookmarked ? "fill-primary text-primary" : ""} size={20} />
        </Button>
      </div>
      <div className="border-b border-border mb-4 pb-3"></div> {/* Separator, border-slate-700 to border-border */}

      {/* Tags Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {(transcript.tags || []).map(tag => (
            <span key={tag} className="flex items-center bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
              {tag}
              <Button variant="ghost" size="icon" onClick={() => handleRemoveTag(tag)} className="ml-1 h-4 w-4 text-muted-foreground hover:text-destructive">
                <XCircle size={12} />
              </Button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add a tag"
            className="input input-sm bg-input text-foreground border-border p-2 rounded-md text-sm flex-grow" // Basic input styling
          />
          <Button onClick={handleAddTag} size="sm" variant="outline">
            <Tag size={16} className="mr-1" /> Add Tag
          </Button>
        </div>
      </div>

      {/* Annotations Section (Placeholder) */}
      {/*
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Annotations</h3>
        <p className="text-sm text-muted-foreground">Annotation functionality coming soon.</p>
      </div>
      */}

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
import React, { useState, useMemo } from 'react';
import { useLifelogs } from '@/hooks/useLifelogs';
import { TranscriptList } from '@/components/lifelogs/TranscriptList';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { TranscriptDetailView } from '@/components/lifelogs/TranscriptDetailView'; // Integrated
import { ContextManager } from '@/components/lifelogs/ContextManager'; // Integrated
import type { Transcript, SpeakerContextState } from '@/types'; // Added SpeakerContextState
import { v4 as uuidv4 } from 'uuid'; // For default speaker context

// Basic Button component (can be replaced with Shadcn Button later)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "sm" | "icon" | "default" | "lg";
}
const Button: React.FC<ButtonProps> = ({ className, variant, size, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
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
    />
  );
};


const LifelogsPage: React.FC = () => {
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [speakerContext, setSpeakerContext] = useState<SpeakerContextState>([ // Added speakerContext state
    { id: uuidv4(), title: 'Family', profiles: [] },
    { id: uuidv4(), title: 'Work Colleagues', profiles: [] },
    { id: uuidv4(), title: 'Friends', profiles: [] },
    { id: uuidv4(), title: 'Other Key People', profiles: [] },
  ]);
  // Add states for searchTerm, sortBy later
  // const [searchTerm, setSearchTerm] = useState('');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useLifelogs({
    // searchTerm: searchTerm
  });

  const transcripts = useMemo(() => {
    return data?.pages.flatMap(page => page.transcripts) ?? [];
  }, [data]);

  const selectedTranscript = useMemo(() => {
    return transcripts.find(t => t.id === selectedTranscriptId) ?? null;
  }, [transcripts, selectedTranscriptId]);

  const handleSelectTranscript = (id: string) => {
    setSelectedTranscriptId(id);
  };

  const handleSpeakerContextChange = (newContextState: SpeakerContextState) => { // Added handler
    setSpeakerContext(newContextState);
    // console.log("Speaker context updated in LifelogsPage:", newContextState);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]"> {/* Assuming header is 4rem (h-16) */}
      {/* Left Panel: List and Controls */}
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 border-r border-border flex flex-col bg-card overflow-y-hidden">
        <h2 className="text-xl font-semibold mb-4 text-primary border-b border-border pb-2 flex-shrink-0">
          Your Lifelogs
        </h2>

        {/* TODO: Add Search and Filter controls here */}
        {/* <input
          type="text"
          placeholder="Search lifelogs..."
          className="w-full p-2 mb-4 border border-input rounded-md bg-transparent flex-shrink-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        /> */}

        {isLoading && <LoadingSpinner message="Loading lifelogs..." />}
        {isError && error && (
          <ErrorDisplay
            message={error.message || "Failed to load lifelogs."}
            onRetry={() => window.location.reload()} // Or a more specific refetch from React Query
          />
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col flex-grow overflow-y-hidden">
            <div className="flex-grow overflow-y-auto pr-2"> {/* Scrollable TranscriptList */}
              <TranscriptList
                transcripts={transcripts}
                onSelectTranscript={handleSelectTranscript}
                selectedTranscriptId={selectedTranscriptId}
              />
            </div>
            {hasNextPage && (
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="secondary"
                className="mt-auto w-full flex-shrink-0" // Changed mt-4 to mt-auto
              >
                {isFetchingNextPage ? 'Loading more...' : 'Load More'}
              </Button>
            )}
            {!hasNextPage && transcripts.length > 0 && !isLoading && (
                <p className="text-center text-muted-foreground mt-2 text-sm flex-shrink-0">No more lifelogs.</p>
            )}
             {transcripts.length === 0 && !isLoading && !isError && (
                <p className="text-center text-muted-foreground mt-4 text-sm">No lifelogs found.</p>
            )}
          </div>
        )}
        {/* Context Manager - Placed at the bottom of the left panel */}
        {!isLoading && !isError && (
            <div className="mt-auto pt-2 border-t border-border flex-shrink-0"> {/* Ensures it stays at bottom */}
                 <ContextManager contextState={speakerContext} onContextChange={handleSpeakerContextChange} />
            </div>
        )}
      </div>

      {/* Right Panel: Detail View */}
      <div className="w-full md:w-2/3 lg:w-3/4 overflow-y-auto bg-background"> {/* Removed p-4 from here, TranscriptDetailView handles its padding */}
        <TranscriptDetailView transcript={selectedTranscript} speakerContext={speakerContext} />
      </div>
    </div>
  );
};

export default LifelogsPage;

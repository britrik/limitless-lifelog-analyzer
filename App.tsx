import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TranscriptList } from './components/TranscriptList';
import { TranscriptDetailView } from './components/TranscriptDetailView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { fetchTranscripts, FetchTranscriptsResult } from './services/limitlessApi';
import type { Transcript } from './types';

interface ActionableError {
  message: string;
  type?: 'cors' | 'generic';
}

const App: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For initial load
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // For "load more"
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [actionableError, setActionableError] = useState<ActionableError>({ message: '', type: 'generic' });

  const TRANSCRIPTS_PAGE_LIMIT = 10;

  const loadTranscripts = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setSelectedTranscript(null); // Reset selection on initial load/refresh
    }
    setActionableError({ message: '', type: 'generic' });

    try {
      const result: FetchTranscriptsResult = await fetchTranscripts(TRANSCRIPTS_PAGE_LIMIT, cursor);
      setTranscripts(prevTranscripts => cursor ? [...prevTranscripts, ...result.transcripts] : result.transcripts);
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.error("Error fetching lifelogs:", err);
      const errorMessage = (err as Error).message || "Failed to load lifelogs. Please try again later.";
      // Only show full page error if it's an initial load error
      if (!cursor) {
        if (errorMessage.toLowerCase().includes('cors') || errorMessage.toLowerCase().includes('cross-origin')) {
          setActionableError({ message: errorMessage, type: 'cors' });
        } else {
          setActionableError({ message: errorMessage, type: 'generic' });
        }
      } else {
        // For "load more" errors, we could show a toast or a small message near the button
        // For now, just log it and allow retry by clicking button again.
        console.error("Error loading more lifelogs:", errorMessage);
        setActionableError({ message: `Failed to load more: ${errorMessage}`, type: 'generic' }); // Or a new error type for minor errors
      }
    } finally {
      if (cursor) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTranscripts(); // Initial load
  }, [loadTranscripts]); // Note: loadTranscripts has no dependencies, so this runs once on mount.

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      loadTranscripts(nextCursor);
    }
  };

  const handleRefresh = () => {
    setTranscripts([]); // Clear existing transcripts before refresh
    setNextCursor(undefined); // Reset cursor
    loadTranscripts(); // Fetch from beginning
  };

  const handleSelectTranscript = (id: string) => {
    setActionableError({ message: '', type: 'generic' }); 
    const transcript = transcripts.find(t => t.id === id);
    
    if (transcript) {
      setSelectedTranscript(transcript);
    } else {
      console.error(`Error selecting lifelog ${id}: Not found in the fetched list.`);
      const errorMessage = `Failed to display lifelog (ID: ${id}). It may have been removed or an error occurred.`;
      setActionableError({ message: errorMessage, type: 'generic' });
      setSelectedTranscript(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-200">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
          <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-2xl rounded-xl p-4 h-full">
            <h2 className="text-xl font-semibold mb-4 text-purple-300 border-b border-purple-700 pb-2">Your Lifelogs</h2>
            {isLoading && transcripts.length === 0 && <LoadingSpinner message="Loading lifelogs..." />}
            {actionableError.message && transcripts.length === 0 && !isLoadingMore && (
              <ErrorDisplay
                message={actionableError.message}
                onRetry={actionableError.type === 'generic' ? handleRefresh : undefined}
                isCorsError={actionableError.type === 'cors'}
              />
            )}
            {!isLoading && !actionableError.message && transcripts.length === 0 && !isLoadingMore && <p className="text-gray-400">No lifelogs found.</p>}

            {transcripts.length > 0 && (
              <>
                <TranscriptList
                  transcripts={transcripts}
                  onSelectTranscript={handleSelectTranscript}
                  selectedTranscriptId={selectedTranscript?.id || null}
                />
                {nextCursor && !isLoadingMore && (
                  <button
                    onClick={handleLoadMore}
                    className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md shadow-md transition-colors duration-150"
                  >
                    Load More
                  </button>
                )}
                {isLoadingMore && <LoadingSpinner message="Loading more..." size="sm" className="mt-4" />}
                {actionableError.message && isLoadingMore && ( // Show error if loading more failed
                    <p className="text-red-400 text-xs mt-2 text-center">{actionableError.message}</p>
                )}
              </>
            )}
             {!isLoading && transcripts.length > 0 && ( // Refresh button always available if not initial loading and has transcripts
                <button
                    onClick={handleRefresh}
                    disabled={isLoadingMore || isLoading}
                    className="mt-4 w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-md shadow-md transition-colors duration-150 disabled:bg-gray-500"
                >
                    Refresh List
                </button>
            )}
          </div>
        </div>
        <div className="md:w-2/3 lg:w-3/4 flex-grow">
          <TranscriptDetailView transcript={selectedTranscript} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
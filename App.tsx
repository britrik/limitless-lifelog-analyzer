import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TranscriptList } from './components/TranscriptList';
import { TranscriptDetailView } from './components/TranscriptDetailView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { fetchTranscripts } from './services/limitlessApi';
import type { Transcript } from './types';

interface ActionableError {
  message: string;
  type?: 'cors' | 'generic';
}

const App: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionableError, setActionableError] = useState<ActionableError>({ message: '', type: 'generic' });

  const loadTranscripts = useCallback(async () => {
    setIsLoading(true);
    setActionableError({ message: '', type: 'generic' });
    setSelectedTranscript(null);
    try {
      const fetchedTranscripts = await fetchTranscripts(10);
      setTranscripts(fetchedTranscripts);
    } catch (err) {
      console.error("Error fetching lifelogs:", err);
      const errorMessage = (err as Error).message || "Failed to load lifelogs. Please try again later.";
      if (errorMessage.toLowerCase().includes('cors') || errorMessage.toLowerCase().includes('cross-origin')) {
        setActionableError({ message: errorMessage, type: 'cors' });
      } else {
        setActionableError({ message: errorMessage, type: 'generic' });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTranscripts();
  }, [loadTranscripts]);

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
            {actionableError.message && transcripts.length === 0 && (
              <ErrorDisplay
                message={actionableError.message}
                onRetry={actionableError.type === 'generic' ? loadTranscripts : undefined}
                isCorsError={actionableError.type === 'cors'}
              />
            )}
            {!isLoading && !actionableError.message && transcripts.length === 0 && <p className="text-gray-400">No lifelogs found.</p>}
            {transcripts.length > 0 && (
              <TranscriptList
                transcripts={transcripts}
                onSelectTranscript={handleSelectTranscript}
                selectedTranscriptId={selectedTranscript?.id || null}
              />
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
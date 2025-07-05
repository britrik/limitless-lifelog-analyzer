import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Transcript } from '../types';
import { fetchTranscripts } from '../services/limitlessApi';
import { SearchBar } from '../components/SearchBar';
import { TranscriptList } from '../components/TranscriptList';
import { TranscriptDetailModal } from '../components/TranscriptDetailModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay } from '../components/ErrorDisplay';

interface LifelogsState {
  transcripts: Transcript[];
  isLoading: boolean;
  error: string | null;
  nextCursor?: string;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export const Lifelogs: React.FC = () => {
  // Main state
  const [state, setState] = useState<LifelogsState>({
    transcripts: [],
    isLoading: true,
    error: null,
    hasMore: false,
    isLoadingMore: false,
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'starred'>('date');
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Modal state
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load initial transcripts
  const loadTranscripts = useCallback(async (reset: boolean = false) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: reset,
        isLoadingMore: !reset,
        error: null,
      }));

      const cursor = reset ? undefined : state.nextCursor;
      const result = await fetchTranscripts(20, cursor);

      setState(prev => ({
        ...prev,
        transcripts: reset ? result.transcripts : [...prev.transcripts, ...result.transcripts],
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load transcripts';

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isLoadingMore: false,
      }));
    }
  }, [state.nextCursor]);

  // Load more transcripts
  const loadMoreTranscripts = useCallback(() => {
    if (state.hasMore && !state.isLoadingMore) {
      loadTranscripts(false);
    }
  }, [state.hasMore, state.isLoadingMore, loadTranscripts]);

  // Initial load
  useEffect(() => {
    loadTranscripts(true);
  }, []);

  // Handle star toggle
  const handleStarToggle = useCallback((transcriptId: string, isStarred: boolean) => {
    setState(prev => ({
      ...prev,
      transcripts: prev.transcripts.map(transcript =>
        transcript.id === transcriptId
          ? { ...transcript, isStarred }
          : transcript
      ),
    }));

    // Update selected transcript if it's the one being starred
    if (selectedTranscript?.id === transcriptId) {
      setSelectedTranscript(prev => prev ? { ...prev, isStarred } : null);
    }

    // TODO: In a real app, you'd also make an API call to persist this change
    console.log(`Transcript ${transcriptId} ${isStarred ? 'starred' : 'unstarred'}`);
  }, [selectedTranscript]);

  // Handle transcript click
  const handleTranscriptClick = useCallback((transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTranscript(null);
  }, []);

  // Filter and sort transcripts
  const filteredAndSortedTranscripts = useMemo(() => {
    let filtered = state.transcripts;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transcript =>
        transcript.title.toLowerCase().includes(searchLower) ||
        transcript.content.toLowerCase().includes(searchLower) ||
        (transcript.summary && transcript.summary.toLowerCase().includes(searchLower))
      );
    }

    // Apply starred filter
    if (showStarredOnly) {
      filtered = filtered.filter(transcript => transcript.isStarred);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'starred':
          if (a.isStarred === b.isStarred) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return a.isStarred ? -1 : 1;
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return sorted;
  }, [state.transcripts, searchTerm, showStarredOnly, sortBy]);

  // Handle retry
  const handleRetry = useCallback(() => {
    loadTranscripts(true);
  }, [loadTranscripts]);

  // Render loading state
  if (state.isLoading && state.transcripts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-100">Lifelogs</h1>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading your transcripts..." size="lg" />
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error && state.transcripts.length === 0) {
    const isCorsError = state.error.toLowerCase().includes('cors') || 
                       state.error.toLowerCase().includes('failed to fetch');
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-100">Lifelogs</h1>
        </div>
        <ErrorDisplay
          message={state.error}
          onRetry={!isCorsError ? handleRetry : undefined}
          isCorsError={isCorsError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-100">Lifelogs</h1>
        <button
          onClick={() => loadTranscripts(true)}
          disabled={state.isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          {state.isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Search and Filters */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showStarredOnly={showStarredOnly}
        onStarredFilterChange={setShowStarredOnly}
        totalCount={filteredAndSortedTranscripts.length}
      />

      {/* Error Display (for partial errors) */}
      {state.error && state.transcripts.length > 0 && (
        <ErrorDisplay
          message={`Warning: ${state.error}`}
          onRetry={handleRetry}
        />
      )}

      {/* Transcript List */}
      <TranscriptList
        transcripts={filteredAndSortedTranscripts}
        onTranscriptClick={handleTranscriptClick}
        onStarToggle={handleStarToggle}
        isLoading={state.isLoadingMore}
        hasMore={state.hasMore && !searchTerm && !showStarredOnly} // Only show load more if not filtering
        onLoadMore={loadMoreTranscripts}
      />

      {/* Transcript Detail Modal */}
      <TranscriptDetailModal
        transcript={selectedTranscript}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onStarToggle={handleStarToggle}
      />
    </div>
  );
};
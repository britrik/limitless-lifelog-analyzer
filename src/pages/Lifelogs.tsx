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
  const [modalInitialTab, setModalInitialTab] = useState<'transcript' | 'analysis'>('transcript');

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
    if (!state.isLoadingMore && state.hasMore) {
      loadTranscripts(false);
    }
  }, [state.isLoadingMore, state.hasMore, loadTranscripts]);

  // Initial load
  useEffect(() => {
    loadTranscripts(true);
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    loadTranscripts(true);
  }, [loadTranscripts]);

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

    // Update selected transcript if it's the one being toggled
    if (selectedTranscript && selectedTranscript.id === transcriptId) {
      setSelectedTranscript(prev => prev ? { ...prev, isStarred } : null);
    }

    // Here you would typically make an API call to update the star status
    // For now, we'll just log it
    console.log(`Transcript ${transcriptId} ${isStarred ? 'starred' : 'unstarred'}`);
  }, [selectedTranscript]);

  // Handle transcript click (regular click - opens to transcript tab)
  const handleTranscriptClick = useCallback((transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setModalInitialTab('transcript');
    setIsModalOpen(true);
  }, []);

  // Handle analyze click (opens to analysis tab)
  const handleAnalyzeClick = useCallback((transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setModalInitialTab('analysis');
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTranscript(null);
    setModalInitialTab('transcript');
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

  // Show loading spinner for initial load
  if (state.isLoading && state.transcripts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error for initial load failure
  if (state.error && state.transcripts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorDisplay
          message={state.error}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Lifelogs</h1>
          <p className="text-slate-400 mt-1">
            Browse and analyze your recorded conversations and meetings
          </p>
        </div>
        <button
          onClick={() => loadTranscripts(true)}
          disabled={state.isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
        onAnalyzeClick={handleAnalyzeClick}
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
        initialTab={modalInitialTab}
      />
    </div>
  );
};
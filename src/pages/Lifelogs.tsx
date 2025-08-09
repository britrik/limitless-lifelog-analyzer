import React, { useState, useEffect, useCallback } from 'react';
import type { Transcript, SpeakerContextState } from '../types';
import { ContextManager } from '../components/ContextManager';
import { TranscriptList } from '../components/TranscriptList';
import { TranscriptDetailModal } from '../components/TranscriptDetailModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { fetchTranscripts } from '../services/limitlessApi';
import { v4 as uuidv4 } from 'uuid';

export const Lifelogs: React.FC = () => {
  // Transcript state
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<string>('content');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);

  // Speaker context state
  const [speakerContext, setSpeakerContext] = useState<SpeakerContextState>([
    { id: uuidv4(), title: 'Family', profiles: [] },
    { id: uuidv4(), title: 'Work Colleagues', profiles: [] },
    { id: uuidv4(), title: 'Friends', profiles: [] },
    { id: uuidv4(), title: 'Other Key People', profiles: [] },
  ]);

  // Load initial transcripts
  const loadTranscripts = useCallback(async (reset: boolean = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchTranscripts();

      if (reset) {
        setTranscripts(result);
      } else {
        setTranscripts(prev => [...prev, ...result]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcripts');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, transcripts]);

  // Initial load
  useEffect(() => {
    loadTranscripts(true);
  }, []);

  // Filter transcripts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscripts(transcripts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = transcripts.filter(transcript =>
        transcript.title.toLowerCase().includes(query) ||
        transcript.content.toLowerCase().includes(query) ||
        transcript.summary?.toLowerCase().includes(query)
      );
      setFilteredTranscripts(filtered);
    }
  }, [transcripts, searchQuery]);

  // Speaker context handler
  const handleSpeakerContextChange = (newContextState: SpeakerContextState) => {
    setSpeakerContext(newContextState);
  };

  // Transcript selection handlers
  const handleSelectTranscript = (transcriptId: string) => {
    setSelectedTranscriptId(transcriptId);
    const transcript = transcripts.find(t => t.id === transcriptId);
    if (transcript) {
      setSelectedTranscript(transcript);
      setModalInitialTab('content');
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTranscript(null);
    setSelectedTranscriptId(null);
  };

  // Star toggle handler
  const handleStarToggle = (transcriptId: string) => {
    setTranscripts(prev => prev.map(transcript => 
      transcript.id === transcriptId 
        ? { ...transcript, isStarred: !transcript.isStarred }
        : transcript
    ));
    
    // Update selected transcript if it's the one being toggled
    if (selectedTranscript?.id === transcriptId) {
      setSelectedTranscript(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    }
  };

  // Refresh transcripts
  const handleRefresh = () => {
    loadTranscripts(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-100">Lifelogs</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-medium rounded-md transition-colors duration-150 flex items-center space-x-2"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Speaker Context Manager */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <ContextManager 
          contextState={speakerContext} 
          onContextChange={handleSpeakerContextChange} 
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transcript List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">
                Transcripts ({filteredTranscripts.length})
              </h2>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>

            {error ? (
              <ErrorDisplay message={error} onRetry={() => loadTranscripts(true)} />
            ) : (
              <TranscriptList
                transcripts={filteredTranscripts}
                onSelectTranscript={handleSelectTranscript}
                selectedTranscriptId={selectedTranscriptId}
              />
            )}
          </div>
        </div>

        {/* Instructions/Info Panel */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Getting Started</h2>
            <div className="space-y-4 text-slate-400">
              <p>
                Welcome to your Lifelog Analyzer! This tool helps you explore and analyze your recorded conversations and meetings.
              </p>
              <div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">Features:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Browse and search through your transcripts</li>
                  <li>Set up speaker context to improve AI analysis accuracy</li>
                  <li>Generate AI-powered summaries and insights</li>
                  <li>Extract topics, sentiment, and action items</li>
                  <li>Star important transcripts for quick access</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">How to use:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Configure speaker profiles in the context manager above</li>
                  <li>Click on any transcript from the list to view details</li>
                  <li>Use the analysis tools to generate insights</li>
                  <li>Search through your transcripts using the search bar</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Detail Modal */}
      <TranscriptDetailModal
        transcript={selectedTranscript}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onStarToggle={handleStarToggle}
        initialTab={modalInitialTab}
        speakerContext={speakerContext}
      />
    </div>
  );
};
import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: 'date' | 'title' | 'starred';
  onSortChange: (sort: 'date' | 'title' | 'starred') => void;
  showStarredOnly: boolean;
  onStarredFilterChange: (showStarredOnly: boolean) => void;
  totalCount?: number;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  showStarredOnly,
  onStarredFilterChange,
  totalCount,
  className = '',
}) => {
  return (
    <div className={`bg-slate-800 rounded-lg p-4 space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search transcripts..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-md leading-5 bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-slate-300">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'date' | 'title' | 'starred')}
              className="bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 px-3 py-1"
            >
              <option value="date">Date (Newest First)</option>
              <option value="title">Title (A-Z)</option>
              <option value="starred">Starred First</option>
            </select>
          </div>

          {/* Starred Filter */}
          <div className="flex items-center space-x-2">
            <input
              id="starred-filter"
              type="checkbox"
              checked={showStarredOnly}
              onChange={(e) => onStarredFilterChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
            />
            <label htmlFor="starred-filter" className="text-sm font-medium text-slate-300">
              Starred only
            </label>
          </div>
        </div>

        {/* Results Count */}
        {totalCount !== undefined && (
          <div className="text-sm text-slate-400">
            {totalCount} {totalCount === 1 ? 'transcript' : 'transcripts'}
            {showStarredOnly && ' (starred)'}
          </div>
        )}
      </div>
    </div>
  );
};
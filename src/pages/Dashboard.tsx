import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTranscripts } from '../services/limitlessApi';
import { Transcript } from '../types';
import { AnalyticsChart, ChartDataPoint } from '../components/AnalyticsChart';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { TrendAnalysis } from '../components/TrendAnalysis';
import { TopicsCloud } from '../components/TopicsCloud';
import { HourlyActivity } from '../components/HourlyActivity';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay } from '../components/ErrorDisplay';
import {
  calculateDashboardMetrics,
  generateActivityChartData,
  generateDurationChartData,
  generateConversationDensityData,
  generateSentimentTrendData,
  getRecentActivity,
  TIME_RANGES,
  type DashboardMetrics,
  type ActivityItem,
} from '../utils/dashboardAnalytics';

export const Dashboard: React.FC = () => {
  // State management
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Helper functions
  const getPeriodLabel = (timeRange: '7d' | '30d' | '90d' | 'all') => {
    switch (timeRange) {
      case '7d': return 'vs previous 7 days';
      case '30d': return 'vs previous 30 days';
      case '90d': return 'vs previous 90 days';
      default: return 'vs previous period';
    }
  };

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to fetch real data first
      try {
        const result = await fetchTranscripts(100); // Get more transcripts for better analytics
        setTranscripts(result.transcripts);
        console.log(`Loaded ${result.transcripts.length} real transcripts`);
      } catch (apiError) {
        console.warn('Failed to load real data, using sample data for testing:', apiError);

        // Generate sample data for testing
        const sampleTranscripts: Transcript[] = [];
        const now = new Date();

        // Generate sample data for the last 100 days
        for (let i = 0; i < 100; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          // Set different times throughout the day to avoid grouping issues
          date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

          // Create 1-3 transcripts per day (randomly)
          const transcriptsPerDay = Math.floor(Math.random() * 3) + 1;

          for (let j = 0; j < transcriptsPerDay; j++) {
            // Create slightly different times for each transcript on the same day
            const transcriptDate = new Date(date);
            transcriptDate.setMinutes(transcriptDate.getMinutes() + (j * 30));

            const transcript: Transcript = {
              id: `sample-${i}-${j}`,
              title: `Sample Recording ${i}-${j}`,
              date: transcriptDate.toISOString(),
              content: `This is sample content for transcript ${i}-${j}. `.repeat(Math.floor(Math.random() * 50) + 10),
              summary: Math.random() > 0.5 ? `Summary for transcript ${i}-${j}` : '',
              isStarred: Math.random() > 0.8
            };
            sampleTranscripts.push(transcript);
          }
        }

        setTranscripts(sampleTranscripts);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Calculate metrics based on current time range
  const metrics = useMemo((): DashboardMetrics => {
    return calculateDashboardMetrics(transcripts, timeRange);
  }, [transcripts, timeRange]);

  // Generate chart data
  const conversationDensityData = useMemo((): ChartDataPoint[] => {
    return generateConversationDensityData(transcripts, timeRange);
  }, [transcripts, timeRange]);

  const activityChartData = useMemo((): ChartDataPoint[] => {
    return generateActivityChartData(transcripts, timeRange);
  }, [transcripts, timeRange]); // Added timeRange

  const sentimentTrendData = useMemo((): ChartDataPoint[] => {
    return generateSentimentTrendData(transcripts, timeRange);
  }, [transcripts, timeRange]); // Added timeRange

  const durationChartData = useMemo((): ChartDataPoint[] => {
    return generateDurationChartData(transcripts, timeRange);
  }, [transcripts, timeRange]); // Added timeRange


  // Get recent activity
  const recentActivity = useMemo((): ActivityItem[] => {
    return getRecentActivity(transcripts, 5, timeRange);
  }, [transcripts, timeRange]);

  // Handle topic filtering
  const handleTopicClick = useCallback((topic: string) => {
    setSelectedTopic(selectedTopic === topic ? null : topic);
  }, [selectedTopic]);

  // Format percentage for display
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${Math.round(value)}%`;
  };

  // Get percentage color
  const getPercentageColor = (value: number): string => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'recording':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'analysis':
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'bookmark':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
          <ErrorDisplay message={error} onRetry={loadDashboardData} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section with Time Range Selector */}
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-sm">Time range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <p className="text-slate-300 text-lg">
          Welcome to your Limitless Lifelog Analyzer. Monitor your recordings and insights at a glance.
        </p>
        
        {selectedTopic && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-slate-400 text-sm">Filtered by topic:</span>
            <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm">{selectedTopic}</span>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Recordings */}
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Recordings</p>
              <p className="text-2xl font-bold text-white">{metrics.totalRecordings}</p>
            </div>
            <div className="bg-blue-500 bg-opacity-20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getPercentageColor(metrics.growthPercentages.recordings)}`}>
              {formatPercentage(metrics.growthPercentages.recordings)}
            </span>
            <span className="text-slate-400 text-sm ml-2">{getPeriodLabel(timeRange)}</span>
          </div>
        </div>

        {/* Hours Recorded */}
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Estimated Hours</p>
              <p className="text-2xl font-bold text-white">{metrics.hoursRecorded.toFixed(1)}</p>
            </div>
            <div className="bg-green-500 bg-opacity-20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getPercentageColor(metrics.growthPercentages.hours)}`}>
              {formatPercentage(metrics.growthPercentages.hours)}
            </span>
            <span className="text-slate-400 text-sm ml-2">{getPeriodLabel(timeRange)}</span>
          </div>
        </div>

        {/* AI Analyses */}
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">AI Analyses</p>
              <p className="text-2xl font-bold text-white">{metrics.aiAnalyses}</p>
            </div>
            <div className="bg-purple-500 bg-opacity-20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getPercentageColor(metrics.growthPercentages.analyses)}`}>
              {formatPercentage(metrics.growthPercentages.analyses)}
            </span>
            <span className="text-slate-400 text-sm ml-2">{getPeriodLabel(timeRange)}</span>
          </div>
        </div>

        {/* Bookmarks */}
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Bookmarks</p>
              <p className="text-2xl font-bold text-white">{metrics.bookmarks}</p>
            </div>
            <div className="bg-yellow-500 bg-opacity-20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getPercentageColor(metrics.growthPercentages.bookmarks)}`}>
              {formatPercentage(metrics.growthPercentages.bookmarks)}
            </span>
            <span className="text-slate-400 text-sm ml-2">{getPeriodLabel(timeRange)}</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          key={`conversation-density-${timeRange}`}
          data={conversationDensityData}
          type="line"
          title="Estimated Speaking Rate (Words/Min)"
          subtitle="Estimated words per minute based on content length - higher values may indicate faster speech or denser content"
          color="#3b82f6"
          height={250}
        />
        <AnalyticsChart
          key={`sentiment-trend-${timeRange}`}
          data={sentimentTrendData}
          type="area"
          title="Word Sentiment Indicators"
          subtitle="Basic sentiment analysis using positive/negative word matching - not a comprehensive emotional analysis"
          color="#10b981"
          height={250}
        />
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          key={`activity-${timeRange}`}
          data={activityChartData}
          type="bar"
          title="Daily Recording Count"
          subtitle="Number of recordings per day - shows your activity patterns and busy vs. quiet days"
          color="#8b5cf6"
          height={250}
        />
        <AnalyticsChart
          key={`duration-${timeRange}`}
          data={durationChartData}
          type="area"
          title="Estimated Duration Trends"
          subtitle="Estimated recording length based on content analysis - actual duration may vary significantly"
          color="#f59e0b"
          height={250}
        />
      </div>

      {/* Trend Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrendAnalysis transcripts={transcripts} metric="count" timeRange={timeRange} />
        <TrendAnalysis transcripts={transcripts} metric="duration" timeRange={timeRange} />
        <TrendAnalysis transcripts={transcripts} metric="analysis" timeRange={timeRange} />
      </div>

      {/* Activity Patterns and Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HourlyActivity transcripts={transcripts} timeRange={timeRange} />
        <TopicsCloud transcripts={transcripts} timeRange={timeRange} onTopicClick={handleTopicClick} />
      </div>

      {/* Original Activity Heatmap (Calendar View) */}
      <div className="grid grid-cols-1 gap-6">
        <ActivityHeatmap transcripts={transcripts} timeRange={timeRange} />
      </div>



      {/* Recent Activity */}
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-white">
            Recent Activity
            <span className="text-slate-400 text-sm ml-2 font-normal">
              ({timeRange === '7d' ? 'Last 7 days' :
                timeRange === '30d' ? 'Last 30 days' :
                timeRange === '90d' ? 'Last 90 days' : 'All time'})
            </span>
          </h2>
        </div>
        
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-400">No activity in this period</p>
              <p className="text-slate-500 text-sm mt-1">
                No recordings or analyses found for the selected time range
              </p>
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-4 bg-slate-700 bg-opacity-50 rounded-lg">
                <div className={`bg-opacity-20 p-2 rounded-full ${
                  activity.type === 'recording' ? 'bg-green-500' :
                  activity.type === 'analysis' ? 'bg-purple-500' : 'bg-yellow-500'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.title}</p>
                  <p className="text-slate-400 text-sm">{activity.description}</p>
                </div>
                <span className="text-slate-400 text-sm">{activity.relativeTime}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => window.location.hash = '#/lifelogs'}
            className="flex items-center space-x-3 p-4 bg-slate-700 bg-opacity-50 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="text-white font-medium">View Recordings</span>
          </button>
          
          <button 
            onClick={loadDashboardData}
            className="flex items-center space-x-3 p-4 bg-slate-700 bg-opacity-50 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-white font-medium">Refresh Data</span>
          </button>
          
          <button 
            onClick={() => window.location.hash = '#/settings'}
            className="flex items-center space-x-3 p-4 bg-slate-700 bg-opacity-50 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-white font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
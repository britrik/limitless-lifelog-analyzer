import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Paper, Typography, Select, MenuItem, FormControl, InputLabel, Box, Tooltip } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
// utils/dashboardAnalytics functions are used to process transcript data for display.
// generateHourlyActivityData was removed as ActivityHeatmap now handles its own data processing from raw transcripts.
import {
  calculateDashboardMetrics,
  filterTranscriptsByTimeRange,
  getRecentActivity,
  generateActivityChartData,
  generateDurationChartData,
  generateConversationDensityData,
  generateSentimentTrendData,
  TIME_RANGES,
  type DashboardMetrics, // Import type
  type TimeRangeFilter   // Import type
} from 'utils/dashboardAnalytics';
import { Transcript, ChartDataResponse as GenericChartDataResponse, ActivityItem } from 'types'; // Renamed to avoid conflict, Added ActivityItem

// Components are imported using named exports from the barrel file src/components/index.ts
import {
  MetricCard,
  AnalyticsChart,
  ActivityHeatmap,
  RecentActivityList,
  LoadingSpinner, // For displaying loading state
  ErrorDisplay    // For displaying error messages with a retry option
} from 'components/index';

// API service for fetching transcripts.
// FetchTranscriptsResult is imported to type the result of fetchTranscripts.
import { fetchTranscripts, FetchTranscriptsResult } from 'services/limitlessApi';

// Type definition for props of AnalyticsChart if it's generic.
// These aliases are used if AnalyticsChart can render different chart types.
const LineChart = AnalyticsChart;
const BarChart = AnalyticsChart;
// HeatmapChart alias was removed; ActivityHeatmap is used directly for clarity on its specific props.

// Fallback component to display when an error occurs within an ErrorBoundary.
const ChartErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
    <Typography variant="h6">Something went wrong loading this chart</Typography>
    <Typography variant="body2">{error.message}</Typography>
    <button onClick={resetErrorBoundary}>Try again</button>
  </Box>
);

// Define the Dashboard functional component.
export const Dashboard: React.FC = () => {
  // State for storing all fetched transcripts.
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  // State for the selected time range filter.
  const [timeRange, setTimeRange] = useState<TimeRangeFilter['value']>('30d'); // Use value from imported type
  // State for storing calculated dashboard metrics.
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRecordings: 0,
    hoursRecorded: 0,
    aiAnalyses: 0,
    bookmarks: 0,
    recentActivity: 0, // This might be a count or a list; ensure type consistency.
    growthPercentages: {
      recordings: 0,
      hours: 0,
      analyses: 0,
      bookmarks: 0,
    },
    invalidDateCount: 0,
  });
  // State to manage loading status during API calls.
  const [loading, setLoading] = useState(true);
  // State to store any error messages from API calls.
  const [error, setError] = useState<string | null>(null);

  // Function to fetch all transcript data.
  // It sets loading state, calls the API, and handles success or error.
  const loadAllData = async () => {
    setLoading(true);
    setError(null); // Reset error before a new fetch attempt.
    try {
      // Fetch all transcripts. fetchTranscripts uses pagination internally if fetchAll is true.
      // Using a limit of 100 per page as an example.
      const result: FetchTranscriptsResult = await fetchTranscripts(100, undefined, true);
      setTranscripts(result.transcripts);
      if (result.transcripts.length === 0) {
        console.warn("Dashboard: No transcripts received from API. This could be expected or indicate an issue.");
      }
    } catch (err) {
      console.error('Dashboard: Failed to fetch transcripts:', err);
      const specificMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(
        `Failed to load dashboard data. ${specificMessage} This could be due to network issues, an invalid API key, ` +
        'or problems reaching the Limitless API. Please check your setup and try again. ' +
        '(Ensure VITE_LIMITLESS_API_KEY is set in .env.local and vite.config.ts proxy is active for dev.)'
      );
    } finally {
      setLoading(false);
    }
  };

  // useEffect hook to load data when the component mounts.
  useEffect(() => {
    loadAllData();
  }, []); // Empty dependency array means this runs once on mount.

  // useEffect hook to recalculate dashboard metrics when transcripts or timeRange change,
  // but only if not loading and no error has occurred.
  useEffect(() => {
    if (transcripts.length > 0 && !loading && !error) {
      const newMetrics = calculateDashboardMetrics(transcripts, timeRange);
      setMetrics(newMetrics);
    }
  }, [transcripts, timeRange, loading, error]);

  // useMemo hook to filter transcripts based on the selected timeRange.
  // Returns an empty array if an error occurred to prevent downstream issues.
  const filteredTranscripts = useMemo(() => {
    if (error) return [];
    return filterTranscriptsByTimeRange(transcripts, timeRange);
  }, [transcripts, timeRange, error]);

  // useMemo hooks to generate data for various charts.
  // These hooks depend on filteredTranscripts and timeRange.
  // They return default/empty data structures if an error occurred or if there's no data.
  const activityData = useMemo((): GenericChartDataResponse => {
    if (error || filteredTranscripts.length === 0) return { data: [], status: 'no-data', message: 'No activity data.' };
    return generateActivityChartData(filteredTranscripts, timeRange);
  }, [filteredTranscripts, timeRange, error]);

  const durationData = useMemo((): GenericChartDataResponse => {
    if (error || filteredTranscripts.length === 0) return { data: [], status: 'no-data', message: 'No duration data.' };
    return generateDurationChartData(filteredTranscripts, timeRange);
  }, [filteredTranscripts, timeRange, error]);

  const densityData = useMemo((): GenericChartDataResponse => {
    if (error || filteredTranscripts.length === 0) return { data: [], status: 'no-data', message: 'No density data.' };
    return generateConversationDensityData(filteredTranscripts, timeRange);
  }, [filteredTranscripts, timeRange, error]);

  // hourlyData calculation was removed from Dashboard.tsx.
  // ActivityHeatmap now takes filteredTranscripts and timeRange directly to do its own processing.

  // State for sentiment analysis data.
  const [sentimentData, setSentimentData] = useState<GenericChartDataResponse>({ data: [], status: 'loading' });

  // useEffect hook to load sentiment data.
  // This runs when filteredTranscripts or timeRange changes, or if an error occurs.
  useEffect(() => {
    if (error || filteredTranscripts.length === 0) {
      setSentimentData({ data: [], status: error ? 'error' : 'no-data', message: error ? 'Error loading sentiment' : 'No data for sentiment' });
      return;
    }
    const loadSentiment = async () => {
      setSentimentData({ data: [], status: 'loading' });
      try {
        const data = await generateSentimentTrendData(filteredTranscripts, timeRange);
        setSentimentData(data);
      } catch (sentimentError) {
        console.error("Failed to generate sentiment data:", sentimentError);
        setSentimentData({ data: [], status: 'error', message: 'Could not load sentiment data.' });
      }
    };
    loadSentiment();
  }, [filteredTranscripts, timeRange, error]);

  // useMemo hook to get recent activity items.
  // Returns an empty array if an error occurred.
  const recentActivity = useMemo((): ActivityItem[] => {
    if (error) return [];
    return getRecentActivity(transcripts);
  }, [transcripts, error]);

  // Handler for changing the time range filter.
  const handleTimeRangeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTimeRange(event.target.value as TimeRangeFilter['value']);
  };

  // Conditional rendering for loading state.
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner />
        <Typography sx={{ ml: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  // Conditional rendering for error state.
  // ErrorDisplay component allows retrying the data fetch.
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay message={`Failed to load dashboard: ${error}`} onRetry={loadAllData} />
      </Box>
    );
  }

  // Main dashboard layout.
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

      {/* Time range selector */}
      <FormControl sx={{ mb: 3, minWidth: 120 }}>
        <InputLabel>Time Range</InputLabel>
        <Select value={timeRange} onChange={handleTimeRangeChange}>
          {TIME_RANGES.map((range: TimeRangeFilter) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Metric cards display */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total Recordings"
            value={metrics.totalRecordings}
            growth={metrics.growthPercentages.recordings}
            tooltip="Number of processed recordings in the selected period"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Hours Recorded"
            value={Math.round(metrics.hoursRecorded * 10) / 10}
            growth={metrics.growthPercentages.hours}
            tooltip="Total estimated hours of recorded content"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="AI Analyses"
            value={metrics.aiAnalyses}
            growth={metrics.growthPercentages.analyses}
            tooltip="Number of transcripts with AI-generated insights"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Bookmarks"
            value={metrics.bookmarks}
            growth={metrics.growthPercentages.bookmarks}
            tooltip="Number of starred/bookmarked recordings"
          />
        </Grid>
      </Grid>

      {/* Warning for transcripts with invalid dates */}
      {metrics.invalidDateCount > 0 && (
        <Typography color="warning" sx={{ mt: 2 }}>
          Warning: {metrics.invalidDateCount} transcripts have invalid dates and were skipped in calculations.
        </Typography>
      )}

      {/* Grid for various analytical charts, wrapped in an ErrorBoundary */}
      <ErrorBoundary FallbackComponent={ChartErrorFallback} resetKeys={[timeRange]}>
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
              {/* Pass the whole chartResponse object to AnalyticsChart */}
              <LineChart chartResponse={activityData} type="line" title="Activity Over Time" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
              <BarChart chartResponse={durationData} type="bar" title="Recording Duration" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
              <LineChart chartResponse={densityData} type="line" title="Conversation Density (WPM)" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
              {/* For Sentiment Trend, AnalyticsChart expects chartResponse prop.
                  The sentimentData state already matches ChartDataResponse structure. */}
              <LineChart chartResponse={sentimentData} type="line" title="Sentiment Trend" />
            </Paper>
          </Grid>
        </Grid>
      </ErrorBoundary>

      {/* ActivityHeatmap display, wrapped in its own ErrorBoundary.
          It now receives filteredTranscripts and timeRange directly. */}
      <ErrorBoundary FallbackComponent={ChartErrorFallback} resetKeys={[timeRange, filteredTranscripts]}>
        <Paper sx={{ mt: 4, p: 2 }}>
          <Typography variant="h6">Hourly Activity Pattern</Typography>
          <ActivityHeatmap transcripts={filteredTranscripts} timeRange={timeRange} />
        </Paper>
      </ErrorBoundary>

      {/* Recent activity list display */}
      <Paper sx={{ mt: 4, p: 2 }}>
        <Typography variant="h6">Recent Activity</Typography>
        <RecentActivityList items={recentActivity} />
      </Paper>
    </Box>
  );
};

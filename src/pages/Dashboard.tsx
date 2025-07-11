import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Paper, Typography, Select, MenuItem, FormControl, InputLabel, Box, Tooltip } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary'; // Added import (npm install react-error-boundary)
import { calculateDashboardMetrics, filterTranscriptsByTimeRange, getRecentActivity, generateActivityChartData, generateDurationChartData, generateConversationDensityData, generateHourlyActivityData, generateSentimentTrendData, TIME_RANGES } from '../utils/dashboardAnalytics';
import { Transcript } from '../types';

// Fixed imports based on repo structure (relative from src/pages/; no 'charts/' dir)
import MetricCard from '../components/AnalysisCard'; // Assuming AnalysisCard.tsx is your MetricCard; adjust if wrong (or use the placeholder above)
import LineChart from '../components/AnalyticsChart'; // Assuming AnalyticsChart.tsx is LineChart; adjust if it's a different file
import BarChart from '../components/AnalyticsChart'; // Same assumption; if separate, update path
import HeatmapChart from '../components/ActivityHeatmap'; // Matches ActivityHeatmap.tsx
import RecentActivityList from '../components/RecentActivityList'; // Exists in components/

import { fetchTranscripts } from '../services/apiService';

// Fallback component for ErrorBoundary (Added)
const ChartErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
    <Typography variant="h6">Something went wrong loading this chart</Typography>
    <Typography variant="body2">{error.message}</Typography>
    <button onClick={resetErrorBoundary}>Try again</button>
  </Box>
);

const Dashboard: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRecordings: 0,
    hoursRecorded: 0,
    aiAnalyses: 0,
    bookmarks: 0,
    recentActivity: 0,
    growthPercentages: {
      recordings: 0,
      hours: 0,
      analyses: 0,
      bookmarks: 0,
    },
    invalidDateCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchTranscripts();
        setTranscripts(data);
      } catch (error) {
        console.error('Failed to fetch transcripts:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (transcripts.length > 0) {
      const newMetrics = calculateDashboardMetrics(transcripts, timeRange);
      setMetrics(newMetrics);
    }
  }, [transcripts, timeRange]);

  const filteredTranscripts = useMemo(() => filterTranscriptsByTimeRange(transcripts, timeRange), [transcripts, timeRange]);

  const activityData = useMemo(() => generateActivityChartData(filteredTranscripts, timeRange), [filteredTranscripts, timeRange]);
  const durationData = useMemo(() => generateDurationChartData(filteredTranscripts, timeRange), [filteredTranscripts, timeRange]);
  const densityData = useMemo(() => generateConversationDensityData(filteredTranscripts, timeRange), [filteredTranscripts, timeRange]);
  const hourlyData = useMemo(() => generateHourlyActivityData(filteredTranscripts, timeRange), [filteredTranscripts, timeRange]);

  const [sentimentData, setSentimentData] = useState<ChartDataResponse>({ data: [], status: 'loading' });

  useEffect(() => {
    const loadSentiment = async () => {
      const data = await generateSentimentTrendData(filteredTranscripts, timeRange);
      setSentimentData(data);
    };
    loadSentiment();
  }, [filteredTranscripts, timeRange]);

  const recentActivity = useMemo(() => getRecentActivity(transcripts), [transcripts]);

  const handleTimeRangeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTimeRange(event.target.value as '7d' | '30d' | '90d' | 'all');
  };

  if (loading) {
    return <Typography>Loading dashboard...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

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

      {metrics.invalidDateCount > 0 && (
        <Typography color="warning" sx={{ mt: 2 }}>
          Warning: {metrics.invalidDateCount} transcripts have invalid dates and were skipped in calculations.
        </Typography>
      )}

      {/* Wrapped chart grid in ErrorBoundary */}
      <ErrorBoundary FallbackComponent={ChartErrorFallback} resetKeys={[timeRange]}>
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Activity Over Time</Typography>
              <LineChart data={activityData.data} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Recording Duration</Typography>
              <BarChart data={durationData.data} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Conversation Density (WPM)</Typography>
              <LineChart data={densityData.data} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Sentiment Trend</Typography>
              {sentimentData.status === 'loading' ? (
                <Typography>Loading sentiment data...</Typography>
              ) : (
                <LineChart data={sentimentData.data} />
              )}
            </Paper>
          </Grid>
        </Grid>
      </ErrorBoundary>

      {/* Wrapped hourly heatmap in its own ErrorBoundary */}
      <ErrorBoundary FallbackComponent={ChartErrorFallback} resetKeys={[timeRange]}>
        <Paper sx={{ mt: 4, p: 2 }}>
          <Typography variant="h6">Hourly Activity Pattern</Typography>
          <HeatmapChart data={hourlyData} />
        </Paper>
      </ErrorBoundary>

      <Paper sx={{ mt: 4, p: 2 }}>
        <Typography variant="h6">Recent Activity</Typography>
        <RecentActivityList items={recentActivity} />
      </Paper>
    </Box>
  );
};

export default Dashboard;

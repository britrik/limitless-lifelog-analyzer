import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Typography, Paper, Box, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';
import { format } from 'date-fns';

import { fetchTranscripts } from '../services/limitlessApi'; // Path to limitlessApi.ts (adjust if needed)
import { processAnalytics } from '../utils/dashboardAnalytics'; // Corrected: Relative to src/utils/dashboardAnalytics.ts
import { Transcript } from '../types';

import ActivityHeatmap from './ActivityHeatmap';
import SentimentTrendChart from './SentimentTrendChart';
import RecentActivityList from './RecentActivityList';
import TopSpeakers from './TopSpeakers';
import ErrorBoundary from './ErrorBoundary';

const Dashboard: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]); // Stores fetched lifelogs/transcripts
  const [analytics, setAnalytics] = useState({ // Processed analytics data for charts/lists
    sentimentTrend: [],
    activityHeatmap: [],
    topSpeakers: [],
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true); // Loading state for API fetches
  const [error, setError] = useState<string | null>(null); // Error messages for UI
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Date for filtering lifelogs

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch transcripts with optional date and timezone filters
      const { transcripts: fetchedTranscripts } = await fetchTranscripts(100, undefined, {
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined, // Format to API-expected YYYY-MM-DD
        timezone: 'Europe/London', // Default timezone; adjust based on user location
      });

      if (fetchedTranscripts.length === 0) {
        setError('No lifelogs found for the selected date. Try recording some with your Pendant or choose another date.');
      }

      setTranscripts(fetchedTranscripts);

      // Process analytics from fetched data
      const processedAnalytics = processAnalytics(fetchedTranscripts);
      setAnalytics(processedAnalytics);
    } catch (err) {
      console.error('Dashboard: Failed to fetch transcripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data. Please check your API key and network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      'Dashboard component mounted, initiating data load. Preserved features like Speaker Context are managed in their respective components (e.g., Lifelogs, TranscriptDetailModal).'
    );
    loadAllData();
  }, [selectedDate]); // Auto-refetch when selectedDate changes

  const memoizedAnalytics = useMemo(() => analytics, [analytics]); // Memoize to prevent unnecessary re-renders

  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1, p: 3, backgroundColor: 'background.default' }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        {/* Time Period Selector */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Select Date for Lifelogs"
            value={selectedDate}
            onChange={(newDate) => {
              setSelectedDate(newDate);
              loadAllData(); // Immediate refetch on date change
            }}
            slots={{ textField: (params) => <TextField {...params} sx={{ mb: 2 }} /> }}
          />
        </LocalizationProvider>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" variant="h6">
            {error}
          </Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 2, minHeight: 300 }}>
                <Typography variant="h6">Sentiment Trend</Typography>
                <SentimentTrendChart data={memoizedAnalytics.sentimentTrend} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 2, minHeight: 300 }}>
                <Typography variant="h6">Activity Heatmap</Typography>
                <ActivityHeatmap data={memoizedAnalytics.activityHeatmap} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6">Recent Activities</Typography>
                <RecentActivityList activities={memoizedAnalytics.recentActivities} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6">Top Speakers</Typography>
                <TopSpeakers speakers={memoizedAnalytics.topSpeakers} />
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default Dashboard;

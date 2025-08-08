import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { Grid, Typography, Paper, Box, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';
import { format } from 'date-fns';

import { fetchTranscripts } from '../services/limitlessApi'; // Correct: Relative to src/services/limitlessApi.ts
import { generateSentimentTrendData, generateHourlyActivityData, getRecentActivity } from '../utils/dashboardAnalytics'; // Correct: Relative to src/utils/dashboardAnalytics.ts
import { Transcript } from '../types'; // Correct: Relative to src/types.ts

import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { RecentActivityList } from '../components/RecentActivityList';

// Note: Removed imports/usages for missing files (TopSpeakers, ErrorBoundary). Other components from screenshot (e.g., HourlyActivity) can be added if needed.

export const Dashboard: React.FC = () => {  // Fixed: Changed to named export to match likely import in index.ts
  const [transcripts, setTranscripts] = useState<Transcript[]>([]); // Stores fetched lifelogs/transcripts
  const [analytics, setAnalytics] = useState<{
    sentimentTrend: ReturnType<typeof Array.prototype.slice>;
    activityHeatmap: Array<{ hour: number; activity: number; label: string }>;
    recentActivities: Array<{ id: string; type: 'recording' | 'analysis' | 'bookmark'; title: string; description: string; timestamp: string; relativeTime: string }>;
  }>({
    sentimentTrend: [],
    activityHeatmap: [],
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

      console.log('Fetched transcripts:', fetchedTranscripts); // Added for debugging API responses

      if (fetchedTranscripts.length === 0) {
        setError('No lifelogs found for the selected date. Try recording some with your Pendant or choose another date.');
        setAnalytics({ sentimentTrend: [], activityHeatmap: [], recentActivities: [] });
        return;
      }

      setTranscripts(fetchedTranscripts);

      // Process analytics using individual functions from dashboardAnalytics.ts
      // Use '30d' as default timeRange; can make this dynamic later
      const sentimentResult = await generateSentimentTrendData(fetchedTranscripts, '30d'); // Still process data (even if not displayed yet)
      const activityHeatmapData = generateHourlyActivityData(fetchedTranscripts, '30d');
      const recentActivitiesData = getRecentActivity(fetchedTranscripts, 5, '7d');

      setAnalytics({
        sentimentTrend: sentimentResult.data || [], // From generateSentimentTrendData (kept for future use)
        activityHeatmap: activityHeatmapData || [], // From generateHourlyActivityData
        recentActivities: recentActivitiesData || [], // From getRecentActivity
      });
    } catch (err) {
      console.error('Dashboard: Failed to fetch or process data:', err);
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

  // Custom textField with forwardRef to handle refs properly
  const CustomTextField = forwardRef<HTMLInputElement, React.ComponentProps<typeof TextField>>((props, ref) => (
    <TextField {...props} inputRef={ref} sx={{ mb: 2 }} />
  ));

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: 'background.default' }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Time Period Selector */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Select Date for Lifelogs"
          value={selectedDate}
          onChange={(newDate: Date | null) => setSelectedDate(newDate)} // Removed duplicate loadAllData() - useEffect handles it
          enableAccessibleFieldDOMStructure={false} // Fix for sectionListRef error when using custom textField with <input>
          slots={{ textField: CustomTextField }} // Use forwarded ref component
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
        </Grid>
      )}
    </Box>
  );
};

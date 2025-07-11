import { parseISO, isWithinInterval, subDays, format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Transcript, AnalysisType, ChartDataPoint, ChartDataResponse } from '../types';
// ChartDataPoint is now imported from ../types
import { performAnalysis } from '../services/geminiService';

// Cache for sentiment analysis results
const sentimentCache = new Map<string, number | null>();

// Define GroupBy type
export type GroupBy = 'day' | 'week' | 'month';

// Helper function to get default groupBy from timeRange
const getGroupByFromTimeRange = (timeRange: '7d' | '30d' | '90d' | 'all'): GroupBy => {
  switch (timeRange) {
    case '7d':
    case '30d':
      return 'day';
    case '90d':
      return 'week';
    case 'all':
      return 'month';
    default:
      return 'day'; // Default fallback, though should not be reached with current types
  }
};

export interface DashboardMetrics {
  totalRecordings: number;
  hoursRecorded: number;
  aiAnalyses: number;
  bookmarks: number;
  recentActivity: number;
  growthPercentages: {
    recordings: number;
    hours: number;
    analyses: number;
    bookmarks: number;
  };
  invalidDateCount: number;
}

export interface TimeRangeFilter {
  label: string;
  value: '7d' | '30d' | '90d' | 'all';
  days?: number;
}

export const TIME_RANGES: TimeRangeFilter[] = [
  { label: '7 days', value: '7d', days: 7 },
  { label: '30 days', value: '30d', days: 30 },
  { label: '90 days', value: '90d', days: 90 },
  { label: 'All time', value: 'all' },
];

// Estimate duration using API metadata if available, otherwise from content length.
const estimateDuration = (transcript: Transcript): number => {
  if (transcript.startTime && transcript.endTime) {
    try {
      const startDate = parseISO(transcript.startTime);
      const endDate = parseISO(transcript.endTime);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const diffMilliseconds = endDate.getTime() - startDate.getTime();
        if (diffMilliseconds >= 0) {
          // Convert milliseconds to hours
          return diffMilliseconds / (1000 * 60 * 60);
        } else {
          console.warn(`estimateDuration: endTime (${transcript.endTime}) is before startTime (${transcript.startTime}) for transcript ${transcript.id}. Falling back to content length estimation.`);
        }
      } else {
        console.warn(`estimateDuration: Invalid startTime or endTime for transcript ${transcript.id}. startTime: ${transcript.startTime}, endTime: ${transcript.endTime}. Falling back to content length estimation.`);
      }
    } catch (error) {
      console.warn(`estimateDuration: Error parsing startTime or endTime for transcript ${transcript.id}. Error: ${error}. Falling back to content length estimation.`);
    }
  } else {
    // console.log(`estimateDuration: Missing startTime or endTime for transcript ${transcript.id}. Falling back to content length estimation.`); // Optional: log if fields are missing
  }

  // Fallback: Estimate duration from content length (rough approximation)
  const wordCount = transcript.content.length / 5; // Assume ~5 characters per word
  const durationHours = wordCount / 150; // Assume ~150 words per minute
  return Math.max(durationHours, 0.1); // Minimum 0.1 hours (6 minutes)
};

// Check if transcript has been analyzed
const hasAnalysis = (transcript: Transcript): boolean => {
  return Boolean(transcript.summary && transcript.summary.length > 50);
};

// Filter transcripts by time range

export const filterTranscriptsByTimeRange = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all'
): Transcript[] => {
  if (timeRange === 'all') return transcripts;

  const now = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = subDays(now, days);

  return transcripts.filter(transcript => {
    try {
      const date = parseISO(transcript.date);
      // Check if date is valid after parsing
      if (isNaN(date.getTime())) {
        console.warn(`Skipping transcript with invalid date: ${transcript.id}`);
        return false;
      }
      return isWithinInterval(date, { start: startDate, end: now });
    } catch {
      // This catch block might be redundant if parseISO doesn't throw for all invalid date strings
      // but good to keep for other potential errors during date operations.
      console.warn(`Skipping transcript due to error processing date: ${transcript.id}`);
      return false;
    }
  });
};

// Calculate dashboard metrics
export const calculateDashboardMetrics = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all'
): DashboardMetrics => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);
  let invalidDateCount = 0;

  // Recalculate invalidDateCount for the current time range based on the initial filter logic.
  // This is a bit redundant as filterTranscriptsByTimeRange already filters them out and logs.
  // However, to accurately count *within this function's scope* for the given timeRange:
  const nowForCount = new Date();
  const daysForCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDateForCount = timeRange === 'all' ? null : subDays(nowForCount, daysForCount);

  transcripts.forEach(transcript => {
    if (timeRange !== 'all' && startDateForCount) {
      try {
        const date = parseISO(transcript.date);
        if (isNaN(date.getTime())) {
          // This check is important: only count if it would have been in the date range
          // We need a proxy for whether it *would* have been considered if the date was valid.
          // This is tricky. For simplicity, we'll count all invalid dates in the raw `transcripts`
          // array if they fall within the *intended* period, assuming a valid date.
          // This might slightly overcount if parseISO itself fails for non-date related reasons.
          // A more robust way would be to inspect `transcript.date` format if possible.
          invalidDateCount++;
        } else if (!isWithinInterval(date, { start: startDateForCount, end: nowForCount })) {
          // Date is valid but outside range, do nothing.
        }
      } catch {
        // Catch errors from parseISO itself for malformed strings
        invalidDateCount++;
      }
    } else if (timeRange === 'all') { // For 'all time', count all that fail to parse
        try {
            const date = parseISO(transcript.date);
            if (isNaN(date.getTime())) {
                invalidDateCount++;
            }
        } catch {
            invalidDateCount++;
        }
    }
  });
  
  // Current period metrics
  const totalRecordings = filteredTranscripts.length;
  const hoursRecorded = filteredTranscripts.reduce((sum, t) => sum + estimateDuration(t), 0);
  const aiAnalyses = filteredTranscripts.filter(hasAnalysis).length;
  const bookmarks = filteredTranscripts.filter(t => t.isStarred).length;
  const recentActivity = filterTranscriptsByTimeRange(transcripts, '7d').length;
  
  // Calculate growth percentages (compare with previous period)
  let growthPercentages = {
    recordings: 0,
    hours: 0,
    analyses: 0,
    bookmarks: 0,
  };
  
  if (timeRange !== 'all') {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const now = new Date();
    const previousStart = subDays(now, days * 2);
    const previousEnd = subDays(now, days);
    
    const previousTranscripts = transcripts.filter(transcript => {
      try {
        const date = parseISO(transcript.date);
        return isWithinInterval(date, { start: previousStart, end: previousEnd });
      } catch {
        return false;
      }
    });
    
    const prevRecordings = previousTranscripts.length;
    const prevHours = previousTranscripts.reduce((sum, t) => sum + estimateDuration(t), 0);
    const prevAnalyses = previousTranscripts.filter(hasAnalysis).length;
    const prevBookmarks = previousTranscripts.filter(t => t.isStarred).length;
    
    growthPercentages = {
      recordings: prevRecordings < 5 ? NaN : prevRecordings === 0 ? (totalRecordings > 0 ? 100 : 0) : ((totalRecordings - prevRecordings) / prevRecordings) * 100,
      hours: prevHours < 5 ? NaN : prevHours === 0 ? (hoursRecorded > 0 ? 100 : 0) : ((hoursRecorded - prevHours) / prevHours) * 100,
      analyses: prevAnalyses < 5 ? NaN : prevAnalyses === 0 ? (aiAnalyses > 0 ? 100 : 0) : ((aiAnalyses - prevAnalyses) / prevAnalyses) * 100,
      bookmarks: prevBookmarks < 5 ? NaN : prevBookmarks === 0 ? (bookmarks > 0 ? 100 : 0) : ((bookmarks - prevBookmarks) / prevBookmarks) * 100,
    };
  }
  
  return {
    totalRecordings,
    hoursRecorded,
    aiAnalyses,
    bookmarks,
    recentActivity,
    growthPercentages,
    invalidDateCount,
  };
};

// Generate chart data for activity over time

export const generateActivityChartData = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy
): ChartDataResponse => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const groupBy: GroupBy = customGroupBy ?? getGroupByFromTimeRange(timeRange);

  // Group transcripts by time period
  const groups: Record<string, { transcripts: Transcript[], sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string;
      let sortDate: Date;

      switch (groupBy) { // Use the new 'groupBy' constant
        case 'day':
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
          break;
        case 'week':
          const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          break;
        case 'month':
          key = format(date, 'MMM yyyy');
          sortDate = startOfMonth(date);
          break;
        default:
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
      }

      if (!groups[key]) {
        groups[key] = { transcripts: [], sortDate };
      }
      groups[key].transcripts.push(transcript);
    } catch {
      console.warn(`Skipping transcript with invalid date: ${transcript.id}`);
    }
  });

  // Convert to chart data and sort by date
  const chartDataPoints = Object.entries(groups)
    .map(([dateLabel, { transcripts, sortDate }]) => ({
      date: dateLabel,
      value: transcripts.length,
      label: `${transcripts.length} recording${transcripts.length !== 1 ? 's' : ''}`,
    }))
    .sort((a, b) => {
      // Sort by the actual date, not the label
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });

  const status = chartDataPoints.length ? 'success' : 'no-data';
  const message = status === 'no-data' ? 'No activity data to display for the selected period and grouping.' : undefined;
  return { data: chartDataPoints, status, message };
};

// Generate duration chart data
export const generateDurationChartData = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy
): ChartDataResponse => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const groupBy: GroupBy = customGroupBy ?? getGroupByFromTimeRange(timeRange);

  // Group by time period and sum durations
  const groups: Record<string, { duration: number, sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string;
      let sortDate: Date;

      switch (groupBy) { // Use the new 'groupBy' constant
        case 'day':
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
          break;
        case 'week':
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          break;
        case 'month':
          key = format(date, 'MMM yyyy');
          sortDate = startOfMonth(date);
          break;
        default:
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
      }

      const duration = estimateDuration(transcript);

      if (!groups[key]) {
        groups[key] = { duration: 0, sortDate };
      }
      groups[key].duration += duration;
    } catch {
      console.warn(`Skipping transcript with invalid date: ${transcript.id}`);
    }
  });

  const chartDataPointsResult = Object.entries(groups)
    .map(([dateLabel, { duration, sortDate }]) => {
      const numericValue = Number(duration); // Ensure duration is treated as a number
      const value = isNaN(numericValue) ? 0 : Math.round(numericValue * 10) / 10;
      return {
        date: dateLabel,
        value: value,
        label: `${value} hours`,
      };
    })
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });

  const status = chartDataPointsResult.length ? 'success' : 'no-data';
  const message = status === 'no-data' ? 'No duration data to display for the selected period and grouping.' : undefined;
  return { data: chartDataPointsResult, status, message };
};

// Get recent activity items
export interface ActivityItem {
  id: string;
  type: 'recording' | 'analysis' | 'bookmark';
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
}

export const getRecentActivity = (
  transcripts: Transcript[],
  limit: number = 5,
  timeRange: '7d' | '30d' | '90d' | 'all' = '7d'
): ActivityItem[] => {
  const activities: ActivityItem[] = [];

  // Get recent transcripts based on timeRange
  const recentTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange)
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .slice(0, limit);

  recentTranscripts.forEach(transcript => {
    const date = parseISO(transcript.date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    let relativeTime: string;
    if (diffHours < 1) {
      relativeTime = 'Just now';
    } else if (diffHours < 24) {
      relativeTime = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      relativeTime = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    // Add recording activity
    activities.push({
      id: `recording-${transcript.id}`,
      type: 'recording',
      title: 'New recording processed',
      description: transcript.title,
      timestamp: transcript.date,
      relativeTime,
    });

    // Add analysis activity if available
    if (hasAnalysis(transcript)) {
      activities.push({
        id: `analysis-${transcript.id}`,
        type: 'analysis',
        title: 'AI analysis completed',
        description: `Generated insights for ${transcript.title}`,
        timestamp: transcript.date,
        relativeTime,
      });
    }

    // Add bookmark activity if starred
    if (transcript.isStarred) {
      activities.push({
        id: `bookmark-${transcript.id}`,
        type: 'bookmark',
        title: 'Recording bookmarked',
        description: transcript.title,
        timestamp: transcript.date,
        relativeTime,
      });
    }
  });

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
    .slice(0, limit);
};

// Generate conversation density chart data (words per minute over time)
export const generateConversationDensityData = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy
): ChartDataResponse => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const groupBy: GroupBy = customGroupBy ?? getGroupByFromTimeRange(timeRange);

  // Group by time period and calculate average conversation density
  const groups: Record<string, { totalWords: number; totalDuration: number; count: number; sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string;
      let sortDate: Date;

      switch (groupBy) { // Use the new 'groupBy' constant
        case 'day':
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
          break;
        case 'week':
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          break;
        case 'month':
          key = format(date, 'MMM yyyy');
          sortDate = startOfMonth(date);
          break;
      }

      // Estimate words (rough: content length / 5 characters per word)
      const wordCount = Math.round(transcript.content.length / 5);
      // Get duration in hours from estimateDuration, then convert to minutes
      const durationHours = estimateDuration(transcript);
      const durationMinutes = Math.max(1, durationHours * 60); // Ensure at least 1 minute to avoid division by zero

      if (!groups[key]) {
        groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate };
      }

      groups[key].totalWords += wordCount;
      groups[key].totalDuration += durationMinutes;
      groups[key].count += 1;
    } catch {
      console.warn(`Skipping transcript with invalid date: ${transcript.id}`);
    }
  });

  const chartDataPointsResult = Object.entries(groups)
    .map(([dateLabel, data]) => {
      const WPM = (data.totalDuration > 0 && typeof data.totalWords === 'number' && !isNaN(data.totalWords))
                   ? (data.totalWords / data.totalDuration)
                   : 0;
      const value = isNaN(WPM) ? 0 : Math.round(WPM * 10) / 10;
      return {
        date: dateLabel,
        value: value,
        label: `${value} WPM`,
      };
    })
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });

  const status = chartDataPointsResult.length ? 'success' : 'no-data';
  const message = status === 'no-data' ? 'No conversation density data to display for the selected period and grouping.' : undefined;
  return { data: chartDataPointsResult, status, message };
};

// Generate hourly activity pattern data
export const generateHourlyActivityData = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all'
): Array<{ hour: number; activity: number; label: string }> => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Initialize 24-hour array
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    activity: 0,
    count: 0,
    label: `${hour.toString().padStart(2, '0')}:00`
  }));

  filteredTranscripts.forEach(transcript => {
    try {
      let date = parseISO(transcript.date);
      if (isNaN(date.getTime())) {
        console.warn(`Skipping transcript with invalid date for hourly data: ${transcript.id}`);
        return; // Skip this transcript
      }

      // Normalize to local time zone, fallback to UTC
      try {
        const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localizedDateString = date.toLocaleString('en-US', { timeZone: localTimeZone });
        date = new Date(localizedDateString); // Re-parse the date string that's now in local time
        if (isNaN(date.getTime())) { // Fallback if localized date string is invalid
            console.warn(`Failed to convert date to local time zone for transcript ${transcript.id}, using UTC.`);
            date = parseISO(transcript.date); // Re-parse as UTC
        }
      } catch (tzError) {
        console.warn(`Error getting local time zone or converting date for transcript ${transcript.id}, defaulting to UTC. Error: ${tzError}`);
        // Date is already parsed as UTC if parseISO was successful initially
        date = parseISO(transcript.date); // Ensure it's the original UTC date if any error occurred
         if (isNaN(date.getTime())) { // Should not happen if first check passed, but as safeguard
            console.warn(`Skipping transcript with invalid date after TZ fallback: ${transcript.id}`);
            return;
        }
      }

      const hour = date.getHours();

      // Calculate activity score (words per transcript as proxy for engagement)
      const wordCount = Math.round(transcript.content.length / 5);

      hourlyData[hour].activity += wordCount;
      hourlyData[hour].count += 1;
    } catch {
      console.warn(`Skipping transcript with invalid date: ${transcript.id}`);
    }
  });

  // Calculate average activity per hour
  return hourlyData.map(data => ({
    hour: data.hour,
    activity: data.count > 0 ? Math.round(data.activity / data.count) : 0,
    label: data.label
  }));
};

export const generateSentimentTrendData = async (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy
): Promise<ChartDataResponse> => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const groupBy: GroupBy = customGroupBy ?? getGroupByFromTimeRange(timeRange);

  // Group by time period and calculate sentiment proxy
  const groups: Record<string, { positiveWords: number; totalWords: number; count: number; sortDate: Date; sentimentSum?: number }> = {};

  // Simple positive word indicators (can be enhanced)
  const positiveWordsList = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'excited', 'awesome', 'perfect', 'brilliant', 'outstanding'];
  const negativeWordsList = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'frustrated', 'angry', 'sad', 'disappointed', 'worried', 'stressed', 'difficult', 'problem', 'issue', 'wrong'];

  // Use an async IIFE to handle promises within the synchronous function structure if needed,
  // or refactor parent functions to be async. For now, let's assume direct async processing.
  // This function will need to become async.
  const processTranscriptSentiment = async (transcript: Transcript): Promise<number> => {
    if (sentimentCache.has(transcript.id)) {
      // Ensure cached value is not null before returning, default to 0 if it is (though cache should store numbers)
      return sentimentCache.get(transcript.id) ?? 0;
    }

    let score = 0; // Default score to 0

    try {
      const analysisResult = await performAnalysis(transcript.content, AnalysisType.SENTIMENT);

      // Expect analysisResult.data to be { score: number, label: string } from geminiService fallback or actual API
      if (analysisResult.data && typeof analysisResult.data.score === 'number') {
        score = analysisResult.data.score;
      } else {
        // This case should be rare if geminiService.ts handles its fallbacks correctly for SENTIMENT.
        // This acts as a secondary fallback or if the structure from Gemini is unexpectedly different.
        console.warn(`Sentiment data for transcript ${transcript.id} not in expected {score, label} format. Data: `, analysisResult.data, ` Using default score 0.`);
        // No word-list fallback here as per reclarified request; geminiService provides the primary fallback.
        // If geminiService guarantees {score:0, label:'neutral'}, this 'else' might only catch truly bizarre API responses.
      }
    } catch (error) {
      // This catch block is if performAnalysis itself throws an error, which it shouldn't for SENTIMENT type
      // due to changes in geminiService.ts. Included for robustness.
      console.error(`Error processing sentiment for transcript ${transcript.id}: ${error}. Defaulting score to 0.`);
      // Score remains 0 as initialized
    }

    // Ensure score is a valid number and within bounds, default to 0 if NaN
    const finalScore = (!isNaN(score) && score !== null) ? Math.max(-100, Math.min(100, score)) : 0;
    sentimentCache.set(transcript.id, finalScore);
    return finalScore;
  };

  // This function needs to be async due to processTranscriptSentiment
  // We'll collect all promises and then process them.
  const promises = filteredTranscripts.map(async transcript => {
    try {
      const date = parseISO(transcript.date);
      if (isNaN(date.getTime())) {
        console.warn(`Skipping transcript with invalid date in sentiment processing: ${transcript.id}`);
        return null; // Skip if date is invalid
      }
      let key: string;
      let sortDate: Date;

      switch (groupBy) {
        case 'day':
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
          break;
        case 'week':
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          break;
        case 'month':
          key = format(date, 'MMM yyyy');
          sortDate = startOfMonth(date);
          break;
        default: // Should not happen with current types, but good for safety
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
          break;
      }

      const sentimentScore = await processTranscriptSentiment(transcript);

      if (sentimentScore === null) return null; // Skip if sentiment processing failed entirely

      return { key, sortDate, sentimentScore };
    } catch (error) { // Catches errors from date parsing primarily
      console.warn(`Skipping transcript with invalid date: ${transcript.id}`, error);
      return null;
    }
  });

  // Resolve all promises and then group
  // This function `generateSentimentTrendData` must be declared async.
  // For now, this change implies that callers of generateSentimentTrendData must await it.
  // This is a significant change. Assuming this is acceptable.

  // The function signature needs to be changed to:
  // export const generateSentimentTrendData = async ( ... ): Promise<ChartDataPoint[]> => { ... }
  // I will make this change in a separate step if required, for now focusing on the logic.

  // The following processing needs to happen after all promises resolve.
  // This requires `generateSentimentTrendData` to be `async` and use `await Promise.all(promises)`.
  // Let's simulate this for now, assuming the function is async.

  // Placeholder for the actual async transformation of the function:
  // const processedResults = await Promise.all(promises);
  // For now, I'll write the grouping logic as if `processedResults` is available.
  // This will require a follow-up to make the function truly async.

  // The grouping logic will be applied to the results of the promises.
  // This current implementation will not work directly without making generateSentimentTrendData async.
  // I will proceed with the logic assuming it becomes async.
  // The tool does not allow me to change the function signature and body in one go easily.

  // Correct approach: The function itself must be async.
  // I will attempt to make the function async and then process.
  // If the tool has limitations, I'll note it.

  // For demonstration, let's assume we can make it async and process results:
  // This function needs to be declared async.
  // The following is conceptual until the function is made async.
  // const results = await Promise.all(promises);
  // results.forEach(result => {
  // if (result) {
  // if (!groups[result.key]) {
  // groups[result.key] = { sentimentSum: 0, count: 0, sortDate: result.sortDate };
  // }
  // groups[result.key].sentimentSum += result.sentimentScore;
  // groups[result.key].count += 1;
  // }
  // });
  // The return map also changes.

  // Given the constraints, I will first write the fallback logic correctly and the API call.
  // The full async conversion might need to be a separate step or manual intervention.

  // Rewriting the loop part to be more direct if we assume it's made async.
  // This will be part of an async function.
  // Removed IIFE, directly using await in the async function
  for (const transcript of filteredTranscripts) {
    try {
      const date = parseISO(transcript.date);
      if (isNaN(date.getTime())) {
          console.warn(`Skipping transcript with invalid date in sentiment processing: ${transcript.id}`);
          continue;
      }
      let key: string;
      let sortDate: Date;

      switch (groupBy) { // Use the new 'groupBy' constant
        case 'day': key = format(date, 'MMM dd, yyyy'); sortDate = startOfDay(date); break;
        case 'week': const weekStart = startOfWeek(date, { weekStartsOn: 1 }); key = format(weekStart, 'MMM dd, yyyy'); sortDate = weekStart; break;
        case 'month': key = format(date, 'MMM yyyy'); sortDate = startOfMonth(date); break;
        default: key = format(date, 'MMM dd, yyyy'); sortDate = startOfDay(date); break;
      }

      const sentimentScore = await processTranscriptSentiment(transcript);
      if (sentimentScore === null) continue;

      if (!groups[key]) {
        // Storing sum of scores and count to average later
        // Initialize with correct type for sentimentSum
        groups[key] = { positiveWords: 0, totalWords: 0, count: 0, sortDate, sentimentSum: 0 };
      }

      // Let's adapt to store sum of scores directly.
      groups[key].sentimentSum! += sentimentScore; // Using non-null assertion as it's initialized
      groups[key].count += 1;
      // totalWords from the original structure is not directly used for averaging sentiment scores here
    } catch (error) {
      console.warn(`Skipping transcript ${transcript.id} due to error during sentiment processing loop: ${error}`);
    }
  }

  // The function `generateSentimentTrendData` MUST be `async`.
  // I will proceed assuming that modification is made.
  // The loop should be a standard for...of loop within the async function.

  // Corrected structure (conceptual, assuming function is async):
  // for (const transcript of filteredTranscripts) { ... await processTranscriptSentiment(transcript); ... }
  // Then the return map:

  const chartDataPoints = Object.entries(groups)
    .map(([dateLabel, data]: [string, any]) => ({ // data is explicitly 'any' due to dynamic property 'sentimentSum'
      date: dateLabel,
      value: data.count > 0 ? Math.round((data.sentimentSum / data.count) * 10) / 10 : 0,
      label: `${data.count > 0 ? Math.round((data.sentimentSum / data.count) * 10) / 10 : 0} sentiment score`,
    }))
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });

  const status = chartDataPoints.length ? 'success' : 'no-data';
  const message = status === 'no-data' ? 'No sentiment data to display for the selected period and grouping.' : undefined;
  return { data: chartDataPoints, status, message };
};
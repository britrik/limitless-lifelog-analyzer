import { parseISO, isWithinInterval, subDays, format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Transcript, TimeRange, GroupBy } from '../types'; // Added TimeRange, GroupBy
import { ChartDataPoint } from '../components/AnalyticsChart';

// Added getGroupByFromTimeRange function
export const getGroupByFromTimeRange = (timeRange: TimeRange): GroupBy => {
  const map: Record<TimeRange, GroupBy> = {
    '24h': 'hour',
    '7d': 'day',
    '30d': 'day',
    '90d': 'week', // Matching the updated TimeRange type
    '12w': 'week',
    '52w': 'week',
    'all': 'month',
  };
  return map[timeRange] || 'day'; // Default to 'day'
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

// Estimate duration from content length (rough approximation)
const estimateDuration = (content: string): number => {
  // Assume ~150 words per minute, ~5 characters per word
  const wordCount = content.length / 5;
  return Math.max(wordCount / 150, 0.1); // Minimum 0.1 hours (6 minutes)
};

// Check if transcript has been analyzed
const hasAnalysis = (transcript: Transcript): boolean => {
  return Boolean(transcript.summary && transcript.summary.length > 50);
};

// Filter transcripts by time range

export const filterTranscriptsByTimeRange = (
  transcripts: Transcript[],
  timeRange: TimeRange // Updated to use the broader TimeRange type
): Transcript[] => {
  if (timeRange === 'all') return transcripts;

  // Find the configuration for the given timeRange (e.g., number of days)
  const rangeConfig = TIME_RANGES.find(r => r.value === timeRange);

  // If the timeRange is not one of '7d', '30d', '90d' from TIME_RANGES,
  // or if it's '24h', '12w', '52w' which don't have 'days' defined in TIME_RANGES,
  // this function might not be suitable, or needs specific logic for them.
  // For '24h', generateActivityChartData handles it separately.
  // For now, if no 'days' are found, we'll return all transcripts to be safe,
  // as this function is primarily designed for day-based filtering from TIME_RANGES.
  if (!rangeConfig || typeof rangeConfig.days !== 'number') {
    // console.warn(`filterTranscriptsByTimeRange: No 'days' configuration for timeRange '${timeRange}'. Returning all transcripts.`);
    // For '24h', '12w', '52w', etc., if they are passed here without a 'days' config.
    // It's better to let functions like generateActivityChartData handle their specific filtering.
    return transcripts; // Or handle more specific cases if needed
  }

  const now = new Date();
  // Filter from the start of 'days' ago to now.
  const startDate = subDays(startOfDay(now), rangeConfig.days -1);


  return transcripts.filter(transcript => {
    try {
      const date = parseISO(transcript.date);
      return isWithinInterval(date, { start: startDate, end: now });
    } catch {
      return false;
    }
  });
};

// Calculate dashboard metrics
export const calculateDashboardMetrics = (
  transcripts: Transcript[],
  timeRange: TimeRange // Updated to use the broader TimeRange type
): DashboardMetrics => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);
  
  // Current period metrics
  const totalRecordings = filteredTranscripts.length;
  const hoursRecorded = filteredTranscripts.reduce((sum, t) => sum + estimateDuration(t.content), 0);
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
    const prevHours = previousTranscripts.reduce((sum, t) => sum + estimateDuration(t.content), 0);
    const prevAnalyses = previousTranscripts.filter(hasAnalysis).length;
    const prevBookmarks = previousTranscripts.filter(t => t.isStarred).length;
    
    growthPercentages = {
      recordings: prevRecordings === 0 ? (totalRecordings > 0 ? 100 : 0) : ((totalRecordings - prevRecordings) / prevRecordings) * 100,
      hours: prevHours === 0 ? (hoursRecorded > 0 ? 100 : 0) : ((hoursRecorded - prevHours) / prevHours) * 100,
      analyses: prevAnalyses === 0 ? (aiAnalyses > 0 ? 100 : 0) : ((aiAnalyses - prevAnalyses) / prevAnalyses) * 100,
      bookmarks: prevBookmarks === 0 ? (bookmarks > 0 ? 100 : 0) : ((bookmarks - prevBookmarks) / prevBookmarks) * 100,
    };
  }
  
  return {
    totalRecordings,
    hoursRecorded,
    aiAnalyses,
    bookmarks,
    recentActivity,
    growthPercentages,
  };
};

import dayjs from 'dayjs'; // Import dayjs

// Generate chart data for activity over time
export const generateActivityChartData = (
  transcripts: Transcript[],
  timeRange: TimeRange, // Use the global TimeRange type
): ChartDataPoint[] => {
  let relevantTranscripts = transcripts;

  // For '24h', filter to the last 24 hours directly.
  // For other ranges, use filterTranscriptsByTimeRange.
  if (timeRange === '24h') {
    const twentyFourHoursAgo = dayjs().subtract(24, 'hours');
    relevantTranscripts = transcripts.filter(t => {
      try {
        return dayjs(t.date).isAfter(twentyFourHoursAgo);
      } catch {
        return false;
      }
    });
  } else {
    relevantTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);
  }

  if (relevantTranscripts.length === 0) return [];

  const groupBy = getGroupByFromTimeRange(timeRange);

  // Group transcripts by time period using dayjs
  const groups: Record<number, { date: dayjs.Dayjs; count: number }> = {};

  relevantTranscripts.forEach(transcript => {
    try {
      const date = dayjs(transcript.date); // Ensure date is valid dayjs object
      if (!date.isValid()) return; // Skip if date is invalid

      const groupKey = date.startOf(groupBy).valueOf();

      if (!groups[groupKey]) {
        groups[groupKey] = { date: date.startOf(groupBy), count: 0 };
      }
      groups[groupKey].count += 1;
    } catch {
      // Skip errors during date parsing or processing for a single transcript
    }
  });

  // Get sorted keys
  const sortedKeys = Object.keys(groups)
    .map(key => parseInt(key, 10))
    .sort((a, b) => a - b);

  // Convert to chart data
  return sortedKeys.map(key => {
    const group = groups[key];
    let dateFormat: string;
    switch (groupBy) {
      case 'hour':
        dateFormat = 'MMM DD, HH:00';
        break;
      case 'day':
        dateFormat = 'MMM DD, YYYY';
        break;
      case 'week':
        // For weeks, label with the start of the week.
        dateFormat = `Week of ${group.date.format('MMM DD, YYYY')}`;
        break;
      case 'month':
        dateFormat = 'MMM YYYY';
        break;
      default:
        dateFormat = 'MMM DD, YYYY';
    }
    return {
      date: group.date.format(dateFormat), // Use formatted date string
      value: group.count, // Ensure value is a number
      label: `${group.count} recording${group.count !== 1 ? 's' : ''}`,
    };
  });
};

// Generate duration chart data
export const generateDurationChartData = (
  transcripts: Transcript[],
  timeRange: TimeRange // Updated to use the broader TimeRange type
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  const groupBy = getGroupByFromTimeRange(timeRange); // Use new utility

  // Group by time period and sum durations
  const groups: Record<string, { duration: number, sortDate: Date, count: number }> = {}; // Added count for averaging if needed

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string = format(date, 'MMM dd, yyyy'); // Default key
      let sortDate: Date = startOfDay(date); // Default sortDate

      switch (groupBy) {
        case 'hour': // Added hour case
          key = format(date, 'MMM dd, HH:00');
          sortDate = date; // Use actual date for hourly sorting, or startOf('hour', date)
          break;
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
        // Default case is covered by initial assignment
      }

      const duration = estimateDuration(transcript.content);

      if (!groups[key]) {
        groups[key] = { duration: 0, sortDate, count: 0 };
      }
      groups[key].duration += duration;
      groups[key].count++; // Increment count
    } catch {
      // Skip invalid dates
    }
  });

  return Object.entries(groups)
    .map(([dateLabel, { duration, sortDate }]) => ({
      date: dateLabel,
      value: Math.round(duration * 10) / 10, // Round to 1 decimal place
      label: `${Math.round(duration * 10) / 10} hours`,
    }))
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });
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
  timeRange: TimeRange = '7d' // Updated to use the broader TimeRange type
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
  timeRange: TimeRange // Updated to use the broader TimeRange type
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  const groupBy = getGroupByFromTimeRange(timeRange); // Use new utility

  // Group by time period and calculate average conversation density
  // Changed totalDuration to totalDurationMinutes for clarity
  const groups: Record<string, { totalWords: number; totalDurationMinutes: number; count: number; sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string = format(date, 'MMM dd, yyyy'); // Default key
      let sortDate: Date = startOfDay(date); // Default sortDate

      switch (groupBy) {
        case 'hour': // Added hour case
          key = format(date, 'MMM dd, HH:00');
          sortDate = date;
          break;
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
        // Default case is covered by initial assignment
      }

      // Estimate words (rough: content length / 5 characters per word)
      const wordCount = Math.round(transcript.content.length / 5);
      // Estimate duration in minutes (rough: 150 words per minute speaking rate)
      const durationMinutes = Math.max(1, wordCount / 150); // Min 1 minute to avoid division by zero

      if (!groups[key]) {
        // Use totalDurationMinutes here
        groups[key] = { totalWords: 0, totalDurationMinutes: 0, count: 0, sortDate };
      }

      groups[key].totalWords += wordCount;
      groups[key].totalDurationMinutes += durationMinutes; // Use totalDurationMinutes here
      groups[key].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.entries(groups)
    .map(([dateLabel, data]) => ({
      date: dateLabel,
      // Use totalDurationMinutes here
      value: data.count > 0 ? Math.round(data.totalWords / data.totalDurationMinutes) : 0,
      label: `${data.count > 0 ? Math.round(data.totalWords / data.totalDurationMinutes) : 0} WPM`,
    }))
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });
};

// Generate hourly activity pattern data
export const generateHourlyActivityData = (
  transcripts: Transcript[],
  timeRange: TimeRange // Updated to use the broader TimeRange type
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
      const date = parseISO(transcript.date);
      const hour = date.getHours();

      // Calculate activity score (words per transcript as proxy for engagement)
      const wordCount = Math.round(transcript.content.length / 5);

      hourlyData[hour].activity += wordCount;
      hourlyData[hour].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  // Calculate average activity per hour
  return hourlyData.map(data => ({
    hour: data.hour,
    activity: data.count > 0 ? Math.round(data.activity / data.count) : 0,
    label: data.label
  }));
};

export const generateSentimentTrendData = (
  transcripts: Transcript[],
  timeRange: TimeRange // Updated to use the broader TimeRange type
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  const groupBy = getGroupByFromTimeRange(timeRange); // Use new utility

  // Group by time period and calculate sentiment proxy
  // Renamed positiveWords to sentimentScoreSum for clarity, and removed totalWords as it's not used for final value.
  const groups: Record<string, { sentimentScoreSum: number; count: number; sortDate: Date }> = {};

  // Simple positive word indicators (can be enhanced)
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'excited', 'awesome', 'perfect', 'brilliant', 'outstanding'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'frustrated', 'angry', 'sad', 'disappointed', 'worried', 'stressed', 'difficult', 'problem', 'issue', 'wrong'];

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string = format(date, 'MMM dd, yyyy'); // Default key
      let sortDate: Date = startOfDay(date); // Default sortDate

      switch (groupBy) {
        case 'hour': // Added hour case
          key = format(date, 'MMM dd, HH:00');
          sortDate = date;
          break;
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
        // Default case is covered by initial assignment
      }

      const content = transcript.content.toLowerCase();

      const positiveCount = positiveWords.reduce((count, word) =>
        count + (content.match(new RegExp(word, 'g')) || []).length, 0);
      const negativeCount = negativeWords.reduce((count, word) =>
        count + (content.match(new RegExp(word, 'g')) || []).length, 0);

      const totalWords = Math.max(1, content.split(/\s+/).length); // Avoid division by zero
      const sentimentScore = (positiveCount - negativeCount) / totalWords * 100;


      if (!groups[key]) {
        // Use sentimentScoreSum here
        groups[key] = { sentimentScoreSum: 0, count: 0, sortDate };
      }

      groups[key].sentimentScoreSum += sentimentScore; // Use sentimentScoreSum
      groups[key].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.entries(groups)
    .map(([dateLabel, data]) => ({
      date: dateLabel,
      // Use sentimentScoreSum here for the average
      value: data.count > 0 ? Math.round(data.sentimentScoreSum / data.count) : 0,
      label: `Sentiment: ${(data.count > 0 ? Math.round(data.sentimentScoreSum / data.count) : 0)}`,
    }))
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });
};
import { parseISO, isWithinInterval, subDays, format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Transcript } from '../types';
import { ChartDataPoint } from '../components/AnalyticsChart';

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

import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'; // Import isBetween plugin
dayjs.extend(isBetween); // Extend dayjs with the plugin

export interface TimeRangeFilter {
  label: string;
  value: '24h' | '7d' | '30d' | '90d' | 'all';
  days?: number; // days will not be relevant for '24h' in the same way, but kept for structure
}

export const TIME_RANGES: TimeRangeFilter[] = [
  { label: '24 hours', value: '24h' }, // No 'days' needed here as it's handled differently
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
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
): Transcript[] => {
  if (timeRange === 'all') return transcripts;

  if (timeRange === '24h') {
    const endTime = dayjs(); // now
    const startTime = endTime.subtract(24, 'hour');
    return transcripts.filter(transcript => {
      try {
        const date = dayjs(transcript.date); // Use dayjs to parse
        return date.isBetween(startTime, endTime, null, '[)'); // [) includes start, excludes end
      } catch {
        return false;
      }
    });
  }

  // Handle '7d', '30d', '90d'
  const now = new Date(); // date-fns works with Date objects
  const daysToSubtract = TIME_RANGES.find(tr => tr.value === timeRange)?.days || 0;
  if (daysToSubtract === 0) return transcripts; // Should not happen if timeRange is valid and not 'all' or '24h'

  const startDate = subDays(now, daysToSubtract);

  return transcripts.filter(transcript => {
    try {
      const date = parseISO(transcript.date); // date-fns parse
      return isWithinInterval(date, { start: startDate, end: now });
    } catch {
      return false;
    }
  });
};

// Calculate dashboard metrics
export const calculateDashboardMetrics = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
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

// Generate chart data for activity over time

export const generateActivityChartData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all',
  groupBy?: 'hour' | 'day' | 'week' | 'month'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range if not specified
  if (!groupBy) {
    switch (timeRange) {
      case '24h':
        groupBy = 'hour';
        break;
      case '7d':
        groupBy = 'day';
        break;
      case '30d':
        groupBy = 'day';
        break;
      case '90d':
        groupBy = 'week';
        break;
      case 'all':
        groupBy = 'month';
        break;
    }
  }

  // Group transcripts by time period
  const groups: Record<string, { transcripts: Transcript[], count: number, sortDate: Date, dateLabel: string }> = {};
  const now = dayjs();

  if (groupBy === 'hour') {
    // Pre-seed every hour for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const hourStart = now.subtract(i, 'hour').startOf('hour');
      const key = hourStart.valueOf().toString(); // Timestamp as key
      groups[key] = {
        transcripts: [],
        count: 0,
        sortDate: hourStart.toDate(),
        dateLabel: hourStart.format('MMM D, h A') // e.g., Jul 10, 3 PM
      };
    }
  }

  filteredTranscripts.forEach(transcript => {
    try {
      const transcriptDayjsDate = dayjs(transcript.date);
      let key: string;
      let sortDate: Date;
      let dateLabel: string;

      switch (groupBy) {
        case 'hour':
          const hourStart = transcriptDayjsDate.startOf('hour');
          key = hourStart.valueOf().toString();
          sortDate = hourStart.toDate();
          dateLabel = hourStart.format('MMM D, h A');
          // Ensure the key exists from pre-seeding, or if a transcript is slightly outside the 24h window due to exact timing
          if (!groups[key]) {
            groups[key] = { transcripts: [], count: 0, sortDate, dateLabel };
          }
          break;
        case 'day':
          // For day, week, month, continue using date-fns for consistency with original logic if preferred, or switch to dayjs
          const dfnsDate = parseISO(transcript.date); // date-fns for existing logic
          key = format(dfnsDate, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDate);
          dateLabel = key;
          if (!groups[key]) {
             groups[key] = { transcripts: [], count: 0, sortDate, dateLabel };
          }
          break;
        case 'week':
          const dfnsDateW = parseISO(transcript.date);
          const weekStart = startOfWeek(dfnsDateW, { weekStartsOn: 1 }); // Monday start
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { transcripts: [], count: 0, sortDate, dateLabel };
          }
          break;
        case 'month':
          const dfnsDateM = parseISO(transcript.date);
          key = format(dfnsDateM, 'MMM yyyy');
          sortDate = startOfMonth(dfnsDateM);
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { transcripts: [], count: 0, sortDate, dateLabel };
          }
          break;
        default: // Should not happen
          const dfnsDateDef = parseISO(transcript.date);
          key = format(dfnsDateDef, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDateDef);
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { transcripts: [], count: 0, sortDate, dateLabel };
          }
      }

      groups[key].transcripts.push(transcript);
      groups[key].count = groups[key].transcripts.length; // Update count based on transcripts array
    } catch {
      // Skip invalid dates
    }
  });

  // For hourly, ensure all pre-seeded hours are included even if count is 0
  // For other groupings, Object.values will only include groups with actual data

  return Object.values(groups) // Use Object.values to get all group objects
    .map(group => ({
      date: group.dateLabel, // Use the stored dateLabel (e.g., 'Jul 10, 3 PM' or 'MMM dd, yyyy')
      value: group.count,
      label: `${group.count} recording${group.count !== 1 ? 's' : ''}`,
      _sortDate: group.sortDate,
    }))
    .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime())
    .map(({ _sortDate, ...rest }) => rest);
};

// Generate duration chart data
export const generateDurationChartData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range
  let groupBy: 'hour' | 'day' | 'week' | 'month';
  switch (timeRange) {
    case '24h':
      groupBy = 'hour';
      break;
    case '7d':
      groupBy = 'day';
      break;
    case '30d':
      groupBy = 'day';
      break;
    case '90d':
      groupBy = 'week';
      break;
    case 'all':
      groupBy = 'month';
      break;
  }

  // Group by time period and sum durations
  const groups: Record<string, { duration: number, sortDate: Date, dateLabel: string }> = {};
  const now = dayjs();

  if (groupBy === 'hour') {
    // Pre-seed every hour for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const hourStart = now.subtract(i, 'hour').startOf('hour');
      const key = hourStart.valueOf().toString();
      groups[key] = {
        duration: 0,
        sortDate: hourStart.toDate(),
        dateLabel: hourStart.format('MMM D, h A')
      };
    }
  }

  filteredTranscripts.forEach(transcript => {
    try {
      const transcriptDayjsDate = dayjs(transcript.date);
      let key: string;
      let sortDate: Date;
      let dateLabel: string;

      switch (groupBy) {
        case 'hour':
          const hourStart = transcriptDayjsDate.startOf('hour');
          key = hourStart.valueOf().toString();
          sortDate = hourStart.toDate();
          dateLabel = hourStart.format('MMM D, h A');
          if (!groups[key]) {
            groups[key] = { duration: 0, sortDate, dateLabel };
          }
          break;
        case 'day':
          const dfnsDate = parseISO(transcript.date);
          key = format(dfnsDate, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDate);
          dateLabel = key;
          if (!groups[key]) {
             groups[key] = { duration: 0, sortDate, dateLabel };
          }
          break;
        case 'week':
          const dfnsDateW = parseISO(transcript.date);
          const weekStart = startOfWeek(dfnsDateW, { weekStartsOn: 1 });
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { duration: 0, sortDate, dateLabel };
          }
          break;
        case 'month':
          const dfnsDateM = parseISO(transcript.date);
          key = format(dfnsDateM, 'MMM yyyy');
          sortDate = startOfMonth(dfnsDateM);
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { duration: 0, sortDate, dateLabel };
          }
          break;
        default:
          const dfnsDateDef = parseISO(transcript.date);
          key = format(dfnsDateDef, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDateDef);
          dateLabel = key;
          if (!groups[key]) {
            groups[key] = { duration: 0, sortDate, dateLabel };
          }
      }

      const duration = estimateDuration(transcript.content);
      groups[key].duration += duration;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.values(groups)
    .map(group => ({
      date: group.dateLabel,
      value: Math.round(group.duration * 10) / 10, // Round to 1 decimal place
      label: `${Math.round(group.duration * 10) / 10} hours`,
      _sortDate: group.sortDate,
    }))
    .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime())
    .map(({ _sortDate, ...rest }) => rest);
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
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all' = '7d'
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
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range
  let groupBy: 'hour' | 'day' | 'week' | 'month'; // Added 'hour'
  switch (timeRange) {
    case '24h': // Added '24h' case
      groupBy = 'hour';
      break;
    case '7d':
      groupBy = 'day';
      break;
    case '30d':
      groupBy = 'day';
      break;
    case '90d':
      groupBy = 'week';
      break;
    case 'all':
      groupBy = 'month';
      break;
  }

  // Group by time period and calculate average conversation density
  const groups: Record<string, { totalWords: number; totalDuration: number; count: number; sortDate: Date; dateLabel: string }> = {};
  const now = dayjs();

  if (groupBy === 'hour') {
    for (let i = 0; i < 24; i++) {
      const hourStart = now.subtract(i, 'hour').startOf('hour');
      const key = hourStart.valueOf().toString();
      groups[key] = {
        totalWords: 0,
        totalDuration: 0,
        count: 0,
        sortDate: hourStart.toDate(),
        dateLabel: hourStart.format('MMM D, h A')
      };
    }
  }

  filteredTranscripts.forEach(transcript => {
    try {
      const transcriptDayjsDate = dayjs(transcript.date);
      let key: string;
      let sortDate: Date;
      let dateLabel: string;

      switch (groupBy) {
        case 'hour':
          const hourStart = transcriptDayjsDate.startOf('hour');
          key = hourStart.valueOf().toString();
          sortDate = hourStart.toDate();
          dateLabel = hourStart.format('MMM D, h A');
          if (!groups[key]) {
            groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate, dateLabel };
          }
          break;
        case 'day':
          const dfnsDate = parseISO(transcript.date);
          key = format(dfnsDate, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDate);
          dateLabel = key;
          if (!groups[key]) {
             groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate, dateLabel };
          }
          break;
        case 'week':
          const dfnsDateW = parseISO(transcript.date);
          const weekStart = startOfWeek(dfnsDateW, { weekStartsOn: 1 });
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate, dateLabel };
          }
          break;
        case 'month':
          const dfnsDateM = parseISO(transcript.date);
          key = format(dfnsDateM, 'MMM yyyy');
          sortDate = startOfMonth(dfnsDateM);
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate, dateLabel };
          }
          break;
        default:
          const dfnsDateDef = parseISO(transcript.date);
          key = format(dfnsDateDef, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDateDef);
          dateLabel = key;
          if (!groups[key]) {
            groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate, dateLabel };
          }
      }

      const wordCount = Math.round(transcript.content.length / 5);
      const durationMinutes = Math.max(1, wordCount / 150);

      groups[key].totalWords += wordCount;
      groups[key].totalDuration += durationMinutes;
      groups[key].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.values(groups)
    .map(data => ({
      date: data.dateLabel,
      value: data.totalDuration > 0 ? Math.round((data.totalWords / data.totalDuration) * 10) / 10 : 0,
      label: `${data.totalDuration > 0 ? Math.round((data.totalWords / data.totalDuration) * 10) / 10 : 0} WPM`,
      _sortDate: data.sortDate,
    }))
    .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime())
    .map(({ _sortDate, ...rest }) => rest);
};

// Generate hourly activity pattern data
export const generateHourlyActivityData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
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
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range
  let groupBy: 'hour' | 'day' | 'week' | 'month'; // Added 'hour'
  switch (timeRange) {
    case '24h': // Added '24h' case
      groupBy = 'hour';
      break;
    case '7d':
      groupBy = 'day';
      break;
    case '30d':
      groupBy = 'day';
      break;
    case '90d':
      groupBy = 'week';
      break;
    case 'all':
      groupBy = 'month';
      break;
  }

  // Group by time period and calculate sentiment proxy
  const groups: Record<string, { sentimentSum: number; count: number; sortDate: Date; dateLabel: string }> = {};
  const now = dayjs();

  if (groupBy === 'hour') {
    for (let i = 0; i < 24; i++) {
      const hourStart = now.subtract(i, 'hour').startOf('hour');
      const key = hourStart.valueOf().toString();
      groups[key] = {
        sentimentSum: 0,
        count: 0,
        sortDate: hourStart.toDate(),
        dateLabel: hourStart.format('MMM D, h A')
      };
    }
  }

  const positiveWordsList = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'excited', 'awesome', 'perfect', 'brilliant', 'outstanding'];
  const negativeWordsList = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'frustrated', 'angry', 'sad', 'disappointed', 'worried', 'stressed', 'difficult', 'problem', 'issue', 'wrong'];

  filteredTranscripts.forEach(transcript => {
    try {
      const transcriptDayjsDate = dayjs(transcript.date);
      let key: string;
      let sortDate: Date;
      let dateLabel: string;

      switch (groupBy) {
        case 'hour':
          const hourStart = transcriptDayjsDate.startOf('hour');
          key = hourStart.valueOf().toString();
          sortDate = hourStart.toDate();
          dateLabel = hourStart.format('MMM D, h A');
          if (!groups[key]) {
            groups[key] = { sentimentSum: 0, count: 0, sortDate, dateLabel };
          }
          break;
        case 'day':
          const dfnsDate = parseISO(transcript.date);
          key = format(dfnsDate, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDate);
          dateLabel = key;
          if (!groups[key]) {
             groups[key] = { sentimentSum: 0, count: 0, sortDate, dateLabel };
          }
          break;
        case 'week':
          const dfnsDateW = parseISO(transcript.date);
          const weekStart = startOfWeek(dfnsDateW, { weekStartsOn: 1 });
          key = format(weekStart, 'MMM dd, yyyy');
          sortDate = weekStart;
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { sentimentSum: 0, count: 0, sortDate, dateLabel };
          }
          break;
        case 'month':
          const dfnsDateM = parseISO(transcript.date);
          key = format(dfnsDateM, 'MMM yyyy');
          sortDate = startOfMonth(dfnsDateM);
          dateLabel = key;
           if (!groups[key]) {
             groups[key] = { sentimentSum: 0, count: 0, sortDate, dateLabel };
          }
          break;
        default:
          const dfnsDateDef = parseISO(transcript.date);
          key = format(dfnsDateDef, 'MMM dd, yyyy');
          sortDate = startOfDay(dfnsDateDef);
          dateLabel = key;
          if (!groups[key]) {
            groups[key] = { sentimentSum: 0, count: 0, sortDate, dateLabel };
          }
      }

      const content = transcript.content.toLowerCase();
      const positiveCount = positiveWordsList.reduce((acc, word) => acc + (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      const negativeCount = negativeWordsList.reduce((acc, word) => acc + (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
      const wordCount = Math.max(1, Math.round(transcript.content.length / 5)); // Avoid division by zero for sentiment score

      // Simplified sentiment: +1 for each positive, -1 for each negative, normalized by word count (between -100 and 100)
      // This is a sum of scores for each transcript in the group. We will average it later.
      const sentimentScore = ((positiveCount - negativeCount) / wordCount) * 100;

      groups[key].sentimentSum += sentimentScore;
      groups[key].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.values(groups)
    .map(data => {
      const avgSentiment = data.count > 0 ? Math.round((data.sentimentSum / data.count) * 10) / 10 : 0;
      return {
        date: data.dateLabel,
        value: avgSentiment,
        label: `${avgSentiment} sentiment score`,
        _sortDate: data.sortDate,
      };
    })
    .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime())
    .map(({ _sortDate, ...rest }) => rest);
};
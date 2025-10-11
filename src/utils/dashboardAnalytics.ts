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
  timeRange: '7d' | '30d' | '90d' | 'all'
): Transcript[] => {
  if (timeRange === 'all') return transcripts;

  const now = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = subDays(now, days);

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
  timeRange: '7d' | '30d' | '90d' | 'all'
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
  timeRange: '7d' | '30d' | '90d' | 'all',
  groupBy?: 'day' | 'week' | 'month'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range if not specified
  if (!groupBy) {
    switch (timeRange) {
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
  const groups: Record<string, { transcripts: Transcript[], sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
      let key: string;
      let sortDate: Date;

      switch (groupBy) {
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
      // Skip invalid dates
    }
  });

  // Convert to chart data and sort by date
  return Object.entries(groups)
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
};

// Generate duration chart data
export const generateDurationChartData = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range
  let groupBy: 'day' | 'week' | 'month';
  switch (timeRange) {
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
  const groups: Record<string, { duration: number, sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
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
        default:
          key = format(date, 'MMM dd, yyyy');
          sortDate = startOfDay(date);
      }

      const duration = estimateDuration(transcript.content);

      if (!groups[key]) {
        groups[key] = { duration: 0, sortDate };
      }
      groups[key].duration += duration;
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
  timeRange: '7d' | '30d' | '90d' | 'all'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range
  let groupBy: 'day' | 'week' | 'month';
  switch (timeRange) {
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
  const groups: Record<string, { totalWords: number; totalDuration: number; count: number; sortDate: Date }> = {};

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
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
      }

      // Estimate words (rough: content length / 5 characters per word)
      const wordCount = Math.round(transcript.content.length / 5);
      // Estimate duration in minutes (rough: 150 words per minute speaking rate)
      const durationMinutes = Math.max(1, wordCount / 150);

      if (!groups[key]) {
        groups[key] = { totalWords: 0, totalDuration: 0, count: 0, sortDate };
      }

      groups[key].totalWords += wordCount;
      groups[key].totalDuration += durationMinutes;
      groups[key].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.entries(groups)
    .map(([dateLabel, data]) => ({
      date: dateLabel,
      value: Math.round((data.totalWords / data.totalDuration) * 10) / 10, // Words per minute, rounded
      label: `${Math.round((data.totalWords / data.totalDuration) * 10) / 10} WPM`,
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
  timeRange: '7d' | '30d' | '90d' | 'all'
): ChartDataPoint[] => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  if (filteredTranscripts.length === 0) return [];

  // Determine grouping based on time range
  let groupBy: 'day' | 'week' | 'month';
  switch (timeRange) {
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
  const groups: Record<string, { positiveWords: number; totalWords: number; count: number; sortDate: Date }> = {};

  // Simple positive word indicators (can be enhanced)
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'excited', 'awesome', 'perfect', 'brilliant', 'outstanding'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'frustrated', 'angry', 'sad', 'disappointed', 'worried', 'stressed', 'difficult', 'problem', 'issue', 'wrong'];

  filteredTranscripts.forEach(transcript => {
    try {
      const date = parseISO(transcript.date);
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
      }

      const content = transcript.content.toLowerCase();

      const positiveCount = positiveWords.reduce((count, word) =>
        count + (content.match(new RegExp(word, 'g')) || []).length, 0);
      const negativeCount = negativeWords.reduce((count, word) =>
        count + (content.match(new RegExp(word, 'g')) || []).length, 0);

      const totalWords = Math.round(transcript.content.length / 5);

      if (!groups[key]) {
        groups[key] = { positiveWords: 0, totalWords: 0, count: 0, sortDate };
      }

      // Sentiment score: (positive - negative) / total words * 100
      const sentimentScore = totalWords > 0 ? ((positiveCount - negativeCount) / totalWords) * 100 : 0;
      groups[key].positiveWords += sentimentScore;
      groups[key].totalWords += totalWords;
      groups[key].count += 1;
    } catch {
      // Skip invalid dates
    }
  });

  return Object.entries(groups)
    .map(([dateLabel, data]) => ({
      date: dateLabel,
      value: data.count > 0 ? Math.round((data.positiveWords / data.count) * 10) / 10 : 0,
      label: `${data.count > 0 ? Math.round((data.positiveWords / data.count) * 10) / 10 : 0} sentiment score`,
    }))
    .sort((a, b) => {
      const aGroup = groups[a.date];
      const bGroup = groups[b.date];
      return aGroup.sortDate.getTime() - bGroup.sortDate.getTime();
    });
};
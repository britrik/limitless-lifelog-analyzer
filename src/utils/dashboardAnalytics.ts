import { parseISO, isWithinInterval, subDays, format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Transcript, AnalysisType, ChartDataPoint, ChartDataResponse } from '../types';
// ChartDataPoint is now imported from ../types
import { performAnalysis } from '../services/geminiService';

// Cache for sentiment analysis results
const sentimentCache = new Map<string, number | null>();

// Helper to safely parse ISO date strings
const safeParseISO = (dateStr: string | undefined, transcriptIdForWarning?: string): Date | null => {
  if (!dateStr) {
    // Optionally log if dateStr is undefined, though often it's legitimately optional
    // if (transcriptIdForWarning) {
    //   console.warn(`safeParseISO: Date string is undefined for transcript ${transcriptIdForWarning}.`);
    // }
    return null;
  }
  try {
    const dateObj = parseISO(dateStr);
    if (isNaN(dateObj.getTime())) {
      if (transcriptIdForWarning) {
        console.warn(`safeParseISO: Invalid date string '${dateStr}' for transcript ${transcriptIdForWarning}.`);
      }
      return null;
    }
    return dateObj;
  } catch (error) {
    if (transcriptIdForWarning) {
      console.warn(`safeParseISO: Error parsing date string '${dateStr}' for transcript ${transcriptIdForWarning}:`, error);
    }
    return null;
  }
};

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
    const startDate = safeParseISO(transcript.startTime, `${transcript.id} (startTime)`);
    const endDate = safeParseISO(transcript.endTime, `${transcript.id} (endTime)`);

    if (startDate && endDate) {
      const diffMilliseconds = endDate.getTime() - startDate.getTime();
      if (diffMilliseconds < 0) {
        console.warn(`estimateDuration: endTime (${transcript.endTime}) is before startTime (${transcript.startTime}) for transcript ${transcript.id}. Returning 0 duration.`);
        return 0; // Negative duration is invalid, return 0
      }
      // If diffMilliseconds is 0, this will correctly return 0.
      // No artificial minimum for API-derived durations.
      return diffMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours
    }
    // If parsing failed for startTime or endTime, safeParseISO already warned. Fall through to content-based.
    console.warn(`estimateDuration: Falling back to content length for transcript ${transcript.id} due to missing/invalid startTime or endTime after safeParseISO.`);
  }

  // Fallback: Estimate duration from content length.
  // This is a rough approximation: ~150 words per minute, ~5 characters per word.
  const wordCount = transcript.content.length / 5;
  const durationHours = wordCount / 150;
  return Math.max(durationHours, 0.1); // Apply minimum duration only for content-based fallback
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
    const dateObj = safeParseISO(transcript.date, transcript.id);
    if (!dateObj) {
      // safeParseISO already warns
      return false;
    }
    return isWithinInterval(dateObj, { start: startDate, end: now });
  });
};

// --- START REUSABLE GROUPING UTILITY ---
// Generic type for the data each group will hold
// It must include sortDate, and can have other properties via [key: string]: any
export type BaseGroupData = { // Exporting for potential use in tests or other modules if needed
  sortDate: Date;
  [key: string]: any;
};

// Aggregator function type: takes the current group data and a transcript, returns updated group data
// The transcript type U allows for augmented transcripts (e.g., with a pre-calculated sentimentScore)
export type Aggregator<G extends BaseGroupData, U extends Transcript = Transcript> = (
  currentGroupData: G, // Will be initialized by initialDataFactory before first call for a key
  transcript: U
) => G;

// Factory for new group's initial data
export type InitialDataFactory<T extends BaseGroupData> = (sortDate: Date) => T;

// Utility to group transcripts by a specified period (day, week, month)
export const groupTranscriptsByPeriod = <T extends BaseGroupData, U extends Transcript = Transcript>(
  transcriptsToGroup: U[], // Array of transcripts (can be augmented, e.g., with sentimentScore)
  groupBy: GroupBy,
  aggregator: Aggregator<T, U>,
  initialDataFactory: InitialDataFactory<T>
): { groups: Record<string, T>; skippedCount: number } => {
  const groups: Record<string, T> = {};
  let skippedCount = 0;

  transcriptsToGroup.forEach(transcript => {
    // The 'transcript.date' field is used for grouping.
    const dateObj = safeParseISO(transcript.date, `${transcript.id} in groupTranscriptsByPeriod`);
    if (!dateObj) {
      skippedCount++;
      return; // Skip this transcript if its primary date is invalid
    }

    let key: string;
    let sortDate: Date;
    switch (groupBy) {
      case 'day': key = format(dateObj, 'MMM dd, yyyy'); sortDate = startOfDay(dateObj); break;
      case 'week': const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 }); key = format(weekStart, 'MMM dd, yyyy'); sortDate = weekStart; break;
      case 'month': key = format(dateObj, 'MMM yyyy'); sortDate = startOfMonth(dateObj); break;
      default:
        // Fallback, though should be prevented by GroupBy type
        key = format(dateObj, 'MMM dd, yyyy');
        sortDate = startOfDay(dateObj);
        break;
    }

    if (!groups[key]) {
      groups[key] = initialDataFactory(sortDate);
    }
    groups[key] = aggregator(groups[key], transcript);
  });

  // Log if a high percentage of transcripts were skipped
  if (transcriptsToGroup.length > 0 && skippedCount > 0 && (skippedCount / transcriptsToGroup.length) > 0.1) {
    console.warn(`groupTranscriptsByPeriod: High percentage of items skipped due to date parsing issues (${skippedCount}/${transcriptsToGroup.length}).`);
  }

  return { groups, skippedCount };
};
// --- END REUSABLE GROUPING UTILITY ---

// Calculate dashboard metrics
export const calculateDashboardMetrics = (
  transcripts: Transcript[],
  timeRange: '7d' | '30d' | '90d' | 'all'
): DashboardMetrics => {
  // Simplified invalidDateCount: counts all transcripts with unparsable primary dates from the original list.
  const invalidDateCount = transcripts.reduce((count, transcript) => {
    const dateObj = safeParseISO(transcript.date); // Don't need transcriptId for this general count here
    return dateObj ? count : count + 1;
  }, 0);

  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);

  // Current period metrics calculated in a single pass
  const currentPeriodMetrics = filteredTranscripts.reduce(
    (acc, t) => {
      acc.hoursRecorded += estimateDuration(t);
      if (hasAnalysis(t)) acc.aiAnalyses += 1;
      if (t.isStarred) acc.bookmarks += 1;
      return acc;
    },
    { hoursRecorded: 0, aiAnalyses: 0, bookmarks: 0 }
  );

  const totalRecordings = filteredTranscripts.length;
  const { hoursRecorded, aiAnalyses, bookmarks } = currentPeriodMetrics;
  
  // recentActivity still needs its own filterTranscriptsByTimeRange call if its range ('7d')
  // can be different from the main 'timeRange' parameter.
  const recentActivity = filterTranscriptsByTimeRange(transcripts, '7d').length;

// NOTE: The duplicated grouping utility and its types that appeared here have been removed.
// The correct single definition is assumed to be earlier in the file.

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
    
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? Infinity : 0; // Growth from 0 to positive is Infinity, 0 to 0 is 0%
      }
      // The 'prev < 5 ? NaN' rule is removed as per plan, can be re-added if it's a specific business requirement.
      return ((current - previous) / previous) * 100;
    };

    growthPercentages = {
      recordings: calculateGrowth(totalRecordings, prevRecordings),
      hours: calculateGrowth(hoursRecorded, prevHours),
      analyses: calculateGrowth(aiAnalyses, prevAnalyses),
      bookmarks: calculateGrowth(bookmarks, prevBookmarks),
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

  type ActivityGroupData = BaseGroupData & { count: number };

  const initialDataFactory: InitialDataFactory<ActivityGroupData> = (sortDate) => ({
    count: 0,
    sortDate: sortDate,
  });

  const aggregator: Aggregator<ActivityGroupData> = (currentGroupData, _transcript) => {
    return {
      ...currentGroupData,
      count: currentGroupData.count + 1,
    };
  };

  const { groups } = groupTranscriptsByPeriod<ActivityGroupData>(
    filteredTranscripts,
    groupBy,
    aggregator, // Pass aggregator directly
    initialDataFactory
  );

  const chartDataPoints = Object.entries(groups)
    .map(([dateLabel, groupData]) => ({
      date: dateLabel,
      value: groupData.count,
      label: `${groupData.count} recording${groupData.count !== 1 ? 's' : ''}`,
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

  type DurationGroupData = BaseGroupData & { totalDuration: number };

  const initialDataFactory: InitialDataFactory<DurationGroupData> = (sortDate) => ({
    totalDuration: 0,
    sortDate: sortDate,
  });

  const aggregator: Aggregator<DurationGroupData> = (currentGroupData, transcript) => {
    return {
      ...currentGroupData,
      totalDuration: currentGroupData.totalDuration + estimateDuration(transcript),
    };
  };

  const { groups } = groupTranscriptsByPeriod<DurationGroupData>(
    filteredTranscripts,
    groupBy,
    aggregator,
    initialDataFactory
  );

  const chartDataPointsResult = Object.entries(groups)
    .map(([dateLabel, groupData]) => {
      const value = isNaN(groupData.totalDuration) ? 0 : Math.round(groupData.totalDuration * 10) / 10;
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
    .sort((a, b) => {
      const dateA = safeParseISO(a.date, `recentActivity sort ${a.id}`)?.getTime() ?? 0;
      const dateB = safeParseISO(b.date, `recentActivity sort ${b.id}`)?.getTime() ?? 0;
      return dateB - dateA; // Sort descending by valid dates
    })
    .slice(0, limit);

  recentTranscripts.forEach(transcript => {
    const dateObj = safeParseISO(transcript.date, `recentActivity item ${transcript.id}`);
    if (!dateObj) {
      return; // Skip if date is invalid
    }

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    let relativeTime: string;

    if (diffSeconds < 0) {
      relativeTime = 'Invalid date'; // Future date
    } else if (diffSeconds < 60) {
      relativeTime = `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) { // Less than an hour
      relativeTime = `${Math.floor(diffSeconds / 60)}m ago`;
    } else if (diffSeconds < 86400) { // Less than a day
      relativeTime = `${Math.floor(diffSeconds / 3600)}h ago`;
    } else {
      relativeTime = `${Math.floor(diffSeconds / 86400)}d ago`;
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
    .sort((a, b) => {
      const timeA = safeParseISO(a.timestamp, `activity sort ${a.id}`)?.getTime() ?? 0;
      const timeB = safeParseISO(b.timestamp, `activity sort ${b.id}`)?.getTime() ?? 0;
      return timeB - timeA; // Sort descending
    })
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

  type DensityGroupData = BaseGroupData & { totalWords: number; totalDurationMinutes: number; count: number };

  const initialDataFactory: InitialDataFactory<DensityGroupData> = (sortDate) => ({
    totalWords: 0,
    totalDurationMinutes: 0,
    count: 0, // Changed from transcriptCount to count for consistency
    sortDate: sortDate,
  });

  const aggregator: Aggregator<DensityGroupData> = (currentGroupData, transcript) => {
    const wordCount = Math.round(transcript.content.length / 5);
    const durationHours = estimateDuration(transcript);
    const durationMinutes = Math.max(1, durationHours * 60);
    return {
      ...currentGroupData,
      totalWords: currentGroupData.totalWords + wordCount,
      totalDurationMinutes: currentGroupData.totalDurationMinutes + durationMinutes,
      count: currentGroupData.count + 1,
    };
  };

  const { groups } = groupTranscriptsByPeriod<DensityGroupData>(
    filteredTranscripts,
    groupBy,
    aggregator,
    initialDataFactory
  );

  const chartDataPointsResult = Object.entries(groups)
    .map(([dateLabel, groupData]) => {
      const WPM = (groupData.totalDurationMinutes > 0 && typeof groupData.totalWords === 'number' && !isNaN(groupData.totalWords))
                   ? (groupData.totalWords / groupData.totalDurationMinutes)
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
  // Initialize 24-hour array with AM/PM labels (based on UTC hours)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour12 = i % 12 === 0 ? 12 : i % 12; // 0 and 12 become 12
    const ampm = i < 12 ? 'AM' : 'PM'; // 0-11 are AM, 12-23 are PM
    return {
      hour: i,
      activity: 0,
      count: 0,
      label: `${hour12} ${ampm} UTC` // Indicate UTC
    };
  });

  filteredTranscripts.forEach(transcript => {
    // Use safeParseISO for robust date parsing.
    // The hour extraction will be UTC-based.
    const dateObj = safeParseISO(transcript.date, `${transcript.id} in generateHourlyActivityData`);
    if (!dateObj) {
      return; // Skips this transcript if date is invalid
    }

    try {
      const hour = dateObj.getUTCHours(); // Consistently use UTC hours

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

  const processTranscriptSentiment = async (transcript: Transcript): Promise<number> => {
    if (sentimentCache.has(transcript.id)) {
      return sentimentCache.get(transcript.id) ?? 0;
    }
    let score = 0;
    try {
      const analysisResult = await performAnalysis(transcript.content, AnalysisType.SENTIMENT);
      if (analysisResult.data && typeof analysisResult.data.score === 'number') {
        score = analysisResult.data.score;
      }
      // Warning for unexpected format removed, defaulting to 0 silently if score not found
    } catch (error) {
      console.error(`Error processing sentiment for transcript ${transcript.id}: ${error}. Defaulting score to 0.`);
    }
    const finalScore = (!isNaN(score) && score !== null) ? Math.max(-100, Math.min(100, score)) : 0;
    sentimentCache.set(transcript.id, finalScore);
    return finalScore;
  };

  // Step 1: Augment transcripts with their sentiment scores, filtering out those with initially invalid dates.
  const sentimentProcessingPromises = filteredTranscripts.map(async (transcript) => {
    const dateObjForValidityCheck = safeParseISO(transcript.date, `${transcript.id} (pre-sentiment check)`);
    if (!dateObjForValidityCheck) {
      return null;
    }
    const sentimentScore = await processTranscriptSentiment(transcript);
    return { ...transcript, sentimentScore };
  });

  const transcriptsWithSentiment = (await Promise.all(sentimentProcessingPromises))
    .filter(t => t !== null) as (Transcript & { sentimentScore: number })[];

  if (transcriptsWithSentiment.length === 0) {
    const message = filteredTranscripts.length > 0
      ? 'No processable transcripts for sentiment chart after date validation or sentiment fetching.'
      : 'No transcripts found for selected period.';
    return { data: [], status: 'no-data', message };
  }

  // Step 2: Group these augmented transcripts
  type SentimentGroupData = BaseGroupData & { sentimentSum: number; count: number };
  const initialDataFactory: InitialDataFactory<SentimentGroupData> = (sd) => ({
    sentimentSum: 0,
    count: 0,
    sortDate: sd
  });

  const aggregator: Aggregator<SentimentGroupData, Transcript & { sentimentScore: number }> = (currentGroupData, t) => ({
    ...currentGroupData, // Spread previous group data
    sentimentSum: currentGroupData.sentimentSum + t.sentimentScore,
    count: currentGroupData.count + 1,
  });

  const { groups } = groupTranscriptsByPeriod<SentimentGroupData, Transcript & { sentimentScore: number }>(
    transcriptsWithSentiment, groupBy, aggregator, initialDataFactory
  );

  if (Object.keys(groups).length === 0 && transcriptsWithSentiment.length > 0) {
     // This implies all items in transcriptsWithSentiment were skipped by groupTranscriptsByPeriod's internal date check
     return { data: [], status: 'no-data', message: 'No sentiment data to display due to grouping issues (e.g. all dates invalid for grouping after sentiment processing).' };
  }

  const chartDataPoints = Object.entries(groups)
    .map(([dateLabel, groupData]) => {
      const value = groupData.count > 0 ? Math.round((groupData.sentimentSum / groupData.count) * 10) / 10 : 0;
      return { date: dateLabel, value, label: `${value} sentiment score` };
    })
    .sort((a, b) => (groups[a.date] as SentimentGroupData).sortDate.getTime() - (groups[b.date] as SentimentGroupData).sortDate.getTime());

  const status = chartDataPoints.length ? 'success' : 'no-data';
  const message = status === 'no-data' ? 'No sentiment data to display for the selected period and grouping.' : undefined;
  return { data: chartDataPoints, status, message };
};
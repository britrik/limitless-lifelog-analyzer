import { parseISO, isWithinInterval, subDays, format, startOfDay, startOfWeek, startOfMonth, differenceInMinutes } from 'date-fns';
import { Transcript, AnalysisType, ChartDataResponse } from '../types';
import { performAnalysis } from '../services/geminiService';

// Cache for sentiment analysis results
const sentimentCache = new Map<string, number | null>();

// Define GroupBy type
export type GroupBy = 'day' | 'week' | 'month';

// Helper to get default groupBy from timeRange
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
      return 'day'; // Fallback
  }
};

export interface DashboardMetrics {
  totalRecordings: number;
  hoursRecorded: number;
  aiAnalyses: number;
  bookmarks: number;
  recentActivity: number;
  growthPercentages: {
    recordings: number | 'N/A';
    hours: number | 'N/A';
    analyses: number | 'N/A';
    bookmarks: number | 'N/A';
  };
  invalidDateCount: number;
  errorCount?: number; // Optional field for other errors encountered during processing
}

export function isValidDashboardMetrics(x: unknown): x is DashboardMetrics {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  const growth = m.growthPercentages as Record<string, unknown> | undefined;

  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const isNumOrNA = (v: unknown) => isNum(v) || v === 'N/A';

  return (
    isNum(m.totalRecordings) &&
    isNum(m.hoursRecorded) &&
    isNum(m.aiAnalyses) &&
    isNum(m.bookmarks) &&
    isNum(m.recentActivity) &&
    isNum(m.invalidDateCount) &&
    typeof growth === 'object' && growth !== null &&
    isNumOrNA(growth.recordings) &&
    isNumOrNA(growth.hours) &&
    isNumOrNA(growth.analyses) &&
    isNumOrNA(growth.bookmarks) &&
    (m.errorCount === undefined || isNum(m.errorCount))
  );
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

// Centralized safe date parsing helper
const safeParseISO = (dateStr: string, transcriptId: string): Date | null => {
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date "${dateStr}" for transcript ${transcriptId}. Skipping.`);
      return null;
    }
    return date;
  } catch (error) {
    console.warn(`Error parsing date "${dateStr}" for transcript ${transcriptId}: ${error}. Skipping.`);
    return null;
  }
};

// Estimate duration using API metadata if available, otherwise from content length.
const estimateDuration = (transcript: Transcript): number => {
  if (transcript.startTime && transcript.endTime) {
    const startDate = safeParseISO(transcript.startTime, transcript.id);
    const endDate = safeParseISO(transcript.endTime, transcript.id);
    if (startDate && endDate && endDate >= startDate) {
      const diffMilliseconds = endDate.getTime() - startDate.getTime();
      return diffMilliseconds / (1000 * 60 * 60); // ms to hours
    } else {
      console.warn(`Invalid start/end times for transcript ${transcript.id}. Falling back to content length.`);
    }
  }
  // Fallback: Estimate from content length
  const wordCount = transcript.content.length / 5; // ~5 chars/word
  const durationHours = wordCount / (150 * 60); // ~150 words/min, to hours
  return Math.max(durationHours, 0.1); // Min 0.1 hours
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
    const date = safeParseISO(transcript.date, transcript.id);
    return date ? isWithinInterval(date, { start: startDate, end: now }) : false;
  });
};

// Calculate dashboard metrics with single reduce
export const calculateDashboardMetrics = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
): DashboardMetrics => {
  const filteredTranscripts = filterTranscriptsByTimeRange(transcripts, timeRange);
  let invalidDateCount = 0;

  // Single reduce for current metrics
  const { totalRecordings, hoursRecorded, aiAnalyses, bookmarks } = filteredTranscripts.reduce(
    (acc, t) => {
      if (!safeParseISO(t.date, t.id)) invalidDateCount++;
      acc.totalRecordings++;
      acc.hoursRecorded += estimateDuration(t);
      if (hasAnalysis(t)) acc.aiAnalyses++;
      if (t.isStarred) acc.bookmarks++;
      return acc;
    },
    { totalRecordings: 0, hoursRecorded: 0, aiAnalyses: 0, bookmarks: 0 }
  );

  const recentActivity = filterTranscriptsByTimeRange(transcripts, '7d').length;

  // Growth percentages (safe calc, use 'N/A' for small prev)
  let growthPercentages: DashboardMetrics['growthPercentages'] = {
    recordings: 'N/A',
    hours: 'N/A',
    analyses: 'N/A',
    bookmarks: 'N/A',
  };

  if (timeRange !== 'all') {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const now = new Date();
    const previousStart = subDays(now, days * 2);
    const previousEnd = subDays(now, days);

    const previousTranscripts = transcripts.filter(t => {
      const date = safeParseISO(t.date, t.id);
      return date ? isWithinInterval(date, { start: previousStart, end: previousEnd }) : false;
    });

    const prevMetrics = previousTranscripts.reduce(
      (acc, t) => {
        acc.recordings++;
        acc.hours += estimateDuration(t);
        if (hasAnalysis(t)) acc.analyses++;
        if (t.isStarred) acc.bookmarks++;
        return acc;
      },
      { recordings: 0, hours: 0, analyses: 0, bookmarks: 0 }
    );

    const calcGrowth = (current: number, prev: number): number | 'N/A' =>
      prev < 5 ? 'N/A' : prev === 0 ? (current > 0 ? 100 : 0) : ((current - prev) / prev) * 100;

    growthPercentages = {
      recordings: calcGrowth(totalRecordings, prevMetrics.recordings),
      hours: calcGrowth(hoursRecorded, prevMetrics.hours),
      analyses: calcGrowth(aiAnalyses, prevMetrics.analyses),
      bookmarks: calcGrowth(bookmarks, prevMetrics.bookmarks),
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

// Common grouping utility
type GroupedData<T> = Record<string, { data: T; sortDate: Date }>;

const groupTranscriptsByPeriod = <T>(
  transcripts: Transcript[],
  groupBy: GroupBy,
  aggregator: (transcript: Transcript, current: T) => T,
  initial: () => T
): { groups: GroupedData<T>; skipped: number } => {
  const groups: GroupedData<T> = {};
  let skipped = 0;

  transcripts.forEach(transcript => {
    const date = safeParseISO(transcript.date, transcript.id);
    if (!date) {
      skipped++;
      return;
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
      default:
        key = format(date, 'MMM dd, yyyy');
        sortDate = startOfDay(date);
        break;
    }

    if (!groups[key]) {
      groups[key] = { data: initial(), sortDate };
    }
    groups[key].data = aggregator(transcript, groups[key].data);
  });

  // Log if many skipped
  if (skipped / transcripts.length > 0.1) {
    console.warn(`High skip rate in grouping: ${skipped}/${transcripts.length} transcripts due to invalid dates.`);
  }

  return { groups, skipped };
};

// Generate chart data for activity over time
export const generateActivityChartData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy | 'hour'
): ChartDataResponse => {
  const filtered = filterTranscriptsByTimeRange(transcripts, timeRange);
  if (filtered.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const inferredGroupBy: GroupBy = getGroupByFromTimeRange(timeRange === '24h' ? '7d' : timeRange);
  const groupBy = (customGroupBy ?? (timeRange === '24h' ? 'hour' : inferredGroupBy)) as GroupBy | 'hour';

  if (groupBy === 'hour') {
    const nowHour = dayjs().startOf('hour');
    const buckets: Record<string, { count: number; sortDate: Date; label: string }> = {};
    for (let i = 0; i < 24; i++) {
      const hour = nowHour.subtract(i, 'hour');
      const key = hour.valueOf().toString();
      buckets[key] = { count: 0, sortDate: hour.toDate(), label: hour.format('MMM D, h A') };
    }
    filtered.forEach(t => {
      const d = dayjs(t.date);
      if (!d.isValid()) return;
      const h = d.startOf('hour');
      const key = h.valueOf().toString();
      if (!buckets[key]) buckets[key] = { count: 0, sortDate: h.toDate(), label: h.format('MMM D, h A') };
      buckets[key].count += 1;
    });
    const data = Object.values(buckets)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ label, count }) => ({ date: label, value: count, label: `${count} recording${count !== 1 ? 's' : ''}` }));
    const status = data.length ? 'success' : 'no-data';
    return { data, status, message: status === 'no-data' ? 'No activity data to display.' : undefined };
  }

  const { groups } = groupTranscriptsByPeriod(
    filtered,
    groupBy as GroupBy,
    (t, current: Transcript[]) => [...current, t],
    () => []
  );

  const data = Object.entries(groups)
    .map(([date, { data: ts }]) => ({
      date,
      value: ts.length,
      label: `${ts.length} recording${ts.length !== 1 ? 's' : ''}`,
    }))
    .sort((a, b) => groups[a.date].sortDate.getTime() - groups[b.date].sortDate.getTime());

  const status = data.length ? 'success' : 'no-data';
  return { data, status, message: status === 'no-data' ? 'No activity data to display.' : undefined };
};

// Generate duration chart data
export const generateDurationChartData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy | 'hour'
): ChartDataResponse => {
  const filtered = filterTranscriptsByTimeRange(transcripts, timeRange);
  if (filtered.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const inferredGroupBy: GroupBy = getGroupByFromTimeRange(timeRange === '24h' ? '7d' : timeRange);
  const groupBy = (customGroupBy ?? (timeRange === '24h' ? 'hour' : inferredGroupBy)) as GroupBy | 'hour';

  if (groupBy === 'hour') {
    const nowHour = dayjs().startOf('hour');
    const buckets: Record<string, { duration: number; sortDate: Date; label: string }> = {};
    for (let i = 0; i < 24; i++) {
      const hour = nowHour.subtract(i, 'hour');
      const key = hour.valueOf().toString();
      buckets[key] = { duration: 0, sortDate: hour.toDate(), label: hour.format('MMM D, h A') };
    }
    filtered.forEach(t => {
      const d = dayjs(t.date);
      if (!d.isValid()) return;
      const h = d.startOf('hour');
      const key = h.valueOf().toString();
      if (!buckets[key]) buckets[key] = { duration: 0, sortDate: h.toDate(), label: h.format('MMM D, h A') };
      buckets[key].duration += estimateDuration(t);
    });
    const data = Object.values(buckets)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ label, duration }) => {
        const value = isNaN(duration) ? 0 : Math.round(duration * 10) / 10;
        return { date: label, value, label: `${value} hours` };
      });
    const status = data.length ? 'success' : 'no-data';
    return { data, status, message: status === 'no-data' ? 'No duration data to display.' : undefined };
  }

  const { groups } = groupTranscriptsByPeriod(
    filtered,
    groupBy as GroupBy,
    (t, current: number) => current + estimateDuration(t),
    () => 0
  );

  const data = Object.entries(groups)
    .map(([date, { data: duration }]) => {
      const value = isNaN(duration) ? 0 : Math.round(duration * 10) / 10;
      return { date, value, label: `${value} hours` };
    })
    .sort((a, b) => groups[a.date].sortDate.getTime() - groups[b.date].sortDate.getTime());

  const status = data.length ? 'success' : 'no-data';
  return { data, status, message: status === 'no-data' ? 'No duration data to display.' : undefined };
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
  const recent = filterTranscriptsByTimeRange(transcripts, timeRange)
    .map(t => ({ ...t, parsedDate: safeParseISO(t.date, t.id) }))
    .filter(t => t.parsedDate !== null)
    .sort((a, b) => (b.parsedDate?.getTime() ?? 0) - (a.parsedDate?.getTime() ?? 0))
    .slice(0, limit);

  const activities: ActivityItem[] = [];
  const now = new Date();

  recent.forEach(({ id, title, date, parsedDate, isStarred, summary }) => {
    if (!parsedDate) return; // Safeguard

    const diffMins = differenceInMinutes(now, parsedDate);
    let relativeTime: string;
    if (diffMins < 0) {
      relativeTime = 'Upcoming'; // Future dates
    } else if (diffMins < 1) {
      relativeTime = 'Just now';
    } else if (diffMins < 60) {
      relativeTime = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      relativeTime = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      relativeTime = `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    // Recording
    activities.push({
      id: `recording-${id}`,
      type: 'recording',
      title: 'New recording processed',
      description: title,
      timestamp: date,
      relativeTime,
    });

    // Analysis
    if (hasAnalysis({ summary } as Transcript)) {
      activities.push({
        id: `analysis-${id}`,
        type: 'analysis',
        title: 'AI analysis completed',
        description: `Generated insights for ${title}`,
        timestamp: date,
        relativeTime,
      });
    }

    // Bookmark
    if (isStarred) {
      activities.push({
        id: `bookmark-${id}`,
        type: 'bookmark',
        title: 'Recording bookmarked',
        description: title,
        timestamp: date,
        relativeTime,
      });
    }
  });

  return activities
    .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
    .slice(0, limit);
};

// Generate conversation density chart data (WPM over time)
export const generateConversationDensityData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy | 'hour'
): ChartDataResponse => {
  const filtered = filterTranscriptsByTimeRange(transcripts, timeRange);
  if (filtered.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const inferredGroupBy: GroupBy = getGroupByFromTimeRange(timeRange === '24h' ? '7d' : timeRange);
  const groupBy = (customGroupBy ?? (timeRange === '24h' ? 'hour' : inferredGroupBy)) as GroupBy | 'hour';

  if (groupBy === 'hour') {
    const nowHour = dayjs().startOf('hour');
    const buckets: Record<string, { totalWords: number; totalMinutes: number; sortDate: Date; label: string }> = {};
    for (let i = 0; i < 24; i++) {
      const hour = nowHour.subtract(i, 'hour');
      const key = hour.valueOf().toString();
      buckets[key] = { totalWords: 0, totalMinutes: 0, sortDate: hour.toDate(), label: hour.format('MMM D, h A') };
    }
    filtered.forEach(t => {
      const words = Math.round(t.content.length / 5);
      const minutes = Math.max(1, estimateDuration(t) * 60);
      const d = dayjs(t.date);
      if (!d.isValid()) return;
      const h = d.startOf('hour');
      const key = h.valueOf().toString();
      if (!buckets[key]) buckets[key] = { totalWords: 0, totalMinutes: 0, sortDate: h.toDate(), label: h.format('MMM D, h A') };
      buckets[key].totalWords += words;
      buckets[key].totalMinutes += minutes;
    });
    const data = Object.values(buckets)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ label, totalWords, totalMinutes }) => {
        const value = totalMinutes > 0 ? Math.round((totalWords / totalMinutes) * 10) / 10 : 0;
        return { date: label, value, label: `${value} WPM` };
      });
    const status = data.length ? 'success' : 'no-data';
    return { data, status, message: status === 'no-data' ? 'No density data to display.' : undefined };
  }

  const { groups } = groupTranscriptsByPeriod(
    filtered,
    groupBy as GroupBy,
    (t, current: { totalWords: number; totalMinutes: number }) => {
      const wordCount = Math.round(t.content.length / 5);
      const minutes = Math.max(1, estimateDuration(t) * 60);
      return { totalWords: current.totalWords + wordCount, totalMinutes: current.totalMinutes + minutes };
    },
    () => ({ totalWords: 0, totalMinutes: 0 })
  );

  const data = Object.entries(groups)
    .map(([date, { data: { totalWords, totalMinutes } }]) => {
      const wpm = totalMinutes > 0 ? totalWords / totalMinutes : 0;
      const value = Math.round(wpm * 10) / 10;
      return { date, value, label: `${value} WPM` };
    })
    .sort((a, b) => groups[a.date].sortDate.getTime() - groups[b.date].sortDate.getTime());

  const status = data.length ? 'success' : 'no-data';
  return { data, status, message: status === 'no-data' ? 'No density data to display.' : undefined };
};

// Generate hourly activity pattern data
export const generateHourlyActivityData = (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all'
): Array<{ hour: number; activity: number; label: string }> => {
  const filtered = filterTranscriptsByTimeRange(transcripts, timeRange);
  if (filtered.length === 0) return [];

  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    totalActivity: 0,
    count: 0,
  }));

  filtered.forEach(transcript => {
    const date = safeParseISO(transcript.date, transcript.id);
    if (!date) return;

    // Use UTC for consistency
    const utcHour = date.getUTCHours();
    const wordCount = Math.round(transcript.content.length / 5);
    hourlyData[utcHour].totalActivity += wordCount;
    hourlyData[utcHour].count += 1;
  });

  return hourlyData.map(({ hour, totalActivity, count }) => {
    const ampm = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 || 12;
    const activity = count > 0 ? Math.round(totalActivity / count) : 0;
    return {
      hour,
      activity,
      label: `${displayHour}:00 ${ampm} UTC`,
    };
  });
};

// Generate sentiment trend data
export const generateSentimentTrendData = async (
  transcripts: Transcript[],
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all',
  customGroupBy?: GroupBy | 'hour'
): Promise<ChartDataResponse> => {
  const filtered = filterTranscriptsByTimeRange(transcripts, timeRange);
  if (filtered.length === 0) {
    return { data: [], status: 'no-data', message: 'No transcripts found for the selected period.' };
  }

  const inferredGroupBy: GroupBy = getGroupByFromTimeRange(timeRange === '24h' ? '7d' : timeRange);
  const groupBy = (customGroupBy ?? (timeRange === '24h' ? 'hour' : inferredGroupBy)) as GroupBy | 'hour';

  const processTranscriptSentiment = async (transcript: Transcript): Promise<number> => {
    if (sentimentCache.has(transcript.id)) return sentimentCache.get(transcript.id) ?? 0;
    try {
      const result = (await performAnalysis(transcript.content, AnalysisType.SENTIMENT)) as AnalysisResponse;
      const data = result?.data as SentimentDataShape | undefined;
      const score = typeof data?.score === 'number' ? data.score : 0;
      const finalScore = Math.max(-100, Math.min(100, score));
      sentimentCache.set(transcript.id, finalScore);
      return finalScore;
    } catch (error) {
      console.error(`Sentiment error for ${transcript.id}: ${error}. Defaulting to 0.`);
      sentimentCache.set(transcript.id, 0);
      return 0;
    }
  };

  const sentiments = await Promise.all(filtered.map(async t => ({ transcript: t, score: await processTranscriptSentiment(t) })));

  if (groupBy === 'hour') {
    const nowHour = dayjs().startOf('hour');
    const buckets: Record<string, { sum: number; count: number; sortDate: Date; label: string }> = {};
    for (let i = 0; i < 24; i++) {
      const hour = nowHour.subtract(i, 'hour');
      const key = hour.valueOf().toString();
      buckets[key] = { sum: 0, count: 0, sortDate: hour.toDate(), label: hour.format('MMM D, h A') };
    }
    sentiments.forEach(({ transcript, score }) => {
      const d = dayjs(transcript.date);
      if (!d.isValid()) return;
      const h = d.startOf('hour');
      const key = h.valueOf().toString();
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0, sortDate: h.toDate(), label: h.format('MMM D, h A') };
      buckets[key].sum += score;
      buckets[key].count += 1;
    });
    const data = Object.values(buckets)
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ label, sum, count }) => {
        const value = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
        return { date: label, value, label: `${value} sentiment score` };
      });
    const status = data.length ? 'success' : 'no-data';
    return { data, status, message: status === 'no-data' ? 'No sentiment data to display.' : undefined };
  }

  // Group without mutating Transcript: aggregate sentiment by matching ids
  const { groups, skipped } = groupTranscriptsByPeriod(
    filtered,
    groupBy as GroupBy,
    (t, current: { sum: number; count: number }) => {
      const s = sentiments.find(s => s.transcript.id === t.id)?.score ?? 0;
      return { sum: current.sum + s, count: current.count + 1 };
    },
    () => ({ sum: 0, count: 0 })
  );

  if (skipped === filtered.length) {
    return { data: [], status: 'no-data', message: 'No sentiment data due to date issues in all transcripts.' };
  }

  const data = Object.entries(groups)
    .map(([date, { data: { sum, count } }]) => {
      const value = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      return { date, value, label: `${value} sentiment score` };
    })
    .sort((a, b) => groups[a.date].sortDate.getTime() - groups[b.date].sortDate.getTime());

  const status = data.length ? 'success' : 'no-data';
  return { data, status, message: status === 'no-data' ? 'No sentiment data to display.' : undefined };
};

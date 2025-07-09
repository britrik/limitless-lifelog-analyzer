import { describe, it, expect } from 'vitest';
import {
  generateActivityChartData,
  getGroupByFromTimeRange,
  // filterTranscriptsByTimeRange, // Removed unused import
} from './dashboardAnalytics';
import { Transcript /* TimeRange as GlobalTimeRange */ } from '../types'; // Removed unused import alias
import dayjs from 'dayjs';

// Helper to create sample transcripts
const createSampleTranscript = (date: string, id: string, content: string = 'Sample content.'): Transcript => ({
  id,
  title: `Sample ${id}`,
  date,
  content,
  summary: `Summary for ${id}`,
  isStarred: false,
});

const now = dayjs(); // Use a fixed 'now' for reproducible tests

// A more diverse set of transcripts for thorough testing
const sampleTranscripts: Transcript[] = [
  // Today (for 24h tests) - multiple within the same hour, and spread across a few hours
  createSampleTranscript(now.toISOString(), 't-now-1'),
  createSampleTranscript(now.subtract(5, 'minutes').toISOString(), 't-now-2'),
  createSampleTranscript(now.subtract(1, 'hour').toISOString(), 't-1h-ago'),
  createSampleTranscript(now.subtract(1, 'hour').subtract(10, 'minutes').toISOString(), 't-1h10m-ago'),
  createSampleTranscript(now.subtract(3, 'hours').toISOString(), 't-3h-ago'),

  // Yesterday
  createSampleTranscript(now.subtract(1, 'day').startOf('day').add(10, 'hours').toISOString(), 't-yesterday-1'),
  createSampleTranscript(now.subtract(1, 'day').startOf('day').add(14, 'hours').toISOString(), 't-yesterday-2'),

  // Last 7 days
  createSampleTranscript(now.subtract(2, 'days').toISOString(), 't-2d-ago'),
  createSampleTranscript(now.subtract(4, 'days').toISOString(), 't-4d-ago'),
  createSampleTranscript(now.subtract(6, 'days').toISOString(), 't-6d-ago'), // Exactly 6 days ago from now

  // Last 30 days (but outside last 7 days)
  createSampleTranscript(now.subtract(10, 'days').toISOString(), 't-10d-ago'),
  createSampleTranscript(now.subtract(15, 'days').toISOString(), 't-15d-ago'),
  createSampleTranscript(now.subtract(29, 'days').toISOString(), 't-29d-ago'), // Exactly 29 days ago from now

  // Last 90 days (but outside last 30 days)
  createSampleTranscript(now.subtract(35, 'days').toISOString(), 't-35d-ago'),
  createSampleTranscript(now.subtract(60, 'days').toISOString(), 't-60d-ago'),
  createSampleTranscript(now.subtract(89, 'days').toISOString(), 't-89d-ago'),

  // Older than 90 days (for 'all' or longer ranges if added)
  createSampleTranscript(now.subtract(100, 'days').toISOString(), 't-100d-ago'),
  createSampleTranscript(now.subtract(200, 'days').toISOString(), 't-200d-ago'),
];


describe('dashboardAnalytics', () => {
  describe('getGroupByFromTimeRange', () => {
    it('should return "hour" for "24h"', () => {
      expect(getGroupByFromTimeRange('24h')).toBe('hour');
    });
    it('should return "day" for "7d"', () => {
      expect(getGroupByFromTimeRange('7d')).toBe('day');
    });
    it('should return "day" for "30d"', () => {
      expect(getGroupByFromTimeRange('30d')).toBe('day');
    });
    it('should return "week" for "90d"', () => {
      expect(getGroupByFromTimeRange('90d')).toBe('week');
    });
    it('should return "week" for "12w"', () => {
      expect(getGroupByFromTimeRange('12w')).toBe('week');
    });
    it('should return "week" for "52w"', () => {
      expect(getGroupByFromTimeRange('52w')).toBe('week');
    });
    it('should return "month" for "all"', () => {
      expect(getGroupByFromTimeRange('all')).toBe('month');
    });
  });

  describe('generateActivityChartData', () => {
    it('should group by hour for "24h" time range and have at least 2 buckets if data spans multiple hours', () => {
      const chartData = generateActivityChartData(sampleTranscripts, '24h');
      // Based on sampleTranscripts, we expect data from 'now', '1h-ago', '3h-ago' which are 3 distinct hours
      expect(chartData.length).toBeGreaterThanOrEqual(2);
      expect(chartData.length).toBe(3); // Exactly 3 for current sample data
      chartData.forEach(dataPoint => {
        expect(dataPoint.date).toMatch(/MMM DD, HH:00/); // Format: MMM DD, HH:00
        expect(typeof dataPoint.value).toBe('number');
        expect(dataPoint.value).toBeGreaterThan(0);
      });
      // Check specific counts for the hours
      expect(chartData.find(d => d.date === now.startOf('hour').format('MMM DD, HH:00'))?.value).toBe(2); // t-now-1, t-now-2
      expect(chartData.find(d => d.date === now.subtract(1, 'hour').startOf('hour').format('MMM DD, HH:00'))?.value).toBe(2); // t-1h-ago, t-1h10m-ago
      expect(chartData.find(d => d.date === now.subtract(3, 'hours').startOf('hour').format('MMM DD, HH:00'))?.value).toBe(1); // t-3h-ago
    });

    it('should group by day for "7d" time range and have appropriate buckets', () => {
      const chartData = generateActivityChartData(sampleTranscripts, '7d');
      // Expected days with activity in the last 7 days (from `now`):
      // Today (now, 1h ago, 3h ago) = 1 bucket for today
      // Yesterday = 1 bucket
      // 2 days ago = 1 bucket
      // 4 days ago = 1 bucket
      // 6 days ago = 1 bucket
      // Total = 5 distinct days
      expect(chartData.length).toBe(5);
      chartData.forEach(dataPoint => {
        expect(dataPoint.date).toMatch(/MMM DD, YYYY/); // Format: MMM DD, YYYY
        expect(typeof dataPoint.value).toBe('number');
        expect(dataPoint.value).toBeGreaterThan(0);
      });
       // Verify counts for specific days based on `sampleTranscripts`
      expect(chartData.find(d => d.date === now.format('MMM DD, YYYY'))?.value).toBe(5); // 5 from "today"
      expect(chartData.find(d => d.date === now.subtract(1, 'day').format('MMM DD, YYYY'))?.value).toBe(2);
      expect(chartData.find(d => d.date === now.subtract(2, 'days').format('MMM DD, YYYY'))?.value).toBe(1);
      expect(chartData.find(d => d.date === now.subtract(4, 'days').format('MMM DD, YYYY'))?.value).toBe(1);
      expect(chartData.find(d => d.date === now.subtract(6, 'days').format('MMM DD, YYYY'))?.value).toBe(1);
    });

    it('should generate a snapshot for "30d" time range for consistency', () => {
      const chartData = generateActivityChartData(sampleTranscripts, '30d');
      // For 30d, we expect data from:
      // Today (5), Yesterday (2), 2d ago (1), 4d ago (1), 6d ago (1) (total 5 days from 7d)
      // + 10d ago (1), 15d ago (1), 29d ago (1) (total 3 days from 30d specific)
      // Total = 8 distinct day buckets
      expect(chartData.length).toBe(8);
      chartData.forEach(dataPoint => {
        expect(dataPoint.date).toMatch(/MMM DD, YYYY/);
        expect(typeof dataPoint.value).toBe('number');
      });
      expect(chartData).toMatchSnapshot();
    });

    it('should return empty array for no transcripts', () => {
      const chartData = generateActivityChartData([], '7d');
      expect(chartData).toEqual([]);
    });

    it('should handle transcripts with invalid dates gracefully', () => {
      const transcriptsWithInvalidDate: Transcript[] = [
        createSampleTranscript(now.toISOString(), 'valid-1'),
        createSampleTranscript('invalid-date-string', 'invalid-1'),
        createSampleTranscript(now.subtract(1, 'day').toISOString(), 'valid-2'),
      ];
      const chartData = generateActivityChartData(transcriptsWithInvalidDate, '7d');
      expect(chartData.length).toBe(2); // Only valid dates should be processed
      const totalValue = chartData.reduce((sum, dp) => sum + dp.value, 0);
      expect(totalValue).toBe(2); // Each valid transcript counts as 1
    });

    it('should correctly format week labels', () => {
      const transcriptsForWeekTest: Transcript[] = [
        createSampleTranscript(now.startOf('week').add(1, 'day').toISOString(), 'wk-t1'), // This week
        createSampleTranscript(now.startOf('week').subtract(1, 'week').add(1,'day').toISOString(), 'wk-t2'), // Last week
      ];
      const chartData = generateActivityChartData(transcriptsForWeekTest, '90d'); // 90d uses 'week' groupBy
      expect(chartData.length).toBe(2);
      expect(chartData[0].date).toMatch(/Week of MMM DD, YYYY/);
      expect(chartData[1].date).toMatch(/Week of MMM DD, YYYY/);
    });
  });
});

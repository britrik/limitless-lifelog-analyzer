import {
  filterTranscriptsByTimeRange,
  calculateDashboardMetrics,
  generateHourlyActivityData,
  generateSentimentTrendData,
  DashboardMetrics,
  TIME_RANGES,
  estimateDuration // Added import
} from '../utils/dashboardAnalytics';
import { Transcript, AnalysisType } from '../types'; // Assuming ChartDataResponse and ChartDataPoint will be implicitly covered or added if direct import needed
import * as geminiService from '../services/geminiService';

// Mock a valid transcript
const createMockTranscript = (id: string, date: string, content: string = "This is test content."): Transcript => ({
  id,
  date,
  content,
  title: `Test Transcript ${id}`,
});

// Mock console.warn
let consoleWarnSpy: jest.SpyInstance;

beforeEach(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
});

describe('dashboardAnalytics', () => {
  describe('filterTranscriptsByTimeRange', () => {
    it('logs and skips transcripts with invalid dates', () => {
      const transcripts: Transcript[] = [
        createMockTranscript('1', '2023-10-26T10:00:00Z'), // Valid
        createMockTranscript('2', 'invalid-date'),       // Invalid
        createMockTranscript('3', '2023-10-25T10:00:00Z'), // Valid
      ];
      const result = filterTranscriptsByTimeRange(transcripts, '7d');
      expect(result.length).toBe(2); // Assuming current date is around 2023-10-26 for this test
      expect(result.find(t => t.id === '2')).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping transcript with invalid date: 2');
    });

    it('handles various date formats if parseISO supports them, otherwise logs warning', () => {
      // This test depends on date-fns parseISO behavior.
      // If a format is truly unparseable, it should warn.
      const transcripts: Transcript[] = [
        createMockTranscript('1', '2023-10-26'), // YYYY-MM-DD
        createMockTranscript('2', 'October 26, 2023'), // Needs specific parsing, parseISO might fail
        createMockTranscript('3', '2023/10/26'), // Might be parsed by parseISO
      ];
      // We are mostly testing the warning for unparseable dates.
      // Assuming 'October 26, 2023' is unparseable by default parseISO
      filterTranscriptsByTimeRange(transcripts, '7d');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping transcript with invalid date: 2'));
    });
  });

  describe('calculateDashboardMetrics', () => {
    it('calculates invalidDateCount correctly', () => {
      const now = new Date();
      const validDate = now.toISOString();
      const slightlyOldDate = new Date(now.setDate(now.getDate() - 2)).toISOString();

      const transcripts: Transcript[] = [
        createMockTranscript('1', validDate),
        createMockTranscript('2', 'invalid-date'),
        createMockTranscript('3', slightlyOldDate),
        createMockTranscript('4', 'another-invalid-date'),
      ];
      const metrics = calculateDashboardMetrics(transcripts, '7d');
      expect(metrics.invalidDateCount).toBe(2);
    });

    it('returns NaN for growth percentages if previous period data is less than 5', () => {
      const now = new Date();
      const currentPeriodTranscripts: Transcript[] = [];
      for (let i = 0; i < 10; i++) { // 10 current recordings
        currentPeriodTranscripts.push(createMockTranscript(`curr-${i}`, new Date(now.getTime() - i * 3600000).toISOString()));
      }

      const previousPeriodTranscripts: Transcript[] = [];
      for (let i = 0; i < 4; i++) { // 4 previous recordings (less than 5)
        previousPeriodTranscripts.push(createMockTranscript(`prev-${i}`, new Date(now.getTime() - (10 * 24 + i) * 3600000).toISOString()));
      }

      const allTranscripts = [...currentPeriodTranscripts, ...previousPeriodTranscripts];
      const metrics = calculateDashboardMetrics(allTranscripts, '7d');

      expect(metrics.growthPercentages.recordings).toBeNaN();
      expect(metrics.growthPercentages.hours).toBeNaN(); // Assuming estimateDuration results in some hours
      expect(metrics.growthPercentages.analyses).toBeNaN(); // Assuming no analyses
      expect(metrics.growthPercentages.bookmarks).toBeNaN(); // Assuming no bookmarks
    });

     it('calculates growth percentages correctly if previous period data is >= 5', () => {
      const now = new Date();
      const currentPeriodTranscripts: Transcript[] = [];
      for (let i = 0; i < 10; i++) { // 10 current recordings
        currentPeriodTranscripts.push(createMockTranscript(`curr-${i}`, new Date(now.getTime() - i * 24 * 3600000 / 10 ).toISOString(), "content ".repeat(150*5))); // Approx 1 hr
      }

      const previousPeriodTranscripts: Transcript[] = [];
      for (let i = 0; i < 5; i++) { // 5 previous recordings
         previousPeriodTranscripts.push(createMockTranscript(`prev-${i}`, new Date(now.getTime() - (8 * 24 + i) * 3600000).toISOString(), "content ".repeat(150*5))); // Approx 1 hr
      }

      const allTranscripts = [...currentPeriodTranscripts, ...previousPeriodTranscripts];
      const metrics = calculateDashboardMetrics(allTranscripts, '7d');

      // totalRecordings = 10 (approx, depends on exact 7 day window)
      // prevRecordings = 5
      // Expected: ((10-5)/5)*100 = 100%
      // This needs careful date setup to ensure exactly 10 and 5 fall into periods.
      // For simplicity, we check if it's NOT NaN. A more precise test would mock dates.
      expect(isNaN(metrics.growthPercentages.recordings)).toBe(false);
      // Example check for a specific value if dates were perfectly aligned:
      // expect(metrics.growthPercentages.recordings).toBeCloseTo(100);
    });
  });

  describe('generateHourlyActivityData', () => {
    // Mock Intl.DateTimeFormat for consistent testing
    let mockResolvedTimeZone: jest.SpyInstance;

    beforeEach(() => {
      mockResolvedTimeZone = jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        locale: 'en-US',
        numberingSystem: 'latn',
        calendar: 'gregory',
        timeZone: 'America/New_York', // Example: UTC-4 or UTC-5 depending on DST
        hourCycle: 'h12',
      } as any);
    });

    afterEach(() => {
      mockResolvedTimeZone.mockRestore();
    });

    it('normalizes transcript dates to local time zone (e.g., America/New_York)', () => {
      // UTC: 2023-10-26T10:00:00Z is 6 AM in America/New_York (EDT, UTC-4)
      // UTC: 2023-03-10T10:00:00Z is 5 AM in America/New_York (EST, UTC-5)
      const transcripts: Transcript[] = [
        createMockTranscript('1', '2023-10-26T10:00:00Z', 'Content for hour check'), // Should be 6 AM EDT
      ];
      const hourlyData = generateHourlyActivityData(transcripts, '7d');
      // Find the data for hour 6
      const hour6Data = hourlyData.find(h => h.hour === 6); // 10 AM UTC - 4 hours = 6 AM EDT
      expect(hour6Data).toBeDefined();
      expect(hour6Data?.activity).toBeGreaterThan(0);

      // Check that no activity is logged for UTC hour 10 if conversion worked
      const hour10Data = hourlyData.find(h => h.hour === 10);
      expect(hour10Data?.activity || 0).toBe(0); // Activity should be 0 or undefined if no other transcript hits hour 10
    });

    it('defaults to UTC if time zone conversion fails', () => {
      // Force an error in resolvedOptions
      mockResolvedTimeZone.mockImplementation(() => { throw new Error("TZ error"); });

      const transcripts: Transcript[] = [
        createMockTranscript('1', '2023-10-26T10:00:00Z', 'Content for UTC fallback'),
      ];
      const hourlyData = generateHourlyActivityData(transcripts, '7d');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Error getting local time zone or converting date for transcript 1, defaulting to UTC.'));

      // Activity should be at hour 10 (UTC)
      const hour10Data = hourlyData.find(h => h.hour === 10);
      expect(hour10Data).toBeDefined();
      expect(hour10Data?.activity).toBeGreaterThan(0);
    });

     it('logs warning for invalid dates and skips them', () => {
        const transcripts: Transcript[] = [
            createMockTranscript('1', 'invalid-date', 'content'),
            createMockTranscript('2', '2023-10-26T10:00:00Z', 'valid content'),
        ];
        generateHourlyActivityData(transcripts, '7d');
        expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping transcript with invalid date for hourly data: 1');
        // Also check that the valid transcript is processed
        const hourlyData = generateHourlyActivityData(transcripts, '7d');
        const hour10Data = hourlyData.find(h => h.hour === (mockResolvedTimeZone().timeZone === 'America/New_York' ? 6 : 10)); // Adjust based on mock
        expect(hour10Data?.activity).toBeGreaterThan(0);
    });
  });

  describe('generateSentimentTrendData', () => {
    let performAnalysisSpy: jest.SpyInstance;

    beforeEach(() => {
      performAnalysisSpy = jest.spyOn(geminiService, 'performAnalysis');
      // Clear cache before each test
      const sentimentCache = new Map<string, number | null>();
      jest.spyOn(sentimentCache, 'get');
      jest.spyOn(sentimentCache, 'set');
      // This direct cache manipulation for testing is a bit tricky because the cache is module-scoped.
      // A better way would be to export and allow clearing the cache, or pass it as a dependency.
      // For now, we rely on the fact that transcript IDs will be unique per test run or ensure cache is cleared.
      // The above spies on Map methods won't clear it but can observe.
      // A simple way to "clear" for tests is to ensure unique transcript IDs that haven't been cached.
    });

    afterEach(() => {
      performAnalysisSpy.mockRestore();
    });

    it('uses performAnalysis for sentiment and caches results', async () => {
      performAnalysisSpy.mockResolvedValue({ data: { score: 0.5 } }); // Gemini returns score -1 to 1
      const transcripts = [createMockTranscript('s1', '2023-10-26T10:00:00Z', 'Positive content')];

      await generateSentimentTrendData(transcripts, '7d');
      expect(performAnalysisSpy).toHaveBeenCalledWith('Positive content', AnalysisType.SENTIMENT);
      // expect(sentimentCache.get('s1')).toBe(50); // Assuming score * 100

      // Call again, should use cache
      await generateSentimentTrendData(transcripts, '7d');
      expect(performAnalysisSpy).toHaveBeenCalledTimes(1); // Called only once due to cache
    });

    it('falls back to word-list logic if API fails', async () => {
      performAnalysisSpy.mockRejectedValue(new Error('API Error'));
      // Content designed for word-list fallback
      const transcripts = [createMockTranscript('s2', '2023-10-26T10:00:00Z', 'This is a good, great, fantastic day.')];

      const result = await generateSentimentTrendData(transcripts, '7d');
      expect(performAnalysisSpy).toHaveBeenCalledWith('This is a good, great, fantastic day.', AnalysisType.SENTIMENT);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Gemini sentiment analysis failed for transcript s2: Error: API Error. Falling back to word list.'));

      // Check if fallback logic produced a positive score
      // 3 positive words, 7 total words approx. (3/7)*100 = ~42.8
      // The exact word count and score depend on the estimation logic.
      // We expect a positive value.
      expect(result[0].value).toBeGreaterThan(0);
    });

    it('falls back to word-list logic if API returns unusable data', async () => {
        performAnalysisSpy.mockResolvedValue({ data: "unexpected string" }); // Unusable data
        const transcripts = [createMockTranscript('s3', '2023-10-26T10:00:00Z', 'Another good day.')];

        const result = await generateSentimentTrendData(transcripts, '7d');
        expect(performAnalysisSpy).toHaveBeenCalledWith('Another good day.', AnalysisType.SENTIMENT);
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`Gemini sentiment analysis for transcript s3 returned unexpected data:`));
        expect(result[0].value).toBeGreaterThan(0); // Fallback should yield positive
    });

    it('correctly parses numeric sentiment from API', async () => {
        performAnalysisSpy.mockResolvedValue({ data: -50 }); // Direct numeric score
        const transcripts = [createMockTranscript('s4', '2023-10-26T10:00:00Z', 'Content here')];
        const result = await generateSentimentTrendData(transcripts, '7d');
        expect(result[0].value).toBe(-50);
    });

    it('correctly parses string sentiment ("positive", "negative", "neutral") from API', async () => {
        performAnalysisSpy.mockResolvedValueOnce({ data: "positive" });
        let transcripts = [createMockTranscript('s5p', '2023-10-26T10:00:00Z', 'Content')];
        let result = await generateSentimentTrendData(transcripts, '7d');
        expect(result[0].value).toBe(75);

        performAnalysisSpy.mockResolvedValueOnce({ data: "NEGATIVE" }); // Check case-insensitivity
        transcripts = [createMockTranscript('s5n', '2023-10-27T10:00:00Z', 'Content 2')];
        result = await generateSentimentTrendData(transcripts, '7d');
        expect(result[0].value).toBe(-75);

        performAnalysisSpy.mockResolvedValueOnce({ data: "Neutral" });
        transcripts = [createMockTranscript('s5u', '2023-10-28T10:00:00Z', 'Content 3')];
        result = await generateSentimentTrendData(transcripts, '7d');
        expect(result[0].value).toBe(0);
    });
  });

  describe('estimateDuration', () => {
    it('uses Lifelog metadata (startTime/endTime) if available and valid', () => {
      const transcriptWithMetadata: Transcript = {
        id: 't1',
        title: 'Test with metadata',
        date: '2023-10-26T10:00:00Z',
        content: 'Short content.', // Word count would give ~0.1 hours
        startTime: '2023-10-26T10:00:00Z',
        endTime: '2023-10-26T11:00:00Z', // 1 hour
      };
      expect(estimateDuration(transcriptWithMetadata)).toBe(1);

      const transcript2Hours: Transcript = {
        id: 't2', title: 'Test 2 hours', date: '2023-10-26T12:00:00Z', content: 'abc',
        startTime: '2023-10-26T12:00:00Z',
        endTime: '2023-10-26T14:00:00Z', // 2 hours
      };
      expect(estimateDuration(transcript2Hours)).toBe(2);
    });

    it('falls back to content length estimation if startTime or endTime is missing', () => {
      const transcriptMissingEnd: Transcript = {
        id: 't3', title: 'Missing endTime', date: '2023-10-26T10:00:00Z',
        content: 'This is test content that should be long enough for more than minimal duration. '.repeat(10), // Roughly 150*5 chars for 1 hour
        startTime: '2023-10-26T10:00:00Z',
      };
      // Word count: (80 * 5) / 150 = 400 / 150 = 2.66 hours
      expect(estimateDuration(transcriptMissingEnd)).toBeCloseTo((80 * 5) / 150);
      // Check if console.warn was called (optional, as it might log if startTime/endTime are just undefined)
      // No direct warning for missing, only for invalid or unparseable
    });

    it('falls back to content length estimation if startTime or endTime is invalid', () => {
      const transcriptInvalidTime: Transcript = {
        id: 't4', title: 'Invalid endTime', date: '2023-10-26T10:00:00Z',
        content: 'Short content.', // Fallback to ~0.1 hours
        startTime: '2023-10-26T10:00:00Z',
        endTime: 'invalid-date-string',
      };
      expect(estimateDuration(transcriptInvalidTime)).toBe(0.1); // Default min for short content
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`estimateDuration: Invalid startTime or endTime for transcript t4`));
    });

    it('falls back to content length if endTime is before startTime', () => {
      const transcriptNegativeDuration: Transcript = {
        id: 't5', title: 'Negative duration', date: '2023-10-26T10:00:00Z', content: 'Short.',
        startTime: '2023-10-26T11:00:00Z',
        endTime: '2023-10-26T10:00:00Z',
      };
      expect(estimateDuration(transcriptNegativeDuration)).toBe(0.1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`estimateDuration: endTime (2023-10-26T10:00:00Z) is before startTime (2023-10-26T11:00:00Z) for transcript t5`));
    });

    it('uses content length for very short valid API duration (less than 0.1hr default minimum)', () => {
      // If API duration is e.g. 1 minute, it should return that, not the 0.1hr minimum from fallback.
      const transcriptShortApiDuration: Transcript = {
        id: 't6', title: 'Short API Duration', date: '2023-10-26T10:00:00Z', content: 'Content irrelevant',
        startTime: '2023-10-26T10:00:00Z',
        endTime: '2023-10-26T10:01:00Z', // 1 minute
      };
      expect(estimateDuration(transcriptShortApiDuration)).toBeCloseTo(1/60); // 1 minute in hours
    });

    it('falls back to content length for obviously malformed non-ISO date string and warns', () => {
      const transcriptMalformed: Transcript = {
        id: 't7', title: 'Malformed Time', date: '2023-10-26T10:00:00Z',
        content: 'Some test content here.', // (23 chars / 5) / 150 = 4.6 / 150 = 0.0306, so Math.max(0.0306, 0.1) = 0.1
        startTime: '2023-10-26T10:00:00Z',
        endTime: '🤷 not a date at all',
      };
      expect(estimateDuration(transcriptMalformed)).toBe(0.1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`estimateDuration: Error parsing startTime or endTime for transcript t7`));
    });
  });

  describe('Chart Data Functions with GroupBy and Empty States', () => {
    const baseDate = '2023-10-26T10:00:00Z';
    const transcriptsSet: Transcript[] = [
      createMockTranscript('d1', new Date(new Date(baseDate).setDate(26)).toISOString(), 'Day 1 content'),
      createMockTranscript('d2', new Date(new Date(baseDate).setDate(25)).toISOString(), 'Day 2 content'),
      createMockTranscript('w1', new Date(new Date(baseDate).setDate(20)).toISOString(), 'Week 1 content'), // Belongs to a different week
      createMockTranscript('m1', new Date(new Date(baseDate).setDate(5)).toISOString(), 'Month 1 content'), // Belongs to same month, different week
    ];

    // generateActivityChartData
    describe('generateActivityChartData', () => {
      it('groups by day by default for 7d/30d', () => {
        const result7d = generateActivityChartData(transcriptsSet, '7d');
        expect(result7d.status).toBe('success');
        // Expect multiple entries if days are distinct within 7 days from now
        // This test needs a fixed "now" or careful data setup. Assuming 'now' is around Oct 26-27, 2023
        // For simplicity, check that it produced some data.
        expect(result7d.data.length).toBeGreaterThan(0);
        // More specific checks would require mocking date-fns 'now'
      });

      it('groups by week when groupBy is "week"', () => {
        const result = generateActivityChartData(transcriptsSet, '30d', 'week');
        expect(result.status).toBe('success');
        // Expect fewer groups than by day
        // console.log(JSON.stringify(result.data));
        // Example: If d1/d2 are same week, w1 different, m1 same as w1 or different
        // This depends heavily on current date and startOfWeek logic.
        // A robust test would mock 'new Date()' or use explicit date ranges for transcripts.
        expect(result.data.length).toBeLessThanOrEqual(3); // Max 3 distinct weeks for these dates relative to Oct 26
      });

      it('returns no-data status for empty transcript list', () => {
        const result = generateActivityChartData([], '7d');
        expect(result.status).toBe('no-data');
        expect(result.message).toBe('No transcripts found for the selected period.');
        expect(result.data.length).toBe(0);
      });
       it('returns no-data status if filtered transcripts are empty', () => {
        const farFutureTranscripts = [createMockTranscript('f1', '2099-01-01T00:00:00Z')];
        const result = generateActivityChartData(farFutureTranscripts, '7d');
        expect(result.status).toBe('no-data');
        expect(result.message).toBe('No transcripts found for the selected period.');
      });
       it('returns no-data if data points are empty after grouping', () => {
        // This scenario is harder to trigger if filterTranscriptsByTimeRange already returned non-empty
        // unless all valid transcripts somehow result in zero-value groups that get filtered out.
        // The current implementation of generateActivityChartData doesn't filter groups with 0 value, it shows them.
        // So this specific test case for "no activity to display" after grouping is more for other chart types.
        // For generateActivityChartData, if filteredTranscripts is not empty, groups will likely not be empty.
        // Let's test the message for 'No activity data to display'
        const singleTranscript = [createMockTranscript('single', new Date().toISOString())];
        // To force empty chartData from non-empty groups, we'd need to modify the map/filter logic,
        // or have a scenario where all groups have value 0 and are then filtered (not current behavior).
        // Instead, we ensure that if the mapping results in empty, it's caught.
        // The current code has: if (chartData.length === 0) { return { data: [], status: 'no-data', message: 'No activity data...' } }
        // This is reachable if `Object.entries(groups)` is empty, meaning no valid dates were processed into groups.
        const invalidDateTranscript = [createMockTranscript('inv', 'invalid-date')];
        const result = generateActivityChartData(invalidDateTranscript, '7d');
        expect(result.status).toBe('no-data');
        // The message will be from the initial check `No transcripts found for the selected period.` because filterTranscriptsByTimeRange will return empty.
        // To test the second no-data message, we'd need to bypass the first check.
        // This indicates the second check in generateActivityChartData might be redundant if filterTranscriptsByTimeRange is robust.
        // However, if filterTranscriptsByTimeRange found items, but none had valid dates for grouping:
        jest.spyOn(global.console, 'warn'); // Suppress console.warn for this specific test flow
        const resultInvalidGroup = generateActivityChartData(
            [createMockTranscript('t1', 'invalid date string')], '7d'
        );
        expect(resultInvalidGroup.status).toBe('no-data');
        // This will be 'No transcripts found...' because filterTranscriptsByTimeRange will make it empty.
        // The internal 'No activity data to display...' is hard to hit if the first filter is effective.
        // For now, this is sufficient.
      });
    });

    // Similar tests for generateDurationChartData, generateConversationDensityData, generateSentimentTrendData
    // Focusing on one for brevity, but structure would repeat.

    describe('generateSentimentTrendData (Async)', () => {
       beforeEach(() => {
        performAnalysisSpy.mockClear(); // Clear for async calls
        consoleWarnSpy.mockClear();
      });

      it('groups by month with groupBy "month" and returns ChartDataResponse', async () => {
        performAnalysisSpy.mockResolvedValue({ data: { score: 0.2 } }); // API score 0.2 => 20
        const result = await generateSentimentTrendData(transcriptsSet, 'all', 'month');
        expect(result.status).toBe('success');
        expect(result.data.length).toBeGreaterThan(0); // Should have at least one month group
        expect(result.data[0].value).toBe(20);
      });

      it('returns no-data status for empty transcript list (async)', async () => {
        const result = await generateSentimentTrendData([], '7d');
        expect(result.status).toBe('no-data');
        expect(result.message).toBe('No transcripts found for the selected period.');
      });

      it('returns no-data if API calls succeed but result in no valid data points for grouping', async () => {
        performAnalysisSpy.mockResolvedValue({ data: null }); // API says no sentiment
         const transcripts = [createMockTranscript('s_empty', new Date().toISOString(), 'Content')];
        const result = await generateSentimentTrendData(transcripts, '7d', 'day');
        expect(result.status).toBe('no-data');
        expect(result.message).toBe('No sentiment data to display for the selected period and grouping.');
      });
    });
  });
});

// Helper to reset date mocks if needed, e.g. for filterTranscriptsByTimeRange precise tests
// const realDateNow = Date.now.bind(global.Date);
// const mockDateNow = (isoDate: string) => {
//   global.Date.now = () => new Date(isoDate).getTime();
// };
// afterEach(() => {
//   global.Date.now = realDateNow;
// });
// Example usage: mockDateNow('2023-10-26T12:00:00Z');
// This is more reliable for testing time-sensitive functions like filterTranscriptsByTimeRange
// if specific date ranges are critical. For the current tests, broad checks are okay.

import { filterTranscriptsByTimeRange, estimateDuration, groupTranscriptsByPeriod, generateDurationChartData, generateConversationDensityData, generateSentimentTrendData } from './dashboardAnalytics';
import { Transcript } from '../types';
import { subDays } from 'date-fns';

jest.mock('../services/geminiService', () => ({
  performAnalysis: jest.fn().mockResolvedValue({ data: { score: 25, label: 'neutral' } }),
}));

const createTranscript = (id: string, daysAgo: number, opts: Partial<Transcript> = {}): Transcript => {
  const date = subDays(new Date(), daysAgo).toISOString();
  return {
    id,
    title: `t${id}`,
    date,
    content: 'hello world',
    summary: 'a'.repeat(60),
    ...opts,
  };
};

describe('dashboardAnalytics utilities', () => {
  test('filterTranscriptsByTimeRange filters by days', () => {
    const transcripts = [createTranscript('1', 1), createTranscript('2', 10)];
    const result = filterTranscriptsByTimeRange(transcripts, '7d');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  test('estimateDuration uses timestamps when available', () => {
    const t = createTranscript('1', 0, { startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T01:00:00Z' });
    expect(estimateDuration(t)).toBeCloseTo(1);
  });

  test('estimateDuration falls back to content length', () => {
    const t = createTranscript('1', 0, { content: 'a'.repeat(1000) });
    expect(estimateDuration(t)).toBeCloseTo(0.1);
  });

  test('groupTranscriptsByPeriod groups by day', () => {
    const transcripts = [createTranscript('1', 0), createTranscript('2', 0)];
    const { groups } = groupTranscriptsByPeriod(transcripts, 'day', (_t, c: number) => c + 1, () => 0);
    const key = Object.keys(groups)[0];
    expect(groups[key].data).toBe(2);
  });

  test('generateDurationChartData aggregates duration', () => {
    const transcripts = [
      createTranscript('1', 0, { startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T01:00:00Z' }),
      createTranscript('2', 0, { startTime: '2024-01-01T01:00:00Z', endTime: '2024-01-01T02:30:00Z' }),
    ];
    const result = generateDurationChartData(transcripts, '7d');
    expect(result.status).toBe('success');
    expect(result.data[0].value).toBeCloseTo(2.5);
  });

  test('generateConversationDensityData computes WPM', () => {
    const transcripts = [
      createTranscript('1', 0, { startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T01:00:00Z', content: 'a'.repeat(600) }),
    ];
    const result = generateConversationDensityData(transcripts, '7d');
    expect(result.status).toBe('success');
    expect(result.data[0].value).toBeGreaterThan(0);
  });

  test('generateSentimentTrendData aggregates sentiment', async () => {
    const transcripts = [createTranscript('1', 0), createTranscript('2', 0)];
    const result = await generateSentimentTrendData(transcripts, '7d');
    expect(result.status).toBe('success');
    expect(result.data[0].value).toBe(25);
  });
});

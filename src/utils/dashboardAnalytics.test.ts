import { filterTranscriptsByTimeRange } from './dashboardAnalytics';
import { Transcript } from '../types';
import dayjs from 'dayjs';

// Mock a few transcripts with specific dates relative to now
const now = dayjs();
const mockTranscripts: Transcript[] = [
  {
    id: '1',
    title: 'Transcript 1 (1 hour ago)',
    date: now.subtract(1, 'hour').toISOString(),
    content: 'This was 1 hour ago.',
    isStarred: false,
  },
  {
    id: '2',
    title: 'Transcript 2 (12 hours ago)',
    date: now.subtract(12, 'hour').toISOString(),
    content: 'This was 12 hours ago.',
    isStarred: true,
  },
  {
    id: '3',
    title: 'Transcript 3 (23 hours 59 mins ago)',
    date: now.subtract(23, 'hour').subtract(59, 'minute').toISOString(),
    content: 'This was 23 hours 59 mins ago, just within range.',
    isStarred: false,
  },
  {
    id: '4',
    title: 'Transcript 4 (24 hours 1 min ago)',
    date: now.subtract(24, 'hour').subtract(1, 'minute').toISOString(),
    content: 'This was 24 hours 1 minute ago, just outside range.',
    isStarred: false,
  },
  {
    id: '5',
    title: 'Transcript 5 (5 days ago)',
    date: now.subtract(5, 'day').toISOString(),
    content: 'This was 5 days ago.',
    isStarred: false,
  },
  {
    id: '6',
    title: 'Transcript 6 (future date)',
    date: now.add(1, 'hour').toISOString(),
    content: 'This is in the future.',
    isStarred: false,
  },
];

describe('dashboardAnalytics', () => {
  describe('filterTranscriptsByTimeRange', () => {
    it('should have a placeholder test', () => {
      expect(true).toBe(true);
    });

    it('should correctly filter for "24h" range', () => {
      const filtered = filterTranscriptsByTimeRange(mockTranscripts, '24h');
      // Expecting transcripts 1, 2, and 3 (1h ago, 12h ago, 23h 59m ago)
      expect(filtered).toHaveLength(3);
      expect(filtered.some(t => t.id === '1')).toBe(true);
      expect(filtered.some(t => t.id === '2')).toBe(true);
      expect(filtered.some(t => t.id === '3')).toBe(true);
      expect(filtered.some(t => t.id === '4')).toBe(false); // 24h 1m ago
      expect(filtered.some(t => t.id === '5')).toBe(false); // 5 days ago
      expect(filtered.some(t => t.id === '6')).toBe(false); // future
    });

    it('should correctly filter for "7d" range', () => {
      const filtered = filterTranscriptsByTimeRange(mockTranscripts, '7d');
      // Expecting transcripts 1, 2, 3, 4, and 5 (all except future)
      expect(filtered).toHaveLength(5);
      expect(filtered.some(t => t.id === '1')).toBe(true);
      expect(filtered.some(t => t.id === '2')).toBe(true);
      expect(filtered.some(t => t.id === '3')).toBe(true);
      expect(filtered.some(t => t.id === '4')).toBe(true); // 24h 1m ago is within 7 days
      expect(filtered.some(t => t.id === '5')).toBe(true);
      expect(filtered.some(t => t.id === '6')).toBe(false); // future
    });

    it('should return all transcripts for "all" range', () => {
      const filtered = filterTranscriptsByTimeRange(mockTranscripts, 'all');
      // All non-future transcripts. The current filterTranscriptsByTimeRange for 'all' returns all,
      // but typically we might not want future ones. For now, matching existing behavior.
      // If future dates should be excluded by 'all', this test would need adjustment.
      expect(filtered).toHaveLength(mockTranscripts.length);
    });

    it('should return empty array if no transcripts match "24h"', () => {
      const oldTranscripts: Transcript[] = [
        { id: 'old1', title: 'Very old', date: now.subtract(3, 'day').toISOString(), content: '...' },
        { id: 'old2', title: 'Ancient', date: now.subtract(10, 'day').toISOString(), content: '...' },
      ];
      const filtered = filterTranscriptsByTimeRange(oldTranscripts, '24h');
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const filtered = filterTranscriptsByTimeRange([], '24h');
      expect(filtered).toHaveLength(0);
    });

    it('should handle invalid dates gracefully by excluding them', () => {
      const transcriptsWithInvalidDate: Transcript[] = [
        ...mockTranscripts,
        { id: 'invalid', title: 'Invalid Date', date: 'not-a-date', content: '...' }
      ];
      const filtered = filterTranscriptsByTimeRange(transcriptsWithInvalidDate, '24h');
      // Should still get the 3 valid ones from mockTranscripts
      expect(filtered.filter(t => t.id !== 'invalid')).toHaveLength(3);
      expect(filtered.some(t => t.id === 'invalid')).toBe(false);
    });
  });
});

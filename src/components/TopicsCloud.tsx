import React, { useMemo, useState } from 'react';
import { Transcript } from '../types';
import { filterTranscriptsByTimeRange } from '../utils/dashboardAnalytics';

interface TopicsCloudProps {
  transcripts: Transcript[];
  timeRange: '7d' | '30d' | '90d' | 'all';
  onTopicClick?: (topic: string) => void;
}

interface TopicData {
  text: string;
  count: number;
  size: number;
  color: string;
}

const COLORS = [
  'text-blue-400',
  'text-green-400',
  'text-purple-400',
  'text-yellow-400',
  'text-pink-400',
  'text-indigo-400',
  'text-red-400',
  'text-cyan-400',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'myself', 'yourself',
  'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'now', 'here', 'there', 'then', 'also', 'well', 'like', 'get', 'go',
  'know', 'think', 'see', 'come', 'want', 'use', 'make', 'take', 'say', 'tell',
  'give', 'work', 'call', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put'
]);

const extractTopics = (transcripts: Transcript[]): TopicData[] => {
  const wordCounts: Record<string, number> = {};

  transcripts.forEach(transcript => {
    // Combine title and content for topic extraction
    const text = `${transcript.title} ${transcript.content}`.toLowerCase();

    // Extract words (remove punctuation, split by whitespace)
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word =>
        word.length > 3 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word) // Exclude pure numbers
      );

    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });

  // Convert to array and sort by frequency
  const topics = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30); // Take top 30 topics

  if (topics.length === 0) return [];

  const maxCount = topics[0].count;
  const minCount = topics[topics.length - 1].count;

  return topics.map((topic, index) => {
    // Calculate size based on frequency (12px to 24px)
    const normalizedCount = maxCount === minCount ? 1 : (topic.count - minCount) / (maxCount - minCount);
    const size = 12 + (normalizedCount * 12);

    return {
      text: topic.word,
      count: topic.count,
      size,
      color: COLORS[index % COLORS.length],
    };
  });
};

export const TopicsCloud: React.FC<TopicsCloudProps> = ({
  transcripts,
  timeRange,
  onTopicClick,
}) => {
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  const filteredTranscripts = useMemo(() => filterTranscriptsByTimeRange(transcripts, timeRange), [transcripts, timeRange]);

  const topics = useMemo(() => extractTopics(filteredTranscripts), [filteredTranscripts]);

  if (topics.length === 0) {
    return (
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Topics Cloud</h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-slate-400">No topics found</p>
          <p className="text-slate-500 text-sm mt-1">Add some transcripts to see topic analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Topics Cloud</h3>
        <div className="text-sm text-slate-400">
          {topics.length} topics found
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center items-center min-h-[200px] p-4">
        {topics.map((topic) => (
          <button
            key={topic.text}
            className={`
              ${topic.color}
              hover:opacity-80
              transition-all
              duration-200
              cursor-pointer
              hover:scale-110
              ${hoveredTopic === topic.text ? 'opacity-100 scale-110' : 'opacity-70'}
              ${onTopicClick ? 'hover:underline' : ''}
            `}
            style={{ fontSize: `${topic.size}px` }}
            onClick={() => onTopicClick?.(topic.text)}
            onMouseEnter={() => setHoveredTopic(topic.text)}
            onMouseLeave={() => setHoveredTopic(null)}
            title={`"${topic.text}" appears ${topic.count} time${topic.count !== 1 ? 's' : ''}`}
          >
            {topic.text}
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Most frequent: "{topics[0]?.text}" ({topics[0]?.count})</span>
          <span>Click topics to filter transcripts</span>
        </div>
      </div>
    </div>
  );
};
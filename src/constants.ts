import { AnalysisType } from './types';

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export const ANALYSIS_TYPE_CONFIG: Record<AnalysisType, { displayName: string; promptInstruction: string; requiresJson?: boolean }> = {
  [AnalysisType.SUMMARY]: {
    displayName: 'Summary',
    promptInstruction: 'Provide a concise summary of the following transcript. Focus on the main points and outcomes discussed.',
  },
  [AnalysisType.TOPICS]: {
    displayName: 'Key Topics',
    promptInstruction: 'Extract the key topics discussed in the following transcript. Return the topics as a JSON array of strings. For example: `["topic one", "topic two"]`. If no specific topics are identifiable, return an empty array.',
    requiresJson: true,
  },
  [AnalysisType.SENTIMENT]: {
    displayName: 'Sentiment Analysis',
    promptInstruction: 'Analyze the overall sentiment of the following transcript. Describe it (e.g., positive, neutral, negative, mixed) and briefly explain your reasoning based on the content.',
  },
  [AnalysisType.ACTION_ITEMS]: {
    displayName: 'Action Items',
    promptInstruction: 'Identify any clear action items, tasks, or follow-ups mentioned in the following transcript. Return them as a JSON array of strings. For example: `["Schedule a follow-up meeting", "Send the report by EOD"]`. If no action items are found, return an empty array.',
    requiresJson: true,
  },
  [AnalysisType.ENTITY_EXTRACTION]: {
    displayName: 'Key Entities',
    promptInstruction: 'Extract key entities such as people, places, organizations, products, and important dates from the following transcript. Return them as a JSON object where keys are entity types (e.g., "people", "places", "organizations", "dates", "products") and values are arrays of unique strings. If no entities of a certain type are found, either omit the key or return an empty array for that type. For example: `{"people": ["John Doe", "Jane Smith"], "organizations": ["Acme Corp"], "dates": ["next Tuesday"]}`.',
    requiresJson: true,
  }
};

// Dashboard Analytics Constants
export const TIME_RANGES = {
  '7d': { label: '7 Days', days: 7 },
  '30d': { label: '30 Days', days: 30 },
  '90d': { label: '90 Days', days: 90 },
  'all': { label: 'All Time', days: null }
} as const;

export const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#a855f7',
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b'
} as const;

export const DASHBOARD_CONFIG = {
  // Estimated words per minute for duration calculation
  WORDS_PER_MINUTE: 150,
  
  // Default chart height
  DEFAULT_CHART_HEIGHT: 300,
  
  // Heatmap configuration
  HEATMAP: {
    WEEKS_TO_SHOW: 20,
    CELL_SIZE: 12,
    CELL_GAP: 2
  },
  
  // Topics cloud configuration
  TOPICS_CLOUD: {
    MIN_FONT_SIZE: 12,
    MAX_FONT_SIZE: 24,
    MIN_FREQUENCY: 2,
    MAX_TOPICS: 50
  },
  
  // Stop words to filter out from topics
  STOP_WORDS: new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'now', 'here', 'there', 'then', 'also',
    'well', 'like', 'get', 'go', 'know', 'think', 'see', 'come', 'want', 'say',
    'make', 'take', 'use', 'work', 'time', 'way', 'day', 'year', 'good', 'new',
    'first', 'last', 'long', 'great', 'little', 'own', 'right', 'old', 'um', 'uh',
    'yeah', 'okay', 'ok', 'actually', 'basically', 'really', 'probably', 'maybe'
  ])
} as const;

export type TimeRange = keyof typeof TIME_RANGES;
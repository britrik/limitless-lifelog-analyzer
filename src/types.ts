
export interface Transcript {
  id: string;
  title: string;
  date: string; // ISO date string, e.g., "2023-10-26T10:00:00Z"
  content: string;
  summary?: string; // Short summary, could be pre-generated or from initial fetch
  isStarred?: boolean; // Whether the transcript is starred/favorited
}

export type TimeRange = '24h' | '7d' | '30d' | '90d' | '12w' | '52w' | 'all';
export type GroupBy = 'hour' | 'day' | 'week' | 'month';

export interface ChartDataPoint {
  date: string;
  value: number; // Ensure value is always a number
  label: string;
}

export enum AnalysisType {
  SUMMARY = 'summary',
  TOPICS = 'topics',
  SENTIMENT = 'sentiment',
  ACTION_ITEMS = 'actionItems',
  ENTITY_EXTRACTION = 'entityExtraction',
}

export interface AnalysisContent {
  [AnalysisType.SUMMARY]?: string;
  [AnalysisType.TOPICS]?: string[];
  [AnalysisType.SENTIMENT]?: string;
  [AnalysisType.ACTION_ITEMS]?: string[];
  [AnalysisType.ENTITY_EXTRACTION]?: Record<string, string[]>; // e.g. { "people": ["John", "Jane"], "locations": ["Paris"] }
}

// For grounding metadata from Gemini Search
export interface GroundingChunkWeb {
  uri?: string; // Made optional to match @google/genai type
  title?: string; // Kept optional as it often is
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // other types of chunks can be added here if needed
}
export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // other grounding metadata fields
}

// --- Speaker Context Types ---

export interface SpeakerProfile {
  id: string; // Unique ID for React keys, etc.
  canonicalName: string;
  nicknames: string[]; // Array of strings for various nicknames
  characteristics: string; // Brief description of traits, role, speech style
}

export interface SpeakerContextCategory {
  id: string; // Unique ID for the category
  title: string; // e.g., "Family", "Work Colleagues"
  profiles: SpeakerProfile[];
}

// Represents the overall state for speaker context
export type SpeakerContextState = SpeakerContextCategory[];

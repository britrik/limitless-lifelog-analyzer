
export interface Transcript {
  id: string;
  title: string;
  date: string; // ISO date string, e.g., "2023-10-26T10:00:00Z"
  content: string;
  summary?: string; // Short summary, could be pre-generated or from initial fetch
  isStarred?: boolean; // Whether the transcript is starred/favorited
  startTime?: string; // ISO date string, from Lifelog
  endTime?: string;   // ISO date string, from Lifelog
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

// --- Chart Data Types ---
export interface ChartDataPoint { // Already exists in AnalyticsChart.tsx, centralizing here
  date: string;
  value: number;
  label?: string;
  // For Phase 3: Weighted Sentiment
  min?: number;
  max?: number;
}

export type ChartStatus = 'success' | 'no-data' | 'error' | 'loading';

export interface ChartDataResponse {
  data: ChartDataPoint[];
  status: ChartStatus;
  message?: string; // Optional message, e.g., for 'no-data' or 'error' states
}

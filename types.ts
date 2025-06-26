
export interface Transcript {
  id: string;
  title: string;
  date: string; // ISO date string, e.g., "2023-10-26T10:00:00Z"
  content: string;
  summary?: string; // Short summary, could be pre-generated or from initial fetch
}

export enum AnalysisType {
  SUMMARY = 'summary',
  TOPICS = 'topics',
  SENTIMENT = 'sentiment',
  ACTION_ITEMS = 'actionItems',
}

export interface AnalysisContent {
  [AnalysisType.SUMMARY]?: string;
  [AnalysisType.TOPICS]?: string[];
  [AnalysisType.SENTIMENT]?: string;
  [AnalysisType.ACTION_ITEMS]?: string[];
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

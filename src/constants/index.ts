
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

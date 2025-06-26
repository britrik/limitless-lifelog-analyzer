import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, Part } from "@google/genai";
import { GEMINI_MODEL_NAME, ANALYSIS_TYPE_CONFIG } from '../constants';
import type { AnalysisType, GroundingMetadata } from '../types';

// Get Gemini API key from Vite environment variable
const apiKey = import.meta.env.VITE_API_KEY;

let ai: GoogleGenAI | null = null;

try {
  if (!apiKey) {
    // Warn if the API key is not set
    console.warn("Gemini API Key (VITE_API_KEY) is not set. API calls will likely fail.");
  }
  ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY" });
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
  // The app will continue, but API calls will fail and show errors in the UI.
}

const parseJsonFromText = (text: string): any => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; // Matches ```json ... ``` or ``` ... ```
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON response. Raw text:", text, "Error:", e);
    // Attempt to fix common issues, like trailing commas (very basic)
    try {
      const fixedStr = jsonStr.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas before closing bracket/brace
      return JSON.parse(fixedStr);
    } catch (finalError) {
      console.error("Failed to parse JSON even after basic fix. Error:", finalError);
      throw new Error(`Invalid JSON response: ${ (finalError as Error).message }. Original text: ${text.substring(0,100)}...`);
    }
  }
};

export const performAnalysis = async (
  transcriptContent: string,
  analysisType: AnalysisType
): Promise<{ data: any, groundingMetadata?: GroundingMetadata | null }> => {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check VITE_API_KEY configuration in your .env.local file.");
  }

  const config = ANALYSIS_TYPE_CONFIG[analysisType];
  const prompt = `${config.promptInstruction}\n\nTranscript:\n\`\`\`\n${transcriptContent}\n\`\`\``;

  const requestParams: GenerateContentParameters = {
    model: GEMINI_MODEL_NAME,
    contents: [{ role: "user", parts: [{text: prompt}] as Part[] }],
    config: {},
  };

  if (config.requiresJson && requestParams.config) {
    requestParams.config.responseMimeType = "application/json";
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent(requestParams);

    const responseText = response.text;
    let analysisResult: any;

    if (config.requiresJson) {
      analysisResult = parseJsonFromText(responseText);
    } else {
      analysisResult = responseText;
    }

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    return { data: analysisResult, groundingMetadata };

  } catch (error: any) {
    console.error(`Gemini API error during ${analysisType} analysis:`, error);
    if (error.message && error.message.includes("API key not valid")) {
      throw new Error("Gemini API key is invalid or not authorized. Please check VITE_API_KEY in your .env.local file.");
    }
    throw new Error(`Failed to get ${analysisType} from Gemini: ${error.message || 'Unknown error'}`);
  }
};
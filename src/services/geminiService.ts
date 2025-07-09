import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, Part } from "@google/genai";
import { GEMINI_MODEL_NAME, ANALYSIS_TYPE_CONFIG } from '../constants';
import type { AnalysisType, GroundingMetadata, SpeakerContextState } from '../types';

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

const parseJsonFromText = (text: string): unknown => {
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

const SPEAKER_DISAMBIGUATION_FRAMEWORK = `
# Speaker Disambiguation Framework for LLMs on Limitless Transcripts

## 1. Speaker Mapping Table
Refer to the custom speaker mapping table provided below. It includes:
| Nickname/Label    | Canonical Name/Role      | Key Characteristics or Cues                  |
|-------------------|-------------------------|----------------------------------------------|
(User-provided table will be inserted here if available)

## 2. Disambiguation Cues
A. Contextual Topic Analysis: Link recurring topics to typical speakers. Use references to specific events or routines as anchors.
B. Speech Style & Behavioural Markers: Note directives, instructions, repetitive or imaginative language, sensory comments, wit, specific references etc.
C. Temporal and Acoustic Cues (if available in transcript): Track who is present. Reference known routines. Consider voice timbre if tagged.

## 3. Uncertainty & Confidence Markers
If ambiguous, mentally (or if requested, explicitly) tag speaker with likelihood (e.g., [Likely Richard], [Possibly Zoe], [Unknown Adult], [Likely Child]). Confidence levels: High (explicit label/unique context), Medium (strong cues), Low (pattern guess).

## 4. Disambiguation Protocol (Workflow)
1. Explicit Label: Use speaker label if provided (e.g., "Granny:", "Dad:").
2. Pronoun/Reference Resolution: Resolve using mapping table and recent context.
3. Topic/Style Matching: Match to mapped speaker, consider confidence.
4. Cross-Conversation Validation: Check surrounding lines for clarifying evidence.
5. Avoid False Positives: Do not default to a primary adult on emotional resonance alone; seek explicit cues.
6. Fallback: If all fails, attribute as [Unknown Speaker].

## 5. Special Considerations
- Multi-generational households: Maintain clear distinctions.
- Intergenerational or “family humour” quotes: Attribute correctly.
- Emotional moments: Check for extended family participation.

This framework should guide your interpretation of the transcript for the requested analysis.
---
`;

const formatSpeakerContextForPrompt = (speakerContext: SpeakerContextState): string => {
  let speakerTableMarkdown = "";
  let hasProfiles = false;

  speakerContext.forEach(category => {
    if (category.profiles.length > 0) {
      // No need to add category title to the table, profiles are sufficient
      category.profiles.forEach(profile => {
        hasProfiles = true;
        const nicknames = profile.nicknames.join(', ') || '(none)';
        const characteristics = profile.characteristics || '(none)';
        speakerTableMarkdown += `| ${nicknames.padEnd(17)} | ${profile.canonicalName.padEnd(23)} | ${characteristics.padEnd(44)} |\n`;
      });
    }
  });

  if (!hasProfiles) {
    return ""; // Return empty string if no profiles to avoid sending an empty table structure
  }

  const tableHeader = `| Nickname/Label    | Canonical Name/Role      | Key Characteristics or Cues                  |\n|-------------------|-------------------------|----------------------------------------------|\n`;
  return `User-Provided Speaker Context:\n\n${tableHeader}${speakerTableMarkdown}\n(End of User-Provided Speaker Context)\n\n`;
};


export const performAnalysis = async (
  transcriptContent: string,
  analysisType: AnalysisType,
  speakerContext?: SpeakerContextState,
): Promise<{ data: unknown, groundingMetadata?: GroundingMetadata | null }> => {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. Check VITE_API_KEY configuration in your .env.local file.");
  }

  const config = ANALYSIS_TYPE_CONFIG[analysisType];
  let contextPromptSection = "";

  if (speakerContext && speakerContext.some(cat => cat.profiles.length > 0)) {
    const formattedSpeakerTable = formatSpeakerContextForPrompt(speakerContext);
    if (formattedSpeakerTable) { // Ensure table isn't empty
        // Replace the placeholder in the framework with the actual table
        const frameworkWithTable = SPEAKER_DISAMBIGUATION_FRAMEWORK.replace(
            "(User-provided table will be inserted here if available)",
            formattedSpeakerTable
        );
        contextPromptSection = frameworkWithTable;
    } else {
         // If table is empty after formatting (e.g. all profiles had no data), use framework without table placeholder
        contextPromptSection = SPEAKER_DISAMBIGUATION_FRAMEWORK.replace(
            "| Nickname/Label    | Canonical Name/Role      | Key Characteristics or Cues                  |\n|-------------------|-------------------------|----------------------------------------------|\n(User-provided table will be inserted here if available)",
            "No specific speaker profiles were provided by the user for this session."
        );
    }
  } else {
    // No speaker context provided, or it's empty. Use the framework with a note that no table is available.
    contextPromptSection = SPEAKER_DISAMBIGUATION_FRAMEWORK.replace(
        "| Nickname/Label    | Canonical Name/Role      | Key Characteristics or Cues                  |\n|-------------------|-------------------------|----------------------------------------------|\n(User-provided table will be inserted here if available)",
        "No speaker context table was provided by the user for this session."
    );
  }

  const prompt = `${contextPromptSection}\n\nAnalysis Task: ${config.promptInstruction}\n\nTranscript:\n\`\`\`\n${transcriptContent}\n\`\`\``;
  // console.log("Generated Prompt for Gemini:", prompt); // For debugging

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
    let analysisResult: unknown;

    if (!responseText) {
      throw new Error('No response text received from Gemini API');
    }

    if (config.requiresJson) {
      analysisResult = parseJsonFromText(responseText);
    } else {
      analysisResult = responseText;
    }

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    return { data: analysisResult, groundingMetadata };

  } catch (error) {
    console.error(`Gemini API error during ${analysisType} analysis:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message && message.includes("API key not valid")) {
      throw new Error("Gemini API key is invalid or not authorized. Please check VITE_API_KEY in your .env.local file.");
    }
    throw new Error(`Failed to get ${analysisType} from Gemini: ${message}`);
  }
};
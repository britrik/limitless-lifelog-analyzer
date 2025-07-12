import type { Transcript } from '../types';

// Read the Limitless API key from environment variables (Vite injects this at build time)
const LIMITLESS_API_KEY = import.meta.env.VITE_LIMITLESS_API_KEY;

if (!LIMITLESS_API_KEY) {
  console.error(
    "CRITICAL: Limitless API Key is NOT configured. Make sure VITE_LIMITLESS_API_KEY is set in your .env.local file. API calls to Limitless WILL FAIL."
  );
}

const LIMITLESS_API_BASE_URL = "/api/limitless/v1"; // Updated to include /v1 for correct endpoint (proxies to https://api.limitless.ai/v1)

interface Lifelog {
  id: string;
  title: string;
  markdown: string; // Full markdown content based on API docs
  startTime: string; // ISO-8601 string, maps to Transcript.date
  endTime: string; // ISO-8601 string
  isStarred: boolean;
  updatedAt: string; // ISO-8601 string
}

interface LifelogsApiResponse {
  data: {
    lifelogs: Lifelog[];
  };
  meta: {
    lifelogs: {
      nextCursor?: string;
      count: number;
    };
  };
}

const generateSummarySnippet = (markdown: string, maxLength: number = 150): string => {
  if (!markdown) return 'No content available for summary.';
  
  let plainText = markdown
    .replace(/#{1,6}\s*(.*)/g, '$1') 
    .replace(/(\*\*|__)(.*?)\1/g, '$2') 
    .replace(/(\*|_)(.*?)\1/g, '$2')    
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') 
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1') 
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') 
    .replace(/(\r\n|\n|\r)/gm, " ")    
    .replace(/\s+/g, ' ')    
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength - 3) + "...";
};

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error?.message || errorBody.error || errorMessage;
    } catch (e) {
      console.warn("Could not parse error response body as JSON. Attempting to read as text.", e);
      try {
        const textErrorBody = await response.text();
        if (textErrorBody) {
          errorMessage += `\nResponse body: ${textErrorBody.substring(0, 200)}${textErrorBody.length > 200 ? '...' : ''}`;
        }
      } catch (textParseError) {
        console.warn("Could not parse error response body as text either.", textParseError);
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export interface FetchTranscriptsResult {
  transcripts: Transcript[];
  nextCursor?: string;
}

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3): Promise<Response> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      console.warn(`Fetch attempt ${attempt} failed: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.warn(`Fetch attempt ${attempt} error: ${error}`);
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
  throw new Error(`Failed to fetch after ${retries} attempts. Check network or API status.`);
};

export const fetchTranscripts = async (limit: number = 10, cursor?: string): Promise<FetchTranscriptsResult> => {
  if (!LIMITLESS_API_KEY) {
    const errorMessage = "Limitless API Key is not configured. Please set VITE_LIMITLESS_API_KEY in your .env.local file.";
    console.error(errorMessage); // Keep console error for clarity
    throw new Error(errorMessage);
  }
  
  let apiMessage = 'Limitless API: Fetching lifelogs';
  if (cursor) {
    apiMessage += ` with cursor ${cursor}`;
  }
  apiMessage += ` using key ending with ...${LIMITLESS_API_KEY.slice(-4)}`;
  console.log(apiMessage);

  const params = new URLSearchParams({
    limit: String(limit),
    direction: 'desc', 
    includeMarkdown: 'true', 
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  const url = `${LIMITLESS_API_BASE_URL}/lifelogs?${params.toString()}`; // Now includes /v1/lifelogs

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-API-Key': LIMITLESS_API_KEY, 
        'Accept': 'application/json', 
      },
    });

    const apiResponse = await handleApiResponse(response) as LifelogsApiResponse;
    const rawLifelogs = apiResponse.data?.lifelogs;

    if (!rawLifelogs || !Array.isArray(rawLifelogs)) {
      console.error('Unexpected API response structure for lifelogs list:', apiResponse);
      throw new Error('Failed to parse lifelogs: Unexpected API response structure. Check https://www.limitless.ai/developers for updates.');
    }

    const transcripts = rawLifelogs.map((lifelog: Lifelog): Transcript => ({
      id: lifelog.id,
      title: lifelog.title || 'Untitled Lifelog', 
      date: lifelog.startTime, 
      content: lifelog.markdown, 
      summary: generateSummarySnippet(lifelog.markdown),
      isStarred: lifelog.isStarred,
      startTime: lifelog.startTime, // Added from Lifelog interface
      endTime: lifelog.endTime,    // Added from Lifelog interface
    }));

    return {
      transcripts,
      nextCursor: apiResponse.meta?.lifelogs?.nextCursor,
    };

  } catch (error: any) {
    console.error('Error fetching lifelogs from Limitless API:', error);
    if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Failed to fetch lifelogs. This could be due to a network connectivity issue or a CORS (Cross-Origin Resource Sharing) policy blocking the request. ' +
        'Please check your internet connection and the browser\'s developer console (Network tab) for more specific error details. ' +
        'If it is a CORS issue, the Limitless API server (api.limitless.ai) needs to be configured to allow requests from your application\'s origin. ' +
        'See https://www.limitless.ai/developers for API details.'
      );
    }
    throw error;
  }
};

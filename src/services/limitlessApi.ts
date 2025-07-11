import type { Transcript } from '../types';

// Read the Limitless API key from environment variables (Vite injects this at build time)
const LIMITLESS_API_KEY = import.meta.env.VITE_LIMITLESS_API_KEY;

if (!LIMITLESS_API_KEY) {
  console.error(
    "CRITICAL: Limitless API Key is NOT configured. Make sure VITE_LIMITLESS_API_KEY is set in your .env.local file. API calls to Limitless WILL FAIL."
  );
}

const LIMITLESS_API_BASE_URL = "/api/limitless";

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
  totalFetched?: number;  // New: for logging total after full fetch
}

/** Fetches transcripts from Limitless API with pagination support. If fetchAll is true, loops through all pages. */
export const fetchTranscripts = async (
  limit: number = 10, 
  cursor?: string, 
  fetchAll: boolean = false  // New: if true, fetch all pages via cursors
): Promise<FetchTranscriptsResult> => {
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

  try {
    const response = await fetch(`${LIMITLESS_API_BASE_URL}/lifelogs?${params.toString()}`, {
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
      throw new Error('Failed to parse lifelogs: Unexpected API response structure.');
    }

    const transcripts = rawLifelogs.map((lifelog: Lifelog): Transcript => ({
      id: lifelog.id,
      title: lifelog.title || 'Untitled Lifelog', 
      date: lifelog.startTime || lifelog.updatedAt || new Date().toISOString(),  // Fallback to updatedAt or now
      content: lifelog.markdown || '', 
      summary: generateSummarySnippet(lifelog.markdown),
      isStarred: lifelog.isStarred ?? false,  // Default false if undefined
      startTime: lifelog.startTime || '',    // Keep as string, or parse if needed
      endTime: lifelog.endTime || '',
    }));

    if (transcripts.length === 0) {
      console.warn('No lifelogs returned from API. This might be expected if there are no transcripts, or check your API params/key.');
    }

    // New: Pagination looping if fetchAll is true
    let allTranscripts: Transcript[] = transcripts;
    let currentCursor = apiResponse.meta?.lifelogs?.nextCursor;
    let totalFetched = transcripts.length;

    if (fetchAll && currentCursor) {
      console.log(`Fetching additional pages starting from cursor: ${currentCursor}`);
      while (currentCursor) {
        const nextResult = await fetchTranscripts(limit, currentCursor);  // Recursive call (efficient for small depths)
        allTranscripts = [...allTranscripts, ...nextResult.transcripts];
        currentCursor = nextResult.nextCursor;
        totalFetched += nextResult.transcripts.length;
        if (!currentCursor) break;
      }
    }

    return {
      transcripts: allTranscripts,
      nextCursor: fetchAll ? undefined : currentCursor,  // If fetchAll, no nextCursor needed
      totalFetched,
    };

  } catch (error: any) {
    console.error('Error fetching lifelogs from Limitless API:', error);
    if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Failed to fetch lifelogs. This could be due to a network connectivity issue or a CORS (Cross-Origin Resource Sharing) policy blocking the request. ' +
        'Please check your internet connection and the browser\'s developer console (Network tab) for more specific error details. ' +
        'If it is a CORS issue, the Limitless API server (api.limitless.ai) needs to be configured to allow requests from your application\'s origin.'
      );
    }
    throw error;
  }
};

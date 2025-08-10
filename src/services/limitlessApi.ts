import type { Transcript } from '../types';
import { safeParseISO } from '../utils/date';

const LIMITLESS_API_KEY = import.meta.env.VITE_LIMITLESS_API_KEY;
const LIMITLESS_API_BASE_URL = '/api/limitless/v1';

interface Lifelog {
  id: string;
  title?: string;
  markdown?: string;
  startTime: string;
  endTime?: string;
  isStarred?: boolean;
  updatedAt?: string;
}

interface LifelogsApiResponse {
  data?: {
    lifelogs?: Lifelog[];
  };
}

const generateSummarySnippet = (markdown: string, maxLength = 150): string => {
  const plain = markdown
    .replace(/#{1,6}\s*(.*)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/(\r\n|\n|\r)/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length <= maxLength ? plain : plain.slice(0, maxLength - 3) + '...';
};

/**
 * Retrieve lifelogs from the Limitless API and map them into Transcript objects.
 * Invalid or unparsable dates are skipped to keep analytics stable.
 */
export async function fetchTranscripts(selectedDate?: Date): Promise<Transcript[]> {
  if (!LIMITLESS_API_KEY) {
    console.error('Limitless API key is missing (VITE_LIMITLESS_API_KEY)');
    return [];
  }

  const params = new URLSearchParams({ limit: '200', order: 'desc' });
  if (selectedDate) {
    params.set('date', selectedDate.toISOString().split('T')[0]);
  }

  const response = await fetch(`${LIMITLESS_API_BASE_URL}/lifelogs?${params.toString()}`, {
    headers: {
      'X-API-Key': LIMITLESS_API_KEY,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Limitless API error: ${response.status} ${response.statusText}`);
  }

  const json: LifelogsApiResponse = await response.json();
  const lifelogs = Array.isArray(json.data?.lifelogs) ? json.data!.lifelogs : [];

  return lifelogs
    .map((log): Transcript | null => {
      const start = safeParseISO(log.startTime, log.id);
      const end = log.endTime ? safeParseISO(log.endTime, log.id) : null;
      const updated = log.updatedAt ? safeParseISO(log.updatedAt, log.id) : null;
      if (!start || (log.endTime && !end)) return null;

      return {
        id: log.id,
        title: log.title || 'Untitled Lifelog',
        date: start.toISOString(),
        content: log.markdown || '',
        summary: generateSummarySnippet(log.markdown || ''),
        isStarred: log.isStarred,
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : undefined,
        updatedAt: updated ? updated.toISOString() : undefined,
      };
    })
    .filter((t): t is Transcript => t !== null);
}


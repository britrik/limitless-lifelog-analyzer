import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTranscripts, FetchTranscriptsResult } from '@/services/limitlessApi';
import type { Transcript } from '@/types';

interface UseLifelogsProps {
  searchTerm?: string;
  sortBy?: string; // e.g., 'date_desc', 'title_asc'
  // Add other filter parameters here as needed
}

const TRANSCRIPTS_PAGE_LIMIT = 10;

// Query key factory
export const lifelogsQueryKeys = {
  all: ['lifelogs'] as const,
  lists: () => [...lifelogsQueryKeys.all, 'list'] as const,
  list: (filters: UseLifelogsProps) => [...lifelogsQueryKeys.lists(), filters] as const,
  details: () => [...lifelogsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...lifelogsQueryKeys.details(), id] as const,
};


export const useLifelogs = (props: UseLifelogsProps = {}) => {
  const { searchTerm, sortBy } = props; // Destructure any filters

  return useInfiniteQuery<FetchTranscriptsResult, Error, Transcript[], FetchTranscriptsResult, string | undefined, string | undefined>(
    {
      queryKey: lifelogsQueryKeys.list({ searchTerm, sortBy }), // Include filters in queryKey
      queryFn: ({ pageParam }) => fetchTranscripts(TRANSCRIPTS_PAGE_LIMIT, pageParam),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: undefined, // Explicitly set initialPageParam
      // staleTime: 1000 * 60 * 5, // 5 minutes, optional: data freshness
      // gcTime: 1000 * 60 * 30, // 30 minutes, optional: garbage collection time

      // The select function is not straightforward with useInfiniteQuery for mapping pages directly
      // to a flat array of Transcripts if you also need the page structure for other things.
      // It's often easier to process the `data.pages` array in the component.
      // However, if you always want a flat list of transcripts:
      // select: (data) => ({
      //   ...data,
      //   pages: data.pages.flatMap(page => page.transcripts)
      // })
      // This would change the type of `data` in the component.
      // For now, let's keep the original structure and process it in the component.
    }
  );
};

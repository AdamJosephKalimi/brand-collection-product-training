import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Fetch processing status for a collection (document processing and item generation)
 * 
 * Automatically polls every 2 seconds when processing is active.
 * Stops polling when status is idle, completed, failed, or cancelled.
 * 
 * @param {string} collectionId - The collection ID
 * @returns {Object} Query result with processing status data
 * 
 * @example
 * const { data: status, isLoading } = useProcessingStatus(collectionId);
 * 
 * // status structure:
 * {
 *   document_processing: {
 *     status: 'processing' | 'completed' | 'failed' | 'cancelled' | 'idle',
 *     current_phase: 'Extracting images',
 *     progress: { phase: 1, total_phases: 6, percentage: 17 },
 *     error: null,
 *     started_at: '2024-01-01T00:00:00Z',
 *     completed_at: null
 *   },
 *   item_generation: {
 *     status: 'idle',
 *     current_step: null,
 *     progress: null,
 *     error: null,
 *     started_at: null,
 *     completed_at: null
 *   }
 * }
 */
export const useProcessingStatus = (collectionId) => {
  return useQuery({
    queryKey: ['processingStatus', collectionId],
    queryFn: async () => {
      console.log('[useProcessingStatus] Fetching status for collection:', collectionId);
      
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${collectionId}/processing-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // If 401, token might be stale - getAuthToken() will refresh on next call
        if (response.status === 401) {
          throw new Error('Authentication expired');
        }
        throw new Error('Failed to fetch processing status');
      }
      
      const result = await response.json();
      console.log('[useProcessingStatus] Received:', result);
      return result;
    },
    enabled: !!collectionId,
    // NOTE: We removed refetchInterval here because React Query's interval mechanism
    // doesn't work reliably with optimistic updates. Polling is now handled manually
    // in the component using useEffect + setInterval with the refetch function.
    retry: (failureCount, error) => {
      // Retry up to 3 times for auth errors (token refresh)
      // Retry up to 2 times for other errors
      if (error.message === 'Authentication expired') {
        return failureCount < 3;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Quick retry for auth errors (500ms)
      // Exponential backoff for other errors
      return Math.min(500 * (2 ** attemptIndex), 3000);
    },
    refetchOnWindowFocus: false,
  });
};

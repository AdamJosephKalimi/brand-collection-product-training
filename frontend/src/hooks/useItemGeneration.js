import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Generate items for a collection from purchase order and line sheets
 * 
 * @param {string} collectionId - The collection ID
 * @returns {Promise<Object>} Generation start response
 */
const generateItems = async (collectionId) => {
  const token = await getAuthToken();
  const response = await fetch(`http://localhost:8000/api/collections/${collectionId}/items/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start item generation');
  }
  
  return await response.json();
};

/**
 * Cancel item generation for a collection
 * 
 * @param {string} collectionId - The collection ID
 * @returns {Promise<Object>} Cancellation response
 */
const cancelItemGeneration = async (collectionId) => {
  const token = await getAuthToken();
  const response = await fetch(`http://localhost:8000/api/collections/${collectionId}/items/generate/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to cancel item generation');
  }
  
  return await response.json();
};

/**
 * Hook for starting item generation
 * 
 * @returns {Object} Mutation object with mutate function and state
 * 
 * @example
 * const generateMutation = useGenerateItems();
 * 
 * generateMutation.mutate(
 *   { collectionId: '123' },
 *   {
 *     onSuccess: () => console.log('Generation started'),
 *     onError: (error) => console.error(error.message)
 *   }
 * );
 */
export const useGenerateItems = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId }) => generateItems(collectionId),
    onMutate: async (variables) => {
      console.log('[useGenerateItems] onMutate - optimistically setting status to processing');
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['processingStatus', variables.collectionId] });
      
      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(['processingStatus', variables.collectionId]);
      
      // Optimistically update to 'processing' status
      queryClient.setQueryData(['processingStatus', variables.collectionId], (old) => ({
        ...old,
        item_generation: {
          status: 'processing',
          current_step: 'Starting...',
          progress: { step: 0, total_steps: 7, percentage: 0 },
          error: null
        }
      }));
      
      // Return context with the previous value
      return { previousStatus };
    },
    onSuccess: (data, variables) => {
      console.log('[useGenerateItems] onSuccess - updating cache with server response', data);
      
      // Update cache with the actual processing status from server response
      if (data.processing_status) {
        queryClient.setQueryData(['processingStatus', variables.collectionId], (old) => ({
          ...old,
          ...data.processing_status
        }));
      }
      
      // Invalidate collection items (will be updated when generation completes)
      queryClient.invalidateQueries({ queryKey: ['collectionItems', variables.collectionId] });
      // Invalidate collection data (total_items count may change)
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
    },
    onError: (error, variables, context) => {
      console.log('[useGenerateItems] onError - rolling back optimistic update', error);
      
      // Rollback to previous status on error
      if (context?.previousStatus) {
        queryClient.setQueryData(['processingStatus', variables.collectionId], context.previousStatus);
      }
    },
  });
};

/**
 * Hook for cancelling item generation
 * 
 * @returns {Object} Mutation object with mutate function and state
 * 
 * @example
 * const cancelMutation = useCancelItemGeneration();
 * 
 * cancelMutation.mutate(
 *   { collectionId: '123' },
 *   {
 *     onSuccess: () => console.log('Generation cancelled'),
 *     onError: (error) => console.error(error.message)
 *   }
 * );
 */
export const useCancelItemGeneration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId }) => cancelItemGeneration(collectionId),
    onSuccess: (data, variables) => {
      // Invalidate processing status to reflect cancellation
      queryClient.invalidateQueries({ queryKey: ['processingStatus', variables.collectionId] });
    },
  });
};

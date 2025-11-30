import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Start processing documents for a collection
 * 
 * @param {string} collectionId - The collection ID
 * @param {string[]} documentIds - Array of document IDs to process
 * @returns {Promise<Object>} Processing start response
 */
const processDocuments = async (collectionId, documentIds) => {
  const token = await getAuthToken();
  const response = await fetch(`http://localhost:8000/api/collections/${collectionId}/documents/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ document_ids: documentIds })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start document processing');
  }
  
  return await response.json();
};

/**
 * Cancel document processing for a collection
 * 
 * @param {string} collectionId - The collection ID
 * @returns {Promise<Object>} Cancellation response
 */
const cancelDocumentProcessing = async (collectionId) => {
  const token = await getAuthToken();
  const response = await fetch(`http://localhost:8000/api/collections/${collectionId}/documents/process/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to cancel document processing');
  }
  
  return await response.json();
};

/**
 * Hook for starting document processing
 * 
 * @returns {Object} Mutation object with mutate function and state
 * 
 * @example
 * const processDocsMutation = useProcessDocuments();
 * 
 * processDocsMutation.mutate(
 *   { collectionId: '123', documentIds: ['doc1', 'doc2'] },
 *   {
 *     onSuccess: () => console.log('Processing started'),
 *     onError: (error) => console.error(error.message)
 *   }
 * );
 */
export const useProcessDocuments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, documentIds }) => processDocuments(collectionId, documentIds),
    onMutate: async (variables) => {
      console.log('[useProcessDocuments] onMutate - optimistically setting status to processing');
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['processingStatus', variables.collectionId] });
      
      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(['processingStatus', variables.collectionId]);
      
      // Optimistically update to 'processing' status
      queryClient.setQueryData(['processingStatus', variables.collectionId], (old) => ({
        ...old,
        document_processing: {
          status: 'processing',
          current_phase: 'Starting...',
          progress: { phase: 0, total_phases: 6, percentage: 0 },
          error: null
        }
      }));
      
      // Return context with the previous value
      return { previousStatus };
    },
    onSuccess: (data, variables) => {
      console.log('[useProcessDocuments] onSuccess - updating cache with server response', data);
      
      // Update cache with the actual processing status from server response
      if (data.processing_status) {
        queryClient.setQueryData(['processingStatus', variables.collectionId], (old) => ({
          ...old,
          ...data.processing_status
        }));
      }
      
      // Invalidate documents list (will be updated when processing completes)
      queryClient.invalidateQueries({ queryKey: ['collectionDocuments', variables.collectionId] });
    },
    onError: (error, variables, context) => {
      console.log('[useProcessDocuments] onError - rolling back optimistic update', error);
      
      // Rollback to previous status on error
      if (context?.previousStatus) {
        queryClient.setQueryData(['processingStatus', variables.collectionId], context.previousStatus);
      }
    },
  });
};

/**
 * Hook for cancelling document processing
 * 
 * @returns {Object} Mutation object with mutate function and state
 * 
 * @example
 * const cancelMutation = useCancelDocumentProcessing();
 * 
 * cancelMutation.mutate(
 *   { collectionId: '123' },
 *   {
 *     onSuccess: () => console.log('Processing cancelled'),
 *     onError: (error) => console.error(error.message)
 *   }
 * );
 */
export const useCancelDocumentProcessing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId }) => cancelDocumentProcessing(collectionId),
    onSuccess: (data, variables) => {
      // Invalidate processing status to reflect cancellation
      queryClient.invalidateQueries({ queryKey: ['processingStatus', variables.collectionId] });
    },
  });
};

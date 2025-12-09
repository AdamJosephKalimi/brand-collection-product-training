import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

const API_BASE = 'http://localhost:8000/api';

/**
 * Fetch all items for a collection
 * 
 * @param {string} collectionId - The collection ID
 * @returns {Promise<Array>} Array of items
 */
const fetchCollectionItems = async (collectionId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/collections/${collectionId}/items`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch collection items');
  }
  
  return await response.json();
};

/**
 * Update an item
 * 
 * @param {string} collectionId - The collection ID
 * @param {string} itemId - The item ID
 * @param {object} updateData - Fields to update
 * @returns {Promise<Object>} Updated item
 */
const updateItem = async (collectionId, itemId, updateData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/collections/${collectionId}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update item');
  }
  
  return await response.json();
};

/**
 * Hook for fetching collection items
 * 
 * @param {string} collectionId - The collection ID
 * @param {object} options - Additional React Query options
 * @returns {object} Query result with data, isLoading, error, etc.
 * 
 * @example
 * const { data: items, isLoading } = useCollectionItems(collectionId);
 */
export const useCollectionItems = (collectionId, options = {}) => {
  return useQuery({
    queryKey: ['collectionItems', collectionId],
    queryFn: () => fetchCollectionItems(collectionId),
    enabled: !!collectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
};

/**
 * Hook for updating an item with optimistic updates
 * 
 * @returns {object} Mutation object with mutate function and state
 * 
 * @example
 * const updateItemMutation = useUpdateItem();
 * 
 * updateItemMutation.mutate({
 *   collectionId: '123',
 *   itemId: '456',
 *   updateData: { highlighted_item: true }
 * });
 */
export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, itemId, updateData }) => 
      updateItem(collectionId, itemId, updateData),
    
    onMutate: async ({ collectionId, itemId, updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collectionItems', collectionId] });
      
      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['collectionItems', collectionId]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['collectionItems', collectionId], (old) => {
        if (!old) return old;
        return old.map(item => 
          item.item_id === itemId 
            ? { ...item, ...updateData }
            : item
        );
      });
      
      // Return context with the previous value
      return { previousItems };
    },
    
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['collectionItems', variables.collectionId], 
          context.previousItems
        );
      }
    },
    
    onSettled: (data, error, variables) => {
      // Refetch to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: ['collectionItems', variables.collectionId] });
    }
  });
};

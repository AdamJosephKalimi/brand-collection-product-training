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
 * Reorder items within a category
 * 
 * @param {string} collectionId - The collection ID
 * @param {array} itemOrders - Array of {item_id, display_order} objects
 * @returns {Promise<Object>} Success message
 */
const reorderItems = async (collectionId, itemOrders) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/collections/${collectionId}/items/reorder`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ item_orders: itemOrders })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reorder items');
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

/**
 * Hook for reordering items within a category
 * 
 * @returns {object} Mutation object with mutate function and state
 * 
 * @example
 * const reorderMutation = useReorderItems();
 * 
 * reorderMutation.mutate({
 *   collectionId: '123',
 *   itemOrders: [
 *     { item_id: 'a', display_order: 0 },
 *     { item_id: 'b', display_order: 1 }
 *   ]
 * });
 */
export const useReorderItems = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, itemOrders }) => 
      reorderItems(collectionId, itemOrders),
    
    onMutate: async ({ collectionId, itemOrders }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collectionItems', collectionId] });
      
      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['collectionItems', collectionId]);
      
      // Optimistically update the cache with new order
      queryClient.setQueryData(['collectionItems', collectionId], (old) => {
        if (!old) return old;
        
        // Create a map of new orders
        const orderMap = {};
        itemOrders.forEach(({ item_id, display_order }) => {
          orderMap[item_id] = display_order;
        });
        
        // Update display_order for affected items
        return old.map(item => {
          if (orderMap[item.item_id] !== undefined) {
            return { ...item, display_order: orderMap[item.item_id] };
          }
          return item;
        }).sort((a, b) => {
          // Sort by category, then display_order
          const catCompare = (a.category || 'zzz').localeCompare(b.category || 'zzz');
          if (catCompare !== 0) return catCompare;
          return (a.display_order || 0) - (b.display_order || 0);
        });
      });
      
      // Return context with the previous value
      return { previousItems };
    },
    
    onError: (error, variables, context) => {
      console.error('[useReorderItems] Error:', error);
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['collectionItems', variables.collectionId], 
          context.previousItems
        );
      }
    },
    
    onSuccess: (data, variables) => {
      console.log('[useReorderItems] Success:', data);
      // Don't invalidate - trust the optimistic update
      // The next natural refetch will sync if needed
    }
  });
};

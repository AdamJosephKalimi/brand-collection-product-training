import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Delete a collection (soft delete)
 * 
 * @param {string} collectionId - The collection ID to delete
 * @returns {Promise<Object>} Success message
 */
const deleteCollection = async (collectionId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/collections/${collectionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete collection');
  }
  
  return await response.json();
};

/**
 * Hook for deleting a collection
 * 
 * @returns {Object} Mutation object with mutate function and state
 */
export const useDeleteCollection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (collectionId) => deleteCollection(collectionId),
    onSuccess: () => {
      // Invalidate brands list to update sidebar
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error) => {
      console.error('Failed to delete collection:', error);
    }
  });
};

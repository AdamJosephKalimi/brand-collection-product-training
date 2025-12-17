import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Update a collection's information
 * 
 * @param {string} collectionId - The collection ID to update
 * @param {Object} updateData - Fields to update (name, season, year, description)
 * @returns {Promise<Object>} Updated collection data
 */
const updateCollection = async (collectionId, updateData) => {
  const token = await getAuthToken();
  const response = await fetch(`http://localhost:8000/api/collections/${collectionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update collection');
  }
  
  return await response.json();
};

/**
 * Hook for collection update mutation
 * 
 * @returns {Object} Mutation object with mutate function and state
 */
export const useUpdateCollection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, updateData }) => updateCollection(collectionId, updateData),
    onSuccess: (data, variables) => {
      // Invalidate and refetch collection data
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      // Also invalidate brands list (in case collection name changed)
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Delete a brand (soft delete)
 * 
 * @param {string} brandId - The brand ID to delete
 * @returns {Promise<Object>} Success message
 */
const deleteBrand = async (brandId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete brand');
  }
  
  return await response.json();
};

/**
 * Hook for deleting a brand
 * 
 * @returns {Object} Mutation object with mutate function and state
 */
export const useDeleteBrand = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (brandId) => deleteBrand(brandId),
    onSuccess: () => {
      // Invalidate brands list to remove the deleted brand
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error) => {
      console.error('Failed to delete brand:', error);
    }
  });
};

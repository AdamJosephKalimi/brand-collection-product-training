import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Update a brand's information
 * 
 * @returns {Object} Mutation object
 * @returns {Function} mutate - Function to trigger the mutation
 * @returns {Function} mutateAsync - Async version of mutate
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {boolean} isSuccess - Success state
 * @returns {Error} error - Error object if mutation failed
 */
export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brandId, data }) => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update brand');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch brands list
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      
      // Invalidate and refetch the specific brand
      queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
    },
  });
};

/**
 * Upload a brand logo
 * 
 * @returns {Object} Mutation object
 * @returns {Function} mutate - Function to trigger the mutation
 * @returns {Function} mutateAsync - Async version of mutate
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {boolean} isSuccess - Success state
 */
export const useUploadLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brandId, file }) => {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/brands/${brandId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch brands list (to update logo in sidebar)
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      
      // Invalidate and refetch the specific brand (to update logo in form)
      queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
    },
  });
};

/**
 * Create a new brand
 * 
 * @returns {Object} Mutation object
 * @returns {Function} mutate - Function to trigger the mutation
 * @returns {Function} mutateAsync - Async version of mutate
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {boolean} isSuccess - Success state
 */
export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/brands/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create brand');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch brands list to show new brand
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

/**
 * Delete a brand (soft delete)
 * 
 * @returns {Object} Mutation object
 * @returns {Function} mutate - Function to trigger the mutation
 * @returns {Function} mutateAsync - Async version of mutate
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {boolean} isSuccess - Success state
 */
export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brandId) => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete brand');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch brands list to remove deleted brand
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

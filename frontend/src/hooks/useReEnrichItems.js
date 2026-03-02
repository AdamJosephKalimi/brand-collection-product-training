import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Re-enrich unmatched items using all available line sheets
 *
 * @param {string} collectionId - The collection ID
 * @returns {Promise<Object>} Re-enrichment stats
 */
const reEnrichItems = async (collectionId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/items/re-enrich`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to re-enrich items');
  }

  return await response.json();
};

/**
 * Hook for re-enriching unmatched items after uploading new line sheets
 */
export const useReEnrichItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId }) => reEnrichItems(collectionId),
    onSuccess: (data, variables) => {
      // Invalidate items to refetch with enriched data
      queryClient.invalidateQueries({ queryKey: ['collectionItems', variables.collectionId] });
    },
  });
};

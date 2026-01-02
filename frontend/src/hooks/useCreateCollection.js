import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

const API_BASE = 'http://localhost:8000/api';

/**
 * Create a new collection for a brand
 * @param {string} brandId - Parent brand ID
 * @param {Object} collectionData - { name, season, year }
 * @returns {Promise<Object>} Created collection response
 */
const createCollection = async (brandId, collectionData) => {
  const token = await getAuthToken();
  
  console.log('[createCollection] Creating collection for brand:', brandId, 'with data:', collectionData);
  
  const response = await fetch(`${API_BASE}/brands/${brandId}/collections`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brand_id: brandId,
      name: collectionData.name,
      ...(collectionData.season && { season: collectionData.season }),
      ...(collectionData.year && { year: collectionData.year })
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[createCollection] API Error:', error);
    // Handle Pydantic validation errors which come as an array
    if (Array.isArray(error.detail)) {
      const messages = error.detail.map(e => e.msg || e.message).join(', ');
      throw new Error(messages || 'Validation failed');
    }
    throw new Error(error.detail || 'Failed to create collection');
  }
  
  return await response.json();
};

/**
 * Hook for creating a new collection.
 * 
 * @returns {Object} Mutation object with mutateAsync function
 * 
 * @example
 * const createCollectionMutation = useCreateCollection();
 * 
 * await createCollectionMutation.mutateAsync({
 *   brandId: 'brand-123',
 *   collectionName: 'Spring 2025',
 *   season: 'spring_summer',
 *   year: 2025
 * });
 */
export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandId, collectionName, season, year }) => {
      const collectionData = {
        name: collectionName,
        season,
        year
      };
      
      return await createCollection(brandId, collectionData);
    },
    
    onSuccess: () => {
      // Invalidate brands query to refresh sidebar with new collection
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    
    onError: (error) => {
      console.error('[useCreateCollection] Error:', error);
    }
  });
};

export default useCreateCollection;

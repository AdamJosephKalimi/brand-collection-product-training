import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Fetch a single collection's details by ID
 * 
 * @param {string} collectionId - The collection ID to fetch
 * @returns {Object} Query result with collection data
 * @returns {Object} data - Collection details (name, season, year, description, etc.)
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {Error} error - Error object if request failed
 */
export const useCollection = (collectionId) => {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/collections/${collectionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }
      
      return await response.json();
    },
    enabled: !!collectionId, // Only run query if collectionId is provided
  });
};

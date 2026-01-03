import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Fetch all brands with their collections for the authenticated user
 * 
 * @returns {Object} Query result with brands data
 * @returns {Array} data - Array of brands with nested collections
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {Error} error - Error object if request failed
 * @returns {Function} refetch - Function to manually refetch data
 */
export const useBrands = () => {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/brands/with-collections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      
      // Transform data to match component format
      return data.map(brand => ({
        id: brand.brand_id,
        name: brand.name,
        logo: brand.logo_url,
        collections: brand.collections.map(col => ({
          id: col.collection_id,
          name: col.name
        }))
      }));
    },
  });
};

/**
 * Fetch a single brand's details by ID
 * 
 * @param {string} brandId - The brand ID to fetch
 * @returns {Object} Query result with brand data
 * @returns {Object} data - Brand details
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {Error} error - Error object if request failed
 */
export const useBrand = (brandId) => {
  return useQuery({
    queryKey: ['brand', brandId],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/brands/${brandId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brand');
      }
      
      return await response.json();
    },
    enabled: !!brandId, // Only run query if brandId is provided
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Create a new brand
 * @param {Object} brandData - { name, website_url }
 * @returns {Promise<Object>} Created brand response
 */
const createBrand = async (brandData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/brands/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(brandData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[createBrand] API Error:', error);
    // Handle Pydantic validation errors which come as an array
    if (Array.isArray(error.detail)) {
      const messages = error.detail.map(e => e.msg || e.message).join(', ');
      throw new Error(messages || 'Validation failed');
    }
    throw new Error(error.detail || 'Failed to create brand');
  }
  
  return await response.json();
};

/**
 * Upload brand logo
 * @param {string} brandId - Brand ID
 * @param {File} logoFile - Logo file to upload
 * @returns {Promise<Object>} Upload response with logo_url
 */
const uploadBrandLogo = async (brandId, logoFile) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', logoFile);
  
  const response = await fetch(`${API_BASE_URL}/brands/${brandId}/logo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload logo');
  }
  
  return await response.json();
};

/**
 * Hook for creating a new brand with optional logo upload.
 * 
 * This hook orchestrates:
 * 1. Creating the brand via POST /api/brands/
 * 2. If a logo is provided, uploading it via POST /api/brands/{id}/logo
 * 3. Invalidating the brands query cache only after ALL operations complete
 * 
 * @returns {Object} Mutation object with mutateAsync function
 * 
 * @example
 * const createBrandMutation = useCreateBrand();
 * 
 * await createBrandMutation.mutateAsync({
 *   brandName: 'My Brand',
 *   websiteUrl: 'https://mybrand.com',
 *   logoFile: file // optional
 * });
 */
/**
 * Ensures URL has a protocol prefix
 */
const formatUrl = (url) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Add https:// if no protocol specified
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandName, websiteUrl, logoFile, deckTypography }) => {
      // Step 1: Create the brand
      const brandData = {
        name: brandName
      };

      // Only include website_url if provided, ensuring proper format
      const formattedUrl = formatUrl(websiteUrl);
      if (formattedUrl) {
        brandData.website_url = formattedUrl;
      }

      // Include deck typography if provided
      if (deckTypography) {
        brandData.deck_typography = deckTypography;
      }
      
      console.log('[useCreateBrand] Creating brand with data:', brandData);
      const createdBrand = await createBrand(brandData);
      
      // Step 2: Upload logo if provided
      if (logoFile) {
        await uploadBrandLogo(createdBrand.brand_id, logoFile);
      }
      
      return createdBrand;
    },
    
    onSuccess: () => {
      // Only invalidate queries after the ENTIRE process completes
      // This ensures the brand only appears in sidebar after logo is uploaded (if provided)
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    
    onError: (error) => {
      console.error('[useCreateBrand] Error:', error);
    }
  });
};

export default useCreateBrand;

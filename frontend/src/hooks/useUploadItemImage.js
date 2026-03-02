import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Upload an image for a specific item
 *
 * @param {string} collectionId - The collection ID
 * @param {string} itemId - The item ID
 * @param {File} file - The image file to upload
 * @returns {Promise<Object>} Upload result with url, storage_path, alt
 */
const uploadItemImage = async (collectionId, itemId, file) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/items/${itemId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload item image');
  }

  return await response.json();
};

/**
 * Hook for uploading item images
 */
export const useUploadItemImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, itemId, file }) => uploadItemImage(collectionId, itemId, file),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collectionItems', variables.collectionId] });
    },
  });
};

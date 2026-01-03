import { useQuery, useMutation } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Fetch all generated decks/presentations for the authenticated user
 * 
 * Returns presentations grouped by brand
 * 
 * @returns {Object} Query result with presentations data
 * @returns {Object} data - Object with brands array containing decks
 * @returns {boolean} isLoading - Loading state
 * @returns {boolean} isError - Error state
 * @returns {Error} error - Error object if request failed
 * @returns {Function} refetch - Function to manually refetch data
 */
export const useGeneratedDecks = () => {
  return useQuery({
    queryKey: ['generated-decks'],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/presentations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch generated decks');
      }
      
      return await response.json();
    },
  });
};

/**
 * Download a presentation for a specific collection
 * 
 * @returns {Object} Mutation result
 */
export const useDownloadPresentation = () => {
  return useMutation({
    mutationFn: async (collectionId) => {
      const token = await getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/collections/${collectionId}/presentation/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to download presentation');
      }
      
      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Training_Deck.pptx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    },
  });
};

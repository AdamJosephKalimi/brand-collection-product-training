import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Fetch all documents for a collection
 * 
 * @param {string} collectionId - The collection ID
 * @returns {Object} Query result with documents array
 */
export const useCollectionDocuments = (collectionId) => {
  return useQuery({
    queryKey: ['collectionDocuments', collectionId],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection documents');
      }
      
      return await response.json();
    },
    enabled: !!collectionId,
  });
};

/**
 * Upload a document to a collection
 * 
 * @param {string} collectionId - The collection ID
 * @param {File} file - The file to upload
 * @param {string} type - Document type (LINESHEET, PURCHASE_ORDER, OTHER)
 * @param {boolean} process - Whether to process immediately (default: false for staging)
 * @returns {Promise<Object>} Uploaded document data
 */
const uploadDocument = async (collectionId, file, type, process = false) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  if (type) {
    formData.append('type', type);
  }
  formData.append('process', process);
  
  const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload document');
  }
  
  return await response.json();
};

/**
 * Delete a document from a collection
 * 
 * @param {string} collectionId - The collection ID
 * @param {string} documentId - The document ID to delete
 * @returns {Promise<Object>} Delete response
 */
const deleteDocument = async (collectionId, documentId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete document');
  }
  
  return await response.json();
};

/**
 * Hook for uploading documents
 */
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, file, type, process }) => uploadDocument(collectionId, file, type, process),
    onSuccess: (data, variables) => {
      // Invalidate documents list to refetch
      queryClient.invalidateQueries({ queryKey: ['collectionDocuments', variables.collectionId] });
    },
  });
};

/**
 * Hook for deleting documents
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, documentId }) => deleteDocument(collectionId, documentId),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collectionDocuments', variables.collectionId] });
      
      // Snapshot previous value
      const previousDocuments = queryClient.getQueryData(['collectionDocuments', variables.collectionId]);
      
      // Optimistically remove the document from cache
      queryClient.setQueryData(['collectionDocuments', variables.collectionId], (old) => {
        if (!old) return old;
        return old.filter(doc => doc.document_id !== variables.documentId);
      });
      
      return { previousDocuments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDocuments) {
        queryClient.setQueryData(['collectionDocuments', variables.collectionId], context.previousDocuments);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['collectionDocuments', variables.collectionId] });
    },
  });
};

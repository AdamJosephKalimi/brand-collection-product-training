import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

/**
 * Fetch all documents for a brand
 */
export const useBrandDocuments = (brandId) => {
  return useQuery({
    queryKey: ['brandDocuments', brandId],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/brands/${brandId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brand documents');
      }

      return await response.json();
    },
    enabled: !!brandId,
  });
};

/**
 * Upload a document to a brand
 */
const uploadBrandDocument = async (brandId, file, type) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  if (type) {
    formData.append('type', type);
  }

  const response = await fetch(`${API_BASE_URL}/brands/${brandId}/documents`, {
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
 * Delete a brand document
 */
const deleteBrandDocument = async (brandId, documentId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/brands/${brandId}/documents/${documentId}`, {
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
 * Process a single brand document through RAG pipeline
 */
const processBrandDocument = async (brandId, documentId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/brands/${brandId}/documents/${documentId}/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to process document');
  }

  return await response.json();
};

/**
 * Hook for uploading brand documents
 */
export const useUploadBrandDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, file, type }) => uploadBrandDocument(brandId, file, type),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brandDocuments', variables.brandId] });
    },
  });
};

/**
 * Hook for deleting brand documents
 */
export const useDeleteBrandDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, documentId }) => deleteBrandDocument(brandId, documentId),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['brandDocuments', variables.brandId] });

      const previousDocuments = queryClient.getQueryData(['brandDocuments', variables.brandId]);

      queryClient.setQueryData(['brandDocuments', variables.brandId], (old) => {
        if (!old) return old;
        return old.filter(doc => doc.document_id !== variables.documentId);
      });

      return { previousDocuments };
    },
    onError: (err, variables, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(['brandDocuments', variables.brandId], context.previousDocuments);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brandDocuments', variables.brandId] });
    },
  });
};

/**
 * Hook for processing a single brand document
 */
export const useProcessBrandDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, documentId }) => processBrandDocument(brandId, documentId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brandDocuments', variables.brandId] });
    },
  });
};

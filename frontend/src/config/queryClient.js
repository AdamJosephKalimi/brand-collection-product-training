import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * 
 * Global configuration for all queries and mutations in the application.
 * 
 * Key Settings:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - cacheTime: 10 minutes - Data stays in cache for 10 minutes after last use
 * - refetchOnWindowFocus: false - Don't refetch when user returns to tab
 * - refetchOnMount: false - Use cache if available instead of refetching
 * - retry: 3 - Retry failed requests 3 times with exponential backoff
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (no refetch needed)
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // How long unused data stays in cache
      cacheTime: 10 * 60 * 1000, // 10 minutes
      
      // Don't refetch when window regains focus
      refetchOnWindowFocus: false,
      
      // Use cache if available instead of refetching on mount
      refetchOnMount: false,
      
      // Retry failed requests
      retry: 3,
      
      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Show error in console for debugging
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      
      // Show error in console for debugging
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

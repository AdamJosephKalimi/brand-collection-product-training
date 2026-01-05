/**
 * API Configuration
 * 
 * Uses environment variable in production, falls back to localhost in development
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Host URL without /api path - for routes that don't use /api prefix
export const API_HOST = API_BASE_URL.replace(/\/api$/, '');

export const getApiUrl = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

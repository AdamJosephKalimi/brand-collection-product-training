/**
 * API Configuration
 * 
 * Uses environment variable in production, falls back to localhost in development
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const getApiUrl = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const linesheetAPI = {
  validate: async (data) => {
    const response = await apiClient.post('/api/linesheets/validate', data);
    return response.data;
  },
};

export const decksAPI = {
  generate: async (data) => {
    const response = await apiClient.post('/api/decks/generate', data);
    return response.data;
  },
  
  getStatus: async (deckId) => {
    const response = await apiClient.get(`/api/decks/${deckId}`);
    return response.data;
  },
  
  delete: async (deckId) => {
    const response = await apiClient.delete(`/api/decks/${deckId}`);
    return response.data;
  }
};

export default apiClient;

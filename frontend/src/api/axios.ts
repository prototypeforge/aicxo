import axios from 'axios';
import config from '../config';

// Token holder - can be set by auth store
let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

export const getAuthToken = () => currentToken;

const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Skip adding token if Authorization header is already set
  if (config.headers.Authorization) {
    return config;
  }
  
  // First try the in-memory token (most reliable after login)
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
    return config;
  }
  
  // Fallback to localStorage for page refresh cases
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {
      // Ignore parse errors
    }
  }
  return config;
});

// Handle 401 errors - just reject, don't auto-redirect
// Let components and stores handle auth state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Just reject the error - let the calling code handle it
    // Auto-redirect was causing race conditions after login
    return Promise.reject(error);
  }
);

export default api;

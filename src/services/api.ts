import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError } from '../types/api.types';
import { logApiError, sanitizeErrorData } from '../utils/errorLogging';

// Validate required environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT;

if (!API_BASE_URL && import.meta.env.PROD) {
  console.error('VITE_API_BASE_URL is not configured. API calls may fail.');
}

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:3000/api',
  timeout: parseInt(API_TIMEOUT || '30000'),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Request interceptor
// NOTE: Authentication now uses HttpOnly cookies (sent automatically by browser)
// No need to manually add Authorization headers
api.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  error => {
    // Extract error details
    const status = error.response?.status;
    const endpoint = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'unknown';

    // Handle 401 Unauthorized
    if (status === 401) {
      // Clear any stored data on unauthorized
      // Redirect to login using router instead of window.location
      // Note: This requires access to router navigate function
      // Best practice: Use axios interceptor in a component with router access
      // Or dispatch a Redux action to handle navigation
      const event = new CustomEvent('auth:unauthorized', {
        detail: { endpoint, method, status },
      });
      window.dispatchEvent(event);

      // Fallback to window.location if event listener not set up
      setTimeout(() => {
        if (!event.defaultPrevented) {
          window.location.href = '/signin';
        }
      }, 100);
    }

    // Create API error object
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      code: error.response?.data?.code,
      status: error.response?.status,
    };

    // Log API error with context
    logApiError(new Error(apiError.message), endpoint, method, {
      statusCode: status,
      requestData: sanitizeErrorData(error.config?.data),
      responseData: sanitizeErrorData(error.response?.data),
      metadata: {
        code: apiError.code,
        baseURL: error.config?.baseURL,
      },
    });

    return Promise.reject(apiError);
  }
);

// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config).then(response => response.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.post(url, data, config).then(response => response.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.put(url, data, config).then(response => response.data),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.patch(url, data, config).then(response => response.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config).then(response => response.data),
};

// Auth token management
// NOTE: Tokens are now stored in HttpOnly cookies (managed by backend)
// These utilities are deprecated but kept for backward compatibility
// MIGRATION: Please update your code to use cookie-based authentication
export const authToken = {
  get: () => null, // Tokens are in HttpOnly cookies (not accessible via JS)
  set: (_token: string) => {
    console.warn('authToken.set() is deprecated. Tokens are now managed via HttpOnly cookies.');
  },
  remove: () => {
    console.warn('authToken.remove() is deprecated. Use the /logout endpoint instead.');
  },
};

export const refreshToken = {
  get: () => null, // Tokens are in HttpOnly cookies (not accessible via JS)
  set: (_token: string) => {
    console.warn('refreshToken.set() is deprecated. Tokens are now managed via HttpOnly cookies.');
  },
  remove: () => {
    console.warn('refreshToken.remove() is deprecated. Use the /logout endpoint instead.');
  },
};

export default api;

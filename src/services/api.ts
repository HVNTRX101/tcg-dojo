import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiErrorResponse } from '../types/api.types';
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
});

// Request interceptor to add auth token
// SECURITY WARNING: localStorage is vulnerable to XSS attacks.
// For production, consider using HttpOnly cookies for token storage.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Extract error details
    const status = error.response?.status;
    const endpoint = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'unknown';

    // Handle 401 Unauthorized
    if (status === 401) {
      // Clear auth token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      // TODO: Replace with React Router navigate() for better SPA behavior
      // Using window.location as temporary solution - causes full page reload
      window.location.href = '/signin';
    }

    // Create API error object
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      code: error.response?.data?.code,
      status: error.response?.status,
    };

    // Log API error with context
    logApiError(
      new Error(apiError.message),
      endpoint,
      method,
      {
        statusCode: status,
        requestData: sanitizeErrorData(error.config?.data),
        responseData: sanitizeErrorData(error.response?.data),
        metadata: {
          code: apiError.code,
          baseURL: error.config?.baseURL,
        },
      }
    );

    return Promise.reject(apiError);
  }
);

// Generic API methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config).then((response) => response.data),
    
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.post(url, data, config).then((response) => response.data),
    
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.put(url, data, config).then((response) => response.data),
    
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.patch(url, data, config).then((response) => response.data),
    
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config).then((response) => response.data),
};

// Auth token management
// SECURITY WARNING: localStorage is vulnerable to XSS attacks.
// For production applications, consider:
// 1. Using HttpOnly cookies for token storage (prevents JavaScript access)
// 2. Implementing Content Security Policy (CSP) headers
// 3. Sanitizing all user inputs to prevent XSS
export const authToken = {
  get: () => localStorage.getItem('authToken'),
  set: (token: string) => localStorage.setItem('authToken', token),
  remove: () => localStorage.removeItem('authToken'),
};

export const refreshToken = {
  get: () => localStorage.getItem('refreshToken'),
  set: (token: string) => localStorage.setItem('refreshToken', token),
  remove: () => localStorage.removeItem('refreshToken'),
};

export default api;

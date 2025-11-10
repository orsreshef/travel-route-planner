/**
 * Base API Service Configuration
 * Axios instance with default settings for API communication
 */

import axios from 'axios';

// Create base API instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 60000, 
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

/**
 * Handle API errors and extract meaningful messages
 * @param {Error} error - Axios error object
 * @returns {Error} Formatted error
 */
export const handleApiError = (error) => {
  let message = 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with error status
    const { data, status } = error.response;
    
    if (data?.message) {
      message = data.message;
    } else if (data?.errors && Array.isArray(data.errors)) {
      // Validation errors
      message = data.errors.map(err => err.message || err.msg).join(', ');
    } else {
      // messages for common status codes
      switch (status) {
        case 400:
          message = 'Invalid request data';
          break;
        case 401:
          message = 'Authentication required';
          break;
        case 403:
          message = 'Access denied';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 429:
          message = 'Too many requests. Please try again later';
          break;
        case 500:
          message = 'Server error. Please try again later';
          break;
        default:
          message = `Request failed with status ${status}`;
      }
    }
  } else if (error.request) {
    // Network error
    message = 'Network error. Please check your connection';
  } else {
    // other error
    message = error.message || 'Request failed';
  }
  
  const errorObj = new Error(message);
  errorObj.originalError = error;
  errorObj.status = error.response?.status;
  
  return errorObj;
};

/**
 * Generic API request wrapper
 * @param {Function} apiCall - The API call function
 * @returns {Promise} API response data
 */
export const apiRequest = async (apiCall) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export default api;
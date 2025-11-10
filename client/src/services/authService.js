/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/api/auth`,
  timeout: 10000,
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if we're not already on the login page
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication service methods
 */
export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    try {
      const response = await api.post('/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Login user
   * @param {Object} credentials - Login credentials (email, password)
   * @returns {Promise<Object>} Login response with user data and token
   */
  async login(credentials) {
    try {
      const response = await api.post('/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Logout user
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    try {
      const response = await api.post('/logout');
      localStorage.removeItem('token');
      return response.data;
    } catch (error) {
      // Even if logout fails on server, remove token locally
      localStorage.removeItem('token');
      throw this.handleError(error);
    }
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} Updated profile response
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/profile', profileData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Change user password
   * @param {Object} passwordData - Current and new password
   * @returns {Promise<Object>} Password change response
   */
  async changePassword(passwordData) {
    try {
      const response = await api.post('/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Verify if current token is valid
   * @returns {Promise<Object>} Token verification response
   */
  async verifyToken() {
    try {
      const response = await api.post('/verify-token');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  },

  /**
   * Get stored auth token
   * @returns {string|null} Auth token
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Clear auth token
   */
  clearToken() {
    localStorage.removeItem('token');
  },

  /**
   * Handle API errors and extract meaningful messages
   * @param {Error} error - Axios error object
   * @returns {Error} Formatted error
   */
  handleError(error) {
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
        // Default messages for common status codes
        switch (status) {
          case 400:
            message = 'Invalid request data';
            break;
          case 401:
            message = 'Invalid credentials or session expired';
            break;
          case 403:
            message = 'Access denied';
            break;
          case 404:
            message = 'Service not found';
            break;
          case 429:
            const retryAfter = data?.retryAfter || 900; // Default 15 minutes
            const minutes = Math.ceil(retryAfter / 60);
            message = `Too many login attempts. Please wait ${minutes} minutes before trying again.`;
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
      // Other error
      message = error.message || 'Request failed';
    }
    
    const errorObj = new Error(message);
    errorObj.originalError = error;
    errorObj.status = error.response?.status;
    
    return errorObj;
  }
};

/**
 * Utility function to get auth headers for other API calls
 * @returns {Object} Headers object with authorization
 */
export const getAuthHeaders = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default authService;
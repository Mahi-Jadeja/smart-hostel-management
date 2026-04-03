import axios from 'axios';
import toast from 'react-hot-toast';

// Create an Axios instance with default configuration
// Every request made with this instance will automatically have:
// - The correct base URL
// - Content-Type header
// - Auth token (added by interceptor)
const api = axios.create({
  // Read the API URL from environment variables
  // In development: http://localhost:5000/api/v1
  baseURL: import.meta.env.VITE_API_URL,

  // Default headers sent with every request
  headers: {
    'Content-Type': 'application/json',
  },

  // Timeout after 10 seconds (don't wait forever)
  timeout: 10000,
});

// ============================================================
// REQUEST INTERCEPTOR
// Runs BEFORE every request is sent to the backend
// ============================================================
api.interceptors.request.use(
  (config) => {
    // Get the JWT token from localStorage
    const token = localStorage.getItem('token');

    // If a token exists, add it to the request headers
    // This is how the backend knows WHO is making the request
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // If something goes wrong while PREPARING the request
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// Runs AFTER every response is received from the backend
// ============================================================
api.interceptors.response.use(
  // SUCCESS handler (status 2xx)
  (response) => {
    // Return just the data (skip headers, status, config)
    // So instead of response.data.data, we can just use response.data
    return response;
  },

  // ERROR handler (status 4xx, 5xx)
  (error) => {
    // Extract the error details
    const message =
      error.response?.data?.message || // Backend sent an error message
      error.message ||                  // Axios error message
      'Something went wrong';           // Fallback

    const status = error.response?.status;

    // Handle specific status codes
    switch (status) {
      case 401:
        // Unauthorized — token is invalid or expired
        // Clear the token and redirect to login
        localStorage.removeItem('token');

        // Only redirect if not already on a public page
        if (
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')
        ) {
          toast.error('Session expired. Please log in again.');
          window.location.href = '/login';
        }
        break;

      case 403:
        // Forbidden — user doesn't have permission
        toast.error('You do not have permission to perform this action.');
        break;

      case 429:
        // Too many requests — rate limited
        toast.error('Too many requests. Please slow down.');
        break;

      case 500:
        // Server error
        toast.error('Server error. Please try again later.');
        break;

      default:
        // For other errors, we don't show a toast here
        // Let the calling code handle it (more context-specific)
        break;
    }

    return Promise.reject(error);
  }
);

export default api;
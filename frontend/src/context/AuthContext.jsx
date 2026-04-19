// createContext creates a Context object
// useContext reads the context value
// useState manages state
// useEffect runs side effects (like checking token on mount)
// useCallback memoizes functions (prevents unnecessary re-renders)
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/axios';

// Step 1: Create the Context
// This creates an empty context — we'll fill it with the Provider below
const AuthContext = createContext(null);

// Step 2: Create the Provider component
// This wraps the app and provides auth state to all children
export const AuthProvider = ({ children }) => {
  // ---- State ----
  const [user, setUser] = useState(null);
  // user = null means "not logged in"
  // user = { id, name, email, role } means "logged in"

  const [token, setToken] = useState(localStorage.getItem('token'));
  // Initialize from localStorage so we persist login across page refreshes
  // If no token in localStorage, this starts as null

  const [loading, setLoading] = useState(true);
  // loading = true while we're checking if the stored token is valid
  // Prevents a flash of the login page before redirecting to dashboard

  const navigate = useNavigate();

  // ---- Check token validity on mount ----
  // When the app loads, if there's a token in localStorage,
  // we verify it's still valid by calling /auth/me
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        // No token → not logged in
        setLoading(false);
        return;
      }

      try {
        // Call the /me endpoint to verify the token
        const response = await api.get('/auth/me');

        // If successful, set the user state
        setUser(response.data.data.user);
        setToken(storedToken);
      } catch (error) {
        // Token is invalid or expired
        // Clean up and treat as logged out
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        // Whether success or failure, we're done loading
        setLoading(false);
      }
    };

    verifyToken();
  }, []);
  // Empty dependency array [] means this runs ONCE when the component mounts
  // (when the app first loads or page is refreshed)

  // ---- Login function ----
  // Called by the Login page when user submits credentials
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      const { token: newToken, user: userData } = response.data.data;

      // Save token to localStorage (persists across refreshes)
      localStorage.setItem('token', newToken);

      // Update state
      setToken(newToken);
      setUser(userData);

      // Show success message
      toast.success(`Welcome back, ${userData.name}!`);

      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  }, [navigate]);
  // useCallback memoizes the function — it won't be recreated on every render
  // unless 'navigate' changes (which it doesn't)
  // This prevents unnecessary re-renders of components that receive this function

  // ---- Register function ----
    // ---- Register function ----
  const registerUser = useCallback(async (payload) => {
    try {
      const response = await api.post('/auth/register', payload);

      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);

      toast.success('Registration successful! Welcome to IntelliHostel.');
      navigate('/student/dashboard');

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  }, [navigate]);

  // ---- Logout function ----
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  }, [navigate]);

  // ---- Login with token (for OAuth callback) ----
  const loginWithToken = useCallback(async (newToken) => {
    try {
      localStorage.setItem('token', newToken);
      setToken(newToken);

      // Verify the token and get user data
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${newToken}` },
      });

      const userData = response.data.data.user;
      setUser(userData);

      toast.success(`Welcome, ${userData.name}!`);

      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }

      return { success: true };
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      toast.error('Authentication failed');
      navigate('/login');
      return { success: false };
    }
  }, [navigate]);

  // ---- Context value ----
  // This object is what components receive when they call useAuth()
  const value = {
    user,         // Current user object (or null)
    token,        // Current JWT token (or null)
    loading,      // Is auth state being loaded?
    isAuthenticated: !!user,
    // !!user converts to boolean: null → false, {object} → true
    login,        // Function to login
    register: registerUser, // Function to register
    logout,       // Function to logout
    loginWithToken, // Function for OAuth callback
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Step 3: Create the custom hook
// Components call useAuth() instead of useContext(AuthContext)
// This is cleaner and adds error checking
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
    // This happens if someone uses useAuth() outside of <AuthProvider>
    // A helpful error message instead of a cryptic "undefined" error
  }

  return context;
};

export default AuthContext;
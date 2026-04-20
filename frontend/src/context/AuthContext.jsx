import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ---- Verify token on mount ----
  // ---- Verify token on mount ----
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const userData = response.data.data.user;
        const userData = response.data.data.user;

        setUser(userData);
        setUser(userData);
        setToken(storedToken);

        /**
         * Profile complete check for Google OAuth users.
         * If profile_complete is false, redirect to /complete-profile.
         * This runs on every page refresh so they can't skip it.
         *
         * profile_complete is only false for Google OAuth students
         * who haven't filled in gender/branch/guardian yet.
         */
        if (
          userData.role === 'student' &&
          userData.profile_complete === false
        ) {
          navigate('/complete-profile', { replace: true });
        }

        /**
         * Profile complete check for Google OAuth users.
         * If profile_complete is false, redirect to /complete-profile.
         * This runs on every page refresh so they can't skip it.
         *
         * profile_complete is only false for Google OAuth students
         * who haven't filled in gender/branch/guardian yet.
         */
        if (
          userData.role === 'student' &&
          userData.profile_complete === false
        ) {
          navigate('/complete-profile', { replace: true });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // ---- Login ----
  // ---- Login ----
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);

      toast.success(`Welcome back, ${userData.name}!`);

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

  // ---- Register ----
  // Now accepts extraFields: { gender, branch, guardian }
  const registerUser = useCallback(async (name, email, password, extraFields = {}) => {

  // ---- Register ----
  // Now accepts extraFields: { gender, branch, guardian }
  const registerUser = useCallback(async (name, email, password, extraFields = {}) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        gender: extraFields.gender,
        branch: extraFields.branch,
        guardian: extraFields.guardian,
      });
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        gender: extraFields.gender,
        branch: extraFields.branch,
        guardian: extraFields.guardian,
      });

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

  // ---- Logout ----
  // ---- Logout ----
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  }, [navigate]);

  // ---- Login with token (Google OAuth callback) ----
  // ---- Login with token (Google OAuth callback) ----
  const loginWithToken = useCallback(async (newToken) => {
    try {
      localStorage.setItem('token', newToken);
      setToken(newToken);

      // Verify the token and get user data including profile_complete
      // Verify the token and get user data including profile_complete
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${newToken}` },
      });

      const userData = response.data.data.user;
      setUser(userData);

      toast.success(`Welcome, ${userData.name}!`);

      /**
       * Google OAuth profile completion check.
       * If the student hasn't set gender/branch/guardian yet,
       * redirect to /complete-profile page.
       * Otherwise go straight to dashboard.
       */
      /**
       * Google OAuth profile completion check.
       * If the student hasn't set gender/branch/guardian yet,
       * redirect to /complete-profile page.
       * Otherwise go straight to dashboard.
       */
      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.profile_complete === false) {
        // Google OAuth user — needs to complete profile first
        navigate('/complete-profile', { replace: true });
      } else if (userData.profile_complete === false) {
        // Google OAuth user — needs to complete profile first
        navigate('/complete-profile', { replace: true });
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

  const value = {
    user,
    token,
    loading,
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register: registerUser,
    logout,
    loginWithToken,
    login,
    register: registerUser,
    logout,
    loginWithToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
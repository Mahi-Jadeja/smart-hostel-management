import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  // useSearchParams reads query parameters from the URL
  // URL: /auth/callback?token=abc123
  // searchParams.get('token') → 'abc123'
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  // useRef to prevent double execution in React StrictMode
  // StrictMode runs useEffect twice in development
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google authentication failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token) {
      // Use the loginWithToken function from AuthContext
      // It stores the token, verifies it, and redirects to dashboard
      loginWithToken(token);
    } else {
      toast.error('No authentication token received.');
      navigate('/login');
    }
  }, [searchParams, navigate, loginWithToken]);

  // Show loading while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
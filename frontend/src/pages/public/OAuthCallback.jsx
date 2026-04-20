import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * OAuthCallback
 *
 * Landing page after Google OAuth redirect.
 * URL format: /auth/callback?token=abc123
 *
 * Extracts token from URL, calls loginWithToken which:
 * 1. Stores token in localStorage
 * 2. Calls GET /auth/me to get user data + profile_complete flag
 * 3. Redirects to /complete-profile if profile incomplete (Google users)
 * 4. Redirects to /student/dashboard if profile complete
 *
 * useRef prevents double execution in React StrictMode
 * (StrictMode runs effects twice in development)
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
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
      loginWithToken(token);
    } else {
      toast.error('No authentication token received.');
      navigate('/login');
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {/* Spinner */}
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Signing you in...
        </h2>
        <p className="text-muted-foreground text-sm">
          Please wait while we complete your Google sign-in.
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
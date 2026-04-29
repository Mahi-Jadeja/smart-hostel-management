import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
// Import ThemeToggle for public page theme switching
import { ThemeToggle } from '../../components/theme/ThemeToggle';

const Login = () => {
  const { login, isAuthenticated, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    const path = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return <Navigate to={path} replace />;
  }

  // Don't flash the login page while auth state is being checked
  if (loading) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(email, password);
    if (!result.success) setError(result.message);
    setIsSubmitting(false);
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth entry point
    const apiUrl = import.meta.env.VITE_API_URL;
    const baseUrl = apiUrl.replace('/api/v1', '');
    window.location.href = `${baseUrl}/api/v1/auth/google`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* ---- BACKGROUND EFFECTS ---- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* ======== TOP BAR ======== */}
      {/* 
        Fixed top bar on login page with just the theme toggle.
        Positioned top-right so it doesn't interfere with the form layout.
      */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        {/* Back to landing */}
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Back to Home
        </Link>

        {/* Theme toggle — so users can switch before logging in */}
        <ThemeToggle />
      </div>

      {/* ======== LOGIN FORM CENTERED ======== */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">IntelliHostel</span>
            </Link>
          </div>

          {/* Login Card */}
          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border">
            <h1 className="text-2xl font-bold text-foreground text-center mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-center mb-6">
              Enter your credentials to access your account
            </p>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:text-primary/90 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  {/* Toggle password visibility */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google OAuth */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 border border-input rounded-lg hover:bg-secondary transition-all font-medium text-foreground flex items-center justify-center gap-2 bg-background"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </motion.button>

            {/* Register link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-primary hover:text-primary/90 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
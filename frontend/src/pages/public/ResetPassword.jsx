import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Building2, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../../components/theme/ThemeToggle';

// Use a local axios instance — mirrors GuardianAction.jsx pattern exactly.
// Reason: This is a public page with no auth token.
// We must NOT use the global api from lib/axios.js here because if the
// backend returns 401 for any reason, the global interceptor would
// wipe localStorage and redirect — confusing on a public page.
import axios from 'axios';

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Client-side password match check before hitting the API
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordLongEnough = password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation before API call
    if (!passwordLongEnough) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await publicApi.patch(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });

      setIsSuccess(true);
      toast.success('Password reset successful!');

      // Redirect to login after 3 seconds so user sees the success state
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ======== SUCCESS STATE ========
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
          <ThemeToggle />
        </div>

        {/* Success card */}
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

            <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-3">
                Password Reset!
              </h1>

              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your password has been reset successfully.
                You will be redirected to the login page in a moment.
              </p>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
              >
                Go to Login
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ======== ERROR STATE — Invalid or Expired Token ========
  // We only show this if the token param is missing entirely.
  // Expired/invalid token errors are shown inline in the form
  // (so user sees the error after attempting to submit).
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-20 flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-3">
                Invalid Reset Link
              </h1>

              <p className="text-muted-foreground mb-8 leading-relaxed">
                This password reset link is invalid or missing.
                Please request a new one.
              </p>

              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
              >
                Request New Link
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ======== FORM STATE ========
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>
        <ThemeToggle />
      </div>

      {/* Form card */}
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

          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border">
            <h1 className="text-2xl font-bold text-foreground text-center mb-2">
              Reset Password
            </h1>
            <p className="text-muted-foreground text-center mb-6 leading-relaxed">
              Enter your new password below. Make sure it is at least 6 characters.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password length hint */}
                {password.length > 0 && !passwordLongEnough && (
                  <p className="text-xs text-destructive mt-1">
                    At least 6 characters required
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Passwords match indicator */}
                {confirmPassword.length > 0 && (
                  <p className={`text-xs mt-1 ${passwordsMatch ? 'text-emerald-500' : 'text-destructive'}`}>
                    {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </motion.button>
            </form>

            {/* Back to login */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-primary hover:text-primary/90 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
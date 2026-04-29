import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../../components/theme/ThemeToggle';
import authService from '../../services/auth.service';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email);
      // Always show success — backend returns 200 regardless of email existence
      // (prevents user enumeration — do not show different messages here)
      setIsSubmitted(true);
      toast.success('Reset link sent! Check your inbox.');
    } catch (err) {
      // This only triggers for network errors, rate limiting (429),
      // validation errors (400), or server errors (500)
      // NOT for "email not found" (backend returns 200 for that)
      const message =
        err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ======== SUCCESS STATE ========
  // Shown after form submission — replaces form entirely
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

        {/* Background effects — same as Login.jsx */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
              {/* Success icon */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-3">
                Check your email
              </h1>

              <p className="text-muted-foreground mb-2 leading-relaxed">
                If <span className="font-medium text-foreground">{email}</span> is
                registered, you will receive a password reset link shortly.
              </p>

              <p className="text-sm text-muted-foreground mb-8">
                The link expires in <span className="font-medium">30 minutes</span>.
                Check your spam folder if you do not see it.
              </p>

              {/* Back to login */}
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>

              {/* Resend hint */}
              <p className="text-xs text-muted-foreground mt-4">
                Didn't receive it?{' '}
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setError('');
                  }}
                  className="text-primary hover:text-primary/90 font-medium"
                >
                  Try again
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ======== FORM STATE ========
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Background effects — same as Login.jsx */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
              Forgot Password?
            </h1>
            <p className="text-muted-foreground text-center mb-6 leading-relaxed">
              No worries. Enter your registered email and we will send you a reset link.
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
                  Email Address
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
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
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
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
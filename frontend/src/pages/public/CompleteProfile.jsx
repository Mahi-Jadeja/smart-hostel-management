import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  ArrowRight,
  Phone,
  BookOpen,
  Shield,
  User,
  Mail,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../../components/theme/ThemeToggle';
import { BRANCHES, STUDENT_GENDERS } from '../../constants/enums';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

/**
 * CompleteProfile Page
 *
 * Shown to Google OAuth users who haven't filled in:
 * - gender
 * - branch
 * - guardian details
 *
 * These fields are required for:
 * - Room allocation (gender determines which block)
 * - Outpass approval (guardian email)
 * - Payment reminders (guardian email)
 *
 * Flow:
 * Google Login → OAuthCallback → loginWithToken
 * → getMe returns profile_complete: false
 * → redirect to /complete-profile
 * → user fills form → PATCH /auth/complete-profile
 * → redirect to /student/dashboard
 *
 * This page uses 2 steps (no password step needed):
 * Step 1 → Academic (gender, branch)
 * Step 2 → Guardian (name, phone, email)
 */
const CompleteProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: '',
    branch: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleGenderSelect = (genderValue) => {
    setFormData((prev) => ({ ...prev, gender: genderValue }));
    if (error) setError('');
  };

  // ---- Step 1 validation ----
  const validateStep1 = () => {
    if (!formData.gender) {
      setError('Please select your gender');
      return false;
    }
    if (!formData.branch) {
      setError('Please select your branch');
      return false;
    }
    return true;
  };

  // ---- Step 2 validation ----
  const validateStep2 = () => {
    if (formData.guardianName.trim().length < 2) {
      setError('Guardian name must be at least 2 characters');
      return false;
    }
    if (formData.guardianPhone.trim().length < 7) {
      setError('Guardian phone must be at least 7 digits');
      return false;
    }
    if (!formData.guardianEmail.trim().includes('@')) {
      setError('Please enter a valid guardian email');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  /**
   * Submit completed profile to backend.
   * Calls PATCH /auth/complete-profile with gender, branch, guardian.
   * On success, navigate to student dashboard.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) return;

    try {
      setIsSubmitting(true);

      await api.patch('/auth/complete-profile', {
        gender: formData.gender,
        branch: formData.branch,
        guardian: {
          name: formData.guardianName,
          phone: formData.guardianPhone,
          email: formData.guardianEmail,
        },
      });

      toast.success('Profile completed! Welcome to IntelliHostel 🎉');

      // Navigate to dashboard after completion
      navigate('/student/dashboard', { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to complete profile';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Sign out
        </button>
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-xl shadow-blue-500/25 mx-auto mb-3">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">IntelliHostel</span>
          </div>

          {/* Card */}
          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border">

            {/* Welcome message */}
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Welcome, {user?.name || 'there'}! 👋
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Since you signed in with Google, we need a few more details
                  to set up your hostel profile.
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {[
                { num: 1, label: 'Academic' },
                { num: 2, label: 'Guardian' },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center
                      text-sm font-bold transition-all duration-300
                      ${s.num < step ? 'bg-emerald-500 text-white' : ''}
                      ${s.num === step ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110' : ''}
                      ${s.num > step ? 'bg-secondary text-muted-foreground' : ''}
                    `}>
                      {s.num < step ? '✓' : s.num}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                  {i < 1 && (
                    <div className={`
                      w-12 h-0.5 mb-4 transition-all duration-300
                      ${s.num < step ? 'bg-emerald-500' : 'bg-border'}
                    `} />
                  )}
                </div>
              ))}
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-foreground">
                {step === 1 ? 'Academic Details' : 'Guardian Details'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 1
                  ? 'Required for room allocation'
                  : 'Required for outpass approval'}
              </p>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ======== STEP 1: ACADEMIC ======== */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Gender * <span className="text-xs text-muted-foreground">(determines hostel block)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {STUDENT_GENDERS.map((g) => {
                      const isSelected = formData.gender === g.value;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => handleGenderSelect(g.value)}
                          className={`
                            py-4 rounded-xl border-2 text-sm font-semibold
                            transition-all duration-200 select-none
                            ${isSelected
                              ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                              : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary'
                            }
                          `}
                        >
                          <span className="block text-xl mb-1">
                            {g.value === 'male' ? '♂' : '♀'}
                          </span>
                          {g.label}
                          {isSelected && (
                            <span className="block text-xs mt-1 opacity-80">
                              ✓ Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Branch / Department *
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                      <option value="">Select your branch</option>
                      {BRANCHES.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Next button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {/* ======== STEP 2: GUARDIAN ======== */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Your guardian will receive outpass approval requests and
                    payment reminders via email.
                  </p>
                </div>

                {/* Guardian Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Guardian Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="guardianName"
                      type="text"
                      value={formData.guardianName}
                      onChange={handleChange}
                      placeholder="Parent or guardian's full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Guardian Phone */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Guardian Phone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="guardianPhone"
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Guardian Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Guardian Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="guardianEmail"
                      type="email"
                      value={formData.guardianEmail}
                      onChange={handleChange}
                      placeholder="guardian@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all"
                  >
                    ← Back
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Saving...' : 'Complete Setup'}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompleteProfile;
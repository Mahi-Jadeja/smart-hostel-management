import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Building2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  BookOpen,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "../../components/theme/ThemeToggle";
import { BRANCHES, STUDENT_GENDERS } from "../../constants/enums";

/**
 * Register Page — 3-step form
 *
 * Step 1: Account (name, email, password)
 * Step 2: Academic (gender, branch)
 * Step 3: Guardian (guardian name, phone, email)
 *
 * FIX: Removed AnimatePresence mode="wait" from step content.
 * It was causing unmount/remount cycles during animations which
 * prevented button clicks from registering (especially gender buttons).
 * Steps now use conditional rendering with simple motion.div animations.
 */
const Register = () => {
  const { register, isAuthenticated, user, loading } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    branch: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (isAuthenticated) {
    const path =
      user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";
    return <Navigate to={path} replace />;
  }

  if (loading) return null;

  // ---- Handle input changes ----
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  // ---- Set gender directly (not through handleChange) ----
  // This avoids any potential issues with event object
  const handleGenderSelect = (genderValue) => {
    setFormData((prev) => ({ ...prev, gender: genderValue }));
    if (error) setError("");
  };
/**
 * Google Sign Up handler
 * Same endpoint as Google Login — Google handles both in one flow.
 * If account exists → logs in.
 * If account doesn't exist → creates new account via passport.js
 * then redirects to /complete-profile to fill gender/branch/guardian.
 */
const handleGoogleSignUp = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const baseUrl = apiUrl.replace('/api/v1', '');
  window.location.href = `${baseUrl}/api/v1/auth/google`;
};
  // ---- Validations ----
  const validateStep1 = () => {
    if (formData.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }
    if (!formData.email.trim().includes("@")) {
      setError("Please enter a valid email");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.gender) {
      setError("Please select your gender");
      return false;
    }
    if (!formData.branch) {
      setError("Please select your branch");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.guardianName.trim().length < 2) {
      setError("Guardian name must be at least 2 characters");
      return false;
    }
    if (formData.guardianPhone.trim().length < 7) {
      setError("Guardian phone must be at least 7 digits");
      return false;
    }
    if (!formData.guardianEmail.trim().includes("@")) {
      setError("Please enter a valid guardian email");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateStep3()) return;

    setIsSubmitting(true);

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      {
        gender: formData.gender,
        branch: formData.branch,
        guardian: {
          name: formData.guardianName,
          phone: formData.guardianPhone,
          email: formData.guardianEmail,
        },
      },
    );

    if (!result.success) {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
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

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">
                IntelliHostel
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[
                { num: 1, label: "Account" },
                { num: 2, label: "Academic" },
                { num: 3, label: "Guardian" },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                      ${s.num < step ? "bg-emerald-500 text-white" : ""}
                      ${s.num === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110" : ""}
                      ${s.num > step ? "bg-secondary text-muted-foreground" : ""}
                    `}
                    >
                      {s.num < step ? "✓" : s.num}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`w-8 h-0.5 mb-4 transition-all duration-300 ${s.num < step ? "bg-emerald-500" : "bg-border"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {step === 1 && "Create Account"}
                {step === 2 && "Academic Details"}
                {step === 3 && "Guardian Details"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 1 && "Set up your login credentials"}
                {step === 2 && "Tell us about your studies"}
                {step === 3 && "Emergency contact information"}
              </p>
            </div>

            {/* Error — AnimatePresence only here, NOT on step content */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 
              STEP CONTENT — NO AnimatePresence here.
              Using simple conditional rendering instead.
              AnimatePresence mode="wait" was causing unmount/remount
              during animation which broke button click handlers.
            */}

            {/* ======== STEP 1 ======== */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-12 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
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

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Next */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleNext}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </motion.button>
                {/* Next button — already exists */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleNext}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </motion.button>

                {/* Divider — NEW */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign Up button — NEW */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleGoogleSignUp}
                  className="w-full py-2.5 border border-input rounded-lg hover:bg-secondary transition-all font-medium text-foreground flex items-center justify-center gap-2 bg-background"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </motion.button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary/90 font-medium"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            )}

            {/* ======== STEP 2 ======== */}
            {step === 2 && (
              <div className="space-y-4">
                {/* 
                  Gender Selection
                  Using handleGenderSelect (not handleChange) to avoid
                  any event object issues with button clicks.
                */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Gender *
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
                            ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                            }
                          `}
                        >
                          <span className="block text-xl mb-1">
                            {g.value === "male" ? "♂" : "♀"}
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
                    onClick={handleNext}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}

            {/* ======== STEP 3 ======== */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Guardian details are used for outpass approval and payment
                    reminders.
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
                    {isSubmitting ? "Creating..." : "Create Account"}
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

export default Register;
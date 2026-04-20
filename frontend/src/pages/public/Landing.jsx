import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Shield,
  Users,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
// Import ThemeToggle so users can switch theme from the landing page
import { ThemeToggle } from '../../components/theme/ThemeToggle';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  // Redirect logged-in users to their dashboard
  if (isAuthenticated) {
    const path = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return <Navigate to={path} replace />;
  }

  // Stagger animation for hero section children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">

      {/* ---- BACKGROUND BLOBS ---- */}
      {/* Decorative gradient blobs — pointer-events-none so they don't block clicks */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      {/* ======== NAVBAR ======== */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto"
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">IntelliHostel</span>
        </div>

        {/* Right side: theme toggle + auth links */}
        <div className="flex items-center gap-3">
          {/* 
            ThemeToggle on public pages so users can preview dark mode
            before logging in. Reads/writes to localStorage.
          */}
          <ThemeToggle />

          <div className="h-5 w-px bg-border" />

          <Link
            to="/login"
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25 flex items-center gap-2"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.nav>

      {/* ======== HERO SECTION ======== */}
      <section className="relative z-10 px-6 py-20 lg:py-32 max-w-7xl mx-auto text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Badge pill */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Now with Dark Mode & Analytics
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl lg:text-7xl font-bold text-foreground tracking-tight"
          >
            Smart Hostel
            <span className="gradient-text block mt-2">Management Reimagined</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Digitize your hostel operations with a modern, glassmorphic interface.
            Room allocation, complaints, outpass requests, and payments — all in one beautiful place.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-4 pt-4 flex-wrap"
          >
            <Link
              to="/register"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium text-lg shadow-xl shadow-primary/25 flex items-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 glass-card text-foreground rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all font-medium text-lg border border-border"
            >
              Log In
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ======== FEATURES GRID ======== */}
      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A complete suite of tools designed for modern hostel management
            with delightful interactions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Building2,
              title: 'Room Allocation',
              desc: 'Visual room grid with real-time occupancy tracking and smart allocation algorithms.',
              iconClass: 'text-blue-600 dark:text-blue-400',
              bgClass: 'bg-blue-500/10',
            },
            {
              icon: ClipboardList,
              title: 'Complaint Tracking',
              desc: 'Smart complaint system with auto-priority escalation and resolution tracking.',
              iconClass: 'text-amber-600 dark:text-amber-400',
              bgClass: 'bg-amber-500/10',
            },
            {
              icon: FileText,
              title: 'Outpass Management',
              desc: 'Digital outpass requests with guardian approval workflow and verification.',
              iconClass: 'text-emerald-600 dark:text-emerald-400',
              bgClass: 'bg-emerald-500/10',
            },
            {
              icon: CreditCard,
              title: 'Payment Tracking',
              desc: 'Automated fee reminders, payment records, and financial analytics dashboard.',
              iconClass: 'text-purple-600 dark:text-purple-400',
              bgClass: 'bg-purple-500/10',
            },
            {
              icon: Users,
              title: 'Student Records',
              desc: 'Complete student profiles with academic, personal, and guardian details.',
              iconClass: 'text-rose-600 dark:text-rose-400',
              bgClass: 'bg-rose-500/10',
            },
            {
              icon: Shield,
              title: 'Role-Based Access',
              desc: 'Secure auth with separate dashboards for students, admins, and guardians.',
              iconClass: 'text-indigo-600 dark:text-indigo-400',
              bgClass: 'bg-indigo-500/10',
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="glass-card p-6 rounded-2xl group cursor-pointer"
            >
              {/* 
                NOTE: Using explicit color class strings instead of
                dynamic `bg-${color}-500/10` because Tailwind's JIT
                compiler only includes classes it can statically detect.
                Dynamic interpolation = classes get purged in production.
              */}
              <div className={`w-12 h-12 rounded-xl ${feature.bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.iconClass}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="relative z-10 border-t border-border mt-20 py-8 text-center text-muted-foreground text-sm glass">
        <p>© 2024 IntelliHostel. Built with modern web technologies.</p>
      </footer>
    </div>
  );
};

export default Landing;
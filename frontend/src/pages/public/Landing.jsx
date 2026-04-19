import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Shield,
  Users,
} from 'lucide-react';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    const path = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return <Navigate to={path} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* ======== NAVBAR ======== */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-bold text-indigo-900">IntelliHostel</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ======== HERO SECTION ======== */}
      <section className="px-6 py-20 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Smart Hostel
          <span className="text-indigo-600"> Management</span>
          <br />
          Made Simple
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Digitize your hostel operations — room allocation, complaints, outpass
          requests, and payments — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-lg"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 border-2 border-indigo-200 text-indigo-600 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors font-medium text-lg"
          >
            Log In
          </Link>
        </div>
      </section>

      {/* ======== FEATURES SECTION ======== */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            IntelliHostel provides a complete suite of tools for hostel management.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Card Component (defined inline for simplicity) */}
            {[
              {
                icon: Building2,
                title: 'Room Allocation',
                desc: 'Visual room grid with real-time occupancy tracking. Allocate and manage rooms effortlessly.',
              },
              {
                icon: ClipboardList,
                title: 'Complaint Tracking',
                desc: 'Smart complaint system with auto-priority escalation for recurring issues.',
              },
              {
                icon: FileText,
                title: 'Outpass Management',
                desc: 'Digital outpass requests with one-click approval or rejection by wardens.',
              },
              {
                icon: CreditCard,
                title: 'Payment Tracking',
                desc: 'Track hostel fees, mess charges, and fines with automatic due date reminders.',
              },
              {
                icon: Users,
                title: 'Student Records',
                desc: 'Complete student profiles with academic, personal, and guardian details.',
              },
              {
                icon: Shield,
                title: 'Role-Based Access',
                desc: 'Separate dashboards for students and admins with secure authentication.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-100 hover:border-indigo-100 hover:shadow-lg transition-all duration-300"
              >
                <feature.icon className="w-10 h-10 text-indigo-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="px-6 py-8 text-center text-gray-400 text-sm">
        <p>© 2024 IntelliHostel. Built with MERN Stack.</p>
      </footer>
    </div>
  );
};

export default Landing;
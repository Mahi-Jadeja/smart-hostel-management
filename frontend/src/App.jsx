import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import ErrorBoundary from './components/shared/ErrorBoundary';
import DashboardLayout from './components/layout/DashboardLayout';

// Public pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import OAuthCallback from './pages/public/OAuthCallback';
import GuardianAction from './pages/public/GuardianAction';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';

// Student pages
import StudentOverview from './pages/student/Overview';
import StudentProfile from './pages/student/Profile';
import StudentRoom from './pages/student/Room';
import StudentRoomPreference from './pages/student/RoomPreference';
import StudentComplaints from './pages/student/Complaints';
import StudentOutpass from './pages/student/Outpass';
import StudentPayments from './pages/student/Payments';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';  // NEW
import AdminRoomLayout from './pages/admin/RoomLayout';
import AdminPayments from './pages/admin/Payments';
import AdminComplaints from './pages/admin/Complaints';
import AdminOutpass from './pages/admin/Outpass';

// Error pages
import NotFound from './pages/errors/NotFound';
// Add import at top
import CompleteProfile from './pages/public/CompleteProfile';


const StudentLayout = () => (
  <DashboardLayout>
    <Outlet />
  </DashboardLayout>
);

const AdminLayout = () => (
  <DashboardLayout>
    <Outlet />
  </DashboardLayout>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--card)',
                color: 'var(--card-foreground)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
              },
            }}
          />

          <Routes>
            {/* ======== PUBLIC ROUTES ======== */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/outpass/guardian-action/:token" element={<GuardianAction />} />
            // Add route — PUBLIC but requires auth token (Google user already has token)
            // Place it BEFORE the student/admin routes
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* ======== STUDENT ROUTES ======== */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentOverview />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="room" element={<StudentRoom />} />
              <Route path="complaints" element={<StudentComplaints />} />
              <Route path="outpass" element={<StudentOutpass />} />
              <Route path="payments" element={<StudentPayments />} />
              <Route path="room-preference" element={<StudentRoomPreference />} />
            </Route>

            {/* ======== ADMIN ROUTES ======== */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudents />} />   {/* NEW */}
              <Route path="rooms" element={<AdminRoomLayout />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="outpass" element={<AdminOutpass />} />
            </Route>

            {/* ======== 404 ======== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
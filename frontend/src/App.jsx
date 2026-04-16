import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthProvider } from './context/AuthContext';

// Shared components
import ProtectedRoute from './components/shared/ProtectedRoute';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Public pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import OAuthCallback from './pages/public/OAuthCallback';

// Student pages
import StudentOverview from './pages/student/Overview';
import StudentProfile from './pages/student/Profile';
import StudentRoom from './pages/student/Room';
import StudentRoomPreference from './pages/student/RoomPreference';

// Error pages
import NotFound from './pages/errors/NotFound';

import StudentComplaints from './pages/student/Complaints';
import StudentOutpass from './pages/student/Outpass';
import StudentPayments from './pages/student/Payments';
import AdminRoomLayout from './pages/admin/RoomLayout';

import GuardianAction from './pages/public/GuardianAction';
import AdminPayments from './pages/admin/Payments';
import AdminComplaints from './pages/admin/Complaints';
import AdminOutpass from './pages/admin/Outpass';

// Admin placeholder (we'll build real admin pages in later phases)
const AdminPlaceholder = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    <p className="text-gray-500 mt-2">Coming in Phase 8...</p>
  </div>
);

/**
 * StudentLayout - Wraps all student pages with DashboardLayout
 * Uses <Outlet /> to render the matched child route
 */
const StudentLayout = () => (
  <DashboardLayout>
    <Outlet />
  </DashboardLayout>
);

/**
 * AdminLayout - Same concept for admin pages
 */
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
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
              },
              success: {
                iconTheme: { primary: '#4caf50', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#f44336', secondary: '#fff' },
              },
            }}
          />

          <Routes>
            {/* ================================ */}
            {/* PUBLIC ROUTES                    */}
            {/* ================================ */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            {/* ================================ */}
            {/* PUBLIC ROUTES                    */}
            <Route path="/outpass/guardian-action/:token" element={<GuardianAction />} />

            {/* ================================ */}
            {/* STUDENT ROUTES (nested)          */}
            {/* ================================ */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              {/* index route: /student → redirect to /student/dashboard */}
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentOverview />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="room" element={<StudentRoom />} />
              <Route path="complaints" element={<StudentComplaints />} />
              <Route path="outpass" element={<StudentOutpass />} />
              <Route path="payments" element={<StudentPayments />} />
              <Route path="room-preference" element={<StudentRoomPreference />} />
              {/* These will be added in later phases: */}
              {/* <Route path="complaints" element={<StudentComplaints />} /> */}
              {/* <Route path="outpass" element={<StudentOutpass />} /> */}
              {/* <Route path="payments" element={<StudentPayments />} /> */}
            </Route>

            {/* ================================ */}
            {/* ADMIN ROUTES (nested)            */}
            {/* ================================ */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminPlaceholder />} />
              <Route path="rooms" element={<AdminRoomLayout />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="outpass" element={<AdminOutpass />} />
              {/* More admin routes will be added in later phases */}
            </Route>

            {/* ================================ */}
            {/* CATCH-ALL 404                    */}
            {/* ================================ */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

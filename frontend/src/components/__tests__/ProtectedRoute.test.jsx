import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/protected' }),
    Navigate: ({ to }) => <div>Redirected to: {to}</div>,
  };
});

import ProtectedRoute from '@/components/shared/ProtectedRoute.jsx';
import { useAuth } from '@/context/AuthContext';
~
describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner when auth is loading', () => {
    useAuth.mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute allowedRoles={['student']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render children when authenticated with correct role', () => {
    useAuth.mockReturnValue({
      user: { id: '123', name: 'Test', role: 'student' },
      loading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute allowedRoles={['student']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute allowedRoles={['student']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Redirected to: /login')).toBeInTheDocument();
  });

  it('should redirect when role does not match', () => {
    useAuth.mockReturnValue({
      user: { id: '123', name: 'Test', role: 'student' },
      loading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin Only Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Redirected to: /student/dashboard')).toBeInTheDocument();
  });
});
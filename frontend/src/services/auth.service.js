import api from '../lib/axios';

/**
 * Auth Service
 *
 * Handles API calls for stateless auth operations:
 * - forgotPassword: Sends a reset link to the provided email
 * - resetPassword:  Updates password using the token from the email link
 *
 * Note: Session-state operations (login, register, logout, loginWithToken)
 * live in AuthContext.jsx because they update global user/token state.
 * These two operations are stateless (no user/token state change on frontend)
 * so they belong in the service layer, consistent with outpass.service.js,
 * complaint.service.js, payment.service.js etc.
 *
 * Why use the global api instance (lib/axios.js) here?
 * These endpoints return 200 or 400 — never 401.
 * The 401 interceptor (which redirects to /login and clears token)
 * will never trigger for these calls, so the global instance is safe.
 */
const authService = {
  /**
   * Request a password reset email.
   *
   * Backend always returns 200 with a generic message
   * regardless of whether the email is registered.
   * (Prevents user enumeration — do not change this behaviour on frontend.)
   *
   * @param {string} email - The email address to send the reset link to
   * @returns {Promise} Axios response
   */
  forgotPassword: (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  /**
   * Reset the user's password using the token from the email URL.
   *
   * @param {string} token           - Raw reset token from URL params
   * @param {string} password        - New password
   * @param {string} confirmPassword - Confirmation (must match password)
   * @returns {Promise} Axios response
   */
  resetPassword: (token, password, confirmPassword) => {
    return api.patch(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });
  },
};

export default authService;
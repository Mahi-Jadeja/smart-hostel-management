import api from '../lib/axios';

/**
 * Complaint Service
 * Handles all complaint-related API calls for both students and admins.
 */
const complaintsService = {
  // ============================================================
  // STUDENT METHODS
  // ============================================================

  /**
   * Get current student's own complaints (Student only)
   * @param {object} params - { page, limit, status }
   */
  getMine: (params = {}) => {
    return api.get('/complaints/mine', { params });
  },

  /**
   * Create a new complaint (Student only)
   * @param {object} data - { category, description }
   */
  create: (data) => {
    return api.post('/complaints', data);
  },

  /**
   * Delete a pending complaint (Student only)
   * @param {string} id - Complaint ID
   */
  delete: (id) => {
    return api.delete(`/complaints/${id}`);
  },

  // ============================================================
  // ADMIN METHODS
  // ============================================================

  /**
   * Get all complaints (Admin only)
   * @param {object} params - { status, priority, page, limit, q }
   */
  getAll: (params = {}) => {
    return api.get('/complaints', { params });
  },

  /**
   * Update complaint status and remark (Admin only)
   * @param {string} id - Complaint ID
   * @param {object} data - { status, admin_remark }
   */
  updateStatus: (id, data) => {
    return api.patch(`/complaints/${id}`, data);
  },
};

export default complaintsService;
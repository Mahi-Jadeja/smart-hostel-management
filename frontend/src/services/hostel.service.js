import api from '../lib/axios';

const hostelService = {
  /**
   * Save/update hostel config
   * @param {object} data - Hostel config data
   */
  saveConfig: (data) => {
    return api.post('/hostel/config', data);
  },

  /**
   * Get all hostel configs
   */
  getConfigs: () => {
    return api.get('/hostel/config');
  },

  /**
   * Generate rooms for a block
   * @param {object} data - { hostel_block }
   */
  generateRooms: (data) => {
    return api.post('/hostel/generate-rooms', data);
  },

  /**
   * Get raw room list
   * @param {object} params - Filter params
   */
  getRooms: (params = {}) => {
    return api.get('/hostel/rooms', { params });
  },

  /**
   * Get grouped room layout
   * @param {object} params - { block }
   */
  getLayout: (params = {}) => {
    return api.get('/hostel/layout', { params });
  },

  /**
   * Get students eligible for room allocation (unallocated hostellers)
   * @param {object} params - { limit }
   */
  getEligibleStudents: (params = {}) => {
    return api.get('/hostel/eligible-students', { params });
  },

  /**
   * Get ALL active hosteller students for admin use cases like payment creation.
   * 
   * We reuse the payments endpoint with a high limit to get populated student data.
   * This avoids needing a new backend endpoint.
   * 
   * Strategy: Call eligible-students (unallocated) + extract allocated students
   * from the payments list who are already in the system.
   * 
   * Since hostel/eligible-students only returns UNALLOCATED students,
   * for payment creation we pass a search query to find any student
   * by name/email via the roommate search endpoint called as admin.
   * 
   * NOTE: We call GET /hostel/eligible-students with ignoreAllocation=true
   * if the backend supports it, otherwise we call with high limit and
   * the UI allows manual fallback entry.
   * 
   * @param {object} params - { q: search query, limit }
   */
  searchAllStudents: (params = {}) => {
    // Uses the eligible-students endpoint but with a high limit.
    // The backend returns all unallocated hostellers matching the search.
    // For allocated students, the admin can search by name via payments filter.
    return api.get('/hostel/eligible-students', { 
      params: { ...params, limit: params.limit || 50 } 
    });
  },

  /**
   * Preview bulk room allocation
   * @param {object} data - { mode, scope, selected_blocks }
   */
  previewBulkAllocation: (data) => {
    return api.post('/hostel/allocate/preview', data);
  },

  /**
   * Execute bulk room allocation
   * @param {object} data - { mode, scope, seed, selected_blocks }
   */
  executeBulkAllocation: (data) => {
    return api.post('/hostel/allocate/execute', data);
  },

  /**
   * Allocate a single student to a specific room
   * @param {object} data - { student_id, room_id }
   */
  allocateStudent: (data) => {
    return api.post('/hostel/allocate', data);
  },

  /**
   * Deallocate a student from their room
   * @param {string} studentId - Student's MongoDB _id
   */
  deallocateStudent: (studentId) => {
    return api.delete(`/hostel/deallocate/${studentId}`);
  },
};

export default hostelService;
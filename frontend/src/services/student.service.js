import api from '../lib/axios';

const studentService = {
  /**
   * Get student profile
   * @returns {Promise} Profile data
   */
  getProfile: () => {
    return api.get('/student/profile');
  },

  /**
   * Update student profile
   * @param {object} data - Fields to update
   * @returns {Promise} Updated profile
   */
  updateProfile: (data) => {
    return api.put('/student/profile', data);
  },

  /**
   * Get current room preference (who I chose + is it mutual)
   */
  getRoomPreference: () => {
    return api.get('/student/room-preference');
  },

  /**
   * Search roommate options for current student.
   * Returns same-gender active hostellers.
   * Each result includes `has_selected_you` boolean.
   * @param {object} params - { q, limit }
   */
  searchRoommateOptions: (params = {}) => {
    return api.get('/student/roommate-options', { params });
  },

  /**
   * Update room preference (set or clear)
   * @param {object} data - { preferred_roommate_id } or { preferred_roommate_id: null }
   */
  updateRoomPreference: (data) => {
    return api.put('/student/room-preference', data);
  },

  /**
   * Get students who have chosen ME as their preferred roommate.
   *
   * Strategy: We use the roommate-options search endpoint but filter
   * by `has_selected_you`. We fetch a broad list and filter client-side
   * since there's no dedicated "who chose me" endpoint.
   *
   * Alternative: We call searchRoommateOptions with empty query and
   * filter results where has_selected_you === true.
   *
   * This works because searchRoommateOptions already computes:
   *   has_selected_you = student.room_preference.preferred_roommate === currentStudentId
   *
   * @returns {Promise} List of students who chose current student
   */
  getWhoChoseMe: () => {
    // Fetch with high limit to get all same-gender students
    // then we filter has_selected_you on the frontend
    return api.get('/student/roommate-options', {
      params: { limit: 200 },
    });
  },

  /**
   * Get room allocation info
   * @returns {Promise} Room data with roommates
   */
  getRoom: () => {
    return api.get('/student/room');
  },

  /**
   * Get dashboard statistics
   * @returns {Promise} Aggregated stats
   */
  getDashboardStats: () => {
    return api.get('/student/dashboard-stats');
  },

  /**
   * Get floor layout (Allocated students)
   */
  getRoomLayout: () => {
    return api.get('/student/room-layout');
  },

  /**
   * Get layout preview (Unallocated/Browsing)
   * @param {string} block
   * @param {number} floor
   */
  getLayoutPreview: (block, floor) => {
    return api.get('/student/layout-preview', { params: { block, floor } });
  },
};

export default studentService;
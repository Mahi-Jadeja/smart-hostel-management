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
   * Get current room preference
   */
  getRoomPreference: () => {
    return api.get('/student/room-preference');
  },

  /**
   * Search roommate options
   */
  searchRoommateOptions: (params = {}) => {
    return api.get('/student/roommate-options', { params });
  },

  /**
   * Update room preference
   */
  updateRoomPreference: (data) => {
    return api.put('/student/room-preference', data);
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

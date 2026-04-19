import api from '../lib/axios';

const hostelService = {
  /**
   * Save/update hostel config
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
   */
  generateRooms: (data) => {
    return api.post('/hostel/generate-rooms', data);
  },

  /**
   * Get raw room list
   */
  getRooms: (params = {}) => {
    return api.get('/hostel/rooms', { params });
  },

  /**
   * Get grouped room layout
   */
  getLayout: (params = {}) => {
    return api.get('/hostel/layout', { params });
  },

  /**
   * Get students eligible for room allocation
   */
  getEligibleStudents: (params = {}) => {
    return api.get('/hostel/eligible-students', { params });
  },
  /**
   * Preview bulk room allocation
   */
  previewBulkAllocation: (data) => {
    return api.post('/hostel/allocate/preview', data);
  },

  /**
   * Execute bulk room allocation
   */
  executeBulkAllocation: (data) => {
    return api.post('/hostel/allocate/execute', data);
  },
  /**
   * Allocate student to room
   */
  allocateStudent: (data) => {
    return api.post('/hostel/allocate', data);
  },

  /**
   * Deallocate student from room
   */
  deallocateStudent: (studentId) => {
    return api.delete(`/hostel/deallocate/${studentId}`);
  },
};

export default hostelService;
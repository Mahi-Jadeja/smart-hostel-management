import api from '../lib/axios';

const outpassService = {
  /**
   * Create new outpass request
   * @param {object} data
   */
  create: (data) => {
    return api.post('/outpass', data);
  },

  /**
   * Get current student's outpass history
   * @param {object} params
   */
  getMine: (params = {}) => {
    return api.get('/outpass/mine', { params });
  },

  /**
   * Get all outpasses (admin)
   * @param {object} params
   */
  getAll: (params = {}) => {
    return api.get('/outpass', { params });
  },

  /**
   * Get outpass by id
   * @param {string} id
   */
  getById: (id) => {
    return api.get(`/outpass/${id}`);
  },

  /**
   * Decide outpass (admin)
   * @param {string} id
   * @param {object} data
   */
  decide: (id, data) => {
    return api.patch(`/outpass/${id}/decision`, data);
  },
};

export default outpassService;
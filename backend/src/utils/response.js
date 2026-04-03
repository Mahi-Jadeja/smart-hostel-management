/**
 * Send a successful response
 *
 * Every successful response from our API will look like:
 * {
 *   success: true,
 *   message: "Some message",
 *   data: { ... }  (optional)
 * }
 *
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (200, 201, etc.)
 * @param {string} message - Human-readable message
 * @param {object} data - The actual data to send (optional)
 */
export const sendSuccess = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
  };

  // Only include 'data' key if data was provided
  // This keeps responses clean — no "data: null" when not needed
  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 *
 * Every error response from our API will look like:
 * {
 *   success: false,
 *   message: "What went wrong",
 *   ...(additional error details in development)
 * }
 *
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (400, 401, 404, 500)
 * @param {string} message - Human-readable error message
 */
export const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
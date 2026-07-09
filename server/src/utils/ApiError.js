/**
 * Custom error class for application-level errors.
 *
 * Services throw ApiError; the centralized errorHandler middleware
 * reads statusCode and message to construct the HTTP response.
 *
 * Usage:
 *   throw new ApiError(404, 'Complaint not found');
 *   throw new ApiError(403, 'Insufficient permissions');
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

module.exports = ApiError;

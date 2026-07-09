const { CATEGORY, PRIORITY } = require('../utils/constants');

const VALID_CATEGORIES = Object.values(CATEGORY);
const VALID_PRIORITIES = Object.values(PRIORITY);

/**
 * Validates the create complaint request body.
 * Note: photo validation is handled by Multer (MIME type and file size).
 *
 * @param {object} data
 * @returns {string[]} Array of error messages. Empty means valid.
 */
function validateCreateComplaint(data) {
  const errors = [];

  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }

  if (data.title && data.title.trim().length > 100) {
    errors.push('Title must not exceed 100 characters');
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (!data.priority || !VALID_PRIORITIES.includes(data.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  return errors;
}

/**
 * Validates the update complaint status request body.
 * Transition validity is enforced in complaint.service.js using ALLOWED_STATUS_TRANSITIONS.
 *
 * @param {object} data
 * @returns {string[]} Array of error messages. Empty means valid.
 */
function validateUpdateStatus(data) {
  const errors = [];

  const { STATUS } = require('../utils/constants');
  const VALID_STATUSES = Object.values(STATUS);

  if (!data.status || !VALID_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

module.exports = { validateCreateComplaint, validateUpdateStatus };

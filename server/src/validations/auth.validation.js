const { ROLES } = require('../utils/constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = Object.values(ROLES);

/**
 * Validates the registration request body.
 *
 * @param {object} data
 * @returns {string[]} Array of error messages. Empty means valid.
 */
function validateRegister(data) {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!data.email || !EMAIL_REGEX.test(data.email)) {
    errors.push('A valid email address is required');
  }

  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (data.role && data.role !== ROLES.RESIDENT) {
    errors.push('Registration should never allow selecting ADMIN');
  }

  if (!data.flatNumber || data.flatNumber.trim().length === 0) {
    errors.push('Flat number is required');
  }

  return errors;
}

/**
 * Validates the login request body.
 *
 * @param {object} data
 * @returns {string[]} Array of error messages. Empty means valid.
 */
function validateLogin(data) {
  const errors = [];

  if (!data.email || !EMAIL_REGEX.test(data.email)) {
    errors.push('A valid email address is required');
  }

  if (!data.password || data.password.length === 0) {
    errors.push('Password is required');
  }

  return errors;
}

module.exports = { validateRegister, validateLogin };

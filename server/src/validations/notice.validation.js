/**
 * Validates the create/update notice request body.
 *
 * @param {object} data
 * @returns {string[]} Array of error messages. Empty means valid.
 */
function validateNotice(data) {
  const errors = [];

  if (!data.title || data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }

  if (data.title && data.title.trim().length > 150) {
    errors.push('Title must not exceed 150 characters');
  }

  if (!data.content || data.content.trim().length < 10) {
    errors.push('Content must be at least 10 characters');
  }

  return errors;
}

module.exports = { validateNotice };

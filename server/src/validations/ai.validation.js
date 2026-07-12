/**
 * Validates the POST /api/ai/analyze-complaint request body.
 *
 * @param {object} data - req.body
 * @returns {string[]} Array of error messages. Empty array means valid.
 */
function validateAnalyzeComplaint(data) {
  const errors = [];

  if (!data.complaint || typeof data.complaint !== 'string') {
    errors.push('complaint field is required and must be a string');
    return errors; // early return — no point in further checks
  }

  const trimmed = data.complaint.trim();

  if (trimmed.length < 20) {
    errors.push('Complaint must be at least 20 characters for AI analysis');
  }

  if (trimmed.length > 5000) {
    errors.push('Complaint must not exceed 5000 characters');
  }

  return errors;
}

/**
 * Validates the POST /api/ai/detect-duplicates request body.
 *
 * Uses a lower minimum (10 chars) because we combine title + description
 * and partial text is still useful for duplicate detection.
 *
 * @param {object} data - req.body
 * @returns {string[]} Array of error messages.
 */
function validateDetectDuplicates(data) {
  const errors = [];

  if (!data.complaint || typeof data.complaint !== 'string') {
    errors.push('complaint field is required and must be a string');
    return errors;
  }

  const trimmed = data.complaint.trim();

  if (trimmed.length < 10) {
    errors.push('Complaint must be at least 10 characters');
  }

  if (trimmed.length > 5000) {
    errors.push('Complaint must not exceed 5000 characters');
  }

  return errors;
}

module.exports = { validateAnalyzeComplaint, validateDetectDuplicates };

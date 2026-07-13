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

/**
 * Validates the POST /api/ai/parse-search request body.
 */
function validateParseSearch(data) {
  const errors = [];
  if (!data.query || typeof data.query !== 'string') {
    errors.push('query field is required and must be a string');
    return errors;
  }
  const trimmed = data.query.trim();
  if (trimmed.length < 3) {
    errors.push('Query must be at least 3 characters');
  }
  if (trimmed.length > 500) {
    errors.push('Query must not exceed 500 characters');
  }
  return errors;
}

/**
 * Validates the POST /api/ai/generate-text request body.
 */
function validateGenerateText(data) {
  const errors = [];
  if (!data.type || !['NOTICE', 'RESOLUTION'].includes(data.type)) {
    errors.push('type field must be either NOTICE or RESOLUTION');
  }
  if (!data.instruction || typeof data.instruction !== 'string') {
    errors.push('instruction field is required and must be a string');
  } else {
    const trimmed = data.instruction.trim();
    if (trimmed.length < 3) {
      errors.push('Instruction must be at least 3 characters');
    }
    if (trimmed.length > 1000) {
      errors.push('Instruction must not exceed 1000 characters');
    }
  }
  return errors;
}

module.exports = {
  validateAnalyzeComplaint,
  validateDetectDuplicates,
  validateParseSearch,
  validateGenerateText,
};

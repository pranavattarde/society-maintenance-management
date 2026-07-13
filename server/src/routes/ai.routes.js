/**
 * ai.routes.js — Routes for the AI complaint analysis feature.
 *
 * All routes require authentication (residents and admins).
 * Residents use this to get AI-powered suggestions while composing complaints.
 */

const { Router } = require('express');
const {
  analyzeComplaintHandler,
  detectDuplicatesHandler,
  parseSearchHandler,
  getOperationsInsightsHandler,
  generateTextHandler,
} = require('../controllers/ai.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  validateAnalyzeComplaint,
  validateDetectDuplicates,
  validateParseSearch,
  validateGenerateText,
} = require('../validations/ai.validation');

const router = Router();

// All AI routes require a valid JWT
router.use(authenticate);

/**
 * POST /api/ai/analyze-complaint
 */
router.post('/analyze-complaint', validate(validateAnalyzeComplaint), analyzeComplaintHandler);

/**
 * POST /api/ai/detect-duplicates
 */
router.post('/detect-duplicates', validate(validateDetectDuplicates), detectDuplicatesHandler);

/**
 * POST /api/ai/parse-search
 * Auth: Admin only
 */
router.post('/parse-search', authorize('ADMIN'), validate(validateParseSearch), parseSearchHandler);

/**
 * GET /api/ai/operations-insights
 * Auth: Admin only
 */
router.get('/operations-insights', authorize('ADMIN'), getOperationsInsightsHandler);

/**
 * POST /api/ai/generate-text
 * Auth: Admin only
 */
router.post('/generate-text', authorize('ADMIN'), validate(validateGenerateText), generateTextHandler);

module.exports = router;

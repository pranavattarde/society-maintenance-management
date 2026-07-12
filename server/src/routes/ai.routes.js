/**
 * ai.routes.js — Routes for the AI complaint analysis feature.
 *
 * All routes require authentication (residents and admins).
 * Residents use this to get AI-powered suggestions while composing complaints.
 */

const { Router } = require('express');
const { analyzeComplaintHandler } = require('../controllers/ai.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { validateAnalyzeComplaint } = require('../validations/ai.validation');

const router = Router();

// All AI routes require a valid JWT
router.use(authenticate);

/**
 * POST /api/ai/analyze-complaint
 *
 * Body: { complaint: string }
 * Returns: { success: true, data: { title, category, priority, summary, reasoning, confidence } }
 */
router.post('/analyze-complaint', validate(validateAnalyzeComplaint), analyzeComplaintHandler);

module.exports = router;

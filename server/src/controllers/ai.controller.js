/**
 * ai.controller.js — HTTP handler for the AI complaint analysis endpoint.
 *
 * POST /api/ai/analyze-complaint
 * Auth: Required (any authenticated user, resident or admin)
 *
 * Body: { complaint: string }
 * Response: { title, category, priority, summary, reasoning, confidence }
 */

const { analyzeComplaint, detectDuplicates } = require('../services/ai.service');
const ApiError = require('../utils/ApiError');

/**
 * Analyses a free-text complaint and returns structured AI suggestions.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function analyzeComplaintHandler(req, res, next) {
  try {
    const { complaint } = req.body;

    // Basic input guard (route-level validation also runs before this)
    if (!complaint || typeof complaint !== 'string') {
      throw new ApiError(400, 'complaint field is required and must be a string.');
    }

    const trimmed = complaint.trim();
    if (trimmed.length < 20) {
      throw new ApiError(400, 'Complaint text must be at least 20 characters for meaningful analysis.');
    }
    if (trimmed.length > 5000) {
      throw new ApiError(400, 'Complaint text must not exceed 5000 characters.');
    }

    const result = await analyzeComplaint(trimmed);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Detects potential duplicate complaints before submission.
 *
 * POST /api/ai/detect-duplicates
 * Body: { complaint: string }
 * Returns: { success: true, data: [{complaintId, title, category, status, createdAt, similarity, reason}] }
 */
async function detectDuplicatesHandler(req, res, next) {
  try {
    const { complaint } = req.body;

    if (!complaint || typeof complaint !== 'string') {
      throw new ApiError(400, 'complaint field is required and must be a string.');
    }

    const trimmed = complaint.trim();
    if (trimmed.length < 10) {
      throw new ApiError(400, 'Complaint text must be at least 10 characters.');
    }

    const matches = await detectDuplicates(trimmed);

    res.status(200).json({
      success: true,
      data: matches,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeComplaintHandler, detectDuplicatesHandler };

const { getDashboardStats } = require('../services/dashboard.service');

/**
 * Dashboard Controller
 *
 * Returns role-scoped statistics via a single endpoint.
 * The service determines the response shape based on req.user.role:
 *
 *   RESIDENT — { role, totalComplaints, byStatus }
 *   ADMIN    — { role, totalComplaints, byStatus, byCategory, overdueCount }
 */
async function getDashboard(req, res, next) {
  try {
    const stats = await getDashboardStats(req.user);
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };

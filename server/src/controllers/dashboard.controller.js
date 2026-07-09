const { ROLES } = require('../utils/constants');

/**
 * Dashboard Controller — Phase 4 stub.
 *
 * Returns role-scoped statistics. The response shape differs by role:
 *   RESIDENT — byStatus counts + overdueCount (scoped to their complaints)
 *   ADMIN    — byStatus + byCategory counts + overdueCount (all complaints)
 *
 * Implemented in Phase 4 — Remaining Features.
 */

async function getDashboard(req, res, next) {
  try {
    res.status(501).json({ message: 'Not implemented' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };

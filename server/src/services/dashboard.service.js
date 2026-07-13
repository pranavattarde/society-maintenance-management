const prisma = require('../config/db');
const { ROLES, STATUS, OVERDUE_THRESHOLD_DAYS } = require('../utils/constants');

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Converts a Prisma groupBy result into a flat {STATUS: count} object.
 * All three Status enum values are always present, defaulting to 0.
 *
 * @param {Array} rows - Prisma groupBy result
 * @returns {{ OPEN: number, IN_PROGRESS: number, RESOLVED: number }}
 */
function toStatusMap(rows) {
  const map = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
  for (const row of rows) map[row.status] = row._count.status;
  return map;
}

/**
 * Converts a Prisma groupBy result into a flat {CATEGORY: count} object.
 * All seven Category enum values are always present, defaulting to 0.
 *
 * @param {Array} rows - Prisma groupBy result
 * @returns {object}
 */
function toCategoryMap(rows) {
  const map = {
    PLUMBING: 0, ELECTRICAL: 0, CLEANING: 0,
    SECURITY: 0, LIFT: 0, PARKING: 0, OTHER: 0,
  };
  for (const row of rows) map[row.category] = row._count.category;
  return map;
}

// ─── Resident Stats ───────────────────────────────────────────────────────────

/**
 * Returns complaint statistics scoped to a single resident.
 *
 * All three queries run in parallel via Promise.all.
 *
 * @param {string} userId
 * @returns {{ role, totalComplaints, byStatus, byCategory }}
 */
async function getResidentStats(userId) {
  const where = { residentId: userId };

  const [statusRows, categoryRows, total] = await Promise.all([
    prisma.complaint.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
    prisma.complaint.groupBy({
      by: ['category'],
      where,
      _count: { category: true },
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    role:            ROLES.RESIDENT,
    totalComplaints: total,
    byStatus:        toStatusMap(statusRows),
    byCategory:      toCategoryMap(categoryRows),
  };
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

/**
 * Returns society-wide complaint statistics for admin.
 *
 * Overdue = unresolved complaints created more than OVERDUE_THRESHOLD_DAYS ago.
 * All four queries run in parallel via Promise.all.
 *
 * @returns {{ role, totalComplaints, byStatus, byCategory, overdueCount }}
 */
async function getAdminStats() {
  const overdueThreshold = new Date(
    Date.now() - OVERDUE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  );

  const [statusRows, categoryRows, total, overdueCount] = await Promise.all([
    prisma.complaint.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.complaint.groupBy({
      by: ['category'],
      _count: { category: true },
    }),
    prisma.complaint.count(),
    prisma.complaint.count({
      where: {
        status:    { not: STATUS.RESOLVED },
        createdAt: { lt: overdueThreshold },
      },
    }),
  ]);

  return {
    role:            ROLES.ADMIN,
    totalComplaints: total,
    byStatus:        toStatusMap(statusRows),
    byCategory:      toCategoryMap(categoryRows),
    overdueCount,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns role-scoped dashboard statistics.
 *
 * @param {{ id: string, role: string }} user - From authenticate middleware
 * @returns {object}
 */
async function getDashboardStats(user) {
  if (user.role === ROLES.RESIDENT) return getResidentStats(user.id);
  return getAdminStats();
}

module.exports = { getDashboardStats };

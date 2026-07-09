/**
 * Complaint Service
 *
 * Handles all complaint business logic:
 * - Create complaint (with optional Cloudinary photo upload)
 * - List complaints (role-scoped, filterable by status/category/priority)
 * - Get complaint by ID with history
 * - Update status (validate transition, append history, trigger email)
 * - Overdue count (computed via configurable threshold — no scheduler)
 *
 * Implemented in Phase 3 — Complaint Management.
 */

async function createComplaint(data, residentId, file) {
  throw new Error('Not implemented');
}

async function listComplaints(filters, user) {
  throw new Error('Not implemented');
}

async function getComplaintById(id, user) {
  throw new Error('Not implemented');
}

async function updateComplaintStatus(id, data, admin) {
  throw new Error('Not implemented');
}

async function getOverdueCount(residentId) {
  throw new Error('Not implemented');
}

module.exports = {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaintStatus,
  getOverdueCount,
};

const {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaintStatus,
} = require('../services/complaint.service');

/**
 * Complaint Controller — Phase 3 stub.
 *
 * Implemented in Phase 3 — Complaint Management.
 */

async function create(req, res, next) {
  try {
    const complaint = await createComplaint(req.body, req.user.id, req.file);
    res.status(201).json({ message: 'Complaint submitted successfully', complaint });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const complaints = await listComplaints(req.query, req.user);
    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const complaint = await getComplaintById(req.params.id, req.user);
    res.status(200).json({ complaint });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const complaint = await updateComplaintStatus(req.params.id, req.body, req.user);
    res.status(200).json({ message: 'Status updated successfully', complaint });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, updateStatus };

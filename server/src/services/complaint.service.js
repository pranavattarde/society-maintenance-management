const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const { ROLES, STATUS, CATEGORY } = require('../utils/constants');

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Uploads a file buffer to Cloudinary using a writable stream.
 *
 * Files arrive via Multer memory storage as a Buffer — no disk write occurs.
 * Node's Readable.from() wraps the buffer into a stream that is piped
 * directly into Cloudinary's upload_stream.
 *
 * @param {Buffer} buffer - The file buffer from req.file.buffer
 * @returns {Promise<string>} Cloudinary secure_url
 */
async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'society-maintenance/complaints', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Creates a new complaint for a resident.
 *
 * Steps:
 *   1. If a photo file was attached, stream it to Cloudinary and obtain the URL
 *   2. Insert the complaint record into the database
 *   3. Return the created complaint (password-safe Prisma select)
 *
 * Photo upload is optional. If `file` is undefined (no photo selected),
 * the `photoUrl` column is stored as null.
 *
 * @param {object}     data       - Validated form fields (title, description, category, priority)
 * @param {string}     residentId - Authenticated user's ID from req.user.id
 * @param {object}     [file]     - Multer file object (req.file), may be undefined
 * @returns {object}   Created complaint record
 */
async function createComplaint(data, residentId, file) {
  const { title, description, category, priority } = data;

  let photoUrl = null;
  if (file) {
    photoUrl = await uploadToCloudinary(file.buffer);
  }

  const complaint = await prisma.complaint.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      residentId,
      photoUrl,
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      photoUrl: true,
      createdAt: true,
      resident: {
        select: { name: true, flatNumber: true },
      },
    },
  });

  return complaint;
}

/**
 * Lists complaints with optional filters.
 *
 * Role scoping:
 *   - RESIDENT: only their own complaints (WHERE residentId = user.id)
 *   - ADMIN:    all complaints
 *
 * Supported filters (all optional, invalid values are silently ignored):
 *   - status   {string}  — exact match against STATUS enum
 *   - category {string}  — exact match against CATEGORY enum
 *   - date     {string}  — ISO date string; returns complaints created on or
 *                          after midnight UTC of that day (admin only)
 *
 * Results are ordered newest-first.
 *
 * @param {object} filters - Parsed query params from req.query
 * @param {{ id: string, role: string }} user - From authenticate middleware
 * @returns {object[]}
 */
async function listComplaints(filters, user) {
  const { status, category, date } = filters;

  const where = {};

  // Residents see only their own complaints
  if (user.role === ROLES.RESIDENT) {
    where.residentId = user.id;
  }

  // Validate filter values against known enums — silently ignore unknown values
  if (status && Object.values(STATUS).includes(status)) {
    where.status = status;
  }
  if (category && Object.values(CATEGORY).includes(category)) {
    where.category = category;
  }
  // Date filter: show complaints created on or after midnight of the given date
  if (date) {
    const since = new Date(date);
    if (!isNaN(since.getTime())) {
      where.createdAt = { gte: since };
    }
  }

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      createdAt: true,
      resident: { select: { name: true, flatNumber: true } },
    },
  });

  return complaints;
}

/**
 * Returns a single complaint by ID.
 *
 * Access control:
 *   - ADMIN:    can view any complaint
 *   - RESIDENT: can view only their own (403 otherwise)
 *
 * History is intentionally excluded in this phase.
 * It will be added in Phase 6 — Admin Functionality.
 *
 * @param {string} id
 * @param {{ id: string, role: string }} user
 * @returns {object}
 * @throws {ApiError} 404 — not found | 403 — access denied
 */
async function getComplaintById(id, user) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      photoUrl: true,
      createdAt: true,
      updatedAt: true,
      resident: { select: { id: true, name: true, flatNumber: true } },
    },
  });

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  // Residents cannot access another resident's complaint via a guessed URL
  if (user.role === ROLES.RESIDENT && complaint.resident.id !== user.id) {
    throw new ApiError(403, 'You do not have permission to view this complaint');
  }

  return complaint;
}

/**
 * Updates a complaint's status and appends an audit history record.
 * Implemented in Phase 6 — Admin Functionality.
 */
async function updateComplaintStatus(id, data, admin) {
  throw new Error('Not implemented');
}

/**
 * Returns the count of unresolved complaints older than OVERDUE_THRESHOLD_DAYS.
 * Applied at query time — no scheduler required.
 * Implemented in Phase 7 — Dashboard.
 */
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

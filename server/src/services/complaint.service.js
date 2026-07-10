const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const prisma = require('../config/db');

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
 * Lists complaints — role-scoped and filterable.
 * Implemented in Phase 5 — Complaint Listing.
 */
async function listComplaints(filters, user) {
  throw new Error('Not implemented');
}

/**
 * Returns a single complaint with its full status history.
 * Implemented in Phase 5 — Complaint Listing.
 */
async function getComplaintById(id, user) {
  throw new Error('Not implemented');
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

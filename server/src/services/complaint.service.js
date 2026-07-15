const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const { ROLES, STATUS, CATEGORY, PRIORITY, ALLOWED_STATUS_TRANSITIONS, OVERDUE_THRESHOLD_DAYS } = require('../utils/constants');
const { sendStatusUpdateEmail } = require('./email.service');



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
      isOverdue: true,
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
 *   - status   {string}  — exact match against STATUS enum or 'UNRESOLVED'
 *   - category {string}  — exact match against CATEGORY enum
 *   - priority {string}  — exact match against PRIORITY enum
 *   - search   {string}  — text matching title, description, flat, name
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
  const { status, category, priority, search, date } = filters;

  const where = {};

  // Residents see only their own complaints
  if (user.role === ROLES.RESIDENT) {
    where.residentId = user.id;
  }

  // Validate and apply status filter
  if (status) {
    if (status === 'UNRESOLVED') {
      where.status = { in: [STATUS.OPEN, STATUS.IN_PROGRESS] };
    } else if (Object.values(STATUS).includes(status)) {
      where.status = status;
    }
  }

  // Validate and apply category filter
  if (category && Object.values(CATEGORY).includes(category)) {
    where.category = category;
  }

  // Validate and apply priority filter
  if (priority && Object.values(PRIORITY).includes(priority)) {
    where.priority = priority;
  }

  // Apply search keyword filter
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { resident: { flatNumber: { contains: term, mode: 'insensitive' } } },
      { resident: { name: { contains: term, mode: 'insensitive' } } },
    ];
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
      isOverdue: true,
      createdAt: true,
      resident: { select: { name: true, flatNumber: true } },
    },
  });

  return complaints;
}

/**
 * Returns a single complaint by ID, including the full status history.
 *
 * Access control:
 *   - ADMIN:    can view any complaint
 *   - RESIDENT: can view only their own (403 otherwise)
 *
 * History is ordered oldest-first so the timeline renders chronologically.
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
      isOverdue: true,
      photoUrl: true,
      createdAt: true,
      updatedAt: true,
      resident: { select: { id: true, name: true, flatNumber: true } },
      history: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          remark: true,
          createdAt: true,
          changedBy: { select: { name: true } },
        },
      },
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
 * Updates a complaint's status and creates an immutable audit history record.
 *
 * Transition rules are enforced using ALLOWED_STATUS_TRANSITIONS:
 *   OPEN       -> IN_PROGRESS | RESOLVED
 *   IN_PROGRESS-> RESOLVED
 *   RESOLVED   -> (terminal — no further transitions)
 *
 * The update and history insert are wrapped in an interactive transaction so
 * that a partial failure leaves no inconsistent state.
 *
 * After the transaction, the full complaint (including the new history entry)
 * is fetched and returned so the controller can respond with the latest state.
 *
 * @param {string} id
 * @param {{ status: string, remark?: string }} data - Validated request body
 * @param {{ id: string, role: string }} admin - From authenticate middleware
 * @returns {object} Updated complaint with full history
 * @throws {ApiError} 404 — not found | 400 — invalid transition
 */
async function updateComplaintStatus(id, data, admin) {
  const { status: newStatus, remark } = data;

  // Load current status + resident contact details for email notification
  const existing = await prisma.complaint.findUnique({
    where: { id },
    select: {
      status: true,
      title: true,
      resident: { select: { name: true, email: true } },
    },
  });

  if (!existing) {
    throw new ApiError(404, 'Complaint not found');
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      400,
      `Status cannot transition from ${existing.status} to ${newStatus}`
    );
  }

  // Atomically update the complaint and append the history record
  await prisma.$transaction(async (tx) => {
    const updateData = { status: newStatus };
    if (newStatus === STATUS.RESOLVED) {
      updateData.isOverdue = false;
    }
    await tx.complaint.update({
      where: { id },
      data: updateData,
    });

    await tx.complaintHistory.create({
      data: {
        complaintId: id,
        changedById: admin.id,
        fromStatus: existing.status,
        toStatus: newStatus,
        remark: remark?.trim() || null,
      },
    });
  });

  // Fire-and-forget: notify the resident that their complaint status changed.
  // Not awaited — email failure does not block or delay the API response.
  sendStatusUpdateEmail(
    existing.resident,
    { id, title: existing.title },
    newStatus,
    remark?.trim() || null
  ).catch((err) => {
    console.error('[email] Status update notification failed:', err.message);
  });

  // Return the full complaint with updated history for the API response
  return getComplaintById(id, admin);
}

async function getOverdueCount(residentId) {
  const where = {
    isOverdue: true,
  };

  if (residentId) {
    where.residentId = residentId;
  }

  return prisma.complaint.count({ where });
}

module.exports = {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaintStatus,
  getOverdueCount,
};

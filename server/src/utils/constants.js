/**
 * Application-wide constants.
 *
 * These are the single source of truth for enum values and business rules.
 * Both the server source and Prisma schema derive from the same values.
 */

const ROLES = Object.freeze({
  RESIDENT: 'RESIDENT',
  ADMIN: 'ADMIN',
});

const STATUS = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
});

const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

const CATEGORY = Object.freeze({
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  CLEANING: 'CLEANING',
  SECURITY: 'SECURITY',
  LIFT: 'LIFT',
  PARKING: 'PARKING',
  OTHER: 'OTHER',
});

/**
 * Valid forward transitions for complaint status.
 * RESOLVED is the terminal state — no further transitions are permitted.
 */
const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  [STATUS.OPEN]: [STATUS.IN_PROGRESS, STATUS.RESOLVED],
  [STATUS.IN_PROGRESS]: [STATUS.RESOLVED],
  [STATUS.RESOLVED]: [],
});

const OVERDUE_THRESHOLD_DAYS = parseInt(process.env.OVERDUE_THRESHOLD_DAYS, 10) || 7;

const BCRYPT_SALT_ROUNDS = 12;

const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

module.exports = {
  ROLES,
  STATUS,
  PRIORITY,
  CATEGORY,
  ALLOWED_STATUS_TRANSITIONS,
  OVERDUE_THRESHOLD_DAYS,
  BCRYPT_SALT_ROUNDS,
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
};

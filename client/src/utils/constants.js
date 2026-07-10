/**
 * Frontend constants — mirrors the backend enum values exactly.
 * Labels are used for display throughout the UI.
 */

export const ROLES = Object.freeze({
  RESIDENT: 'RESIDENT',
  ADMIN: 'ADMIN',
});

export const STATUS = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
});

export const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

export const CATEGORY = Object.freeze({
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  CLEANING: 'CLEANING',
  SECURITY: 'SECURITY',
  LIFT: 'LIFT',
  PARKING: 'PARKING',
  OTHER: 'OTHER',
});

export const STATUS_LABELS = Object.freeze({
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
});

export const PRIORITY_LABELS = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
});

export const CATEGORY_LABELS = Object.freeze({
  PLUMBING:   'Plumbing',
  ELECTRICAL: 'Electrical',
  CLEANING:   'Cleaning',
  SECURITY:   'Security',
  LIFT:       'Lift / Elevator',
  PARKING:    'Parking',
  OTHER:      'Other',
});

/**
 * Valid forward transitions for complaint status.
 * RESOLVED is terminal — no further transitions are allowed.
 * Mirrors server/src/utils/constants.js exactly.
 */
export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  OPEN:        ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    [],
});

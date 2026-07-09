/**
 * Shared utility helpers for formatting and display logic.
 */

/**
 * Formats a date string as a readable date (e.g. "09 Jul 2026").
 *
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date string as a readable date and time (e.g. "09 Jul 2026, 08:30 PM").
 *
 * @param {string} dateString
 * @returns {string}
 */
export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns the CSS class name for a complaint status badge.
 *
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  const map = {
    OPEN: 'badge-open',
    IN_PROGRESS: 'badge-in-progress',
    RESOLVED: 'badge-resolved',
  };
  return map[status] || '';
}

/**
 * Returns the CSS class name for a priority badge.
 *
 * @param {string} priority
 * @returns {string}
 */
export function getPriorityBadgeClass(priority) {
  const map = {
    LOW: 'badge-low',
    MEDIUM: 'badge-medium',
    HIGH: 'badge-high',
  };
  return map[priority] || '';
}

/**
 * Truncates a string to the specified length and appends an ellipsis.
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Email Service
 *
 * Handles all outgoing transactional emails via Resend.
 *
 * Triggered in exactly two places:
 *   1. complaint.service.updateComplaintStatus → sendStatusUpdateEmail
 *   2. notice.service.createNotice            → sendNoticeEmail
 *
 * Implemented in Phase 4 — Remaining Features.
 */

/**
 * Sends a status update notification to the complaint's resident.
 *
 * @param {object} resident  - { name, email }
 * @param {object} complaint - { id, title }
 * @param {string} newStatus - The updated status value
 * @param {string} remark    - Optional admin remark
 */
async function sendStatusUpdateEmail(resident, complaint, newStatus, remark) {
  throw new Error('Not implemented');
}

/**
 * Sends a new notice notification to all residents.
 *
 * @param {object[]} residents - Array of { name, email }
 * @param {object}   notice    - { title, content }
 */
async function sendNoticeEmail(residents, notice) {
  throw new Error('Not implemented');
}

module.exports = { sendStatusUpdateEmail, sendNoticeEmail };

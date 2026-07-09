const { Resend } = require('resend');

/**
 * Resend email client — configured once at startup.
 *
 * Used exclusively by email.service.js for:
 *   - Complaint status update notifications (to resident)
 *   - New notice notifications (to all residents)
 */
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;

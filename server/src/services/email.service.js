/**
 * Email Service — Resend integration.
 *
 * Triggered in exactly two places, both fire-and-forget:
 *   1. complaint.service.updateComplaintStatus → sendStatusUpdateEmail
 *   2. notice.service.togglePin (pin only)    → sendNoticeEmail
 *
 * If RESEND_API_KEY is absent (local dev without email configured),
 * each function logs a warning and returns early — no error is thrown.
 *
 * If Resend returns an error, the caller's .catch() logs it.
 * The API response is never blocked by email failures.
 */

const { Resend } = require('resend');

// Initialized at module load; network calls only happen on .emails.send()
const resend     = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM       = process.env.FROM_EMAIL  || 'noreply@society.local';
const CLIENT_URL = process.env.CLIENT_URL  || 'http://localhost:5173';

const STATUS_LABELS = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Escapes a string for safe HTML insertion.
 * Applied to all user-controlled content inside HTML templates.
 *
 * @param {*} str
 * @returns {string}
 */
function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── HTML Templates ───────────────────────────────────────────────────────────

/**
 * Builds the HTML body for a complaint status update email.
 * Uses inline styles for maximum email client compatibility.
 */
function statusUpdateHtml(resident, complaint, newStatus, remark) {
  const remarkBlock = remark
    ? `<p style="background:#f9fafb;border-left:4px solid #4f46e5;padding:12px 16px;
                 border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
         <strong>Admin note:</strong> ${escape(remark)}
       </p>`
    : '';

  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="color:#1f2937;border-bottom:2px solid #4f46e5;padding-bottom:8px;margin-top:0;">
    Complaint Status Updated
  </h2>
  <p>Hello <strong>${escape(resident.name)}</strong>,</p>
  <p>Your complaint "<strong>${escape(complaint.title)}</strong>" has been updated to
     <strong style="color:#4f46e5;">${escape(STATUS_LABELS[newStatus] || newStatus)}</strong>.</p>
  ${remarkBlock}
  <p style="margin-top:24px;">
    <a href="${CLIENT_URL}/complaints/${escape(complaint.id)}"
       style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;
              border-radius:6px;text-decoration:none;font-weight:500;">
      View Complaint &rarr;
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;">
    This is an automated notification from Society Maintenance Tracker.
  </p>
</div>`;
}

/**
 * Builds the HTML body for a pinned notice email.
 * `white-space:pre-wrap` preserves admin-authored line breaks.
 */
function noticeHtml(notice) {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
  <p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:8px 12px;
             margin:0 0 20px;border-radius:0 4px 4px 0;font-weight:600;">
    &#128205; Important Notice
  </p>
  <h2 style="color:#1f2937;margin:0 0 16px;">${escape(notice.title)}</h2>
  <div style="color:#374151;line-height:1.7;white-space:pre-wrap;">${escape(notice.content)}</div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#6b7280;font-size:13px;">
    &mdash; Society Management<br>
    This is an automated notification from Society Maintenance Tracker.
  </p>
</div>`;
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Sends a status update notification to the complaint's resident.
 *
 * Called from complaint.service.updateComplaintStatus as fire-and-forget.
 * Callers must attach a .catch() to suppress unhandled rejection warnings.
 *
 * @param {{ name: string, email: string }} resident
 * @param {{ id: string, title: string }}  complaint
 * @param {string}  newStatus - One of STATUS enum values
 * @param {string|null} remark - Optional admin remark
 */
async function sendStatusUpdateEmail(resident, complaint, newStatus, remark) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — status update email skipped');
    return;
  }

  await resend.emails.send({
    from:    FROM,
    to:      resident.email,
    subject: `Update on your complaint: ${complaint.title}`,
    html:    statusUpdateHtml(resident, complaint, newStatus, remark),
  });
}

/**
 * Sends an important notice notification to all residents.
 *
 * Uses Promise.allSettled so partial failures are logged without throwing.
 * Each resident receives an individual email (addresses are not exposed to others).
 *
 * Called from notice.service.togglePin (pin only) as fire-and-forget.
 * Callers must attach a .catch() to suppress unhandled rejection warnings.
 *
 * @param {{ name: string, email: string }[]} residents
 * @param {{ title: string, content: string }} notice
 */
async function sendNoticeEmail(residents, notice) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — notice email skipped');
    return;
  }

  if (residents.length === 0) return;

  const html = noticeHtml(notice);

  const results = await Promise.allSettled(
    residents.map((resident) =>
      resend.emails.send({
        from:    FROM,
        to:      resident.email,
        subject: `📌 Important Notice: ${notice.title}`,
        html,
      })
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(
      `[email] ${failed.length}/${residents.length} notice emails failed to send`
    );
  }
}

module.exports = { sendStatusUpdateEmail, sendNoticeEmail };

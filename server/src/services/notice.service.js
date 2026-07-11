const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');
const { sendNoticeEmail } = require('./email.service');

// ─── Shared Select Shape ──────────────────────────────────────────────────────
// Single source for the fields returned by every notice query.

const NOTICE_SELECT = {
  id:        true,
  title:     true,
  content:   true,
  isPinned:  true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Throws a 404 ApiError if no notice with the given ID exists.
 *
 * @param {string} id
 */
async function assertExists(id) {
  const exists = await prisma.notice.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, 'Notice not found');
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Creates a new notice. isPinned defaults to false (schema default).
 *
 * @param {{ title: string, content: string }} data - Validated request body
 * @param {string} authorId - Admin user ID from req.user.id
 * @returns {object} Created notice
 */
async function createNotice(data, authorId) {
  const { title, content } = data;

  return prisma.notice.create({
    data: {
      title:    title.trim(),
      content:  content.trim(),
      authorId,
    },
    select: NOTICE_SELECT,
  });
}

/**
 * Returns all notices ordered by:
 *   1. isPinned DESC — pinned notices always appear first
 *   2. createdAt DESC — newest first within each group
 *
 * @returns {object[]}
 */
async function listNotices() {
  return prisma.notice.findMany({
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
    select: NOTICE_SELECT,
  });
}

/**
 * Updates the title and content of an existing notice.
 * Throws 404 if the notice does not exist.
 *
 * @param {string} id
 * @param {{ title: string, content: string }} data - Validated request body
 * @returns {object} Updated notice
 */
async function updateNotice(id, data) {
  await assertExists(id);

  const { title, content } = data;

  return prisma.notice.update({
    where: { id },
    data: {
      title:   title.trim(),
      content: content.trim(),
    },
    select: NOTICE_SELECT,
  });
}

/**
 * Toggles the isPinned flag for a notice.
 *
 * Reads the current state first, then writes the inverse.
 * Throws 404 if the notice does not exist.
 *
 * @param {string} id
 * @returns {object} Updated notice with new isPinned value
 */
async function togglePin(id) {
  const notice = await prisma.notice.findUnique({
    where: { id },
    select: { isPinned: true },
  });

  if (!notice) throw new ApiError(404, 'Notice not found');

  const willBePinned = !notice.isPinned;

  const updated = await prisma.notice.update({
    where: { id },
    data: { isPinned: willBePinned },
    select: NOTICE_SELECT,
  });

  // If the notice is newly pinned, send email to all residents
  if (willBePinned) {
    prisma.user.findMany({
      where: { role: ROLES.RESIDENT },
      select: { name: true, email: true },
    }).then((residents) => {
      sendNoticeEmail(residents, updated).catch((err) => {
        console.error('[email] Notice email notification failed:', err.message);
      });
    }).catch((err) => {
      console.error('[email] Failed to fetch residents for notice notification:', err.message);
    });
  }

  return updated;
}

/**
 * Permanently deletes a notice.
 * Throws 404 if the notice does not exist.
 *
 * @param {string} id
 * @returns {void}
 */
async function deleteNotice(id) {
  await assertExists(id);
  await prisma.notice.delete({ where: { id } });
}

module.exports = { createNotice, listNotices, updateNotice, togglePin, deleteNotice };

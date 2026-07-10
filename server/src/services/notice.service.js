const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

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

  return prisma.notice.update({
    where: { id },
    data: { isPinned: !notice.isPinned },
    select: NOTICE_SELECT,
  });
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

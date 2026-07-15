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

async function createNotice(data, authorId) {
  const { title, content, isPinned } = data;
  const shouldBePinned = Boolean(isPinned);

  const notice = await prisma.notice.create({
    data: {
      title:    title.trim(),
      content:  content.trim(),
      isPinned: shouldBePinned,
      authorId,
    },
    select: NOTICE_SELECT,
  });

  // If the notice is marked as important (pinned) on creation, notify residents
  if (shouldBePinned) {
    prisma.user.findMany({
      where: { role: ROLES.RESIDENT },
      select: { name: true, email: true },
    }).then((residents) => {
      sendNoticeEmail(residents, notice).catch((err) => {
        console.error('[email] Important notice creation email notification failed:', err.message);
      });
    }).catch((err) => {
      console.error('[email] Failed to fetch residents for important notice notification:', err.message);
    });
  }

  return notice;
}

/**
 * Returns all notices ordered by:
 *   1. isPinned DESC — pinned notices always appear first
 *   2. createdAt DESC — newest first within each group
 *
 * @returns {object[]}
 */
async function listNotices(filters = {}) {
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const take = limit;

  const [totalItems, notices] = await Promise.all([
    prisma.notice.count(),
    prisma.notice.findMany({
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take,
      select: NOTICE_SELECT,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    items: notices,
  };
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

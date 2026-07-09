/**
 * Notice Service
 *
 * Handles all notice board business logic:
 * - Create notice (triggers email to all residents)
 * - List notices (pinned first)
 * - Update notice content
 * - Toggle pin status
 * - Delete notice
 *
 * Implemented in Phase 4 — Remaining Features.
 */

async function createNotice(data, authorId) {
  throw new Error('Not implemented');
}

async function listNotices() {
  throw new Error('Not implemented');
}

async function updateNotice(id, data) {
  throw new Error('Not implemented');
}

async function togglePin(id) {
  throw new Error('Not implemented');
}

async function deleteNotice(id) {
  throw new Error('Not implemented');
}

module.exports = { createNotice, listNotices, updateNotice, togglePin, deleteNotice };

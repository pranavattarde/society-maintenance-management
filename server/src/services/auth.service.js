/**
 * Auth Service
 *
 * Handles all authentication business logic:
 * - User registration (hash password, insert user)
 * - User login (verify credentials, sign JWT)
 * - Profile lookup
 *
 * Implemented in Phase 2 — Authentication.
 */

async function registerUser(data) {
  throw new Error('Not implemented');
}

async function loginUser(email, password) {
  throw new Error('Not implemented');
}

async function findUserById(id) {
  throw new Error('Not implemented');
}

module.exports = { registerUser, loginUser, findUserById };

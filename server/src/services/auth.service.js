const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const { BCRYPT_SALT_ROUNDS } = require('../utils/constants');

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Signs a JWT containing the minimum claims needed for auth and role guarding.
 * The secret and expiry are read from environment variables.
 *
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Registers a new user account.
 *
 * Steps:
 *   1. Normalize and check email uniqueness
 *   2. Hash the password (bcrypt, cost factor from constants)
 *   3. Create user record — Prisma `select` ensures password is never returned
 *   4. Sign and return JWT with the new user object
 *
 * @param {object} data - Validated body from validateRegister
 * @returns {{ message: string, token: string, user: object }}
 * @throws {ApiError} 409 — email already registered
 */
async function registerUser(data) {
  const { name, email, password, role, flatNumber, phone } = data;

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'RESIDENT',
      flatNumber: flatNumber.trim(),
      phone: phone?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      flatNumber: true,
      phone: true,
      createdAt: true,
    },
  });

  const token = signToken({ id: user.id, role: user.role });

  return { message: 'Account created successfully', token, user };
}

/**
 * Authenticates a user and returns a signed JWT.
 *
 * A single generic error message is used for both "user not found" and
 * "wrong password" to prevent email enumeration attacks.
 *
 * The full user record (including password hash) is fetched for bcrypt.compare,
 * then the password field is destructured out before returning.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ message: string, token: string, user: object }}
 * @throws {ApiError} 401 — invalid credentials
 */
async function loginUser(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ id: user.id, role: user.role });

  const { password: _omitted, ...safeUser } = user;

  return { message: 'Login successful', token, user: safeUser };
}

/**
 * Returns a user profile by ID, without the password field.
 *
 * Called by GET /auth/me after the authenticate middleware has verified
 * the JWT and attached req.user = { id, role }.
 *
 * @param {string} id
 * @returns {object} User profile
 * @throws {ApiError} 404 — user not found (e.g. account deleted after token was issued)
 */
async function findUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      flatNumber: true,
      phone: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

module.exports = { registerUser, loginUser, findUserById };

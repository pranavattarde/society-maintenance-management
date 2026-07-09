const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

/**
 * Authentication middleware.
 *
 * Verifies the JWT from the Authorization header and attaches
 * the decoded payload to req.user for downstream use.
 *
 * Expected header: Authorization: Bearer <token>
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

module.exports = authenticate;

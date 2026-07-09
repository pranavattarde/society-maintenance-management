const ApiError = require('../utils/ApiError');

/**
 * Centralized error response middleware.
 *
 * Must be the last middleware registered in app.js.
 * Catches ApiError instances (thrown in services) and
 * any unhandled runtime errors.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] ${statusCode} — ${message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({ message });
}

module.exports = errorHandler;

const ApiError = require('../utils/ApiError');

/**
 * Role-based authorization middleware factory.
 *
 * Must be used after the authenticate middleware (requires req.user).
 *
 * Usage:
 *   router.post('/notices', authenticate, authorize('ADMIN'), createNotice);
 *
 * @param {...string} roles - One or more allowed roles
 * @returns {import('express').RequestHandler}
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = authorize;

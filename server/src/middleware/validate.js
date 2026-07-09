/**
 * Validation middleware factory.
 *
 * Accepts a plain validation function that takes a data object
 * and returns an array of error strings.
 *
 * If the array is non-empty, the request is rejected with 400.
 * If empty, the request proceeds to the controller.
 *
 * Usage:
 *   router.post('/register', validate(validateRegister), register);
 *
 * @param {(data: object) => string[]} validationFn
 * @returns {import('express').RequestHandler}
 */
function validate(validationFn) {
  return (req, res, next) => {
    const errors = validationFn(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    next();
  };
}

module.exports = validate;

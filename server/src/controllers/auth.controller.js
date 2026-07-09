const { registerUser, loginUser, findUserById } = require('../services/auth.service');

/**
 * Auth Controller — Phase 2 stub.
 *
 * Controllers are intentionally thin:
 * they parse the request, delegate to the service, and send the response.
 *
 * Implemented in Phase 2 — Authentication.
 */

async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await loginUser(req.body.email, req.body.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };

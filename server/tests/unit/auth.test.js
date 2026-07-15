const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authenticate = require('../../src/middleware/authenticate');
const authorize = require('../../src/middleware/authorize');
const ApiError = require('../../src/utils/ApiError');

// Ensure JWT secret environment variable is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-12345';

test('Unit Tests — Authentication & RBAC', async (t) => {

  await t.test('Password Hashing — bcrypt hashing and verification', async () => {
    const password = 'mySecretPassword123';
    const hash = await bcrypt.hash(password, 10);
    
    // Hash should be created
    assert.ok(hash);
    assert.notStrictEqual(hash, password);

    // Verification should pass for correct password
    const verified = await bcrypt.compare(password, hash);
    assert.strictEqual(verified, true);

    // Verification should fail for incorrect password
    const failed = await bcrypt.compare('wrongPassword', hash);
    assert.strictEqual(failed, false);
  });

  await t.test('JWT Operations — sign and verify token payload', () => {
    const payload = { id: 'cuid123', email: 'resident@society.com', role: 'RESIDENT' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    assert.ok(token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.email, payload.email);
    assert.strictEqual(decoded.role, payload.role);

    // Verify rejection of invalid signature
    assert.throws(() => {
      jwt.verify(token, 'invalid-secret-key');
    });
  });

  await t.test('Auth Middleware — authenticate valid JWT bearer token', () => {
    const payload = { id: 'cuid123', role: 'RESIDENT' };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    const res = {};
    let nextCalled = false;
    let nextError = null;

    const next = (err) => {
      nextCalled = true;
      nextError = err;
    };

    authenticate(req, res, next);

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(nextError, undefined);
    assert.ok(req.user);
    assert.strictEqual(req.user.id, payload.id);
    assert.strictEqual(req.user.role, payload.role);
  });

  await t.test('Auth Middleware — reject missing or invalid auth headers', () => {
    const reqNoHeader = { headers: {} };
    let errNoHeader = null;
    authenticate(reqNoHeader, {}, (err) => { errNoHeader = err; });

    assert.ok(errNoHeader instanceof ApiError);
    assert.strictEqual(errNoHeader.statusCode, 401);
    assert.strictEqual(errNoHeader.message, 'Authentication required');

    const reqBadHeader = { headers: { authorization: 'Bearer invalid-token' } };
    let errBadHeader = null;
    authenticate(reqBadHeader, {}, (err) => { errBadHeader = err; });

    assert.ok(errBadHeader instanceof ApiError);
    assert.strictEqual(errBadHeader.statusCode, 401);
    assert.strictEqual(errBadHeader.message, 'Invalid or expired token');
  });

  await t.test('RBAC Middleware — authorize authorized roles', () => {
    const req = {
      user: { id: 'admin1', role: 'ADMIN' }
    };
    const res = {};
    let nextCalled = false;

    const authorizeMiddleware = authorize('ADMIN');
    authorizeMiddleware(req, res, (err) => {
      assert.strictEqual(err, undefined);
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await t.test('RBAC Middleware — reject unauthorized roles', () => {
    const req = {
      user: { id: 'resident1', role: 'RESIDENT' }
    };
    const res = {};
    let nextError = null;

    const authorizeMiddleware = authorize('ADMIN');
    authorizeMiddleware(req, res, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof ApiError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.message, 'You do not have permission to perform this action');
  });

});

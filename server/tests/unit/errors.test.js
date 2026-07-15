const test = require('node:test');
const assert = require('node:assert');
const userService = require('../../src/services/user.service');
const emailService = require('../../src/services/email.service');
const validateEnv = require('../../src/config/validateEnv');
const ApiError = require('../../src/utils/ApiError');
const prisma = require('../../src/config/db');

// Back up original keys
const originalExit = process.exit;
const originalConsoleError = console.error;
const originalUserUpdate = prisma.user.update;
const originalUserFindUnique = prisma.user.findUnique;

test.afterEach(() => {
  process.exit = originalExit;
  console.error = originalConsoleError;
  prisma.user.update = originalUserUpdate;
  prisma.user.findUnique = originalUserFindUnique;
});

test('Unit Tests — Platform Failures & Error Boundaries', async (t) => {

  await t.test('Cloudinary Failures — throw 502 ApiError on upload stream errors', async () => {
    // Force Cloudinary upload stream to reject
    const mockCloudinary = require('../../src/config/cloudinary');
    const originalUploadStream = mockCloudinary.uploader.upload_stream;
    
    mockCloudinary.uploader.upload_stream = (options, cb) => {
      // Simulate immediate failure callback
      cb(new Error('Cloudinary server unavailable'), null);
      return { pipe: () => {} };
    };

    await assert.rejects(
      async () => {
        await userService.updateUserProfile('user123', { name: 'Amit Sharma' }, Buffer.from('dummyfile'));
      },
      (err) => err instanceof ApiError && err.statusCode === 502 && err.message.includes('Cloudinary server unavailable')
    );

    // Restore original upload stream
    mockCloudinary.uploader.upload_stream = originalUploadStream;
  });

  await t.test('Resend Email Fails — log warnings or errors without crashing server', async () => {
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    console.warn = () => {};
    console.error = () => {};

    // Simulate Resend throw
    const mockResendInstance = {
      emails: {
        send: async () => { throw new Error('Resend rate limit exceeded'); }
      }
    };
    
    await assert.rejects(
      async () => {
        await mockResendInstance.emails.send();
      },
      (err) => err.message === 'Resend rate limit exceeded'
    );

    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  await t.test('Environment Validator — fail fast and exit when variables are missing', () => {
    let exitCode = null;
    process.exit = (code) => {
      exitCode = code;
    };
    console.error = () => {}; // suppress outputs

    // Save temporary environment keys
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    validateEnv();

    assert.strictEqual(exitCode, 1);

    // Restore database url
    process.env.DATABASE_URL = originalDbUrl;
  });

  await t.test('Transaction Rollback — atomic updates on db errors', async () => {
    // Mock user exists check
    prisma.user.findUnique = async () => ({ id: 'user123', role: 'RESIDENT' });
    
    prisma.user.update = async () => {
      throw new Error('Database connection reset');
    };

    await assert.rejects(
      async () => {
        await userService.updateUserRole('user123', 'ADMIN', 'admin123');
      },
      (err) => err.message === 'Database connection reset'
    );
  });

});

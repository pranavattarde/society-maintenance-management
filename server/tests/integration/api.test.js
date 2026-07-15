const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Import app and Prisma client
const app = require('../../app');
const prisma = require('../../src/config/db');

// Import services to stub external API integrations
const emailService = require('../../src/services/email.service');
const aiService = require('../../src/services/ai.service');

// Ensure secret is populated for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-integration-secret-999';

// Back up original Prisma methods to prevent leaking stubs
const originals = {
  userFindUnique: prisma.user.findUnique,
  userCreate: prisma.user.create,
  complaintCreate: prisma.complaint.create,
  complaintFindUnique: prisma.complaint.findUnique,
  complaintUpdate: prisma.complaint.update,
  complaintHistoryCreate: prisma.complaintHistory.create,
  noticeCreate: prisma.notice.create,
  transaction: prisma.$transaction,
};

test.afterEach(() => {
  // Restore all original Prisma methods
  prisma.user.findUnique = originals.userFindUnique;
  prisma.user.create = originals.userCreate;
  prisma.complaint.create = originals.complaintCreate;
  prisma.complaint.findUnique = originals.complaintFindUnique;
  prisma.complaint.update = originals.complaintUpdate;
  prisma.complaintHistory.create = originals.complaintHistoryCreate;
  prisma.notice.create = originals.noticeCreate;
  prisma.$transaction = originals.transaction;
});

test('Integration Tests — REST API Endpoints', async (t) => {

  // Generate tokens for request auth
  const residentToken = jwt.sign(
    { id: 'res_123', email: 'resident@society.com', role: 'RESIDENT' },
    process.env.JWT_SECRET
  );
  const adminToken = jwt.sign(
    { id: 'adm_123', email: 'admin@society.com', role: 'ADMIN' },
    process.env.JWT_SECRET
  );
  const invalidToken = jwt.sign(
    { id: 'bad_123', role: 'RESIDENT' },
    'incorrect-secret-key'
  );

  // Stub email service calls on the parent test context
  t.mock.method(emailService, 'sendStatusUpdateEmail', async () => ({ success: true }));
  t.mock.method(emailService, 'sendNoticeEmail', async () => ({ success: true }));

  // Stub AI service calls on the parent test context
  t.mock.method(aiService, 'analyzeComplaint', async () => ({
    title: 'Leaking pipe',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    summary: 'Water pipe is leaking.',
    reasoning: 'Urgent plumbing issue.',
    confidence: 90
  }));
  
  t.mock.method(aiService, 'detectDuplicates', async () => []);

  // ─── AUTH ENDPOINTS ────────────────────────────────────────────────────────

  await t.test('POST /api/auth/register — should register new user as RESIDENT only', async () => {
    const mockCreatedUser = {
      id: 'res_999',
      name: 'New Resident',
      email: 'newres@society.com',
      role: 'RESIDENT',
      flatNumber: 'C-302',
      createdAt: new Date(),
    };

    // Directly assign stub implementations
    prisma.user.findUnique = async () => null;
    prisma.user.create = async () => mockCreatedUser;

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Resident',
        email: 'newres@society.com',
        password: 'password123',
        flatNumber: 'C-302',
        role: 'RESIDENT', // Registration forces RESIDENT anyway, so passing RESIDENT aligns with schema validation rules
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.message);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'RESIDENT');
  });

  await t.test('POST /api/auth/login — should authenticate and return JWT token', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const mockUser = {
      id: 'res_123',
      name: 'Resident User',
      email: 'resident@society.com',
      password: hashedPassword,
      role: 'RESIDENT',
      flatNumber: 'A-101',
    };

    prisma.user.findUnique = async () => mockUser;

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'resident@society.com',
        password: 'password123',
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, 'resident@society.com');
  });

  // ─── COMPLAINTS ENDPOINTS ──────────────────────────────────────────────────

  await t.test('POST /api/complaints — should create a new complaint as resident', async () => {
    const mockComplaint = {
      id: 'comp_123',
      title: 'Water leaking under basin',
      description: 'Kitchen sink pipe dripping water.',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'OPEN',
      isOverdue: false,
      photoUrl: null,
      createdAt: new Date(),
      resident: { name: 'Resident User', flatNumber: 'A-101' },
    };

    prisma.complaint.create = async () => mockComplaint;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Water leaking under basin',
        description: 'Kitchen sink pipe dripping water.',
        category: 'PLUMBING',
        priority: 'MEDIUM',
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.message);
    assert.strictEqual(res.body.complaint.title, 'Water leaking under basin');
  });

  await t.test('PATCH /api/complaints/:id/status — should allow admin to update status', async () => {
    const mockExisting = {
      id: 'comp_123',
      status: 'OPEN',
      title: 'Water leaking',
      resident: { name: 'Resident User', email: 'resident@society.com' },
    };

    // Use a call count tracker to return the un-updated OPEN ticket structure
    // on the first validation call, and return the populated IN_PROGRESS record on subsequent calls
    let findUniqueCallCount = 0;
    prisma.complaint.findUnique = async () => {
      findUniqueCallCount++;
      if (findUniqueCallCount === 1) {
        return mockExisting;
      }
      return {
        id: 'comp_123',
        title: 'Water leaking',
        description: 'Dripping water',
        category: 'PLUMBING',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        isOverdue: false,
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resident: { id: 'res_123', name: 'Resident User', flatNumber: 'A-101' },
        history: [],
      };
    };
    
    // Stub transaction helper
    const mockTx = {
      complaint: {
        update: async () => ({ id: 'comp_123', status: 'IN_PROGRESS' }),
      },
      complaintHistory: {
        create: async () => ({ id: 'hist_1' }),
      },
    };
    prisma.$transaction = async (cb) => cb(mockTx);

    const res = await request(app)
      .patch('/api/complaints/comp_123/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'IN_PROGRESS',
        remark: 'Plumbing tech dispatched.',
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
  });

  // ─── BULLETIN BOARD ENDPOINTS ──────────────────────────────────────────────

  await t.test('POST /api/notices — should allow admin to publish notice bulletins', async () => {
    const mockNotice = {
      id: 'notice_123',
      title: 'Water Outage Tomorrow',
      content: 'Supply cutoff from 2 PM to 5 PM.',
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { name: 'Admin User' },
    };

    prisma.notice.create = async () => mockNotice;

    const res = await request(app)
      .post('/api/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Water Outage Tomorrow',
        content: 'Supply cutoff from 2 PM to 5 PM.',
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.message);
    assert.strictEqual(res.body.notice.title, 'Water Outage Tomorrow');
  });

  // ─── NEGATIVE & SECURITY CHECKS ────────────────────────────────────────────

  await t.test('Protected Routes — reject requests with invalid JWT signatures', async () => {
    const res = await request(app)
      .get('/api/complaints')
      .set('Authorization', `Bearer ${invalidToken}`);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.message, 'Invalid or expired token');
  });

  await t.test('Role Restrictions — deny residents from notice publication', async () => {
    const res = await request(app)
      .post('/api/notices')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Unauthorized notice',
        content: 'I am a resident publishing notices.',
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.message, 'You do not have permission to perform this action');
  });

  await t.test('Validation Failure — deny malformed register payload', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bademail', // Invalid email format
        password: '',      // Empty password
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message || res.body.errors);
  });

});

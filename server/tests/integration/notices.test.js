const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Import app and Prisma client
const app = require('../../app');
const prisma = require('../../src/config/db');

// Import services to stub external email calls
const emailService = require('../../src/services/email.service');

// Ensure secret is populated for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-integration-secret-999';

// Back up original Prisma methods
const originals = {
  noticeCreate: prisma.notice.create,
  noticeUpdate: prisma.notice.update,
  noticeFindUnique: prisma.notice.findUnique,
  noticeDelete: prisma.notice.delete,
  userFindMany: prisma.user.findMany,
};

test.afterEach(() => {
  // Restore all original Prisma methods
  prisma.notice.create = originals.noticeCreate;
  prisma.notice.update = originals.noticeUpdate;
  prisma.notice.findUnique = originals.noticeFindUnique;
  prisma.notice.delete = originals.noticeDelete;
  prisma.user.findMany = originals.userFindMany;
});

test('Integration Tests — Bulletin Board notices', async (t) => {

  // Generate tokens
  const residentToken = jwt.sign(
    { id: 'res_123', email: 'resident@society.com', role: 'RESIDENT' },
    process.env.JWT_SECRET
  );
  const adminToken = jwt.sign(
    { id: 'adm_123', email: 'admin@society.com', role: 'ADMIN' },
    process.env.JWT_SECRET
  );

  // Stub email service
  t.mock.method(emailService, 'sendNoticeEmail', async () => ({ success: true }));

  await t.test('POST /api/notices — reject resident from notice creation', async () => {
    const res = await request(app)
      .post('/api/notices')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Resident Announcement',
        content: 'Should be rejected.',
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.message, 'You do not have permission to perform this action');
  });

  await t.test('POST /api/notices — allow admin to publish notice', async () => {
    const mockNotice = {
      id: 'notice_123',
      title: 'Annual General Meeting',
      content: 'Meeting scheduled for Sunday at 10 AM.',
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
        title: 'Annual General Meeting',
        content: 'Meeting scheduled for Sunday at 10 AM.',
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.message);
    assert.strictEqual(res.body.notice.title, 'Annual General Meeting');
  });

  await t.test('PATCH /api/notices/:id — allow admin to edit notice content', async () => {
    const mockNotice = {
      id: 'notice_123',
      title: 'AGM Date Postponed',
      content: 'Meeting rescheduled to next Sunday.',
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { name: 'Admin User' },
    };

    // Stub existence check findUnique and update method
    prisma.notice.findUnique = async () => ({ id: 'notice_123' });
    prisma.notice.update = async () => mockNotice;

    const res = await request(app)
      .patch('/api/notices/notice_123')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'AGM Date Postponed',
        content: 'Meeting rescheduled to next Sunday.',
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
    assert.strictEqual(res.body.notice.title, 'AGM Date Postponed');
  });

  await t.test('PATCH /api/notices/:id/pin — allow admin to toggle pins', async () => {
    const mockUnpinned = { id: 'notice_123', isPinned: false };
    const mockPinned = {
      id: 'notice_123',
      title: 'AGM',
      content: 'Details AGM',
      isPinned: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { name: 'Admin User' },
    };

    // Return current state as unpinned
    prisma.notice.findUnique = async () => mockUnpinned;
    // Return updated state as pinned
    prisma.notice.update = async () => mockPinned;
    // Stub resident list findMany
    prisma.user.findMany = async () => [{ email: 'res1@society.com' }];

    const res = await request(app)
      .patch('/api/notices/notice_123/pin')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('pinned'));
    assert.strictEqual(res.body.notice.isPinned, true);
  });

  await t.test('DELETE /api/notices/:id — allow admin to delete notices', async () => {
    prisma.notice.findUnique = async () => ({ id: 'notice_123' });
    prisma.notice.delete = async () => ({ id: 'notice_123' });

    const res = await request(app)
      .delete('/api/notices/notice_123')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Notice deleted successfully');
  });

  await t.test('DELETE /api/notices/:id — reject residents from deleting notices', async () => {
    const res = await request(app)
      .delete('/api/notices/notice_123')
      .set('Authorization', `Bearer ${residentToken}`);

    assert.strictEqual(res.status, 403);
  });

});

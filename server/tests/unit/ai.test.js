const test = require('node:test');
const assert = require('node:assert');
const prisma = require('../../src/config/db');
const aiService = require('../../src/services/ai.service');
const ApiError = require('../../src/utils/ApiError');

// Back up original keys and functions
const originalApiKey = process.env.GROQ_API_KEY;
const originalComplaintFindMany = prisma.complaint.findMany;
const originalComplaintGroupBy = prisma.complaint.groupBy;
const originalFetch = global.fetch;

test.afterEach(() => {
  process.env.GROQ_API_KEY = originalApiKey;
  prisma.complaint.findMany = originalComplaintFindMany;
  prisma.complaint.groupBy = originalComplaintGroupBy;
  global.fetch = originalFetch;
});

test('Unit Tests — AI Operations & Parsing', async (t) => {

  await t.test('detectDuplicates — should return early with empty array if database has no unresolved complaints', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    prisma.complaint.findMany = async () => [];

    const matches = await aiService.detectDuplicates('New dripping faucet leak.');
    assert.deepStrictEqual(matches, []);
  });

  await t.test('detectDuplicates — should format list and parse Groq JSON response matches correctly', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    
    const mockUnresolved = [
      { id: '1', title: 'Water leak', description: 'Leaking basin.', status: 'OPEN', priority: 'LOW', createdAt: new Date() },
    ];
    prisma.complaint.findMany = async () => mockUnresolved;

    // Stub global fetch to simulate Groq response
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              matches: [{ complaintId: '1', similarity: 90, reason: 'Both are plumbing leaks.' }]
            })
          }
        }]
      })
    });

    const matches = await aiService.detectDuplicates('Dripping pipe behind basin.');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].complaintId, '1');
    assert.strictEqual(matches[0].similarity, 90);
  });

  await t.test('parseSearchIntent — should map query strings to specific filters', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'unresolved',
              category: 'plumbing',
              priority: 'high',
              date: '2026-07-15',
              search: 'Tower A'
            })
          }
        }]
      })
    });

    const intent = await aiService.parseSearchIntent('high priority unresolved plumbing complaints in Tower A');
    assert.strictEqual(intent.status, 'UNRESOLVED');
    assert.strictEqual(intent.category, 'PLUMBING');
    assert.strictEqual(intent.priority, 'HIGH');
    assert.strictEqual(intent.search, 'Tower A');
  });

  await t.test('generateOperationsInsights — return insufficient data notice for empty log queues', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    prisma.complaint.findMany = async () => [];
    prisma.complaint.groupBy = async () => [];

    const insights = await aiService.generateOperationsInsights();
    assert.ok(insights.insights[0].includes('Insufficient data'));
  });

  await t.test('generateText — generate notices and resolution updates', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ content: 'We are resolving the plumbing issue.' })
          }
        }]
      })
    });

    const textResult = await aiService.generateText('RESOLUTION', 'Plumbing issue resolved.');
    assert.strictEqual(textResult.content, 'We are resolving the plumbing issue.');
  });

  await t.test('AI Service Failures — throw 503 if GROQ_API_KEY is not configured', async () => {
    delete process.env.GROQ_API_KEY;

    await assert.rejects(
      async () => { await aiService.analyzeComplaint('Water leak'); },
      (err) => err instanceof ApiError && err.statusCode === 503
    );
  });

});

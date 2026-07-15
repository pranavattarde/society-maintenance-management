const test = require('node:test');
const assert = require('node:assert');
const { validateCreateComplaint, validateUpdateStatus } = require('../../src/validations/complaint.validation');
const { ALLOWED_STATUS_TRANSITIONS, STATUS } = require('../../src/utils/constants');
const { parseAndValidate } = require('../../src/services/ai.service');
const ApiError = require('../../src/utils/ApiError');

test('Unit Tests — Complaints & AI Parser', async (t) => {

  await t.test('Validation Schemas — validateCreateComplaint input checks', () => {
    const validData = {
      title: 'Water leaking under sink',
      description: 'The pipes below the kitchen sink are dripping steadily.',
      category: 'PLUMBING',
      priority: 'MEDIUM',
    };

    const errorsValid = validateCreateComplaint(validData);
    assert.strictEqual(errorsValid.length, 0);

    // Title too short
    const badTitle = { ...validData, title: 'leak' };
    const errorsBadTitle = validateCreateComplaint(badTitle);
    assert.ok(errorsBadTitle.includes('Title must be at least 5 characters'));

    // Description too short
    const badDesc = { ...validData, description: 'leak' };
    const errorsBadDesc = validateCreateComplaint(badDesc);
    assert.ok(errorsBadDesc.includes('Description must be at least 10 characters'));

    // Invalid category
    const badCat = { ...validData, category: 'AIR_CONDITIONING' };
    const errorsBadCat = validateCreateComplaint(badCat);
    assert.ok(errorsBadCat.some(e => e.includes('Category must be one of')));

    // Invalid priority
    const badPriority = { ...validData, priority: 'CRITICAL' };
    const errorsBadPriority = validateCreateComplaint(badPriority);
    assert.ok(errorsBadPriority.some(e => e.includes('Priority must be one of')));
  });

  await t.test('Validation Schemas — validateUpdateStatus input checks', () => {
    const validStatus = { status: 'RESOLVED' };
    const errorsValid = validateUpdateStatus(validStatus);
    assert.strictEqual(errorsValid.length, 0);

    const badStatus = { status: 'UNKNOWN_STATUS' };
    const errorsBadStatus = validateUpdateStatus(badStatus);
    assert.ok(errorsBadStatus.some(e => e.includes('Status must be one of')));
  });

  await t.test('Status Transition Rules — ALLOWED_STATUS_TRANSITIONS enforcements', () => {
    // OPEN -> IN_PROGRESS, RESOLVED
    const openTransitions = ALLOWED_STATUS_TRANSITIONS[STATUS.OPEN];
    assert.ok(openTransitions.includes(STATUS.IN_PROGRESS));
    assert.ok(openTransitions.includes(STATUS.RESOLVED));

    // IN_PROGRESS -> RESOLVED
    const inProgressTransitions = ALLOWED_STATUS_TRANSITIONS[STATUS.IN_PROGRESS];
    assert.ok(inProgressTransitions.includes(STATUS.RESOLVED));
    assert.strictEqual(inProgressTransitions.includes(STATUS.OPEN), false);

    // RESOLVED -> terminal
    const resolvedTransitions = ALLOWED_STATUS_TRANSITIONS[STATUS.RESOLVED];
    assert.strictEqual(resolvedTransitions.length, 0);
  });

  await t.test('AI Response Parser — parseAndValidate valid JSON', () => {
    const validRaw = JSON.stringify({
      title: 'Water leak in toilet',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      summary: 'Dripping pipe behind toilet.',
      reasoning: 'Water leak requires scheduling a plumbing repair.',
      confidence: 85,
    });

    const parsed = parseAndValidate(validRaw);
    assert.strictEqual(parsed.title, 'Water leak in toilet');
    assert.strictEqual(parsed.category, 'PLUMBING');
    assert.strictEqual(parsed.priority, 'MEDIUM');
    assert.strictEqual(parsed.confidence, 85);
  });

  await t.test('AI Response Parser — clean markdown codeblocks and validate unknown categories', () => {
    const markdownRaw = '```json\n' + JSON.stringify({
      title: 'Elevator stops on floor 3',
      category: 'lift', // lowercase should be normalised
      priority: 'high', // lowercase should be normalised
      summary: 'Elevator gate stuck.',
      reasoning: 'Safety issues necessitate fast checks.',
      confidence: '95', // string parsed as integer
    }) + '\n```';

    const parsed = parseAndValidate(markdownRaw);
    assert.strictEqual(parsed.title, 'Elevator stops on floor 3');
    assert.strictEqual(parsed.category, 'LIFT');
    assert.strictEqual(parsed.priority, 'HIGH');
    assert.strictEqual(parsed.confidence, 95);
  });

  await t.test('AI Response Parser — reject invalid properties or malformed JSON', () => {
    // Malformed JSON
    assert.throws(() => {
      parseAndValidate('invalid-json-text');
    }, (err) => err instanceof ApiError && err.statusCode === 422);

    // Missing title
    const missingTitle = JSON.stringify({
      category: 'PLUMBING',
      priority: 'LOW',
      confidence: 50,
    });
    assert.throws(() => {
      parseAndValidate(missingTitle);
    }, (err) => err instanceof ApiError && err.statusCode === 422);

    // Unknown category
    const unknownCategory = JSON.stringify({
      title: 'Gate issues',
      category: 'INFRASTRUCTURE',
      priority: 'LOW',
      confidence: 50,
    });
    assert.throws(() => {
      parseAndValidate(unknownCategory);
    }, (err) => err instanceof ApiError && err.statusCode === 422);
  });

});

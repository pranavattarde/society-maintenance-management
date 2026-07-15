const test = require('node:test');
const assert = require('node:assert');
const { validateRegister, validateLogin } = require('../../src/validations/auth.validation');
const { validateCreateComplaint, validateUpdateStatus } = require('../../src/validations/complaint.validation');

test('Unit Tests — Input Validation Schemas', async (t) => {

  await t.test('validateRegister — accept valid payloads', () => {
    const payload = {
      name: 'Amit Patel',
      email: 'amit@example.com',
      password: 'strongPassword123',
      flatNumber: 'B-404',
      role: 'RESIDENT',
    };
    const errors = validateRegister(payload);
    assert.strictEqual(errors.length, 0);
  });

  await t.test('validateRegister — reject invalid emails', () => {
    const invalidEmails = ['plainstring', 'user@', 'user@domain', '@domain.com'];
    for (const email of invalidEmails) {
      const payload = {
        name: 'Amit Patel',
        email,
        password: 'strongPassword123',
        flatNumber: 'B-404',
        role: 'RESIDENT',
      };
      const errors = validateRegister(payload);
      assert.ok(errors.some(e => e.includes('valid email address')), `Failed to reject invalid email: ${email}`);
    }
  });

  await t.test('validateRegister — reject passwords under 8 characters', () => {
    const payload = {
      name: 'Amit Patel',
      email: 'amit@example.com',
      password: 'weak',
      flatNumber: 'B-404',
      role: 'RESIDENT',
    };
    const errors = validateRegister(payload);
    assert.ok(errors.includes('Password must be at least 8 characters'));
  });

  await t.test('validateRegister — enforce role restriction rules (no ADMIN on signup)', () => {
    const payload = {
      name: 'Amit Patel',
      email: 'amit@example.com',
      password: 'strongPassword123',
      flatNumber: 'B-404',
      role: 'ADMIN',
    };
    const errors = validateRegister(payload);
    assert.ok(errors.includes('Registration should never allow selecting ADMIN'));
  });

  await t.test('validateRegister — enforce missing fields', () => {
    const errors = validateRegister({});
    assert.ok(errors.includes('Name must be at least 2 characters'));
    assert.ok(errors.includes('A valid email address is required'));
    assert.ok(errors.includes('Password must be at least 8 characters'));
    assert.ok(errors.includes('Flat number is required'));
  });

  await t.test('validateLogin — enforce email and password requirements', () => {
    const emptyErrors = validateLogin({});
    assert.ok(emptyErrors.includes('A valid email address is required'));
    assert.ok(emptyErrors.includes('Password is required'));

    const badEmailErrors = validateLogin({ email: 'bademail', password: '123' });
    assert.ok(badEmailErrors.includes('A valid email address is required'));
    assert.strictEqual(badEmailErrors.includes('Password is required'), false);
  });

  await t.test('validateCreateComplaint — enforce title, description, category, and priority limits', () => {
    const errorsEmpty = validateCreateComplaint({});
    assert.ok(errorsEmpty.includes('Title must be at least 5 characters'));
    assert.ok(errorsEmpty.includes('Description must be at least 10 characters'));
    assert.ok(errorsEmpty.some(e => e.includes('Category must be one of')));
    assert.ok(errorsEmpty.some(e => e.includes('Priority must be one of')));

    const longTitle = 'A'.repeat(101);
    const errorsTooLong = validateCreateComplaint({
      title: longTitle,
      description: 'Dripping water from main overhead valve.',
      category: 'PLUMBING',
      priority: 'MEDIUM',
    });
    assert.ok(errorsTooLong.includes('Title must not exceed 100 characters'));
  });

});

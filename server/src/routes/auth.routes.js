const { Router } = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { validateRegister, validateLogin } = require('../validations/auth.validation');

const router = Router();

router.post('/register', validate(validateRegister), register);
router.post('/login', validate(validateLogin), login);
router.get('/me', authenticate, getMe);

module.exports = router;

const { Router } = require('express');
const { list, create, update, pin, remove } = require('../controllers/notice.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { validateNotice } = require('../validations/notice.validation');
const { ROLES } = require('../utils/constants');

const router = Router();

// All notice routes require authentication
router.use(authenticate);

router.get('/', list);
router.post('/', authorize(ROLES.ADMIN), validate(validateNotice), create);
router.patch('/:id', authorize(ROLES.ADMIN), validate(validateNotice), update);
router.patch('/:id/pin', authorize(ROLES.ADMIN), pin);
router.delete('/:id', authorize(ROLES.ADMIN), remove);

module.exports = router;

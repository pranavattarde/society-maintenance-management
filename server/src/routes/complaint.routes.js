const { Router } = require('express');
const { create, list, getById, updateStatus } = require('../controllers/complaint.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { validateCreateComplaint, validateUpdateStatus } = require('../validations/complaint.validation');
const { ROLES } = require('../utils/constants');

const router = Router();

// All complaint routes require authentication
router.use(authenticate);

router.post('/', authorize(ROLES.RESIDENT), upload.single('photo'), validate(validateCreateComplaint), create);
router.get('/', list);
router.get('/:id', getById);
router.patch('/:id/status', authorize(ROLES.ADMIN), validate(validateUpdateStatus), updateStatus);

module.exports = router;

const { Router } = require('express');
const { list, updateRole, updateProfile } = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { uploadAvatar } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile update is available to all logged in users
router.patch('/profile', uploadAvatar.single('avatar'), updateProfile);

// Admin-only routes
router.get('/', authorize(ROLES.ADMIN), list);
router.patch('/:id/role', authorize(ROLES.ADMIN), updateRole);

module.exports = router;

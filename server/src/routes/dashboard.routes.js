const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

router.get('/', authenticate, getDashboard);

module.exports = router;

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/adminOverviewController');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/overview', c.getOverview);

module.exports = router;

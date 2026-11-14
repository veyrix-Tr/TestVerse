const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/adminPaymentsController');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/payments', c.listPayments);
router.post('/payments/:id/check', c.checkPayment);

module.exports = router;

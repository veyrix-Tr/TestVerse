const express = require('express');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/paymentsController');

const router = express.Router();

router.get('/payments/config', c.paymentConfig);
router.post('/payments/webhook', c.webhook); // public, signature-checked
router.post('/payments/verify', requireAuth, c.verifyPayment);

module.exports = router;

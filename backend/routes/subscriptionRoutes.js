const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { listBatches, getSubscription, subscribe } = require('../controllers/subscriptionController');

const router = express.Router();

router.get('/batches', listBatches);
router.get('/subscription', requireAuth, getSubscription);
router.post('/subscription', requireAuth, subscribe);

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/testsController');

const router = express.Router();
router.use(requireAuth);

router.get('/', c.listTests);
router.get('/:id', c.getTest);
router.post('/:id/start', c.startTest);
router.put('/:id/attempt', c.saveAttempt);
router.post('/:id/submit', c.submitTest);
router.get('/:id/result', c.getResult);
router.get('/:id/paper', c.getPaper);

module.exports = router;

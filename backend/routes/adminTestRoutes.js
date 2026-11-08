const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/adminTestsController');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/tests', c.listTests);
router.post('/tests/validate', c.validatePaper);
router.post('/tests', c.createTest);
router.get('/tests/:id', c.getTest);
router.put('/tests/:id', c.updateTest);
router.post('/tests/:id/publish', c.publishTest);
router.post('/tests/:id/unpublish', c.unpublishTest);
router.delete('/tests/:id', c.deleteTest);

module.exports = router;

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/adminTestsController');
const series = require('../controllers/adminSeriesController');

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

router.get('/series', series.listSeries);
router.post('/series', series.createSeries);
router.get('/series/:id', series.getSeries);
router.put('/series/:id', series.updateSeries);
router.put('/series/:id/order', series.reorderSeries);
router.post('/series/:id/publish', series.publishSeries);
router.post('/series/:id/unpublish', series.unpublishSeries);
router.delete('/series/:id', series.deleteSeries);

module.exports = router;

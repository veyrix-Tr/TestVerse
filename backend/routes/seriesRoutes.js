const express = require('express');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/seriesController');

const router = express.Router();
router.use(requireAuth);

router.get('/series', c.listSeries);
router.get('/series/:id', c.getSeries);
router.post('/series/:id/orders', c.buySeries);

module.exports = router;

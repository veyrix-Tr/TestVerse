const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/adminContentController');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// Resources (homepage "Resources" section)
router.get('/resources', c.listResources);
router.post('/resources', c.createResource);
router.put('/resources/:id', c.updateResource);
router.delete('/resources/:id', c.deleteResource);

// Announcements (homepage strip + student banner)
router.get('/announcements', c.listAnnouncements);
router.post('/announcements', c.createAnnouncement);
router.put('/announcements/:id', c.updateAnnouncement);
router.delete('/announcements/:id', c.deleteAnnouncement);

// The admin's own inbox (bell in the top bar)
router.get('/notifications', c.listNotifications);
router.post('/notifications/read', c.markAllRead);
router.post('/notifications/:id/read', c.markRead);

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/siteController');

// What the public site and the signed-in student read (no admin rights needed).
const router = express.Router();

router.get('/resources', c.listResources);
router.get('/resources/mine', requireAuth, c.myResources);
router.get('/announcements', c.listAnnouncements);
router.get('/announcements/mine', requireAuth, c.myAnnouncements);
router.post('/announcements/read', requireAuth, c.markAllRead);
router.post('/announcements/:id/read', requireAuth, c.markRead);

// The student's own bell (only rows where userId is them)
router.get('/notifications/mine', requireAuth, c.myNotifications);
router.post('/notifications/read', requireAuth, c.markAllNotificationsRead);
router.post('/notifications/:id/read', requireAuth, c.markNotificationRead);

module.exports = router;
